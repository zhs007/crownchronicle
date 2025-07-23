### 需求

这是一个关于中国古代皇帝的一个卡牌游戏项目，我想要一个用 gemini 来制作卡牌的编辑器项目，也用 Next.js 开发，ts 来写。

用 function call 读写卡牌数据，卡牌数据和这个游戏数据一样，目录结构也一样，编辑好以后能直接整个目录复制过来就能替换使用。

我需要有一个和 gemini 聊天的界面，我和 gemini 讨论该如何设计角色卡和事件卡，然后 gemini 负责制作，当然，我也能让它按我的要求修改已经完成的卡牌。

类似一个 vibe coding ，但只能用来编辑这个游戏数据。

### 实现

#### 1. 项目初始化

```bash
npx create-next-app@latest crownchronicle-editor --typescript --tailwind --eslint --app
cd crownchronicle-editor
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

##### 3.1 基于现有格式的 Gemini 集成

```typescript
// src/lib/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ProxyAgent, setGlobalDispatcher } from 'undici';
import { DataManager } from './dataManager';
import { SchemaExtractor, FormatValidator } from './schemaValidator';

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
  
  private dataManager = new DataManager();
  private functionSchema: any = null;
  
  async initialize() {
    // 启动时分析现有文件格式，构建严格的Function Call Schema
    this.functionSchema = await SchemaExtractor.extractFromExistingFiles();
    console.log('✅ 基于现有文件格式初始化完成');
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
        // 验证函数调用参数是否符合现有格式
        const validationResult = await FormatValidator.validateAgainstExisting(
          call.args, 
          this.getFunctionType(call.name)
        );
        
        if (!validationResult.valid) {
          throw new Error(`数据格式不符合现有配置: ${validationResult.errors.join(', ')}`);
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
    // 确保生成的数据完全符合现有YAML格式
    const characterData = this.formatToExistingSchema(args, 'character');
    
    // 最终兼容性检查
    const compatibility = await FormatValidator.ensureCompatibility(characterData);
    if (!compatibility.isCompatible) {
      throw new Error(`生成的角色数据与现有格式不兼容: ${compatibility.issues.join(', ')}`);
    }
    
    await this.dataManager.saveCharacter(args.id, characterData);
    
    return {
      type: 'success',
      action: 'create_character',
      data: characterData,
      message: `角色 "${args.name}" 创建成功，格式完全兼容现有配置`
    };
  }
  
  private async createEvent(args: any) {
    // 确保生成的数据完全符合现有YAML格式
    const eventData = this.formatToExistingSchema(args, 'event');
    
    // 验证事件是否符合现有游戏逻辑
    const compatibility = await FormatValidator.ensureCompatibility(eventData);
    if (!compatibility.isCompatible) {
      throw new Error(`生成的事件数据与现有格式不兼容: ${compatibility.issues.join(', ')}`);
    }
    
    await this.dataManager.saveEvent(args.characterId, args.id, eventData);
    
    return {
      type: 'success',
      action: 'create_event',
      data: eventData,
      message: `事件 "${args.title}" 创建成功，格式完全兼容现有配置`
    };
  }
  
  private formatToExistingSchema(data: any, type: 'character' | 'event') {
    // 将AI生成的数据转换为完全符合现有YAML格式的结构
    const template = this.dataManager.getTemplate(type);
    
    // 严格按照现有字段结构组织数据
    const formatted = { ...template };
    
    // 只修改值，不修改结构
    Object.keys(data).forEach(key => {
      if (key in formatted) {
        if (typeof formatted[key] === 'object' && !Array.isArray(formatted[key])) {
          // 递归处理嵌套对象
          formatted[key] = { ...formatted[key], ...data[key] };
        } else {
          formatted[key] = data[key];
        }
      }
    });
    
    return formatted;
  }
  
  private buildPrompt(message: string, context: GameDataContext): string {
    return `
      你是《皇冠编年史》游戏的内容编辑助手。
      
      重要约束：
      1. 你只能生成符合现有YAML配置格式的数据
      2. 不能创建新的字段或修改现有的数据结构
      3. 所有生成的内容必须与现有游戏引擎完全兼容
      
      当前项目状态：
      已有角色: ${context.characters.map(c => c.name).join(', ')}
      已有事件数量: ${context.eventCount}
      派系系统: ${context.factions.join(', ')}
      
      用户请求: ${message}
      
      请严格按照现有的角色和事件配置格式来生成内容。
      使用提供的工具函数来创建或修改数据。
    `;
  }
  
  private handleApiError(error: any) {
    console.error('Gemini API Error:', error);
    if (error.message?.includes('proxy')) {
      throw new Error('代理连接失败，请检查 HTTP_PROXY 或 HTTPS_PROXY 环境变量');
    }
    if (error.message?.includes('API key')) {
      throw new Error('Gemini API 密钥无效，请检查 GEMINI_API_KEY 环境变量');
    }
    throw new Error(`Gemini API 调用失败: ${error.message}`);
  }
  
  private getFunctionType(functionName: string): 'character' | 'event' {
    if (functionName.includes('character')) return 'character';
    if (functionName.includes('event')) return 'event';
    throw new Error(`无法确定函数类型: ${functionName}`);
  }
}

