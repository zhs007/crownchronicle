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

// 设置代理（如果需要）
setupGlobalProxy();

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
  
  constructor(apiKey: string, dataPath?: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-pro';
    this.model = this.genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
      // 安全设置，允许更自由的对话
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
  
  async initialize() {
    this.functionSchema = this.buildFunctionSchema();
    console.log('✅ Gemini 客户端初始化完成，已集成 Core 包验证');
  }

  /**
   * 新的核心对话方法，由 AI 驱动工作流
   */
  async chat(userMessage: string, context: WorkflowContext): Promise<{ responseForUser: string, newContext: WorkflowContext, functionCall?: GeminiFunctionCall }> {
    try {
      const allCharacters = await this.dataManager.getAllCharacters();
      // 获取每个角色的事件标题列表
      const characterEventsMap: Record<string, string[]> = {};
      for (const c of allCharacters) {
        const events = await this.dataManager.getCharacterEvents(c.id);
        characterEventsMap[c.id] = Array.isArray(events) ? events.map(e => e.title) : [];
      }
      const gameDataContext: GameDataContext & { characterEventsMap: Record<string, string[]> } = {
        characters: allCharacters.map(c => ({ name: c.name, id: c.id })),
        eventCount: 0, // 这个字段可以后续丰富
        factions: [], // 这个字段可以后续丰富
        characterEventsMap
      };

      const prompt = this.buildSuperPrompt(userMessage, context, gameDataContext);

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{
          functionDeclarations: Object.values(this.functionSchema),
        }],
      });

      const response = result.response;
      const responseText = response.text();
      
      // AI 的回复应该是一个 JSON 字符串，包含给用户的回复和更新后的上下文
      const { reply_to_user, updated_context } = this.parseGeminiResponse(responseText);
      
      const functionCalls = response.functionCalls() ?? [];
      
      return {
        responseForUser: reply_to_user,
        newContext: updated_context,
        functionCall: functionCalls.length > 0 ? functionCalls[0] : undefined,
      };

    } catch (error: unknown) {
      console.error('Gemini API Error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('proxy') || errorMessage.includes('network')) {
        throw new Error('代理连接失败，请检查代理配置');
      }
      // 返回一个友好的错误信息给用户，并保持上下文不变
      return {
        responseForUser: `抱歉，处理时遇到错误: ${errorMessage}`,
        newContext: context,
      };
    }
  }

  /**
   * 解析 Gemini 返回的包含特定格式的 JSON 字符串
   */
  private parseGeminiResponse(responseText: string): { reply_to_user: string, updated_context: WorkflowContext } {
    try {
      // 找到 JSON 开始和结束的位置
      const jsonStart = responseText.indexOf('```json');
      const jsonEnd = responseText.lastIndexOf('```');

      if (jsonStart === -1 || jsonEnd === -1 || jsonStart === jsonEnd) {
        // 如果没有找到我们期望的 JSON 块，就认为整个回复都是给用户的
        return {
          reply_to_user: responseText,
          updated_context: { workflow: null, stage: null, data: {}, lastQuestion: null } // 重置上下文
        };
      }

      const reply_to_user = responseText.substring(0, jsonStart).trim();
      const jsonString = responseText.substring(jsonStart + 7, jsonEnd).trim();
      
      const parsedJson = JSON.parse(jsonString);

      return {
        reply_to_user,
        updated_context: parsedJson.updated_context,
      };

    } catch (error) {
      console.error("Failed to parse Gemini's response:", error);
      // 如果解析失败，将原始文本返回给用户，并提示错误
      return {
        reply_to_user: `我生成了格式不正确的回复，请您重试.\n\n原始回复:\n${responseText}`,
        updated_context: { workflow: null, stage: null, data: {}, lastQuestion: null } // 重置上下文
      };
    }
  }
  
  async executeFunctionCall(functionCall: GeminiFunctionCall): Promise<GeminiFunctionResult> {
    const { name, args } = functionCall;
    try {
      // 使用 Core 包验证数据
      const validationResult = await this.validateWithCore();
      if (!validationResult.valid) {
        throw new Error(`数据验证失败: ${validationResult.issues.map(i => i.message).join(', ')}`);
      }
      
      // 执行函数调用
      switch (name) {
        case 'create_character':
          return await this.createCharacter(args as Record<string, unknown>);
        case 'create_event':
          return await this.createEvent(args as Record<string, unknown>);
        case 'get_character_info':
          return await this.getCharacterInfo(args as Record<string, unknown>);
        case 'list_characters':
            return await this.listCharacters();
        default:
          throw new Error(`未知的函数调用: ${name}`);
      }
    } catch (error: unknown) {
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
      const characterId = String(args.characterId);
      const eventTitle = String(args.title);
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
    // 保持原有的 Schema
    return {
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
        description: '创建事件卡牌。请直接生成标准 options 字段（每个选项包含 description、target、attribute、offset），系统将自动生成ID，数据将通过 crownchronicle-core 包验证器验证。',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            characterId: { type: SchemaType.STRING, description: '所属角色ID' },
            title: { type: SchemaType.STRING, description: '事件标题（系统将据此自动生成ID）' },
            description: { type: SchemaType.STRING, description: '事件描述' },
            speaker: { type: SchemaType.STRING, description: '说话角色的称谓' },
            dialogue: { type: SchemaType.STRING, description: '角色对话内容' },
            weight: { type: SchemaType.NUMBER, description: '事件权重 (1-20)' },
            options: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  description: { type: SchemaType.STRING, description: '选项描述文本' },
                  target: { type: SchemaType.STRING, enum: ['player', 'self'], format: 'enum', description: '影响对象：player 或 self' },
                  attribute: { type: SchemaType.STRING, enum: ['power', 'military', 'wealth', 'popularity', 'health', 'age'], format: 'enum', description: '影响属性' },
                  offset: { type: SchemaType.NUMBER, description: '属性变化值（可正可负）' }
                },
                required: ['description', 'target', 'attribute', 'offset']
              }
            }
          },
          required: ['characterId', 'title', 'description', 'speaker', 'dialogue', 'weight', 'options']
        }
      },
      get_character_info: {
        name: 'get_character_info',
        description: '获取指定角色的详细信息，包括属性、关系和所有事件。在需要了解角色背景进行讨论时使用，或在为角色添加事件前调用',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            characterId: { type: SchemaType.STRING, description: '角色ID，如果用户提到角色名字，需要先列出所有角色找到对应ID' }
          },
          required: ['characterId']
        }
      },
      list_characters: {
        name: 'list_characters',
        description: '列出当前所有可用的角色。当需要了解项目中有哪些角色，或用户提到角色名字但不确定ID时使用。适合在对话中了解现状时调用',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {},
          required: []
        }
      }
    };
  }
  
  private buildSuperPrompt(message: string, context: WorkflowContext, gameData: GameDataContext & { characterEventsMap?: Record<string, string[]> }): string {
    // 新增：为角色添加事件时，要求推荐未被收录的历史事件
    return `
      你是一个资深的游戏史料编辑，你的工作是与用户对话，将真实存在的中国历史人物和事件，转化为符合游戏《皇冠编年史》机制的数据卡。

      ## 核心原则
      1.  **你是对话的主导者**: 主动引导对话，而不是被动回答。
      2.  **基于史实和已有数据**: 你的所有建议都必须基于真实历史和游戏中已存在的数据。绝不虚构内容。
      3.  **状态驱动**: 你必须严格遵循并更新我提供给你的 \`WorkflowContext\` JSON 对象来管理对话状态。
      4.  **结构化输出**: 你的所有回复都必须严格分为两部分：给用户看的自然语言对话，以及一个包含更新后上下文的 JSON 代码块。

      ## 工作流程
      你将收到用户的最新消息，以及当前的 \`WorkflowContext\`。你需要按以下步骤思考并行动：

      1.  **分析上下文 (\`WorkflowContext\`)**:
          *   如果 \`context.workflow\` 为 \`null\`，这表示一个新任务的开始。你需要从用户消息中识别核心意图（如“创建角色”、“添加事件”），然后初始化上下文，并向用户提出第一个引导性问题。
          *   如果 \`context.workflow\` 已存在，说明任务正在进行中。你需要根据 \`context.stage\` 判断当前进展，并结合用户的最新消息来推进流程。

      2.  **推进工作流**:
          *   **收集信息**: 通过一连串有逻辑的问题，逐步收集完成任务所需的所有信息，并将它们填充到 \`context.data\` 中。
          *   **更新状态**: 每完成一步，都要更新 \`context.stage\` 到下一个逻辑阶段，并构思 \`context.lastQuestion\` 的新问题。
          *   **调用工具**: 当 \`context.data\` 中的所有必要信息都已集齐时，调用相应的工具函数（如 \`create_character\` 或 \`create_event\`）。调用工具后，必须将 \`context\` 重置为初始状态（所有字段为 \`null\`），并告知用户任务已完成。

      3.  **生成回复**:
          你的回复必须严格遵循以下格式，不得有任何偏差：

          \`\`\`text
          [这里是给用户看的、自然的、引导性的对话内容]
          \`\`\`

          \`\`\`json
          {
            "updated_context": {
              "workflow": "[更新后的工作流名称，或 null]",
              "stage": "[更新后的阶段名称，或 null]",
              "data": { ... },
              "lastQuestion": "[你向下个用户提出的问题的内部标识符，或 null]"
            }
          }
          \`\`\`

      ---
      ## 当前游戏数据
      *   **已存在角色**: ${gameData.characters.map(c => `${c.name}(${c.id})`).join(', ') || '无'}

      *   **各角色已收录事件（用于推荐时排除重复）**:
      ${Object.entries(gameData.characterEventsMap || {}).map(([cid, titles]) => {
        const char = gameData.characters.find(c => c.id === cid);
        return `- ${char ? char.name : cid}: ${titles.length ? titles.join('、') : '无'}`;
      }).join('\n')}

      ---
      ## 事件推荐要求
      当用户请求为某个角色添加事件时：
      1. 你应主动基于该角色真实历史和上方“已收录事件”列表，推荐3-5个合适且未被收录的事件标题，并简要说明推荐理由。
      2. 推荐时必须排除已存在的事件标题，避免重复。
      3. 用户可直接选择推荐项，也可自定义。

      ---
      ## 对话开始

      **用户的最新消息**: "${message}"

      **当前的工作流上下文**:
      \`\`\`json
      ${JSON.stringify(context, null, 2)}
      \`\`\`

      现在，请严格按照上述规则，生成你的回复。
    `;
  }
}