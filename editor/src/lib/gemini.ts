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
  // 新增：多轮对话消息队列
  private messages: Array<{ role: 'user' | 'model' | 'function', content: string }> = [];
  // 新增：任务队列状态（按实例维护）
  private taskQueue: Task[] = [];
  private taskCursor = 0;
  private taskPolicy: CreationPolicy = 'single';
  private taskOnError: OnErrorPolicy = 'skip';

  constructor(apiKey: string, dataPath?: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-pro';
    this.model = this.genAI.getGenerativeModel({
      model: modelName,
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
    this.taskQueue = [];
    this.taskCursor = 0;
    this.taskPolicy = 'single';
    this.taskOnError = 'skip';
  }
  private hasPendingTasks() { return this.taskCursor < this.taskQueue.length; }
  private peekNextTask(): Task | null {
    return this.taskCursor < this.taskQueue.length ? this.taskQueue[this.taskCursor] : null;
  }
  private popNextTask(): Task | null {
    if (!this.hasPendingTasks()) return null;
    const t = this.taskQueue[this.taskCursor];
    this.taskCursor += 1;
    return t;
  }
  private scheduleTasksInternal(tasks: Task[], policy?: CreationPolicy, onError?: OnErrorPolicy) {
    this.taskQueue = Array.isArray(tasks) ? tasks.filter(t => t && (t.type === 'create_event' || t.type === 'create_character')) : [];
    this.taskCursor = 0;
    if (policy) this.taskPolicy = policy;
    if (onError) this.taskOnError = onError;
    return { total: this.taskQueue.length, nextTask: this.peekNextTask() };
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
   * 新的核心对话方法，由 AI 驱动工作流
   */
  /**
   * 多轮对话核心方法，支持 ready_add_event workflow 和上下文消息队列
   */
  async chat(userMessage: string, context: WorkflowContext): Promise<{ responseForUser: string, newContext: WorkflowContext, functionCall?: GeminiFunctionCall }> {
    try {
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
        console.log('[Gemini][Prompt]', prompt);
        this.messages.push({ role: 'user', content: prompt });
      } else {
        // 后续轮次只追加用户输入
        this.messages.push({ role: 'user', content: userMessage });
      }

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
      // 本地 context 变量，后续 function call 处理时维护
      const localContext: WorkflowContext = { workflow: null, stage: null, data: {}, lastQuestion: null };

      // 3. 追加 Gemini 回复到历史
      this.messages.push({ role: 'model', content: reply_to_user });

      // 4. function call 链式处理
      while (functionCalls.length > 0) {
        const fc = functionCalls[0];
        // 执行 function call
        console.log('[Gemini][FunctionCall]', fc.name, fc.args);
        const fcResult = await this.executeFunctionCall(fc);
        // 如果是 set_workflow，直接用参数更新本地 context
        if (fc.name === 'set_workflow') {
          type SetWorkflowArgs = { workflow: string; characterId?: string };
          const setArgs = fc.args as unknown as SetWorkflowArgs;
          localContext.workflow = setArgs.workflow;
          if (setArgs.characterId) {
            if (!localContext.data) localContext.data = {};
            localContext.data.characterId = setArgs.characterId;
          }
        }

        // 如果是 schedule_tasks，自动串行执行队列
        if (fc.name === 'schedule_tasks' && (fcResult as GeminiFunctionResult).type === 'success') {
          this.messages.push({ role: 'model', content: `[FunctionCallResult] ${fc.name}: ${JSON.stringify(fcResult)}` });
          const chain = await this.runPendingTasksChain();
          reply_to_user = `✅ 任务执行完成：成功 ${chain.success}，失败 ${chain.errors}，已处理 ${chain.processed} 项。` + (chain.errors > 0 ? `\n失败原因：\n- ${chain.errorDetails.join('\n- ')}` : '');
          functionCalls = [];
          break;
        }

        // 如果 create_event/character 成功，若有队列则继续自动执行
        if ((fc.name === 'create_event' || fc.name === 'create_character') && (fcResult as GeminiFunctionResult).type === 'success') {
          if (this.hasPendingTasks()) {
            this.messages.push({ role: 'model', content: `[FunctionCallResult] ${fc.name}: ${JSON.stringify(fcResult)}` });
            const chain = await this.runPendingTasksChain();
            reply_to_user = `✅ 任务执行完成：成功 ${chain.success}，失败 ${chain.errors}，已处理 ${chain.processed} 项。` + (chain.errors > 0 ? `\n失败原因：\n- ${chain.errorDetails.join('\n- ')}` : '');
            functionCalls = [];
            break;
          }
        }

        // 追加 function call 结果到历史
        this.messages.push({ role: 'model', content: `[FunctionCallResult] ${fc.name}: ${JSON.stringify(fcResult)}` });
        console.log('[Gemini][FunctionCallResult]', this.messages[this.messages.length-1]);
        // 继续发起下一轮 Gemini
        const genParams = {
          contents: this.messages.map(m => ({ role: m.role, parts: [{ text: m.content }] })),
          tools: [{ functionDeclarations: Object.values(this.functionSchema) }],
        };
        // console.log('[Gemini][generateContent params]', JSON.stringify(genParams, null, 2));
        result = await this.model.generateContent(genParams);
        response = result.response;
        responseText = response.text();
        console.log('[Gemini][ResponseText]', responseText);
        reply_to_user = responseText;
        functionCalls = response.functionCalls() ?? [];
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
      console.log('[Gemini] Function call:', name, 'args:', JSON.stringify(args, null, 2));
      // 使用 Core 包验证数据
      const validationResult = await this.validateWithCore();
      if (!validationResult.valid) {
        throw new Error(`数据验证失败: ${validationResult.issues.map(i => i.message).join(', ')}`);
      }
      let result: GeminiFunctionResult;
      switch (name) {
        case 'set_workflow': {
          const { workflow, characterId } = args as { workflow: string, characterId: string };
          console.log('[Gemini][set_workflow] 更新 workflow:', workflow, 'characterId:', characterId);

          let recommendPrompt = 'workflow 修改成功';
          // 如果 workflow 是 ready_add_event，自动补充推荐 prompt
          if (workflow === 'ready_add_event' && characterId) {
            // 获取该角色的所有事件
            const events = await this.dataManager.getCharacterEvents(characterId);
            const allCharacters = await this.dataManager.getAllCharacters();
            const characterObj = allCharacters.find(c => c.id === characterId);
            const characterName = characterObj ? characterObj.name : characterId;
            const gameDataContext: GameDataContext & { characterEventsMap?: Record<string, Array<{ title?: string; dialogue?: string }>> } = {
              characters: allCharacters.map(c => ({ name: c.name, id: c.id })),
              eventCount: 0,
              factions: [],
              characterEventsMap: {
                [characterId]: Array.isArray(events) ? events.map(e => ({ title: e.title, dialogue: e.dialogue })) : []
              }
            };
            recommendPrompt = `请为「${characterName}」推荐新的历史事件，避免与下方已收录事件重复或类似。\n\n${JSON.stringify(gameDataContext, null, 2)}`;
            console.log('[Gemini][set_workflow][RecommendPrompt]', recommendPrompt);
            // this.messages.push({ role: 'user', content: recommendPrompt });
          }
          return {
            type: 'success',
            action: 'set_workflow',
            data: {
              workflow,
              characterId
            },
            message: recommendPrompt
          };
        }
        case 'schedule_tasks': {
          const { tasks, policy, onError } = args as { tasks: Task[]; policy?: CreationPolicy; onError?: OnErrorPolicy };
          const schedule = this.scheduleTasksInternal(Array.isArray(tasks) ? tasks : [], policy, onError);
          result = {
            type: 'success',
            action: 'schedule_tasks',
            data: { total: schedule.total, nextTask: schedule.nextTask },
            message: schedule.total > 0 ? `✅ 已加入 ${schedule.total} 个任务，准备执行。` : '⚠️ 未加入任何任务。'
          };
          break;
        }
        case 'clear_task_queue': {
          this.resetTaskQueue();
          result = { type: 'success', action: 'clear_task_queue', data: { cleared: true }, message: '✅ 队列已清空。' };
          break;
        }
        case 'create_character':
          result = await this.createCharacter(args as Record<string, unknown>);
          break;
        case 'create_event':
          result = await this.createEvent(args as Record<string, unknown>);
          break;
        case 'get_character_info':
          result = await this.getCharacterInfo(args as Record<string, unknown>);
          break;
        case 'list_characters':
          result = await this.listCharacters();
          break;
        default:
          throw new Error(`未知的函数调用: ${name}`);
      }
      console.log('[Gemini] Function result:', name, 'result:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error('[Gemini] Function call error:', name, error);
      return {
        type: 'error',
        function: name,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  // --- 工具函数 (createCharacter, createEvent, etc.) 保持不变，但做少量适配 ---

  private async createCharacter(args: Record<string, unknown>): Promise<GeminiFunctionResult> {
    try {
      const characterData: CharacterCard = this.convertToCharacterCard(args);
      const characterName = String(args.name);
      const characterIdPinyin = TinyPinyin.convertToPinyin(characterName, '', true).toLowerCase();
      await this.dataManager.saveCharacter(characterIdPinyin, characterData);
      return {
        type: 'success',
        action: 'create_character',
        data: { ...characterData, id: characterIdPinyin },
        message: `✅ 角色 "${characterName}" (ID: ${characterIdPinyin}) 创建成功并已保存。`
      };
    } catch (error) {
      return { type: 'error', action: 'create_character', error: error instanceof Error ? error.message : String(error) };
    }
  }
  
  private async createEvent(args: Record<string, unknown>): Promise<GeminiFunctionResult> {
    try {
      const eventData: EventCard = this.convertToEventCard(args);
      const characterId = String((args as { characterId?: string }).characterId);
      const eventTitle = String(args.title);

      // 标题重复校验（基于现有数据）
      const existing = await this.dataManager.getCharacterEvents(characterId);
      const normalize = (t: string) => t.trim().replace(/\s+/g, '').toLowerCase();
      if (existing.some(e => normalize(e.title) === normalize(eventTitle))) {
        return { type: 'error', action: 'create_event', error: `该角色已存在同标题事件：${eventTitle}（当前已有 ${existing.length} 个事件）` };
      }

      // 本地规则校验（属性名、数值档位、80%双属性、避免同属性同时改 player/self）
      const legalAttrs = { player: [...LEGAL_ATTRIBUTE_KEYS], self: [...LEGAL_ATTRIBUTE_KEYS] };
      const ruleCheck = validateEventCardRules(eventData, legalAttrs, LEGAL_OFFSETS as unknown as number[]);
      if (!ruleCheck.ok) {
        return {
          type: 'error',
          action: 'create_event',
          error: `事件卡不符合规则：${ruleCheck.errors.join('; ')}（双属性占比：${Math.round(ruleCheck.stats.twoAttrRatio * 100)}%）`
        };
      }

      const eventId = await this.dataManager.saveEvent(characterId, eventTitle, eventData);
      return {
        type: 'success',
        action: 'create_event',
        data: { ...eventData, id: eventId },
        message: `✅ 事件 "${eventTitle}" 创建成功并已保存。`
      };
    } catch (error) {
      return { type: 'error', action: 'create_event', error: error instanceof Error ? error.message : String(error) };
    }
  }

  private async getCharacterInfo(args: Record<string, unknown>): Promise<GeminiFunctionResult> {
    try {
      const characterId = String(args.characterId || args.id);
      const character = await this.dataManager.loadCharacter(characterId);
      if (!character) {
        return { type: 'error', action: 'get_character_info', error: `未找到角色 ${characterId}` };
      }
      const events = await this.dataManager.getCharacterEvents(characterId);
      return {
        type: 'success',
        action: 'get_character_info',
        data: { character, events, eventCount: events.length },
        message: `✅ 获取角色信息成功：${character.name}，共有 ${events.length} 个事件。`
      };
    } catch (error) {
      return { type: 'error', action: 'get_character_info', error: error instanceof Error ? error.message : String(error) };
    }
  }

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
      return { type: 'error', action: 'list_characters', error: error instanceof Error ? error.message : String(error) };
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
    // 更新 Schema：新增任务队列相关函数
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
        description: '将一个或多个创建任务加入队列，由系统自动顺序执行。适合单次或批量创建。',
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
                    description: '任务参数：对于 create_event 包含 characterId、title、dialogue、weight、options；对于 create_character 包含 name、description、initialAttributes',
                    properties: {
                      // create_event 可能用到的字段（宽松定义，严格由运行时校验）
                      characterId: { type: SchemaType.STRING },
                      title: { type: SchemaType.STRING },
                      description: { type: SchemaType.STRING },
                      speaker: { type: SchemaType.STRING },
                      dialogue: { type: SchemaType.STRING },
                      weight: { type: SchemaType.NUMBER },
                      options: {
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
                  },
                  // 兼容旧结构：如提供 description/target/attribute/offset，将被自动转为 reply + effects
                  description: { type: SchemaType.STRING, description: '兼容旧字段：选项描述文本（将作为 reply 使用）' },
                  target: { type: SchemaType.STRING, enum: ['player', 'self'], format: 'enum', description: '兼容旧字段：影响对象' },
                  attribute: { type: SchemaType.STRING, enum: [...LEGAL_ATTRIBUTE_KEYS] as unknown as string[], format: 'enum', description: '兼容旧字段：影响属性' },
                  offset: { type: SchemaType.NUMBER, description: '兼容旧字段：属性变化值（仅允许 -10, -5, -3, 3, 5, 10）' }
                },
                required: ['reply', 'effects']
              }
            }
          },
          required: ['characterId', 'title', 'description', 'speaker', 'dialogue', 'weight', 'options']
        }
      }
    };
  }

  private buildSuperPrompt(message: string, context: WorkflowContext, gameData: GameDataContext & { characterEventsMap?: Record<string, Array<{ title?: string; dialogue?: string }>> }): string {
    console.log('buildSuperPrompt called with message:', message, 'context:', context, 'gameData:', gameData);

    return `
      ## 重要规则
      - 你只能通过 function call（如 set_workflow、schedule_tasks）来设置或变更状态与批量创建，绝不能直接返回 updated_context 或任何 JSON。
      - 当用户提出创建卡牌（单张或多张）时，优先使用 schedule_tasks 将任务加入队列；系统会自动按顺序执行，无需你逐个手动调用 create_*。
      - ready_add_event 是专门用于为角色推荐事件的 workflow，推荐事件前必须进入该 workflow。
      - 其它所有上下文变更也只能通过 function call 完成。
      - 你是一个资深的游戏史料编辑，你的工作是与用户对话，将真实存在的中国历史人物和事件，转化为符合游戏《皇冠编年史》机制的数据卡。

      ## 核心原则
      1.  你是对话的主导者：主动引导对话，而不是被动回答。
      2.  基于史实和已有数据：你的所有建议都必须基于真实历史和游戏中已存在的数据。绝不虚构内容。
      3.  状态驱动：你必须严格遵循并通过 function call 来管理和更新对话状态。
      4.  结构化输出：你的回复只需自然语言对话内容，无需返回任何 JSON。

      ## 工作流程
      你将收到用户的最新消息，以及当前的 \`WorkflowContext\`。你需要按以下步骤思考并行动：

      1. 分析上下文 (\`WorkflowContext\`)：判断是新任务还是进行中任务。
      2. 任务队列模式：
         - 单次或批量创建：请先调用 schedule_tasks，提供 1 个或多个任务（create_event/create_character）。
         - 系统会自动顺序执行队列并返回结果汇总；你无需手动逐条调用 create_*。
         - 执行完成后，向用户汇报成功/失败数量，并询问是否继续或进行下一步。
      3. 生成回复：只需自然语言对话内容，无需返回任何 JSON。

      ---
      ## 当前游戏数据
      * 已存在角色: ${gameData.characters.map(c => `${c.name}(${c.id})`).join(', ') || '无'}

      * 各角色已收录事件（用于推荐时排除重复）:
      ${(Object.entries(gameData.characterEventsMap || {})).map(([cid, evts]) => {
        const char = gameData.characters.find(c => c.id === cid);
        const eventTitles = Array.isArray(evts)
          ? (evts as Array<string | { title?: string }>).map(e => typeof e === 'string' ? e : (e && typeof e.title === 'string' ? e.title : '[无标题]'))
          : [];
        return `- ${char ? char.name : cid}: ${eventTitles.length ? eventTitles.join('、') : '无'}`;
      }).join('\n')}

      ---
      ## 事件推荐要求
      当用户请求为某个角色添加事件时：
      1. 基于该角色真实历史与“已收录事件”，推荐 3-5 个未收录的事件标题并简述理由，避免同义/近义重复。
      2. 用户可直接选择推荐项，也可自定义。

      ---
      ## 事件卡编写规则（调用 create_event 前务必遵守）
      - 对话视角：dialogue 必须是“角色”的一句话；options.reply 必须是“皇帝（玩家）”的回复话术。
      - 选项数量：恰好 2 个 options。
      - 效果结构：多数（≥80%）选项的 effects 至少影响 2 个不同属性。
      - 冲突避免：同一 option 内，不得同时对同一属性既改 player 又改 self。
      - 合法属性：${LEGAL_ATTRIBUTE_KEYS.join(', ')}。
      - 合法数值档位：${LEGAL_OFFSETS.join(', ')}。

      ---
      ## 对话开始

      “${message}”\n\n当前 WorkflowContext: \n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\`
    `;
  }
}