// 代理配置检查函数
export function checkProxyConfiguration(): ProxyStatus {
  const httpProxy = process.env.HTTP_PROXY;
  const httpsProxy = process.env.HTTPS_PROXY;
  
  return {
    enabled: !!(httpProxy || httpsProxy),
    httpProxy,
    httpsProxy,
    status: httpProxy || httpsProxy ? 'configured' : 'disabled'
  };
}

interface ProxyStatus {
  enabled: boolean;
  httpProxy?: string;
  httpsProxy?: string;
  status: 'configured' | 'disabled' | 'error';
}

interface GameDataContext {
  characters: Array<{ name: string; id: string }>;
  eventCount: number;
  factions: string[];
}
```

##### 3.2 数据管理系统

```typescript
// src/lib/dataManager.ts
import { load, dump } from 'js-yaml';
import { promises as fs } from 'fs';
import path from 'path';

// 导入现有的游戏类型定义
import { 
  CharacterCard, 
  EventCard, 
  CharacterAttributes,
  RelationshipWithEmperor,
  CharacterRelationship,
  FactionInfo,
  CharacterInfluence
} from '../types/game';

export class DataManager {
  private dataPath = './src/data';
  
  async saveCharacter(characterId: string, data: CharacterYamlData) {
    const characterDir = path.join(this.dataPath, 'characters', characterId);
    await fs.mkdir(characterDir, { recursive: true });
    
    const yamlContent = dump(data, {
      indent: 2,
      quotingType: '"',
      lineWidth: -1
    });
    
    await fs.writeFile(
      path.join(characterDir, 'character.yaml'),
      yamlContent,
      'utf-8'
    );
  }
  
  async loadCharacter(characterId: string): Promise<CharacterYamlData> {
    const filePath = path.join(this.dataPath, 'characters', characterId, 'character.yaml');
    const content = await fs.readFile(filePath, 'utf-8');
    return load(content) as CharacterYamlData;
  }
  
  async saveEvent(characterId: string, eventId: string, data: EventYamlData) {
    const eventsDir = path.join(this.dataPath, 'characters', characterId, 'events');
    await fs.mkdir(eventsDir, { recursive: true });
    
    const yamlContent = dump(data, {
      indent: 2,
      quotingType: '"',
      lineWidth: -1
    });
    
    await fs.writeFile(
      path.join(eventsDir, `${eventId}.yaml`),
      yamlContent,
      'utf-8'
    );
  }
  
  async loadEvent(characterId: string, eventId: string): Promise<EventYamlData> {
    const filePath = path.join(this.dataPath, 'characters', characterId, 'events', `${eventId}.yaml`);
    const content = await fs.readFile(filePath, 'utf-8');
    return load(content) as EventYamlData;
  }
  
  async loadExistingSchema(): Promise<GameDataSchema> {
    // 分析现有文件结构，提取配置模式
    const schema = await this.analyzeExistingFiles();
    return schema;
  }
  
  async validateData(data: any, type: 'character' | 'event'): Promise<ValidationResult> {
    const schema = await this.loadExistingSchema();
    return this.validateAgainstSchema(data, schema[type]);
  }
  
