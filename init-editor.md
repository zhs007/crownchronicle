### 需求

这是一个关于中国古代皇帝的一个卡牌游戏项目，我想要一个用 gemini 来制作卡牌的编辑器项目，也用 Next.js 开发，ts 来写。

用 function call 读写卡牌数据，卡牌数据和这个游戏数据一样，目录结构也一样，编辑好以后能直接整个目录复制过来就能替换使用。

我需要有一个和 gemini 聊天的界面，我和 gemini 讨论该如何设计角色卡和事件卡，然后 gemini 负责制作，当然，我也能让它按我的要求修改已经完成的卡牌。

类似一个 vibe coding ，但只能用来编辑这个游戏数据。

#### 重构后的需求

经过项目重构，现在我们已经有了独立的 `core` 游戏引擎包，它提供了完整的游戏逻辑、数据管理和验证功能。编辑器项目应该直接基于这个 core 包来开发，而不是重新实现游戏逻辑。

核心要求：
- 直接依赖 `crownchronicle-core` 包，复用其类型定义、数据管理和验证逻辑
- 利用 core 包的 `ConfigValidator` 进行数据验证，确保生成的内容符合游戏引擎要求
- 使用 core 包的 `DataProvider` 接口进行数据读写操作
- 编辑器生成的数据应该能够通过 core 包的验证，确保游戏引擎兼容性
- 保持与现有 prototype 项目相同的数据格式和目录结构

### 实现

#### 1. 项目初始化

```bash
npx create-next-app@latest crownchronicle-editor --typescript --tailwind --eslint --app
cd crownchronicle-editor

# 安装核心依赖
npm install crownchronicle-core@file:../core  # 使用本地 core 包
npm install js-yaml @types/js-yaml
npm install @google/generative-ai
npm install react-markdown
npm install react-syntax-highlighter @types/react-syntax-highlighter
npm install undici
```

#### 2. 项目结构

```
crownchronicle-editor/
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── api/
│   │       ├── gemini/
│   │       │   └── route.ts           # Gemini API 接口
│   │       ├── data/
│   │       │   ├── characters/
│   │       │   │   ├── route.ts       # 角色管理 API
│   │       │   │   └── [characterId]/
│   │       │   │       └── route.ts   # 单个角色操作
│   │       │   └── events/
│   │       │       ├── route.ts       # 事件管理 API
│   │       │       └── [eventId]/
│   │       │           └── route.ts   # 单个事件操作
│   │       └── export/
│   │           └── route.ts           # 导出功能
│   ├── components/
│   │   ├── ChatInterface.tsx          # Gemini 聊天界面
│   │   ├── CharacterEditor.tsx        # 角色编辑器
│   │   ├── EventEditor.tsx            # 事件编辑器
│   │   ├── DataPreview.tsx            # 数据预览组件
│   │   ├── FileExplorer.tsx           # 文件浏览器
│   │   ├── CodeEditor.tsx             # YAML 代码编辑器
│   │   └── Layout/
│   │       ├── Sidebar.tsx            # 侧边栏导航
│   │       └── Header.tsx             # 顶部导航
│   ├── lib/
│   │   ├── gemini.ts                  # Gemini API 客户端
│   │   ├── dataManager.ts             # 游戏数据管理
│   │   ├── yamlProcessor.ts           # YAML 处理工具
│   │   └── fileSystem.ts              # 文件系统操作
│   ├── types/
│   │   ├── editor.ts                  # 编辑器特有类型
│   │   ├── gemini.ts                  # Gemini 相关类型
│   │   └── game.ts                    # 游戏数据类型 (复用原项目)
│   └── data/                          # 编辑中的游戏数据
│       └── characters/
│           └── ...                    # 与原项目相同的目录结构
```

#### 3. 核心功能实现

##### 3.1 基于 Core 包的 Gemini 集成

