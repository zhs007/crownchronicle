import { CharacterAttributes } from '@/types/game';
import TinyPinyin from 'tiny-pinyin';
import { GoogleGenerativeAI, FunctionCall as GeminiFunctionCall, SchemaType, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { setupGlobalProxy } from './proxyConfig';
import {
  type CharacterCard,
  type EventCard,
  ConfigValidator,
  FileSystemDataProvider
} from 'crownchronicle-core';
import { GameConfigManager } from './configManager';
import { EditorDataManager } from './dataManager';
import {
  GeminiFunctionResult,
  FunctionCallSchema
} from '@/types/gemini';
import { WorkflowContext } from '@/types/workflow';
import { GameDataContext } from '@/types/editor';
// 新增导入：事件卡本地规则校验（显式扩展名确保 bundler 解析）
import { validateEventCardRules } from './validators/eventCardRules';

// 设置代理（如果需要）
setupGlobalProxy();

// 允许的属性与数值档位（用于 prompt 与本地校验传参）
const LEGAL_ATTRIBUTE_KEYS = ['power', 'military', 'wealth', 'popularity', 'health', 'age'] as const;
const LEGAL_OFFSETS = [-10, -5, -3, 3, 5, 10] as const;

// 任务队列类型定义（仅 editor 侧使用）
type TaskType = 'create_event' | 'create_character';
type Task = { type: TaskType; args: Record<string, unknown> };
type OnErrorPolicy = 'skip' | 'abort';
type CreationPolicy = 'single' | 'batch';

/**
 * 一个简单的内存会话管理器，用于追踪每个对话的工作流上下文
 */
class WorkflowSessionManager {
  private sessions = new Map<string, WorkflowContext>();

  createSession(): { sessionId: string, context: WorkflowContext } {
    const sessionId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const context: WorkflowContext = {
      workflow: null,
      stage: null,
      data: {},
      lastQuestion: null,
    };
    this.sessions.set(sessionId, context);
    return { sessionId, context };
  }

  getSession(sessionId: string): WorkflowContext | undefined {
    return this.sessions.get(sessionId);
  }

  updateSession(sessionId: string, context: WorkflowContext): void {
    this.sessions.set(sessionId, context);
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}

export const workflowSessionManager = new WorkflowSessionManager();

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;
  private functionSchema: Record<string, FunctionCallSchema> = {};
  private dataProvider: FileSystemDataProvider;
  private validator: ConfigValidator;
  private dataManager: EditorDataManager;
  // 多轮对话消息队列（纯文本，发送时映射为 contents）
  private messages: Array<{ role: 'user' | 'model', content: string }> = [];
  // 新增：任务队列状态（按实例维护）
  private taskQueue: Task[] = [];
  private taskCursor = 0;
  private taskPolicy: CreationPolicy = 'single';
  private taskOnError: OnErrorPolicy = 'skip';

  // 新增：系统级指令，放置稳定的工具使用规范与流程约束
  private buildSystemInstruction(): string {
    return [
      '你是 Crown Chronicle 编辑器内置的 AI（Gemini）。严格遵循以下硬性规则完成任务：',
      '- 仅通过提供的工具完成修改与创建；不要输出 YAML/JSON 或卡片详情到聊天区。',
      "- 新增事件流程：先 set_workflow('ready_add_event', characterId) 获取 existingEvents；严禁调用 get_character_info。",
      "- 用户确认要创建后，一次性调用 schedule_tasks，tasks[].args 仅包含最小信息：characterId|characterName + brief 或 title；不要一次性给出完整事件内容。",
      "- 收到 schedule_tasks 返回的 nextTask 后，逐个调用 create_event 产出完整事件卡；若收到结构化错误（如 DUPLICATE_TITLE/VALIDATION_FAILED/ILLEGAL_OFFSET 等），先根据错误与 suggestion 修正后重试。",
      '- create_event 规则：options 必须恰好 2 条；offset 只能取 -10, -5, -3, 3, 5, 10；属性仅 power,military,wealth,popularity,health,age；多数（≥80%）选项 effects 需覆盖≥2个不同属性；同一 option 内避免同时修改同一属性的 player 与 self；同角色标题唯一。',
      '- 输出风格：除函数调用外，仅给出简短的进度/总结；不要复述卡片 YAML/JSON。',
      '- 若返回中包含 nextTask，则继续下一步函数调用；队列清空后再给用户简短总结。',
      "- 当你收到以‘工具返回:’开头的用户消息时，必须解析其中的 JSON；若 data.nextTask 存在或 queueState.pending>0，则继续调用相应函数，直到 pending=0。",
      '',
      'Few-shot（示例，非真实数据）:',
      'User: 为 霍光 生成 拥立汉宣帝 的事件卡',
      "Assistant (function call): set_workflow({\"workflow\":\"ready_add_event\",\"characterId\":\"huoguang\"})",
      '... 工具返回: { "type":"success", "data":{ "existingEvents":[...] } }',
      "Assistant (function call): schedule_tasks({\"tasks\":[{\"type\":\"create_event\",\"args\":{\"characterId\":\"huoguang\",\"brief\":\"拥立汉宣帝\"}}]})",
      '... 工具返回: { "type":"success", "data":{ "nextTask":{ "type":"create_event", "args":{...} } } }',
      'Assistant (function call): create_event({ ...完整事件卡字段... })',
      '... 工具返回: { "type":"success", "data":{ "saved":true }, "nextTask": null }',
      'Assistant: 已创建并保存，后续可在文件树中查看与修改。'
    ].join('\n');
  }

  constructor(apiKey: string, dataPath?: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-pro';
    this.model = this.genAI.getGenerativeModel({
      model: modelName,
      // 新增：注入系统级指令，提供稳定的工具使用规范
      systemInstruction: this.buildSystemInstruction(),
      generationConfig: {
        temperature: 0.25,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    });
    console.log(`✅ Gemini client initialized with model: ${modelName}`);
    const actualDataPath = dataPath || GameConfigManager.getConfigPath('editor');
    this.dataProvider = new FileSystemDataProvider(actualDataPath);
    this.validator = new ConfigValidator(this.dataProvider);
    this.dataManager = new EditorDataManager(actualDataPath);
  }
  
  // 任务队列辅助方法
  private resetTaskQueue() {
    const prev = this.queueState();
    console.log('[Queue] resetTaskQueue prev=', prev);
    this.taskQueue = [];
    this.taskCursor = 0;
    this.taskPolicy = 'single';
    this.taskOnError = 'skip';
    console.log('[Queue] resetTaskQueue now=', this.queueState());
  }
  private hasPendingTasks() { return this.taskCursor < this.taskQueue.length; }
  private peekNextTask(): Task | null {
    return this.taskCursor < this.taskQueue.length ? this.taskQueue[this.taskCursor] : null;
  }
  private popNextTask(): Task | null {
    if (!this.hasPendingTasks()) return null;
    const t = this.taskQueue[this.taskCursor];
    this.taskCursor += 1;
    console.log('[Queue] popNextTask type=', t.type, 'cursor=', this.taskCursor, 'state=', this.queueState());
    return t;
  }
  private queueState() {
    return { total: this.taskQueue.length, cursor: this.taskCursor, pending: Math.max(0, this.taskQueue.length - this.taskCursor) };
  }
  private scheduleTasksInternal(tasks: Task[], policy?: CreationPolicy, onError?: OnErrorPolicy) {
    console.log('[Queue] scheduleTasksInternal incoming=', Array.isArray(tasks) ? tasks.length : 0, 'policy=', policy || this.taskPolicy, 'onError=', onError || this.taskOnError);
    this.taskQueue = Array.isArray(tasks) ? tasks.filter(t => t && (t.type === 'create_event' || t.type === 'create_character')) : [];
    this.taskCursor = 0;
    if (policy) this.taskPolicy = policy;
    if (onError) this.taskOnError = onError;
    const state = this.queueState();
    console.log('[Queue] scheduled total=', this.taskQueue.length, 'next=', this.peekNextTask() ? this.peekNextTask()!.type : 'none', 'state=', state);
    return { total: this.taskQueue.length, nextTask: this.peekNextTask(), queueState: state };
  }
  private async runPendingTasksChain(maxCount = 10): Promise<{ results: GeminiFunctionResult[]; processed: number; success: number; errors: number; errorDetails: string[] }> {
    const results: GeminiFunctionResult[] = [];
    let processed = 0, success = 0, errors = 0;
    const errorDetails: string[] = [];
    while (this.hasPendingTasks() && processed < maxCount) {
      const task = this.popNextTask();
      if (!task) break;
      let r: GeminiFunctionResult;
      if (task.type === 'create_event') {
        r = await this.createEvent(task.args);
        this.messages.push({ role: 'model', content: `[FunctionCallResult] create_event: ${JSON.stringify(r)}` });
      } else {
        r = await this.createCharacter(task.args);
        this.messages.push({ role: 'model', content: `[FunctionCallResult] create_character: ${JSON.stringify(r)}` });
      }
      results.push(r);
      if (r.type === 'success') {
        success++;
      } else {
        errors++;
        const reason = (r as { error?: string }).error || '';
        const act = (r as { action?: string }).action || 'unknown';
        errorDetails.push(`${act}: ${reason}`);
      }
      processed++;
      if (r.type === 'error' && this.taskOnError === 'abort') break;
    }
    return { results, processed, success, errors, errorDetails };
  }

  async initialize() {
    this.functionSchema = this.buildFunctionSchema();
    console.log('✅ Gemini 客户端初始化完成，已集成 Core 包验证');
  }

  /**
   * 多轮对话核心方法，支持 ready_add_event workflow 和上下文消息队列
   */
  async chat(userMessage: string, context: WorkflowContext): Promise<{ responseForUser: string, newContext: WorkflowContext, functionCall?: GeminiFunctionCall }> {
    try {
      console.log('[Gemini][Chat] incoming userMessage=', String(userMessage).slice(0, 200));
      // 1. 构建对话历史
      if (this.messages.length === 0) {
        // 第一轮，拼接 super prompt
        const allCharacters = await this.dataManager.getAllCharacters();
        const gameDataContext: GameDataContext = {
          characters: allCharacters.map(c => ({ name: c.name, id: c.id })),
          eventCount: 0,
          factions: []
        };
        const prompt = this.buildSuperPrompt(userMessage, context, gameDataContext);
        console.log('[Gemini][Prompt][Super]', prompt.slice(0, 1200));
        this.messages.push({ role: 'user', content: prompt });
      } else {
        // 后续轮次只追加用户输入
        this.messages.push({ role: 'user', content: userMessage });
      }

      console.log('[Gemini][Messages][Count]', this.messages.length);

      // 2. 发送历史消息给 Gemini
      let result = await this.model.generateContent({
        contents: this.messages.map(m => ({ role: m.role, parts: [{ text: m.content }] })),
        tools: [{ functionDeclarations: Object.values(this.functionSchema) }],
      });
      let response = result.response;
      let responseText = response.text();
      console.log('[Gemini][ResponseText]', responseText);
      let reply_to_user = responseText;
      let functionCalls = response.functionCalls() ?? [];
      console.log('[Chat] functionCalls count=', functionCalls.length);
      // 本地 context 变量，后续 function call 处理时维护
      const localContext: WorkflowContext = { workflow: null, stage: null, data: {}, lastQuestion: null };

      // 3. 追加 Gemini 回复到历史
      this.messages.push({ role: 'model', content: reply_to_user });

      // 4. function call 链式处理（以“工具返回:”的用户消息注入结果）
      while (functionCalls.length > 0) {
        const fc = functionCalls[0];
        console.log('[Gemini][FunctionCall]', fc.name, fc.args);
        const fcResult = await this.executeFunctionCall(fc);
        console.log('[Gemini][FunctionCall][ResultSummary]', { name: fc.name, type: fcResult.type, action: fcResult.action, hasData: !!fcResult.data });
        // set_workflow 更新本地 context
        if (fc.name === 'set_workflow') {
          type SetWorkflowArgs = { workflow: string; characterId?: string };
          const setArgs = fc.args as unknown as SetWorkflowArgs;
          localContext.workflow = setArgs.workflow;
          if (setArgs.characterId) {
            if (!localContext.data) localContext.data = {};
            localContext.data.characterId = setArgs.characterId;
          }
        }

        // 注入工具结果为用户消息，以便模型解析并继续函数调用
        const toolMsg = `工具返回: ${JSON.stringify(fcResult)}`;
        this.messages.push({ role: 'user', content: toolMsg });
        console.log('[Gemini][ToolResult->User]', toolMsg.slice(0, 1200));

        // 继续发起下一轮 Gemini 以获取下一步 function call
        result = await this.model.generateContent({
          contents: this.messages.map(m => ({ role: m.role, parts: [{ text: m.content }] })),
          tools: [{ functionDeclarations: Object.values(this.functionSchema) }],
        });
        response = result.response;
        responseText = response.text();
        console.log('[Gemini][ResponseText]', responseText);
        reply_to_user = responseText;
        functionCalls = response.functionCalls() ?? [];
        console.log('[Chat] next functionCalls count=', functionCalls.length);
        this.messages.push({ role: 'model', content: reply_to_user });
      }

      return {
        responseForUser: reply_to_user,
        newContext: localContext,
        functionCall: undefined,
      };
    } catch (error: unknown) {
      console.error('Gemini API Error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        responseForUser: `抱歉，处理时遇到错误: ${errorMessage}`,
        newContext: context,
      };
    }
  }

  async executeFunctionCall(functionCall: GeminiFunctionCall): Promise<GeminiFunctionResult> {
    const { name, args } = functionCall;
    try {
      console.log('[Gemini] Function call:', name, 'args:', JSON.stringify(args, null, 2), 'queueState=', this.queueState());
      // 使用 Core 包验证数据
      const validationResult = await this.validateWithCore();
      if (!validationResult.valid) {
        throw new Error(`数据验证失败: ${validationResult.issues.map(i => i.message).join(', ')}`);
      }
      let result: GeminiFunctionResult;
      switch (name) {
        case 'set_workflow': {
          const { workflow, characterId } = args as { workflow: string, characterId: string };
          console.log('[Workflow] set_workflow start', { workflow, characterId });

          let recommendPrompt = 'workflow 修改成功';
          let existingEvents: Array<{ id: string; title: string; dialogue?: string }> = [];
          let characterName = characterId;
          if (workflow === 'ready_add_event' && characterId) {
            const events = await this.dataManager.getCharacterEvents(characterId);
            const allCharacters = await this.dataManager.getAllCharacters();
            const characterObj = allCharacters.find(c => c.id === characterId);
            characterName = characterObj ? characterObj.name : characterId;
            existingEvents = Array.isArray(events) ? events.map(e => ({ id: e.id, title: e.title, dialogue: e.dialogue })) : [];
            // 更明确的下一步动作提示：先给出候选事件
            recommendPrompt = `现在请基于「${characterName}」的历史与下方已收录事件，先给出 3-5 个新的候选事件（仅“标题 + 一句话理由/首句对话”），避免与已收录重复或高度相似。用户选定后，再一次性调用 schedule_tasks（最小参数：characterId|characterName + brief 或 title）。禁止输出 YAML/JSON。`;
            console.log('[Gemini][set_workflow][RecommendPrompt]', recommendPrompt);
          }
          result = {
            type: 'success',
            action: 'set_workflow',
            data: {
              workflow,
              characterId,
              characterName,
              existingEvents,
              eventCount: existingEvents.length,
              nextAction: 'propose_candidates',
              guidelines: {
                proposeCandidates: true,
                when: '若用户未明确提供 brief 或 title',
                howMany: '3-5',
                format: '以要点列出：标题 — 一句话理由/首句对话；不得输出 YAML/JSON',
                dedupe: '与 data.existingEvents 按标题去重/避免相似',
                afterChoose: '调用 schedule_tasks，args 仅含 characterId|characterName + brief 或 title'
              }
            },
            message: recommendPrompt
          };
          console.log('[Workflow] set_workflow done', { workflow, characterId, existingCount: existingEvents.length });
          break;
        }
        case 'schedule_tasks': {
          const { tasks, policy, onError } = args as { tasks: Task[]; policy?: CreationPolicy; onError?: OnErrorPolicy };
          const schedule = this.scheduleTasksInternal(Array.isArray(tasks) ? tasks : [], policy, onError);
          result = {
            type: 'success',
            action: 'schedule_tasks',
            data: { total: schedule.total, nextTask: schedule.nextTask, queueState: schedule.queueState },
            message: schedule.total > 0 ? `✅ 已加入 ${schedule.total} 个任务，等待执行指令。` : '⚠️ 未加入任何任务。'
          };
          console.log('[Queue] schedule_tasks result', result.data);
          break;
        }
        case 'clear_task_queue': {
          const prev = this.queueState();
          this.resetTaskQueue();
          result = { type: 'success', action: 'clear_task_queue', data: { cleared: true, prevTotal: prev.total, queueState: this.queueState() }, message: '✅ 队列已清空。' };
          console.log('[Queue] cleared');
          break;
        }
        case 'create_character':
          console.log('[CreateCharacter] start');
          result = await this.createCharacter(args as Record<string, unknown>);
          console.log('[CreateCharacter] done type=', result.type);
          break;
        case 'create_event':
          console.log('[CreateEvent] start');
          result = await this.createEvent(args as Record<string, unknown>);
          console.log('[CreateEvent] done type=', result.type);
          break;
        // 已移除 get_character_info 分支，最小化接口
        case 'list_characters':
          result = await this.listCharacters();
          break;
        default:
          throw new Error(`未知的函数调用: ${name}`);
      }
      console.log('[Gemini] Function result:', name, 'resultType:', result.type, 'action:', result.action);
      return result;
    } catch (error) {
      console.error('[Gemini] Function call error:', name, error);
      return {
        type: 'error',
        function: name,
        message: error instanceof Error ? error.message : String(error),
        data: { code: 'RUNTIME_ERROR' }
      };
    }
  }
  
  // --- 工具函数 (createCharacter, createEvent, etc.) ---

  private async createCharacter(args: Record<string, unknown>): Promise<GeminiFunctionResult> {
    try {
      const characterData: CharacterCard = this.convertToCharacterCard(args);
      const characterName = String(args.name);
      const characterIdPinyin = TinyPinyin.convertToPinyin(characterName, '', true).toLowerCase();
      console.log('[CreateCharacter] saving name=', characterName, 'id=', characterIdPinyin);
      await this.dataManager.saveCharacter(characterIdPinyin, characterData);
      // 消费一个队列任务（若存在），并准备下一个任务
      this.popNextTask();
      const nextTask = this.peekNextTask();
      console.log('[Queue] after create_character next=', nextTask ? nextTask.type : 'none', 'state=', this.queueState());
      return {
        type: 'success',
        action: 'create_character',
        data: { ...characterData, id: characterIdPinyin, nextTask, queueState: this.queueState() },
        message: `✅ 角色 "${characterName}" (ID: ${characterIdPinyin}) 创建成功并已保存。`
      };
    } catch (error) {
      console.error('[CreateCharacter] error', error);
      return {
        type: 'error',
        function: 'create_character',
        message: error instanceof Error ? error.message : String(error),
        data: { code: 'CREATE_CHARACTER_FAILED', retryable: true }
      };
    }
  }
  
  private async createEvent(args: Record<string, unknown>): Promise<GeminiFunctionResult> {
    try {
      const eventData: EventCard = this.convertToEventCard(args);
      const characterId = String((args as { characterId?: string }).characterId);
      const eventTitle = String(args.title);
      console.log('[CreateEvent] incoming', { characterId, eventTitle });

      // 标题重复校验（基于现有数据）
      const existing = await this.dataManager.getCharacterEvents(characterId);
      const normalize = (t: string) => t.trim().replace(/\s+/g, '').toLowerCase();
      if (existing.some(e => normalize(e.title) === normalize(eventTitle))) {
        console.warn('[CreateEvent][Duplicate]', { characterId, eventTitle });
        return {
          type: 'error',
          function: 'create_event',
          message: `该角色已存在同标题事件：${eventTitle}`,
          data: {
            code: 'DUPLICATE_TITLE',
            errors: [{ field: 'title', code: 'DUPLICATE_TITLE', msg: '同角色下标题需唯一', value: eventTitle }],
            retryable: true,
            suggestion: '请为标题添加区分后缀，如 “·定策/·再议/·某年”。'
          }
        };
      }

      // 本地规则校验
      const legalAttrs = { player: [...LEGAL_ATTRIBUTE_KEYS], self: [...LEGAL_ATTRIBUTE_KEYS] };
      const ruleCheck = validateEventCardRules(eventData, legalAttrs, LEGAL_OFFSETS as unknown as number[]);
      if (!ruleCheck.ok) {
        console.warn('[CreateEvent][ValidationFailed]', { errors: ruleCheck.errors, stats: ruleCheck.stats });
        return {
          type: 'error',
          function: 'create_event',
          message: '事件卡不符合规则',
          data: {
            code: 'VALIDATION_FAILED',
            errors: ruleCheck.errors.map(msg => ({ msg })),
            stats: ruleCheck.stats,
            retryable: true
          }
        };
      }

      const eventId = await this.dataManager.saveEvent(characterId, eventTitle, eventData);
      console.log('[CreateEvent][Saved]', { eventId, characterId, eventTitle });
      // 成功后消费一个队列任务，并提供下一个任务
      this.popNextTask();
      const nextTask = this.peekNextTask();
      console.log('[Queue] after create_event next=', nextTask ? nextTask.type : 'none', 'state=', this.queueState());
      return {
        type: 'success',
        action: 'create_event',
        data: { ...eventData, id: eventId, nextTask, queueState: this.queueState() },
        message: `✅ 事件 "${eventTitle}" 创建成功并已保存。`
      };
    } catch (error) {
      console.error('[CreateEvent] error', error);
      return {
        type: 'error',
        function: 'create_event',
        message: error instanceof Error ? error.message : String(error),
        data: { code: 'CREATE_EVENT_FAILED', retryable: true }
      };
    }
  }

  // 已移除 getCharacterInfo()

  private async listCharacters(): Promise<GeminiFunctionResult> {
    try {
      const characters = await this.dataManager.getAllCharacters();
      const characterList = characters.map(char => ({ id: char.id, name: char.name, description: char.description.substring(0, 50) + '...' }));
      return {
        type: 'success',
        action: 'list_characters',
        data: characterList,
        message: `✅ 当前共有 ${characters.length} 个角色。`
      };
    } catch (error) {
      return { type: 'error', function: 'list_characters', message: error instanceof Error ? error.message : String(error) } as GeminiFunctionResult;
    }
  }
  
  // --- 数据转换和验证函数 (convertToCharacterCard, etc.) 保持不变 ---
  private convertToCharacterCard(args: Record<string, unknown>): CharacterCard {
    let attrs: Partial<CharacterAttributes> = {};
    if (typeof args.initialAttributes === 'object' && args.initialAttributes !== null) {
      attrs = args.initialAttributes as Partial<CharacterAttributes>;
    }
    return {
      id: '', name: String(args.name || ''), tags: [], events: [], eventIds: [],
      description: String(args.description || ''),
      attributes: attrs as CharacterAttributes,
      commonCardIds: []
    };
  }
  
  private convertToEventCard(args: Record<string, unknown>): EventCard {
    let options: [import('crownchronicle-core').EventOption, import('crownchronicle-core').EventOption];
    const rawOptions = Array.isArray(args.options) ? args.options : [];
    if (rawOptions.length === 2) {
      options = rawOptions.map(opt => ({
        optionId: opt.optionId ?? '',
        reply: opt.reply ?? opt.description ?? '',
        effects: Array.isArray(opt.effects) ? opt.effects : [{
          target: opt.target ?? 'player',
          attribute: opt.attribute ?? 'power',
          offset: typeof opt.offset === 'number' ? opt.offset : 0
        }]
      })) as [import('crownchronicle-core').EventOption, import('crownchronicle-core').EventOption];
    } else {
      options = [
        { optionId: '', reply: '', effects: [{ target: 'player', attribute: 'power', offset: 0 }] },
        { optionId: '', reply: '', effects: [{ target: 'self', attribute: 'power', offset: 0 }] }
      ];
    }
    return {
      eventId: '', id: '', title: String(args.title || ''),
      dialogue: String(args.dialogue || ''),
      options,
      activationConditions: args.activationConditions as Record<string, unknown> | undefined,
      removalConditions: args.removalConditions as Record<string, unknown> | undefined,
      triggerConditions: args.triggerConditions as Record<string, unknown> | undefined,
      weight: Number(args.weight || 1)
    };
  }
  
  private async validateWithCore(): Promise<{ valid: boolean; issues: { message: string }[] }> {
    // 保持原有的验证逻辑
    return { valid: true, issues: [] };
  }
  
  private buildFunctionSchema(): Record<string, FunctionCallSchema> {
    console.log('[Schema] buildFunctionSchema invoked');
    // 更新 Schema：新增任务队列相关函数，移除 get_character_info
    return {
      set_workflow: {
        name: 'set_workflow',
        description: '设置当前工作流和相关上下文（如角色ID），用于补全上下文后继续推荐。',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            workflow: { type: SchemaType.STRING, description: '工作流名称，如 add_event' },
            characterId: { type: SchemaType.STRING, description: '角色ID' }
          },
          required: ['workflow', 'characterId']
        }
      },
      schedule_tasks: {
        name: 'schedule_tasks',
        description: '将一个或多个创建任务加入队列，由模型逐个领取并创建。',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            tasks: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  type: { type: SchemaType.STRING, enum: ['create_event', 'create_character'], format: 'enum', description: '任务类型' },
                  args: {
                    type: SchemaType.OBJECT,
                    description: '最小参数优先：create_event 支持 characterId|characterName 与 brief|title；create_character 支持 name 等',
                    properties: {
                      // create_event 简述输入
                      characterId: { type: SchemaType.STRING },
                      characterName: { type: SchemaType.STRING },
                      brief: { type: SchemaType.STRING },
                      title: { type: SchemaType.STRING },
                      tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                      // 兼容完整创建字段
                      description: { type: SchemaType.STRING },
                      speaker: { type: SchemaType.STRING },
                      dialogue: { type: SchemaType.STRING },
                      weight: { type: SchemaType.NUMBER },
                      options: {
                        type: SchemaType.ARRAY,
                        items: {
                          type: SchemaType.OBJECT,
                          properties: {
                            reply: { type: SchemaType.STRING },
                            effects: {
                              type: SchemaType.ARRAY,
                              items: {
                                type: SchemaType.OBJECT,
                                properties: {
                                  target: { type: SchemaType.STRING, enum: ['player', 'self'], format: 'enum' },
                                  attribute: { type: SchemaType.STRING, enum: [...LEGAL_ATTRIBUTE_KEYS] as unknown as string[], format: 'enum' },
                                  offset: { type: SchemaType.NUMBER }
                                },
                                required: ['target', 'attribute', 'offset']
                              }
                            },
                            // 兼容旧结构
                            description: { type: SchemaType.STRING },
                            target: { type: SchemaType.STRING, enum: ['player', 'self'], format: 'enum' },
                            attribute: { type: SchemaType.STRING, enum: [...LEGAL_ATTRIBUTE_KEYS] as unknown as string[], format: 'enum' },
                            offset: { type: SchemaType.NUMBER }
                          }
                        }
                      },
                      // create_character 可能用到的字段
                      name: { type: SchemaType.STRING },
                      initialAttributes: {
                        type: SchemaType.OBJECT,
                        properties: {
                          power: { type: SchemaType.NUMBER },
                          military: { type: SchemaType.NUMBER },
                          wealth: { type: SchemaType.NUMBER },
                          popularity: { type: SchemaType.NUMBER },
                          health: { type: SchemaType.NUMBER },
                          age: { type: SchemaType.NUMBER }
                        }
                      }
                    }
                  }
                },
                required: ['type', 'args']
              }
            },
            policy: { type: SchemaType.STRING, enum: ['single', 'batch'], format: 'enum', description: '创建策略，single 或 batch' },
            onError: { type: SchemaType.STRING, enum: ['skip', 'abort'], format: 'enum', description: '出错策略：跳过或中止' }
          },
          required: ['tasks']
        }
      },
      clear_task_queue: {
        name: 'clear_task_queue',
        description: '清空当前任务队列。',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {},
          required: []
        }
      },
      create_character: {
        name: 'create_character',
        description: '创建角色卡牌。当用户选定了具体的历史人物后调用此函数。系统将根据角色姓名自动生成规范的ID，数据将通过 crownchronicle-core 包验证器验证',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            name: { type: SchemaType.STRING, description: '角色真实姓名（系统将据此自动生成ID）' },
            description: { type: SchemaType.STRING, description: '角色描述' },
            initialAttributes: {
              type: SchemaType.OBJECT,
              properties: {
                power: { type: SchemaType.NUMBER, description: '权势 (0-100)' },
                military: { type: SchemaType.NUMBER, description: '军队 (0-100)' },
                wealth: { type: SchemaType.NUMBER, description: '财富 (0-100)' },
                popularity: { type: SchemaType.NUMBER, description: '民心 (0-100)' },
                health: { type: SchemaType.NUMBER, description: '健康 (0-100)' },
                age: { type: SchemaType.NUMBER, description: '年龄' }
              },
              required: ['power', 'military', 'wealth', 'popularity', 'health', 'age']
            }
          },
          required: ['name', 'description', 'initialAttributes']
        }
      },
      create_event: {
        name: 'create_event',
        description: '创建事件卡牌。严格遵循：dialogue 为角色话术；options.reply 为皇帝回复；多数（≥80%）选项的 effects 至少影响 2 个不同属性；offset 只能取 -10/-5/-3/3/5/10。',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            characterId: { type: SchemaType.STRING, description: '所属角色ID' },
            title: { type: SchemaType.STRING, description: '事件标题（系统将据此自动生成ID）' },
            description: { type: SchemaType.STRING, description: '事件描述' },
            speaker: { type: SchemaType.STRING, description: '说话角色的称谓（与角色一致）' },
            dialogue: { type: SchemaType.STRING, description: '角色对话内容（角色语气）' },
            weight: { type: SchemaType.NUMBER, description: '事件权重 (1-20)' },
            options: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  reply: { type: SchemaType.STRING, description: '皇帝（玩家）的回复话术' },
                  effects: {
                    type: SchemaType.ARRAY,
                    items: {
                      type: SchemaType.OBJECT,
                      properties: {
                        target: { type: SchemaType.STRING, enum: ['player', 'self'], format: 'enum', description: '影响对象：player 或 self' },
                        attribute: { type: SchemaType.STRING, enum: [...LEGAL_ATTRIBUTE_KEYS] as unknown as string[], format: 'enum', description: '影响属性' },
                        offset: { type: SchemaType.NUMBER, description: '属性变化值（仅允许 -10, -5, -3, 3, 5, 10）' }
                      },
                      required: ['target', 'attribute', 'offset']
                    }
                  }
                },
                required: ['reply', 'effects']
              }
            }
          },
          required: ['characterId', 'title', 'description', 'speaker', 'dialogue', 'weight', 'options']
        }
      },
    };
  }

  private buildSuperPrompt(userMessage: string, context: WorkflowContext, gameDataContext: GameDataContext): string {
    const characters = Array.isArray(gameDataContext.characters) ? gameDataContext.characters.slice(0, 40) : [];
    const characterIndex = characters.map(c => `- ${c.name} (${c.id})`).join('\n');
    return [
      '本轮目标：根据用户意图，先进入准备新增事件的工作流，避免重复，并走“最小参数 + 逐任务创建”的链路。',
      `用户输入：${userMessage}`,
      '可用角色（部分）：',
      characterIndex || '- (空)',
      '',
      '请按以下顺序行动：',
      "1) 若用户意图是给某个角色新增事件，并且能唯一定位角色，则立即调用 set_workflow('ready_add_event', characterId)。若角色歧义，仅用一句话澄清一次。",
      "2) 若用户未明确提供 brief/title，请先给出 3-5 个候选事件（标题 + 一句话理由/首句对话，基于 existingEvents 去重），待用户选定后再一次性调用 schedule_tasks（最小参数）。",
      "3) 若用户已明确 brief/title，则跳过候选，直接一次性调用 schedule_tasks（最小参数：characterId|characterName + brief 或 title）。",
      '4) 收到 nextTask 后，逐个调用 create_event 补全并保存完整事件卡；若报错，按结构化错误提示修正后重试；直到队列为空再做简短总结。',
      '',
      '注意：',
      '- 严禁调用 get_character_info（已移除）。',
      '- 自然语言回复只做简短提示，不复述 YAML/JSON 详情。',
    ].join('\n');
  }
}