  async exportProject(): Promise<Blob> {
    // 导出为与原项目兼容的目录结构
    const archiver = require('archiver');
    const archive = archiver('zip');
    
    // 只导出data目录，保持与原项目相同的结构
    archive.directory(this.dataPath, 'data');
    archive.finalize();
    
    return new Blob([archive], { type: 'application/zip' });
  }
  
  private async analyzeExistingFiles(): Promise<GameDataSchema> {
    // 读取现有的字符配置文件，分析其结构
    const existingChars = await this.getExistingCharacters();
    const existingEvents = await this.getExistingEvents();
    
    return {
      character: this.extractCharacterSchema(existingChars),
      event: this.extractEventSchema(existingEvents)
    };
  }
}

// 严格基于现有文件格式的类型定义
interface CharacterYamlData {
  id: string;
  name: string;
  displayName: string;
  role: string;
  description: string;
  category: string;
  rarity: string;
  
  initialAttributes: {
    power: number;
    loyalty: number;
    ambition: number;
    competence: number;
    reputation: number;
    health: number;
    age: number;
  };
  
  initialRelationshipWithEmperor: {
    affection: number;
    trust: number;
    fear: number;
    respect: number;
    dependency: number;
    threat: number;
  };
  
  factionInfo: {
    primaryFaction: string;
    secondaryFactions: string[];
    factionLoyalty: number;
    leadershipRole: string;
  };
  
  relationshipNetwork: Array<{
    targetCharacter: string;
    relationType: string;
    relationshipStrength: number;
    secretLevel: number;
    historicalBasis: string;
  }>;
  
  influence: {
    health: number;
    authority: number;
    treasury: number;
    military: number;
    popularity: number;
  };
  
  // 其他字段完全按照现有格式...
}

interface EventYamlData {
  id: string;
  title: string;
  description: string;
  speaker: string;
  dialogue: string;
  
  characterClues?: {
    revealedTraits?: string[];
    personalityHints?: string[];
    backgroundHints?: string[];
  };
  
  activationConditions?: {
    minReignYears?: number;
    maxReignYears?: number;
    minAge?: number;
    maxAge?: number;
    // 其他条件按现有格式...
  };
  
  weight: number;
  
  choices: Array<{
    id: string;
    text: string;
    effects: {
      health?: number;
      authority?: number;
      treasury?: number;
      military?: number;
      popularity?: number;
    };
    consequences?: string;
    // 其他字段按现有格式...
  }>;
}
```

##### 3.3 基于现有格式的 Function Calls 定义

```typescript
// Gemini Function Calls 工具定义 - 严格基于现有的YAML配置格式
// 通过分析现有文件提取准确的字段定义

export class SchemaExtractor {
  static async extractFromExistingFiles(): Promise<FunctionCallSchema> {
    // 读取现有的角色和事件文件，提取准确的字段结构
    const existingCharacter = await this.loadSampleCharacter();
    const existingEvent = await this.loadSampleEvent();
    
    return {
      createCharacter: this.buildCharacterSchema(existingCharacter),
      createEvent: this.buildEventSchema(existingEvent),
      modifyCharacter: this.buildModificationSchema('character'),
      modifyEvent: this.buildModificationSchema('event')
    };
  }
  