```typescript
// src/lib/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ProxyAgent, setGlobalDispatcher } from 'undici';
import { 
  FileSystemDataProvider, 
  ConfigValidator, 
  type CharacterCard, 
  type EventCard,
  type ValidationResult
} from 'crownchronicle-core';

// 设置代理（如果需要）
if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  const dispatcher = new ProxyAgent(proxyUrl!);
  setGlobalDispatcher(dispatcher);
  console.log(`Using proxy: ${proxyUrl}`);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export class GeminiClient {
  private model = genAI.getGenerativeModel({ 
    model: 'gemini-pro',
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
    }
  });
  
  private dataProvider = new FileSystemDataProvider('./src/data');
  private validator = new ConfigValidator();
  private functionSchema: any = null;
  
  async initialize() {
    // 基于 core 包的数据格式构建 Function Call Schema
    this.functionSchema = await this.buildSchemaFromCore();
    console.log('✅ 基于 Core 包初始化完成');
  }
  
  async chatWithContext(message: string, context: GameDataContext) {
    try {
      const prompt = this.buildPrompt(message, context);
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ functionDeclarations: Object.values(this.functionSchema) }]
      });
      
      // 检查是否有函数调用
      const functionCalls = result.response.functionCalls();
      if (functionCalls && functionCalls.length > 0) {
        return await this.processFunctionCalls(functionCalls);
      }
      
      return { type: 'text', content: result.response.text() };
    } catch (error) {
      console.error('Gemini API Error:', error);
      if (error.message?.includes('proxy') || error.message?.includes('network')) {
        throw new Error('代理连接失败，请检查代理配置');
      }
      throw error;
    }
  }
  
  private async processFunctionCalls(functionCalls: any[]) {
    const results = [];
    
    for (const call of functionCalls) {
      try {
        // 使用 core 包的验证器验证数据
        const validationResult = await this.validateWithCore(call.args, call.name);
        
        if (!validationResult.isValid) {
          throw new Error(`数据验证失败: ${validationResult.issues.map(i => i.message).join(', ')}`);
        }
        
        // 执行函数调用
        const result = await this.executeFunctionCall(call.name, call.args);
        results.push(result);
      } catch (error) {
        results.push({
          type: 'error',
          function: call.name,
          error: error.message
        });
      }
    }
    
    return { type: 'function_calls', results };
  }
  
  private async executeFunctionCall(functionName: string, args: any) {
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
  
  private async createCharacter(args: any) {
    // 转换为符合 Core 包类型的数据结构
    const characterData: CharacterCard = this.convertToCharacterCard(args);
    
    // 使用 Core 包验证器进行最终验证
    const validationResult = await this.validator.validateCharacter(characterData);
    if (!validationResult.isValid) {
      throw new Error(`角色数据验证失败: ${validationResult.issues.map(i => i.message).join(', ')}`);
    }
    
    // 使用 Core 包的数据提供器保存数据
    await this.dataProvider.saveCharacter(args.id, characterData);
    
    return {
      type: 'success',
      action: 'create_character',
      data: characterData,
      message: `角色 "${args.name}" 创建成功，已通过 Core 包验证`
    };
  }
  
  private async createEvent(args: any) {
    // 转换为符合 Core 包类型的数据结构
    const eventData: EventCard = this.convertToEventCard(args);
    
    // 使用 Core 包验证器进行验证
    const validationResult = await this.validator.validateEvent(eventData);
    if (!validationResult.isValid) {
      throw new Error(`事件数据验证失败: ${validationResult.issues.map(i => i.message).join(', ')}`);
    }
    
    // 使用 Core 包的数据提供器保存数据
    await this.dataProvider.saveEvent(args.characterId, args.id, eventData);
    
    return {
      type: 'success',
      action: 'create_event',
      data: eventData,
      message: `事件 "${args.title}" 创建成功，已通过 Core 包验证`
    };
  }
  
  private convertToCharacterCard(args: any): CharacterCard {
    // 将 AI 生成的数据转换为 Core 包定义的 CharacterCard 类型
    return {
      id: args.id,
      name: args.name,
      displayName: args.displayName,
      role: args.role,
      description: args.description,
      category: args.category,
      rarity: args.rarity,
      initialAttributes: args.initialAttributes,
      initialRelationshipWithEmperor: args.initialRelationshipWithEmperor,
      factionInfo: args.factionInfo,
      relationshipNetwork: args.relationshipNetwork || [],
      influence: args.influence
    };
  }
  
  private convertToEventCard(args: any): EventCard {
    // 将 AI 生成的数据转换为 Core 包定义的 EventCard 类型
    return {
      id: args.id,
      title: args.title,
      description: args.description,
      speaker: args.speaker,
      dialogue: args.dialogue,
      characterClues: args.characterClues,
      activationConditions: args.activationConditions,
      weight: args.weight,
      choices: args.choices
    };
  }
  
  private async validateWithCore(data: any, functionName: string): Promise<ValidationResult> {
    // 使用 Core 包的验证器进行预验证
    if (functionName.includes('character')) {
      const characterData = this.convertToCharacterCard(data);
      return await this.validator.validateCharacter(characterData);
    } else if (functionName.includes('event')) {
      const eventData = this.convertToEventCard(data);
      return await this.validator.validateEvent(eventData);
    }
    
    return { isValid: true, issues: [] };
  }
  
  private async buildSchemaFromCore() {
    // 基于 Core 包的类型定义构建 Function Call Schema
    return {
      create_character: {
        name: 'create_character',
        description: '创建角色卡牌，数据将通过 Core 包验证器验证',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: '角色唯一标识' },
            name: { type: 'string', description: '角色真实姓名' },
            displayName: { type: 'string', description: '游戏显示称谓' },
            role: { type: 'string', description: '角色身份' },
            description: { type: 'string', description: '角色描述' },
            category: { 
              type: 'string', 
              enum: ['emperor_family', 'court_official', 'military', 'eunuch', 'consort'],
              description: '角色类别'
            },
            rarity: { 
              type: 'string', 
              enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
              description: '稀有度'
            },
            initialAttributes: {
              type: 'object',
              properties: {
                power: { type: 'number', minimum: 0, maximum: 100 },
                loyalty: { type: 'number', minimum: 0, maximum: 100 },
                ambition: { type: 'number', minimum: 0, maximum: 100 },
                competence: { type: 'number', minimum: 0, maximum: 100 },
                reputation: { type: 'number', minimum: 0, maximum: 100 },
                health: { type: 'number', minimum: 0, maximum: 100 },
                age: { type: 'number', minimum: 10, maximum: 100 }
              },
              required: ['power', 'loyalty', 'ambition', 'competence', 'reputation', 'health', 'age']
            },
            initialRelationshipWithEmperor: {
              type: 'object',
              properties: {
                affection: { type: 'number', minimum: -100, maximum: 100 },
                trust: { type: 'number', minimum: -100, maximum: 100 },
                fear: { type: 'number', minimum: 0, maximum: 100 },
                respect: { type: 'number', minimum: 0, maximum: 100 },
                dependency: { type: 'number', minimum: 0, maximum: 100 },
                threat: { type: 'number', minimum: 0, maximum: 100 }
              },
              required: ['affection', 'trust', 'fear', 'respect', 'dependency', 'threat']
            },
            factionInfo: {
              type: 'object',
              properties: {
                primaryFaction: { type: 'string' },
                secondaryFactions: { type: 'array', items: { type: 'string' } },
                factionLoyalty: { type: 'number', minimum: 0, maximum: 100 },
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
          required: ['id', 'name', 'displayName', 'role', 'description', 'category', 'rarity', 'initialAttributes', 'initialRelationshipWithEmperor', 'factionInfo', 'influence']
        }
      },
      create_event: {
        name: 'create_event',
        description: '创建事件卡牌，数据将通过 Core 包验证器验证',
        parameters: {
          type: 'object',
          properties: {
            characterId: { type: 'string', description: '所属角色ID' },
            id: { type: 'string', description: '事件唯一标识' },
            title: { type: 'string', description: '事件标题' },
            description: { type: 'string', description: '事件描述' },
            speaker: { type: 'string', description: '说话角色的称谓' },
            dialogue: { type: 'string', description: '角色对话内容' },
            weight: { type: 'number', minimum: 1, maximum: 20, description: '事件权重' },
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
      你是《皇冠编年史》游戏的内容编辑助手。
      
      重要约束：
      1. 你生成的数据将通过 crownchronicle-core 包的验证器验证
      2. 必须严格遵循 Core 包定义的数据类型和格式
      3. 所有生成的内容必须与游戏引擎完全兼容
      4. 数值范围必须在规定的最小值和最大值之间
      
      当前项目状态：
      已有角色: ${context.characters.map(c => c.name).join(', ')}
      已有事件数量: ${context.eventCount}
      派系系统: ${context.factions.join(', ')}
      
      用户请求: ${message}
      
      请使用提供的工具函数来创建或修改数据，确保生成的内容能够通过 Core 包的验证。
    `;
  }
}

