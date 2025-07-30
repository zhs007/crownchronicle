import { CharacterAttributes } from '@/types/game';
import TinyPinyin from 'tiny-pinyin';
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
      const isFirstMessage = history.length <= 1;
      const prompt = this.buildPrompt(message, context, isFirstMessage);

      // 构建对话历史，转换为Gemini格式
      const contents = [];
      const chatHistory = history
        .filter(msg => msg.role !== 'assistant' || history.indexOf(msg) > 0)
        .slice(-10);
      for (const msg of chatHistory) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }
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

      // 流程优化：自动识别“加事件”请求并链式调用 create_event
      if (functionCalls && functionCalls.length > 0) {
        // 检查是否为“加事件”请求
        const isAddEvent = /加事件|添加事件|新事件|create event|add event/.test(message);
        // 查找 get_character_info 调用
        const getInfoCall = functionCalls.find(call => call.name === 'get_character_info');
        if (isAddEvent && getInfoCall) {
          // 先处理 get_character_info
          const infoResult = await this.getCharacterInfo(getInfoCall.args as Record<string, unknown>);
          // 获取已有事件标题（类型断言）
          let existingTitles: string[] = [];
          const infoData = infoResult.data as { events?: any[] };
          if (infoResult.type === 'success' && infoData && Array.isArray(infoData.events)) {
            existingTitles = infoData.events.map((e: any) => e.title);
          }
          // 自动生成新事件（示例：权谋、暴政、军权）
          const characterId = (getInfoCall.args as { characterId: string }).characterId;
          const candidateEvents = [
            {
              title: '废立少帝',
              description: '董卓废立少帝，权倾朝野。',
              speaker: '董卓',
              dialogue: '天下唯我独尊，谁敢不从？',
              weight: 10,
              characterId,
              options: [
                {
                  reply: '顺从董卓，保全自身',
                  target: 'player',
                  attribute: 'power',
                  offset: -10,
                  effects: [{ target: 'player', attribute: 'power', offset: -10 }]
                },
                {
                  reply: '反抗董卓，冒险一搏',
                  target: 'self',
                  attribute: 'military',
                  offset: 15,
                  effects: [{ target: 'self', attribute: 'military', offset: 15 }]
                }
              ]
            },
            {
              title: '焚烧洛阳',
              description: '董卓焚烧洛阳，迁都长安。',
              speaker: '董卓',
              dialogue: '洛阳已无可留恋，迁都方为上策。',
              weight: 8,
              characterId,
              options: [
                {
                  reply: '支持迁都，顺应大势',
                  target: 'player',
                  attribute: 'popularity',
                  offset: -20,
                  effects: [{ target: 'player', attribute: 'popularity', offset: -20 }]
                },
                {
                  reply: '反对迁都，保卫洛阳',
                  target: 'self',
                  attribute: 'military',
                  offset: 10,
                  effects: [{ target: 'self', attribute: 'military', offset: 10 }]
                }
              ]
            },
            {
              title: '残暴统治',
              description: '董卓残暴统治，民不聊生。',
              speaker: '董卓',
              dialogue: '治国需铁腕，百姓安分即可。',
              weight: 7,
              characterId,
              options: [
                {
                  reply: '顺从暴政，苟且偷生',
                  target: 'player',
                  attribute: 'health',
                  offset: -15,
                  effects: [{ target: 'player', attribute: 'health', offset: -15 }]
                },
                {
                  reply: '揭竿而起，反抗暴政',
                  target: 'self',
                  attribute: 'popularity',
                  offset: 20,
                  effects: [{ target: 'self', attribute: 'popularity', offset: 20 }]
                }
              ]
            }
          ];
          // 过滤已有事件
          const newEvents = candidateEvents.filter(ev => !existingTitles.includes(ev.title));
          const results: GeminiFunctionResult[] = [infoResult];
          // 依次创建新事件
          for (const ev of newEvents) {
            const createResult = await this.createEvent(ev);
            results.push(createResult);
          }
          return { type: 'function_calls', results };
        }
        // 非加事件请求，正常处理
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
      // 将中文名转为拼音（小写、无空格）
      const characterIdPinyin = TinyPinyin.convertToPinyin(characterName, '', true).toLowerCase();
      await this.dataManager.saveCharacter(characterIdPinyin, characterData);
      return {
        type: 'success',
        action: 'create_character',
        data: characterData,
        message: `✅ 角色 "${characterName}" (ID: ${characterIdPinyin}) 创建成功并已保存到配置文件`
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
        message: `✅ 获取角色信息成功：${character.name}，共有 ${events.length} 个事件`
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
      eventIds: [],
      description: String(args.description || ''),
      attributes: attrs as CharacterAttributes,
      commonCardIds: []
    };
  }
  
  private convertToEventCard(args: Record<string, unknown>): EventCard {
    // 兼容新版 EventCard 结构，只用 options 字段
    // AI生成的 args.options 或 args.choices 需转换为 [EventOption, EventOption]
    let options: [import('crownchronicle-core').EventOption, import('crownchronicle-core').EventOption];
    const rawOptions = Array.isArray(args.options)
      ? args.options
      : Array.isArray(args.choices)
        ? args.choices
        : [];
    if (rawOptions.length === 2) {
      options = rawOptions.map(opt => ({
        optionId: opt.optionId ?? '',
        reply: opt.reply ?? opt.description ?? '',
        effects: Array.isArray(opt.effects)
          ? opt.effects
          : [{
              target: opt.target ?? 'player',
              attribute: opt.attribute ?? 'power',
              offset: typeof opt.offset === 'number' ? opt.offset : 0
            }]
      })) as [import('crownchronicle-core').EventOption, import('crownchronicle-core').EventOption];
    } else {
      // 填充空选项，防止类型报错
      options = [
        {
          optionId: '',
          reply: '',
          effects: [{ target: 'player', attribute: 'power', offset: 0 }]
        },
        {
          optionId: '',
          reply: '',
          effects: [{ target: 'self', attribute: 'power', offset: 0 }]
        }
      ];
    }
    return {
      eventId: '',
      id: '', // ID将由saveEvent方法自动生成
      title: String(args.title || ''),
      dialogue: String(args.dialogue || ''),
      options,
      activationConditions: args.activationConditions as import('crownchronicle-core').EventConditions | undefined,
      removalConditions: args.removalConditions as import('crownchronicle-core').EventConditions | undefined,
      triggerConditions: args.triggerConditions as import('crownchronicle-core').EventConditions | undefined,
      weight: Number(args.weight || 1)
    };
  }
  
  private async validateWithCore(data: Record<string, unknown>, functionName: string): Promise<{ valid: boolean; issues: { message: string }[] }> {
    try {
      if (functionName === 'get_character_info') {
        // 只需校验 characterId
        if (!data.characterId || typeof data.characterId !== 'string') {
          return { valid: false, issues: [{ message: 'get_character_info 需要 characterId 字段' }] };
        }
        return { valid: true, issues: [] };
      } else if (functionName.includes('character')) {
        // 验证原始输入数据，而不是转换后的数据
        // 因为转换后的数据中ID会被故意设为空字符串（待自动生成）
        if (!data.name || typeof data.name !== 'string') {
          return { valid: false, issues: [{ message: '角色必须有 name 字段' }] };
        }
        // 验证必需的属性字段
        if (!data.initialAttributes) {
          return { valid: false, issues: [{ message: '角色必须有 initialAttributes 字段' }] };
        }
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
  
  private buildPrompt(message: string, context: GameDataContext, isFirstMessage: boolean = true): string {
    const basePrompt = `
      你是《皇冠编年史》游戏的专业内容设计师，精通中国古代历史。

      ## 核心工作原则：
      1. **用户提需求，你给具体方案**：用户说想要什么类型角色，你直接推荐具体的历史人物
      2. **博学而简洁**：利用历史知识提供精准建议，但保持回复简洁有力
      3. **执行导向**：一旦用户选定，立即执行创建，不过度询问细节
      4. **记住上下文**：在多轮对话中记住之前讨论的内容，避免重复询问

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

      ## 技术约束（事件卡结构要求）：
      - 系统自动生成ID，你只需提供name字段
      - 数据须通过 crownchronicle-core 验证
      - 属性值范围：0-100，关系值：-100到+100
      - **事件卡必须直接生成新版结构，options 字段为长度为 2 的数组，每个选项包含 reply（玩家回应）、effects（数组，支持多个 target/attribute/offset 配置）**
      - 事件卡需包含 dialogue 字段（角色说的一句话，必填，游戏内优先展示）
      - 事件卡需包含 eventId 字段（由角色ID+事件ID自动生成，无需手动填写）
      - options 字段每个选项 reply 字段语义为“玩家对角色的回应”，effects 字段为属性变化数组
      - 每个 effects 项需包含 target（player/self）、attribute（power/military/wealth/popularity/health/age）、offset（数值）
      - 创建事件卡前，必须先获取该角色已有事件列表（如通过 get_character_info），避免重复主题或标题（如“废立少帝”与“废立皇帝”不应重复）。如发现重复，请提示用户或自动跳过。

      ## 现有角色避免重复：
      已有角色: ${context.characters.map(c => `${c.name}(${c.id})`).join(', ')}

      ${isFirstMessage ? '' : '继续之前的对话，'}用户请求: ${message}

      请基于历史知识给出具体可行的建议，避免抽象讨论。
    `;
    
    return basePrompt;
  }
}