  private static buildCharacterSchema(sample: any) {
    return {
      name: 'create_character',
      description: '基于现有格式创建角色卡牌，严格遵循YAML配置结构',
      parameters: {
        type: 'object',
        properties: {
          // 基本信息 - 从现有文件提取字段
          id: { 
            type: 'string', 
            description: '角色唯一标识，格式如现有文件',
            pattern: '^[a-z]+$'
          },
          name: { 
            type: 'string', 
            description: '角色真实姓名，如"武则天"'
          },
          displayName: { 
            type: 'string', 
            description: '游戏显示称谓，如"母后"'
          },
          role: { 
            type: 'string', 
            description: '角色身份，如"母后"、"宰相"等'
          },
          description: { 
            type: 'string', 
            description: '角色外观行为描述，不透露真实身份'
          },
          category: { 
            type: 'string', 
            enum: this.extractEnumValues(sample, 'category'),
            description: '角色类别，使用现有分类'
          },
          rarity: {
            type: 'string',
            enum: this.extractEnumValues(sample, 'rarity'),
            description: '稀有度，使用现有等级'
          },
          
          // 初始属性 - 完全按照现有结构
          initialAttributes: {
            type: 'object',
            properties: this.extractObjectSchema(sample.initialAttributes),
            required: Object.keys(sample.initialAttributes),
            additionalProperties: false
          },
          
          // 与皇帝关系 - 完全按照现有结构
          initialRelationshipWithEmperor: {
            type: 'object',
            properties: this.extractObjectSchema(sample.initialRelationshipWithEmperor),
            required: Object.keys(sample.initialRelationshipWithEmperor),
            additionalProperties: false
          },
          
          // 派系信息 - 完全按照现有结构
          factionInfo: {
            type: 'object',
            properties: this.extractObjectSchema(sample.factionInfo),
            required: Object.keys(sample.factionInfo),
            additionalProperties: false
          },
          
          // 关系网络 - 完全按照现有结构
          relationshipNetwork: {
            type: 'array',
            items: {
              type: 'object',
              properties: this.extractObjectSchema(sample.relationshipNetwork[0]),
              required: Object.keys(sample.relationshipNetwork[0]),
              additionalProperties: false
            }
          },
          
          // 影响系数 - 完全按照现有结构
          influence: {
            type: 'object',
            properties: this.extractObjectSchema(sample.influence),
            required: Object.keys(sample.influence),
            additionalProperties: false
          }
        },
        required: this.extractRequiredFields(sample),
        additionalProperties: false  // 严格禁止额外字段
      }
    };
  }
  
  private static buildEventSchema(sample: any) {
    return {
      name: 'create_event',
      description: '基于现有格式创建事件卡牌，严格遵循YAML配置结构',
      parameters: {
        type: 'object',
        properties: {
          characterId: { 
            type: 'string', 
            description: '所属角色ID，必须是已存在的角色'
          },
          id: { 
            type: 'string', 
            description: '事件唯一标识'
          },
          title: { 
            type: 'string', 
            description: '事件标题'
          },
          description: { 
            type: 'string', 
            description: '事件描述'
          },
          speaker: { 
            type: 'string', 
            description: '说话角色的称谓（非真实姓名）'
          },
          dialogue: { 
            type: 'string', 
            description: '角色对话内容'
          },
          
          // 角色线索 - 按现有格式（可选）
          characterClues: sample.characterClues ? {
            type: 'object',
            properties: this.extractObjectSchema(sample.characterClues),
            additionalProperties: false
          } : undefined,
          
          // 激活条件 - 按现有格式（可选）
          activationConditions: sample.activationConditions ? {
            type: 'object',
            properties: this.extractObjectSchema(sample.activationConditions),
            additionalProperties: false
          } : undefined,
          
          // 权重 - 按现有格式
          weight: {
            type: 'number',
            minimum: 1,
            maximum: 20,
            description: '事件权重'
          },
          
          // 选项 - 完全按照现有结构
          choices: {
            type: 'array',
            items: {
              type: 'object',
              properties: this.extractObjectSchema(sample.choices[0]),
              required: Object.keys(sample.choices[0]),
              additionalProperties: false
            },
            minItems: 1
          }
        },
        required: this.extractRequiredFields(sample),
        additionalProperties: false
      }
    };
  }
}

// 配置验证器 - 确保生成的数据与现有格式完全兼容
export class FormatValidator {
  static async validateAgainstExisting(
    data: any, 
    type: 'character' | 'event'
  ): Promise<ValidationResult> {
    const existingFiles = await this.loadExistingFiles(type);
    const schema = this.buildSchemaFromExisting(existingFiles);
    
    return this.validate(data, schema);
  }
  
  static async ensureCompatibility(generatedData: any): Promise<CompatibilityReport> {
    // 检查生成的数据是否与现有游戏引擎兼容
    const compatibility = {
      fieldCompatibility: this.checkFieldCompatibility(generatedData),
      typeCompatibility: this.checkTypeCompatibility(generatedData),
      structureCompatibility: this.checkStructureCompatibility(generatedData),
      valueRangeCompatibility: this.checkValueRanges(generatedData)
    };
    
    return compatibility;
  }
}