interface GameDataContext {
  characters: Array<{ name: string; id: string }>;
  eventCount: number;
  factions: string[];
}
```

##### 3.2 基于 Core 包的数据管理系统

```typescript
// src/lib/dataManager.ts
import { 
  FileSystemDataProvider, 
  ConfigConverter,
  type CharacterCard, 
  type EventCard 
} from 'crownchronicle-core';
import { dump } from 'js-yaml';

export class EditorDataManager {
  private dataProvider: FileSystemDataProvider;
  
  constructor(dataPath: string = './src/data') {
    this.dataProvider = new FileSystemDataProvider(dataPath);
  }
  
  async saveCharacter(characterId: string, data: CharacterCard) {
    // 使用 Core 包的数据提供器保存角色数据
    await this.dataProvider.saveCharacter(characterId, data);
  }
  
  async loadCharacter(characterId: string): Promise<CharacterCard> {
    return await this.dataProvider.loadCharacter(characterId);
  }
  
  async saveEvent(characterId: string, eventId: string, data: EventCard) {
    // 使用 Core 包的数据提供器保存事件数据
    await this.dataProvider.saveEvent(characterId, eventId, data);
  }
  
  async loadEvent(characterId: string, eventId: string): Promise<EventCard> {
    return await this.dataProvider.loadEvent(characterId, eventId);
  }
  
  async getAllCharacters(): Promise<CharacterCard[]> {
    return await this.dataProvider.getAllCharacters();
  }
  
  async getCharacterEvents(characterId: string): Promise<EventCard[]> {
    return await this.dataProvider.getCharacterEvents(characterId);
  }
  
