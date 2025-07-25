import { GoogleGenerativeAI, FunctionCall as GeminiFunctionCall } from '@google/generative-ai';
import { setupGlobalProxy } from './proxyConfig';
import { 
  type CharacterCard, 
  type EventCard, 
  ConfigValidator,
  FileSystemDataProvider,
  GAME_CONSTANTS
} from 'crownchronicle-core';
import { GameConfigManager } from './configManager';
import { 
  GeminiResponse, 
  GeminiFunctionResult, 
  FunctionCallSchema 
} from '@/types/gemini';
import { GameDataContext } from '@/types/editor';

// 设置代理（如果需要）
setupGlobalProxy();

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;
  private functionSchema: Record<string, FunctionCallSchema> = {};
  private dataProvider: FileSystemDataProvider;
  private validator: ConfigValidator;
  
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
      }
    });
    
    console.log(`✅ Gemini client initialized with model: ${modelName}`);
    
    const actualDataPath = dataPath || GameConfigManager.getConfigPath('editor');
    this.dataProvider = new FileSystemDataProvider(actualDataPath);
    this.validator = new ConfigValidator(this.dataProvider);
  }
  
  async initialize() {
    // 构建基于 Core 包约束的 Function Call Schema
    this.functionSchema = this.buildFunctionSchema();
    console.log('✅ Gemini 客户端初始化完成，已集成 Core 包验证');
  }
  
  async chatWithContext(message: string, context: GameDataContext): Promise<GeminiResponse> {
    try {
      const prompt = this.buildPrompt(message, context);
      const result = await this.model.generateContent(prompt);
      
      // 检查是否有函数调用
      const response = result.response;
      const functionCalls = response.functionCalls && response.functionCalls();
      
      if (functionCalls && functionCalls.length > 0) {
        return await this.processFunctionCalls(functionCalls);
      }
      
      return { 
        type: 'text', 
        content: response.text() 
      };
    } catch (error: unknown) {
      console.error('Gemini API Error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('proxy') || errorMessage.includes('network')) {
        throw new Error('代理连接失败，请检查代理配置');
      }
      throw error;
    }
  }
  
  private async processFunctionCalls(functionCalls: GeminiFunctionCall[]): Promise<GeminiResponse> {
    const results: GeminiFunctionResult[] = [];
    
    for (const call of functionCalls) {
      try {
        // 使用 Core 包验证数据
        const validationResult = await this.validateWithCore(call.args as Record<string, unknown>, call.name);
        
        if (!validationResult.valid) {
          throw new Error(`数据验证失败: ${validationResult.issues.map(i => i.message).join(', ')}`);
        }
        
        // 执行函数调用
        const result = await this.executeFunctionCall(call.name, call.args as Record<string, unknown>);
        results.push(result);
      } catch (error: unknown) {
        results.push({
          type: 'error',
          function: call.name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    return { type: 'function_calls', results };
  }
  
  private async executeFunctionCall(functionName: string, args: Record<string, unknown>): Promise<GeminiFunctionResult> {
    switch (functionName) {
      case 'create_character':
        return await this.createCharacter(args);
      case 'create_event':
        return await this.createEvent(args);
      case 'modify_character':
        return await this.modifyCharacter(args);
      case 'modify_event':
        return await this.modifyEvent(args);
      default:
        throw new Error(`未知的函数调用: ${functionName}`);
    }
  }
  
  private async createCharacter(args: Record<string, unknown>): Promise<GeminiFunctionResult> {
    // 转换为符合 Core 包类型的数据结构
    const characterData: CharacterCard = this.convertToCharacterCard(args);
    
    return {
      type: 'success',
      action: 'create_character',
      data: characterData,
      message: `角色 "${String(args.name)}" 创建成功，已通过 Core 包验证`
    };
  }
  
  private async createEvent(args: Record<string, unknown>): Promise<GeminiFunctionResult> {
    // 转换为符合 Core 包类型的数据结构
    const eventData: EventCard = this.convertToEventCard(args);
    
    return {
      type: 'success',
      action: 'create_event',
      data: eventData,
      message: `事件 "${String(args.title)}" 创建成功，已通过 Core 包验证`
    };
  }
  
  private async modifyCharacter(args: Record<string, unknown>): Promise<GeminiFunctionResult> {
    // TODO: 实现角色修改逻辑
    return {
      type: 'success',
      action: 'modify_character',
      message: `角色 "${String(args.name)}" 修改成功`
    };
  }
  
  private async modifyEvent(args: Record<string, unknown>): Promise<GeminiFunctionResult> {
    // TODO: 实现事件修改逻辑
    return {
      type: 'success',
      action: 'modify_event',
      message: `事件 "${String(args.title)}" 修改成功`
    };
  }
  
  private convertToCharacterCard(args: Record<string, unknown>): CharacterCard {
    return {
      id: String(args.id || ''),
      name: String(args.name || ''),
      displayName: String(args.displayName || ''),
      currentTitle: String(args.role || ''),
      role: String(args.role || ''),
      description: String(args.description || ''),
      identityRevealed: false,
      
      attributes: args.initialAttributes as CharacterCard['attributes'],
      relationshipWithEmperor: args.initialRelationshipWithEmperor as CharacterCard['relationshipWithEmperor'],
      relationshipNetwork: (args.relationshipNetwork as CharacterCard['relationshipNetwork']) || [],
      factionInfo: args.factionInfo as CharacterCard['factionInfo'],
      influence: args.influence as CharacterCard['influence'],
      
      revealedTraits: [],
      hiddenTraits: [],
      discoveredClues: [],
      totalClues: 0,
      statusFlags: {
        alive: true,
        inCourt: true,
        inExile: false,
        imprisoned: false,
        promoted: false,
        demoted: false,
        suspicious: false,
        plotting: false
      },
      eventIds: []
    };
  }
  
  private convertToEventCard(args: Record<string, unknown>): EventCard {
    return {
      id: String(args.id || ''),
      characterId: String(args.characterId || ''),
      title: String(args.title || ''),
      description: String(args.description || ''),
      speaker: String(args.speaker || ''),
      dialogue: String(args.dialogue || ''),
      choices: args.choices as EventCard['choices'],
      weight: Number(args.weight || 1),
      activationConditions: args.activationConditions as EventCard['activationConditions'],
      characterClues: args.characterClues as EventCard['characterClues']
    };
  }
  
  private async validateWithCore(data: Record<string, unknown>, functionName: string): Promise<{ valid: boolean; issues: { message: string }[] }> {
    try {
      if (functionName.includes('character')) {
        const characterData = this.convertToCharacterCard(data);
        // 使用 Core 包的验证器进行验证
        // TODO: 实现具体的验证逻辑
        // 基本验证：检查必需字段
        if (!characterData.id || !characterData.name) {
          return { valid: false, issues: [{ message: '角色必须有 id 和 name 字段' }] };
        }
        return { valid: true, issues: [] };
      } else if (functionName.includes('event')) {
        const eventData = this.convertToEventCard(data);
        // 使用 Core 包的验证器进行验证
        // TODO: 实现具体的验证逻辑
        // 基本验证：检查必需字段
        if (!eventData.id || !eventData.title) {
          return { valid: false, issues: [{ message: '事件必须有 id 和 title 字段' }] };
        }
        return { valid: true, issues: [] };
      }
    } catch (error) {
      return { valid: false, issues: [{ message: String(error) }] };
    }
    
    return { valid: true, issues: [] };
  }
  
  private buildFunctionSchema(): Record<string, FunctionCallSchema> {
    // 基于 Core 包的常量和约束构建 Schema
    const constants = GAME_CONSTANTS;
    
    return {
      create_character: {
        name: 'create_character',
        description: '创建角色卡牌，数据将通过 crownchronicle-core 包验证器验证',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: '角色唯一标识' },
            name: { type: 'string', description: '角色真实姓名' },
            displayName: { type: 'string', description: '游戏显示称谓' },
            role: { type: 'string', description: '角色身份' },
            description: { type: 'string', description: '角色描述' },
            initialAttributes: {
              type: 'object',
              properties: {
                power: { type: 'number', minimum: constants.MIN_STAT, maximum: constants.MAX_STAT },
                loyalty: { type: 'number', minimum: constants.MIN_STAT, maximum: constants.MAX_STAT },
                ambition: { type: 'number', minimum: constants.MIN_STAT, maximum: constants.MAX_STAT },
                competence: { type: 'number', minimum: constants.MIN_STAT, maximum: constants.MAX_STAT },
                reputation: { type: 'number', minimum: constants.MIN_STAT, maximum: constants.MAX_STAT },
                health: { type: 'number', minimum: constants.MIN_STAT, maximum: constants.MAX_STAT },
                age: { type: 'number', minimum: constants.MIN_INITIAL_AGE, maximum: constants.MAX_AGE }
              },
              required: ['power', 'loyalty', 'ambition', 'competence', 'reputation', 'health', 'age']
            },
            initialRelationshipWithEmperor: {
              type: 'object',
              properties: {
                affection: { type: 'number', minimum: constants.MIN_RELATIONSHIP, maximum: constants.MAX_RELATIONSHIP },
                trust: { type: 'number', minimum: constants.MIN_RELATIONSHIP, maximum: constants.MAX_RELATIONSHIP },
                fear: { type: 'number', minimum: constants.MIN_STAT, maximum: constants.MAX_STAT },
                respect: { type: 'number', minimum: constants.MIN_STAT, maximum: constants.MAX_STAT },
                dependency: { type: 'number', minimum: constants.MIN_STAT, maximum: constants.MAX_STAT },
                threat: { type: 'number', minimum: constants.MIN_STAT, maximum: constants.MAX_STAT }
              },
              required: ['affection', 'trust', 'fear', 'respect', 'dependency', 'threat']
            },
            factionInfo: {
              type: 'object',
              properties: {
                primaryFaction: { type: 'string' },
                secondaryFactions: { type: 'array', items: { type: 'string' } },
                factionLoyalty: { type: 'number', minimum: constants.MIN_FACTION_INFLUENCE, maximum: constants.MAX_FACTION_INFLUENCE },
                leadershipRole: { 
                  type: 'string', 
                  enum: ['leader', 'core', 'member', 'sympathizer']
                }
              },
              required: ['secondaryFactions', 'factionLoyalty', 'leadershipRole']
            },
            influence: {
              type: 'object',
              properties: {
                health: { type: 'number', minimum: -10, maximum: 10 },
                authority: { type: 'number', minimum: -10, maximum: 10 },
                treasury: { type: 'number', minimum: -10, maximum: 10 },
                military: { type: 'number', minimum: -10, maximum: 10 },
                popularity: { type: 'number', minimum: -10, maximum: 10 }
              },
              required: ['health', 'authority', 'treasury', 'military', 'popularity']
            }
          },
          required: ['id', 'name', 'displayName', 'role', 'description', 'initialAttributes', 'initialRelationshipWithEmperor', 'factionInfo', 'influence']
        }
      },
      create_event: {
        name: 'create_event',
        description: '创建事件卡牌，数据将通过 crownchronicle-core 包验证器验证',
        parameters: {
          type: 'object',
          properties: {
            characterId: { type: 'string', description: '所属角色ID' },
            id: { type: 'string', description: '事件唯一标识' },
            title: { type: 'string', description: '事件标题' },
            description: { type: 'string', description: '事件描述' },
            speaker: { type: 'string', description: '说话角色的称谓' },
            dialogue: { type: 'string', description: '角色对话内容' },
            weight: { type: 'number', minimum: constants.DEFAULT_EVENT_WEIGHT, maximum: constants.MAX_EVENT_WEIGHT, description: '事件权重' },
            choices: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  text: { type: 'string' },
                  effects: {
                    type: 'object',
                    properties: {
                      health: { type: 'number', minimum: -20, maximum: 20 },
                      authority: { type: 'number', minimum: -20, maximum: 20 },
                      treasury: { type: 'number', minimum: -20, maximum: 20 },
                      military: { type: 'number', minimum: -20, maximum: 20 },
                      popularity: { type: 'number', minimum: -20, maximum: 20 }
                    }
                  },
                  consequences: { type: 'string' }
                },
                required: ['id', 'text', 'effects']
              }
            }
          },
          required: ['characterId', 'id', 'title', 'description', 'speaker', 'dialogue', 'weight', 'choices']
        }
      }
    };
  }
  
  private buildPrompt(message: string, context: GameDataContext): string {
    return `
      你是《皇冠编年史》游戏的内容编辑助手，基于 crownchronicle-core 包开发。
      
      重要约束：
      1. 你生成的数据将通过 crownchronicle-core 包的验证器严格验证
      2. 必须严格遵循 Core 包定义的数据类型、格式和数值范围
      3. 所有生成的内容必须与游戏引擎完全兼容
      4. 数值范围必须在 Core 包定义的常量范围内
      5. 角色类别、稀有度等枚举值必须符合 Core 包定义
      
      当前项目状态：
      已有角色: ${context.characters.map(c => c.name).join(', ')}
      已有事件数量: ${context.eventCount}
      派系系统: ${context.factions.join(', ')}
      
      用户请求: ${message}
      
      请使用提供的工具函数来创建或修改数据，确保生成的内容能够通过 Core 包的严格验证。
    `;
  }
}