// 严格的数据生成器 - 只生成符合现有格式的数据
export class StrictDataGenerator {
  constructor(private schema: ExistingGameSchema) {}
  
  generateCharacterData(requirements: any): CharacterYamlData {
    // 基于现有schema和用户需求生成数据
    const template = this.schema.characterTemplate;
    return {
      ...template,
      // 只修改值，不修改结构
      id: this.generateValidId(requirements.name),
      name: requirements.name,
      displayName: requirements.displayName,
      // ... 其他字段严格按照模板结构
    };
  }
  
  generateEventData(requirements: any): EventYamlData {
    const template = this.schema.eventTemplate;
    return {
      ...template,
      // 只修改值，不修改结构
      id: this.generateValidId(requirements.title),
      characterId: requirements.characterId,
      // ... 其他字段严格按照模板结构
    };
  }
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

#### 6. 技术特性（严格基于现有格式）

- **格式锁定系统**: 自动分析现有YAML文件，锁定数据结构，防止格式变更
- **兼容性检测引擎**: 实时验证生成数据与现有游戏引擎的100%兼容性
- **模式驱动生成**: 基于提取的数据模式智能生成内容，确保格式一致性
- **无侵入式编辑**: 只修改数据值，绝不改变字段结构或添加新字段
- **原生YAML输出**: 生成的文件与手写YAML完全一致，保持原有风格
- **批量格式验证**: 支持批量检查所有生成内容的格式合规性
- **向后兼容保证**: 确保新生成的数据不会破坏现有游戏逻辑
- **零配置集成**: 生成的数据可直接复制到原项目，无需任何修改
- **格式演进跟踪**: 当原项目格式更新时，自动适配新的数据结构
- **质量一致性**: 生成的内容在格式和质量上与原有数据保持一致

#### 7. 核心算法和验证规则

##### 7.1 三卡池流转验证
```typescript
// 验证事件激活条件的合理性
interface PoolValidation {
  checkActivationLogic(event: EventConfig): ValidationResult;
  simulatePoolFlow(characters: CharacterConfig[]): PoolSimulation;
  detectDeadlocks(gameState: SimulatedGameState): DeadlockReport;
}

// 确保游戏始终有可用事件
const poolHealthCheck = {
  minActiveEvents: 3,        // 主卡池最少事件数
  maxPendingEvents: 50,      // 待定卡池最大事件数
  emergencyEvents: ['daily_court', 'health_check'],  // 紧急事件
  balanceThreshold: 0.7      // 平衡阈值
};
```

##### 7.2 关系网络一致性检查
```typescript
// 检查角色关系的逻辑一致性
interface RelationshipValidator {
  validateBidirectional(char1: string, char2: string): boolean;
  checkHistoricalAccuracy(relationship: Relationship): AccuracyScore;
  detectConflicts(network: RelationshipNetwork): Conflict[];
  suggestOptimizations(network: RelationshipNetwork): Suggestion[];
}
```

##### 7.3 数值平衡分析
```typescript
// 游戏数值平衡验证
interface BalanceAnalyzer {
  analyzeAttributeRanges(characters: CharacterConfig[]): BalanceReport;
  validateEventEffects(events: EventConfig[]): EffectAnalysis;
  simulateGameProgression(setup: GameSetup): ProgressionAnalysis;
  recommendAdjustments(analysis: BalanceReport): Adjustment[];
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

## 🔒 核心约束保证：

### 1. **格式不可变性**
- 编辑器只生成数据内容，绝不修改现有的YAML结构
- 严格按照现有字段定义生成内容
- 保持与原项目100%的格式兼容性

### 2. **无缝集成**
- 生成的文件可直接复制到原游戏项目使用
- 无需任何格式转换或适配工作
- 保持原有的代码风格和命名约定

### 3. **智能内容创作**
- 基于现有格式约束进行创意设计
- 利用AI的创造力在既定框架内生成高质量内容
- 确保历史准确性和游戏平衡性

这样的设计确保了编辑器作为一个纯粹的内容生成工具，专注于在现有技术框架内提供创作支持，而不会对原项目的架构产生任何影响。