  async exportCharacterAsYaml(characterId: string): Promise<string> {
    const character = await this.loadCharacter(characterId);
    // 使用 Core 包的转换器转换为 YAML 格式
    const yamlData = ConfigConverter.characterToYaml(character);
    return dump(yamlData, {
      indent: 2,
      quotingType: '"',
      lineWidth: -1
    });
  }
  
  async exportEventAsYaml(characterId: string, eventId: string): Promise<string> {
    const event = await this.loadEvent(characterId, eventId);
    // 使用 Core 包的转换器转换为 YAML 格式
    const yamlData = ConfigConverter.eventToYaml(event);
    return dump(yamlData, {
      indent: 2,
      quotingType: '"',
      lineWidth: -1
    });
  }
  
  async exportProject(): Promise<Blob> {
    // 导出整个项目为与原项目兼容的格式
    const archiver = require('archiver');
    const archive = archiver('zip');
    
    const characters = await this.getAllCharacters();
    
    for (const character of characters) {
      // 导出角色配置
      const characterYaml = await this.exportCharacterAsYaml(character.id);
      archive.append(characterYaml, { 
        name: `data/characters/${character.id}/character.yaml` 
      });
      
      // 导出角色事件
      const events = await this.getCharacterEvents(character.id);
      for (const event of events) {
        const eventYaml = await this.exportEventAsYaml(character.id, event.id);
        archive.append(eventYaml, { 
          name: `data/characters/${character.id}/events/${event.id}.yaml` 
        });
      }
    }
    
    archive.finalize();
    return new Blob([archive], { type: 'application/zip' });
  }
  
  async validateAllData(): Promise<ValidationReport> {
    const report: ValidationReport = {
      characters: [],
      events: [],
      isValid: true
    };
    
    const characters = await this.getAllCharacters();
    
    for (const character of characters) {
      // 使用 Core 包的验证器验证角色数据
      const characterValidation = await this.dataProvider.validateCharacter(character);
      report.characters.push({
        id: character.id,
        name: character.name,
        isValid: characterValidation.isValid,
        issues: characterValidation.issues
      });
      
      if (!characterValidation.isValid) {
        report.isValid = false;
      }
      
      // 验证角色的所有事件
      const events = await this.getCharacterEvents(character.id);
      for (const event of events) {
        const eventValidation = await this.dataProvider.validateEvent(event);
        report.events.push({
          id: event.id,
          characterId: character.id,
          title: event.title,
          isValid: eventValidation.isValid,
          issues: eventValidation.issues
        });
        
        if (!eventValidation.isValid) {
          report.isValid = false;
        }
      }
    }
    
    return report;
  }
}

interface ValidationReport {
  characters: Array<{
    id: string;
    name: string;
    isValid: boolean;
    issues: Array<{ field: string; message: string }>;
  }>;
  events: Array<{
    id: string;
    characterId: string;
    title: string;
    isValid: boolean;
    issues: Array<{ field: string; message: string }>;
  }>;
  isValid: boolean;
}
```

##### 3.3 基于 Core 包的验证和类型系统

```typescript
// src/lib/coreIntegration.ts
import { 
  ConfigValidator, 
  GameEngine,
  GameSimulator,
  type CharacterCard, 
  type EventCard,
  type ValidationResult,
  type GameConfig,
  type SimulationResult
} from 'crownchronicle-core';

export class CoreIntegration {
  private validator: ConfigValidator;
  private gameEngine: GameEngine;
  private simulator: GameSimulator;
  
  constructor() {
    this.validator = new ConfigValidator();
    this.gameEngine = new GameEngine();
    this.simulator = new GameSimulator();
  }
  
  async validateCharacter(character: CharacterCard): Promise<ValidationResult> {
    return await this.validator.validateCharacter(character);
  }
  
  async validateEvent(event: EventCard): Promise<ValidationResult> {
    return await this.validator.validateEvent(event);
  }
  
  async validateGameConfig(config: GameConfig): Promise<ValidationResult> {
    return await this.validator.validateGameConfig(config);
  }
  
  async simulateCharacterBalance(characters: CharacterCard[]): Promise<BalanceAnalysis> {
    const config: GameConfig = {
      characters,
      events: [],
      settings: {
        maxReignYears: 50,
        startingAge: 25,
        difficultyLevel: 'normal'
      }
    };
    
    const simulationResult = await this.simulator.simulate(config, 100);
    
    return this.analyzeBalance(simulationResult);
  }
  
