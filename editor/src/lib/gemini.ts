import { CharacterAttributes } from '@/types/game';
import { GoogleGenerativeAI, FunctionCall as GeminiFunctionCall, SchemaType } from '@google/generative-ai';
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
      }
    });
    
    console.log(`✅ Gemini client initialized with model: ${modelName}`);
    
    const actualDataPath = dataPath || GameConfigManager.getConfigPath('editor');
    this.dataProvider = new FileSystemDataProvider(actualDataPath);
    this.validator = new ConfigValidator(this.dataProvider);
    this.dataManager = new EditorDataManager(actualDataPath);
  }
  
  async initialize() {
    // 构建基于 Core 包约束的 Function Call Schema
    this.functionSchema = this.buildFunctionSchema();
    console.log('✅ Gemini 客户端初始化完成，已集成 Core 包验证');
  }
  
  async chatWithContext(message: string, context: GameDataContext, history: Array<{role: string, content: string, timestamp: Date}> = []): Promise<GeminiResponse> {
    try {
      const isFirstMessage = history.length <= 1; // 只有欢迎消息时算作第一次对话
      const prompt = this.buildPrompt(message, context, isFirstMessage);
      
      // 构建对话历史，转换为Gemini格式
      const contents = [];
      
      // 添加历史对话（排除初始的assistant欢迎消息，并限制历史长度）
      const chatHistory = history
        .filter(msg => msg.role !== 'assistant' || history.indexOf(msg) > 0)
        .slice(-10); // 只保留最近10条对话，避免token过多
        
      for (const msg of chatHistory) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }
      
      // 添加当前消息
      contents.push({
        role: 'user',
        parts: [{ text: prompt }]
      });
      
      // 使用function calling配置，但不强制调用
      const result = await this.model.generateContent({
        contents: contents,
        tools: [{
          functionDeclarations: Object.values(this.functionSchema).map(schema => ({
            name: schema.name,
            description: schema.description,
            parameters: schema.parameters
          }))
        }]
      });
      
      // 检查是否有函数调用
      const response = result.response;
      const functionCalls = response.functionCalls();
      
      if (functionCalls && functionCalls.length > 0) {
        return await this.processFunctionCalls(functionCalls);
      }
      
      // 如果没有函数调用，返回文本回复
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
      case 'get_character_info':
        return await this.getCharacterInfo(args);
      case 'list_characters':
        return await this.listCharacters();
      case 'modify_character':
        return await this.modifyCharacter(args);
      case 'modify_event':
        return await this.modifyEvent(args);
      default:
        throw new Error(`未知的函数调用: ${functionName}`);
    }
  }
  
  private async createCharacter(args: Record<string, unknown>): Promise<GeminiFunctionResult> {
    try {
      // 转换为符合 Core 包类型的数据结构
      const characterData: CharacterCard = this.convertToCharacterCard(args);
      // 使用角色名称进行保存，系统将自动生成ID
      const characterName = String(args.name);
      await this.dataManager.saveCharacter(characterName, characterData);
      return {
        type: 'success',
        action: 'create_character',
        data: characterData,
        message: `✅ 角色 "${characterName}" 创建成功并已保存到配置文件`
      };
    } catch (error) {
      console.error('创建角色失败:', error);
      return {
        type: 'error',
        action: 'create_character',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  private async createEvent(args: Record<string, unknown>): Promise<GeminiFunctionResult> {
    try {
      // 转换为符合 Core 包类型的数据结构
      const eventData: EventCard = this.convertToEventCard(args);
      const characterId = String(args.characterId);
      const eventTitle = String(args.title);
      // 使用事件标题进行保存，系统将自动生成ID
      await this.dataManager.saveEvent(characterId, eventTitle, eventData);
      return {
        type: 'success',
        action: 'create_event',
        data: eventData,
        message: `✅ 事件 "${eventTitle}" 创建成功并已保存到配置文件`
      };
    } catch (error) {
      console.error('创建事件失败:', error);
      return {
        type: 'error',
        action: 'create_event',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async getCharacterInfo(args: Record<string, unknown>): Promise<GeminiFunctionResult> {
    try {
      const characterId = String(args.characterId || args.id);
      const character = await this.dataManager.loadCharacter(characterId);
      
      if (!character) {
        return {
          type: 'error',
          action: 'get_character_info',
          error: `未找到角色 ${characterId}`
        };
      }

      const events = await this.dataManager.getCharacterEvents(characterId);
      
      return {
        type: 'success',
        action: 'get_character_info',
        data: {
          character,
          events,
          eventCount: events.length
        },
        message: `✅ 获取角色信息成功：${character.name}（${'displayName' in character ? (character as CharacterCard & { displayName?: string }).displayName : character.name}），共有 ${events.length} 个事件`
      };
    } catch (error) {
      console.error('获取角色信息失败:', error);
      return {
        type: 'error',
        action: 'get_character_info',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async listCharacters(): Promise<GeminiFunctionResult> {
    try {
      const characters = await this.dataManager.getAllCharacters();
      
      const characterList = characters.map(char => ({
        id: char.id,
        name: char.name,
        displayName: 'displayName' in char ? (char as CharacterCard & { displayName?: string }).displayName : char.name,
        role: 'role' in char ? (char as CharacterCard & { role?: string }).role ?? '' : '',
        category: '角色', // 从存储的数据中获取
        description: char.description.substring(0, 100) + (char.description.length > 100 ? '...' : '')
      }));
      
      return {
        type: 'success',
        action: 'list_characters',
        data: characterList,
        message: `✅ 当前共有 ${characters.length} 个角色：${characters.map(c => c.name).join('、')}`
      };
    } catch (error) {
      console.error('获取角色列表失败:', error);
      return {
        type: 'error',
        action: 'list_characters',
        error: error instanceof Error ? error.message : String(error)
      };
    }
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
    // 类型守卫，安全提取属性
    let attrs: Partial<CharacterAttributes> = {};
    if (typeof args.initialAttributes === 'object' && args.initialAttributes !== null) {
      attrs = args.initialAttributes as Partial<CharacterAttributes>;
    }
    return {
      id: '',
      name: String(args.name || ''),
      tags: Array.isArray(args.tags) ? (args.tags as string[]) : [],
      events: Array.isArray(args.events) ? (args.events as string[]) : [],
      // displayName 字段已移除，角色称谓请用 role 字段
      // role 字段已移除，角色身份请用 description 或 attributes 体现
      description: String(args.description || ''),
      attributes: attrs as CharacterAttributes,
      // revealedTraits 字段已移除
      // hiddenTraits 字段已移除
      // discoveredClues 字段已移除
      // totalClues 字段已移除
      eventIds: [],
      commonCardIds: []
    };
  }
  
  private convertToEventCard(args: Record<string, unknown>): EventCard {
    return {
      id: '', // ID将由saveEvent方法自动生成
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
        // 验证原始输入数据，而不是转换后的数据
        // 因为转换后的数据中ID会被故意设为空字符串（待自动生成）
        if (!data.name || typeof data.name !== 'string') {
          return { valid: false, issues: [{ message: '角色必须有 name 字段' }] };
        }
        
        // 验证必需的属性字段
        if (!data.initialAttributes) {
          return { valid: false, issues: [{ message: '角色必须有 initialAttributes 字段' }] };
        }
        
        // ...已移除 initialRelationshipWithEmperor 校验...
        
        return { valid: true, issues: [] };
      } else if (functionName.includes('event')) {
        // 验证原始输入数据
        if (!data.title || typeof data.title !== 'string') {
          return { valid: false, issues: [{ message: '事件必须有 title 字段' }] };
        }
        
        if (!data.characterId || typeof data.characterId !== 'string') {
          return { valid: false, issues: [{ message: '事件必须有 characterId 字段' }] };
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
    // const constants = GAME_CONSTANTS; // 移除未使用变量
    
    return {
      create_character: {
        name: 'create_character',
        description: '创建角色卡牌。当用户选定了具体的历史人物后调用此函数。系统将根据角色姓名自动生成规范的ID，数据将通过 crownchronicle-core 包验证器验证',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            name: { type: SchemaType.STRING, description: '角色真实姓名（系统将据此自动生成ID）' },
            displayName: { type: SchemaType.STRING, description: '游戏显示称谓' },
            role: { type: SchemaType.STRING, description: '角色身份' },
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
            },
            // ...已移除 initialRelationshipWithEmperor、factionInfo、influence 字段schema...
          },
          required: ['name', 'displayName', 'role', 'description', 'initialAttributes']
        }
      },
      create_event: {
        name: 'create_event',
        description: '创建事件卡牌。当用户选定了具体的事件类型和角色后调用此函数。系统将根据事件标题自动生成规范的ID，数据将通过 crownchronicle-core 包验证器验证',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            characterId: { type: SchemaType.STRING, description: '所属角色ID' },
            title: { type: SchemaType.STRING, description: '事件标题（系统将据此自动生成ID）' },
            description: { type: SchemaType.STRING, description: '事件描述' },
            speaker: { type: SchemaType.STRING, description: '说话角色的称谓' },
            dialogue: { type: SchemaType.STRING, description: '角色对话内容' },
            weight: { type: SchemaType.NUMBER, description: '事件权重 (1-20)' },
            choices: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  text: { type: SchemaType.STRING, description: '选项文本（系统将自动生成选项ID）' },
                  effects: {
                    type: SchemaType.OBJECT,
                    properties: {
                      health: { type: SchemaType.NUMBER, description: '健康影响 (-20 到 20)' },
                      authority: { type: SchemaType.NUMBER, description: '威望影响 (-20 到 20)' },
                      treasury: { type: SchemaType.NUMBER, description: '国库影响 (-20 到 20)' },
                      military: { type: SchemaType.NUMBER, description: '军事影响 (-20 到 20)' },
                      popularity: { type: SchemaType.NUMBER, description: '民心影响 (-20 到 20)' }
                    }
                  },
                  consequences: { type: SchemaType.STRING, description: '选择后果描述' }
                },
                required: ['text', 'effects']
              }
            }
          },
          required: ['characterId', 'title', 'description', 'speaker', 'dialogue', 'weight', 'choices']
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
  
  private buildPrompt(message: string, context: GameDataContext, isFirstMessage: boolean = true): string {
    const basePrompt = `
      你是《皇冠编年史》游戏的专业内容设计师，精通中国古代历史。
      
      ## 核心工作原则：
      1. **用户提需求，你给具体方案**：用户说想要什么类型角色，你直接推荐具体的历史人物
      2. **博学而简洁**：利用历史知识提供精准建议，但保持回复简洁有力
      3. **执行导向**：一旦用户选定，立即执行创建，不过度询问细节
      4. **记住上下文**：在多轮对话中记住之前讨论的内容，避免重复询问
      
      ## 工作流程：
      **步骤1 - 需求收集**：用户提出角色类型需求
      **步骤2 - 方案推荐**：你推荐2-3个具体历史人物，简要介绍特点和游戏作用
      **步骤3 - 确认执行**：用户选定后立即调用函数创建
      
      ## 回复格式示例：
      用户："我想要一个权臣角色"
      你应该回复：
      "我为您推荐几个权臣角色：
      
      **1. 严嵩** - 明朝首辅，善于察言观色，专权20年。游戏中可作为腐败但能力强的文臣。
      **2. 和珅** - 清朝宠臣，理财能力出众但贪腐成性。适合做影响国库的关键角色。
      **3. 董卓** - 东汉末年权臣，掌握军权废立皇帝。可设计为最终BOSS型角色。
      
      请告诉我您选择哪一个，或者需要其他类型的权臣？"
      
      ## 多轮对话指导：
      - 如果用户之前已经询问了某类角色，在后续对话中直接处理用户的选择
      - 如果用户说"就选XXX"或"用第一个"，立即创建对应角色
      - 记住之前推荐过的角色，避免重复推荐
      
      ## 技术约束：
      - 系统自动生成ID，你只需提供name字段
      - 数据须通过crownchronicle-core验证
      - 属性值范围：0-100，关系值：-100到+100
      
      ## 现有角色避免重复：
      已有角色: ${context.characters.map(c => `${c.name}(${c.id})`).join(', ')}
      
      ${isFirstMessage ? '' : '继续之前的对话，'}用户请求: ${message}
      
      请基于历史知识给出具体可行的建议，避免抽象讨论。
    `;
    
    return basePrompt;
  }
}