  async testEventFlow(character: CharacterCard, events: EventCard[]): Promise<EventFlowAnalysis> {
    // 使用游戏引擎测试事件流
    const engine = new GameEngine();
    const config: GameConfig = {
      characters: [character],
      events,
      settings: {
        maxReignYears: 20,
        startingAge: 25,
        difficultyLevel: 'normal'
      }
    };
    
    await engine.initialize(config);
    
    const flowAnalysis: EventFlowAnalysis = {
      totalEvents: events.length,
      activatableEvents: 0,
      weightDistribution: {},
      potentialDeadlocks: [],
      recommendations: []
    };
    
    // 分析事件权重分布
    events.forEach(event => {
      const weight = event.weight || 1;
      flowAnalysis.weightDistribution[weight] = 
        (flowAnalysis.weightDistribution[weight] || 0) + 1;
    });
    
    // 检查可激活事件数量
    const gameState = engine.getCurrentState();
    for (const event of events) {
      if (this.canEventActivate(event, gameState)) {
        flowAnalysis.activatableEvents++;
      }
    }
    
    // 生成建议
    if (flowAnalysis.activatableEvents < 3) {
      flowAnalysis.recommendations.push('建议增加更多可激活的事件以确保游戏流畅性');
    }
    
    return flowAnalysis;
  }
  
  private canEventActivate(event: EventCard, gameState: any): boolean {
    if (!event.activationConditions) return true;
    
    const conditions = event.activationConditions;
    const emperor = gameState.emperor;
    
    if (conditions.minAge && emperor.age < conditions.minAge) return false;
    if (conditions.maxAge && emperor.age > conditions.maxAge) return false;
    if (conditions.minReignYears && emperor.reignYears < conditions.minReignYears) return false;
    if (conditions.maxReignYears && emperor.reignYears > conditions.maxReignYears) return false;
    
    return true;
  }
  
  private analyzeBalance(simulation: SimulationResult): BalanceAnalysis {
    return {
      averageGameLength: simulation.averageGameLength,
      survivalRate: simulation.survivalRate,
      attributeDistribution: simulation.finalStates.reduce((acc, state) => {
        acc.health = (acc.health || 0) + state.emperor.health;
        acc.authority = (acc.authority || 0) + state.emperor.authority;
        acc.treasury = (acc.treasury || 0) + state.emperor.treasury;
        acc.military = (acc.military || 0) + state.emperor.military;
        acc.popularity = (acc.popularity || 0) + state.emperor.popularity;
        return acc;
      }, {} as any),
      recommendations: this.generateBalanceRecommendations(simulation)
    };
  }
  
  private generateBalanceRecommendations(simulation: SimulationResult): string[] {
    const recommendations: string[] = [];
    
    if (simulation.survivalRate < 0.3) {
      recommendations.push('游戏难度过高，建议降低事件的负面效果');
    } else if (simulation.survivalRate > 0.8) {
      recommendations.push('游戏难度偏低，建议增加挑战性事件');
    }
    
    if (simulation.averageGameLength < 15) {
      recommendations.push('游戏时长偏短，建议优化事件激活条件');
    } else if (simulation.averageGameLength > 35) {
      recommendations.push('游戏时长偏长，建议增加终局触发条件');
    }
    
    return recommendations;
  }
}

interface BalanceAnalysis {
  averageGameLength: number;
  survivalRate: number;
  attributeDistribution: {
    health: number;
    authority: number;
    treasury: number;
    military: number;
    popularity: number;
  };
  recommendations: string[];
}

interface EventFlowAnalysis {
  totalEvents: number;
  activatableEvents: number;
  weightDistribution: Record<number, number>;
  potentialDeadlocks: string[];
  recommendations: string[];
}
```

#### 4. 用户界面设计

##### 4.1 主界面布局

- **左侧边栏**: 文件浏览器，显示角色和事件树状结构
- **中央区域**: 
  - 上半部分：Gemini 聊天界面
  - 下半部分：当前编辑的数据预览/编辑器
- **右侧面板**: 数据验证结果、导出选项

##### 4.2 聊天界面功能

```typescript
// 支持的聊天命令示例 - 基于完整的游戏逻辑
const chatCommands = [
  // 角色创建类
  "创建一个新的文臣角色，名叫张仪，擅长外交，有legendary稀有度",
  "设计一个权臣角色，历史原型是鳌拜，初始权力值要高，对皇帝有威胁",
  "生成一个宦官角色，参考魏忠贤，要有复杂的派系关系",
  
  // 事件创建类
  "为霍光添加一个关于军事训练的事件，要有三个选择分支",
  "创建武则天的权力斗争事件，需要复杂的激活条件和角色关系影响",
  "设计一个朝堂争议事件，涉及多个角色的关系变化",
  
  // 修改优化类
  "修改武则天的权力值，让她更强势一些，从85提升到95",
  "调整霍光的忠诚度事件，让选择后果更加戏剧化",
  "优化张仪的外交事件，增加更多的政治线索揭示",
  
  // 关系网络类
  "建立武则天和霍光之间的敌对关系，强度-80，高度保密",
  "设计鳌拜和魏忠贤的复杂同盟关系，包含历史背景",
  "创建皇族内部的权力竞争关系网",
  
  // 系统功能类
  "检查所有角色的数据完整性和逻辑一致性",
  "验证事件激活条件是否合理，避免死锁情况",
  "分析当前角色平衡性，确保游戏难度适中",
  "导出当前项目为游戏可用格式",
  
  // 高级设计类
  "设计一个完整的政治危机事件链，涉及5个角色",
  "创建一个派系斗争系统，包含女性政治集团vs传统官僚",
  "生成边境战争主题的角色和事件，包含军事策略元素"
];

// Gemini 智能分析功能
const intelligentFeatures = [
  "历史准确性检查：基于真实历史人物特征验证角色设计",
  "关系逻辑验证：确保角色间关系符合历史背景和政治逻辑", 
  "游戏平衡分析：分析角色数值和事件效果的平衡性",
  "事件链设计：自动设计相关联的事件序列",
  "线索系统优化：确保身份揭示线索的合理分布",
  "派系动态模拟：模拟不同派系组合下的政治走向"
];
```

##### 4.3 实时预览

- **YAML 代码编辑器**：支持语法高亮和错误检测
- **配置完整性验证**：实时检查激活条件、触发条件的逻辑性
- **角色关系图可视化**：动态显示角色间的关系网络和派系归属
- **事件流程预览**：模拟事件在三卡池系统中的流转过程
- **数值平衡分析**：显示角色属性和事件效果的平衡性图表
- **身份线索追踪**：预览玩家发现角色真实身份的进度路径
- **历史准确性提示**：基于真实历史人物给出设计建议

#### 5. 核心工作流程（基于现有格式约束）

1. **格式分析阶段**:
   - 系统启动时扫描现有的角色和事件YAML文件
   - 自动提取字段结构、数据类型、枚举值等格式定义
   - 构建严格的数据模式，确保兼容性

2. **模式验证阶段**:
   - 验证现有文件的一致性和完整性
   - 识别必需字段、可选字段和默认值
   - 建立数据验证规则和约束条件

3. **智能内容生成阶段**:
   - 与 Gemini 讨论角色设计理念，但严格限制在现有格式内
   - AI 基于现有模式生成符合格式的角色和事件数据
   - 实时验证生成的数据是否符合现有配置规范

4. **格式兼容检查**:
   - 每次生成后自动检查与现有游戏引擎的兼容性
   - 验证数据结构、字段名称、数据类型的一致性
   - 确保生成的YAML文件可以被原游戏正确解析

5. **内容优化阶段**:
   - 在不改变格式的前提下优化数据内容
   - 调整数值范围、完善描述文本、优化关系网络
   - 确保历史准确性和游戏平衡性

6. **质量保证阶段**:
   - 与现有角色和事件进行一致性检查
   - 验证新生成内容的游戏逻辑合理性
   - 确保三卡池系统的流转正常

7. **无缝集成导出**:
   - 导出的数据完全兼容现有项目结构
   - 可以直接复制替换到原游戏项目中使用
   - 无需任何格式转换或适配工作

#### 6. 技术特性（基于 Core 包约束）

- **Core 包集成**: 直接使用 `crownchronicle-core` 包的所有功能，确保与游戏引擎的完全兼容性
- **类型安全**: 基于 Core 包的 TypeScript 类型定义，编译时即可发现类型错误
- **内置验证**: 利用 Core 包的 `ConfigValidator` 进行实时数据验证，确保生成的内容符合游戏规则
- **引擎兼容性**: 使用 Core 包的 `GameEngine` 和 `GameSimulator` 进行游戏逻辑测试
- **数据提供器**: 复用 Core 包的 `FileSystemDataProvider` 进行统一的数据管理
- **格式转换**: 利用 Core 包的 `ConfigConverter` 确保 YAML 格式的一致性
- **模拟测试**: 通过 Core 包的模拟器验证角色平衡性和事件流程合理性
- **零配置集成**: 生成的数据直接兼容原项目，无需任何格式转换
- **实时反馈**: 基于 Core 包的验证结果提供即时的错误提示和修改建议
- **版本兼容**: 随着 Core 包的更新自动获得最新的游戏特性支持

#### 7. 核心算法和验证规则（基于 Core 包）

##### 7.1 使用 Core 包的游戏引擎验证
```typescript
// 利用 Core 包的游戏引擎进行完整的游戏流程验证
interface GameFlowValidation {
  validateEventActivation(event: EventCard, gameState: GameState): boolean;
  simulateGameProgression(config: GameConfig): SimulationResult;
  detectGameEndConditions(state: GameState): EndCondition[];
  validateCardPoolBalance(characters: CharacterCard[]): PoolBalance;
}

// 使用 Core 包的内置规则
const coreValidationRules = {
  attributeRanges: { min: 0, max: 100 },      // 来自 Core 包常量
  relationshipRanges: { min: -100, max: 100 }, // 来自 Core 包常量
  eventWeightRange: { min: 1, max: 20 },       // 来自 Core 包常量
  influenceRange: { min: -10, max: 10 }        // 来自 Core 包常量
};
```

##### 7.2 基于 Core 包的关系网络验证
```typescript
// 使用 Core 包的关系验证器
interface CoreRelationshipValidator {
  validateRelationshipLogic(network: CharacterRelationship[]): ValidationResult;
  checkFactionConsistency(characters: CharacterCard[]): FactionAnalysis;
  validateHistoricalAccuracy(character: CharacterCard): AccuracyReport;
  optimizeRelationshipBalance(network: CharacterRelationship[]): OptimizationSuggestion[];
}
```

##### 7.3 Core 包集成的数值平衡系统
```typescript
// 利用 Core 包的模拟器进行平衡分析
interface CoreBalanceSystem {
  runGameSimulation(config: GameConfig, iterations: number): SimulationResult;
  analyzeCharacterPowerLevel(character: CharacterCard): PowerAnalysis;
  validateEventImpact(event: EventCard): ImpactAnalysis;
  generateBalanceReport(characters: CharacterCard[]): BalanceReport;
}
```

#### 8. 部署配置

```env
# .env.local
GEMINI_API_KEY=your_gemini_api_key
NODE_ENV=development

# 代理配置（如果需要通过代理访问 Gemini API）
HTTP_PROXY=http://proxy.company.com:8080
HTTPS_PROXY=https://proxy.company.com:8443
# 或者使用 socks 代理
# HTTP_PROXY=socks5://127.0.0.1:1080
# HTTPS_PROXY=socks5://127.0.0.1:1080

# 代理认证（如果代理需要用户名密码）
# HTTP_PROXY=http://username:password@proxy.company.com:8080
# HTTPS_PROXY=https://username:password@proxy.company.com:8443

# 历史数据库配置（可选）
HISTORICAL_DATA_SOURCE=local_database
CHARACTER_TEMPLATE_PATH=./templates/characters
EVENT_TEMPLATE_PATH=./templates/events

# 验证配置
ENABLE_HISTORICAL_VALIDATION=true
STRICT_RELATIONSHIP_CHECK=true
AUTO_BALANCE_SUGGESTION=true

# API 配置
GEMINI_REQUEST_TIMEOUT=30000
GEMINI_MAX_RETRIES=3
GEMINI_RETRY_DELAY=1000
```

#### 8.1 代理配置说明

```typescript
// src/lib/proxyConfig.ts
import { ProxyAgent } from 'undici';

export interface ProxyConfig {
  enabled: boolean;
  url?: string;
  auth?: {
    username: string;
    password: string;
  };
  timeout?: number;
}

export function getProxyConfig(): ProxyConfig {
  const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
  const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  
  const proxyUrl = httpsProxy || httpProxy;
  
  if (!proxyUrl) {
    return { enabled: false };
  }
  
  try {
    const url = new URL(proxyUrl);
    const config: ProxyConfig = {
      enabled: true,
      url: proxyUrl,
      timeout: parseInt(process.env.GEMINI_REQUEST_TIMEOUT || '30000')
    };
    
    // 如果 URL 中包含认证信息
    if (url.username && url.password) {
      config.auth = {
        username: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password)
      };
    }
    
    return config;
  } catch (error) {
    console.error('Invalid proxy URL:', proxyUrl);
    return { enabled: false };
  }
}

export function createProxyAgent(): ProxyAgent | null {
  const config = getProxyConfig();
  
  if (!config.enabled || !config.url) {
    return null;
  }
  
  return new ProxyAgent({
    uri: config.url,
    requestTls: {
      timeout: config.timeout
    }
  });
}

// 在应用启动时调用
export function setupGlobalProxy(): void {
  const agent = createProxyAgent();
  if (agent) {
    const { setGlobalDispatcher } = require('undici');
    setGlobalDispatcher(agent);
    console.log('✅ Global proxy dispatcher configured');
  } else {
    console.log('ℹ️  No proxy configuration found, using direct connection');
  }
}
```

#### 8.2 连接测试工具

```typescript
// src/lib/connectionTest.ts
import { request } from 'undici';

export async function testGeminiConnection(): Promise<ConnectionTestResult> {
  const testResults: ConnectionTestResult = {
    proxy: false,
    geminiApi: false,
    details: {}
  };
  
  // 测试代理连接
  try {
    const proxyConfig = getProxyConfig();
    if (proxyConfig.enabled) {
      testResults.proxy = true;
      testResults.details.proxyUrl = proxyConfig.url;
    }
  } catch (error) {
    testResults.details.proxyError = error.message;
  }
  
  // 测试 Gemini API 连接
  try {
    const response = await request('https://generativelanguage.googleapis.com/v1/models', {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': process.env.GEMINI_API_KEY || ''
      }
    });
    
    if (response.statusCode === 200) {
      testResults.geminiApi = true;
    } else {
      testResults.details.geminiError = `HTTP ${response.statusCode}`;
    }
  } catch (error) {
    testResults.details.geminiError = error.message;
  }
  
  return testResults;
}

interface ConnectionTestResult {
  proxy: boolean;
  geminiApi: boolean;
  details: {
    proxyUrl?: string;
    proxyError?: string;
    geminiError?: string;
  };
}

// API 路由用于前端测试连接
// src/app/api/test-connection/route.ts
export async function GET() {
  try {
    const result = await testGeminiConnection();
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: 'Connection test failed', details: error.message },
      { status: 500 }
    );
  }
}
```

#### 9. 扩展功能

##### 9.1 AI 助手增强
- **历史专家模式**: 深度分析历史人物，提供专业的角色设计建议
- **剧情编剧模式**: 基于戏剧理论设计引人入胜的事件链
- **游戏平衡师模式**: 专注于数值平衡和游戏性优化

##### 9.2 协作功能
- **多人编辑**: 支持团队协作编辑，实时同步修改
- **评论系统**: 对角色和事件添加设计注释和讨论
- **版本分支**: 支持创建不同的设计方案分支

##### 9.3 高级分析
- **玩家行为预测**: 基于事件设计预测玩家的选择倾向
- **故事弧线分析**: 分析整体游戏的叙事结构和节奏
- **重玩性评估**: 评估不同角色组合下的游戏重玩价值

#### 10. 网络环境适配

##### 10.1 代理支持说明
```typescript
// 支持的代理类型
const supportedProxyTypes = [
  'HTTP代理: http://proxy.server.com:8080',
  'HTTPS代理: https://proxy.server.com:8443', 
  'SOCKS5代理: socks5://127.0.0.1:1080',
  '认证代理: http://username:password@proxy.com:8080'
];

// 自动检测和配置
export class NetworkAdapter {
  static async detectAndConfigure() {
    // 检测网络环境
    const networkInfo = await this.detectNetwork();
    
    // 自动配置最佳连接方式
    if (networkInfo.needsProxy) {
      this.setupProxy();
    }
    
    // 测试连接质量
    const connectionQuality = await this.testConnection();
    
    return {
      proxyRequired: networkInfo.needsProxy,
      connectionQuality,
      recommendations: this.getRecommendations(networkInfo)
    };
  }
  
  static setupProxy() {
    setupGlobalProxy();
    console.log('🔧 Proxy configuration applied for Gemini API access');
  }
}
```

##### 10.2 故障排除指南
```markdown
## 网络连接问题排除

### 1. 代理配置问题
- 检查环境变量 HTTP_PROXY 和 HTTPS_PROXY
- 确认代理服务器地址和端口正确
- 验证代理认证信息（如有）

### 2. API 访问问题  
- 确认 GEMINI_API_KEY 有效
- 检查 Google API 服务状态
- 验证网络防火墙设置

### 3. 连接测试命令
curl -x $HTTP_PROXY https://generativelanguage.googleapis.com/v1/models
```

这个编辑器将成为一个专门为《皇冠编年史》游戏设计的内容生成工具。通过与 Gemini 的深度集成，它能够智能生成符合现有格式的游戏内容，同时严格确保与原项目的完全兼容性。

## 🔒 核心约束保证（基于 Core 包）：

### 1. **Core 包依赖性**
- 编辑器完全基于 `crownchronicle-core` 包构建，复用所有类型定义和验证逻辑
- 使用 Core 包的 `ConfigValidator` 确保数据格式的严格一致性
- 利用 Core 包的 `GameEngine` 验证游戏逻辑的正确性

### 2. **类型安全保证**
- 基于 Core 包的 TypeScript 类型定义，编译时发现类型错误
- 使用 Core 包的 `CharacterCard` 和 `EventCard` 接口确保数据结构正确
- 通过 Core 包的类型系统防止无效的数据组合

### 3. **验证机制集成**
- 集成 Core 包的完整验证体系，包括数据格式、游戏逻辑和平衡性验证
- 利用 Core 包的 `GameSimulator` 进行游戏流程模拟测试
- 通过 Core 包的验证结果提供实时反馈和修改建议

### 4. **引擎兼容性**
- 生成的数据直接兼容 Core 包的游戏引擎，无需任何转换
- 使用 Core 包的 `DataProvider` 接口进行数据读写，保持格式一致性
- 确保编辑器生成的内容能够被游戏引擎正确解析和执行

### 5. **智能内容创作**
- 在 Core 包定义的约束范围内进行创意设计
- 利用 AI 的创造力生成符合游戏引擎要求的高质量内容
- 基于 Core 包的历史数据和规则确保内容的合理性和一致性

这样的设计确保了编辑器作为基于 Core 包的专业内容生成工具，不仅能够充分利用现有的游戏引擎功能，还能保证生成的内容与整个游戏生态系统的完美集成。通过 Core 包的约束和验证体系，编辑器能够在保持创作自由度的同时，确保内容质量和系统兼容性。