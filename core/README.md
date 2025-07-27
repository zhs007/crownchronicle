# Crown Chronicle Core

Crown Chronicle 的核心游戏逻辑库，采用模块化架构，便于维护和扩展。该包包含游戏主流程、卡牌系统、配置校验、类型定义等核心功能，可独立运行或被 prototype/editor 等项目引用。

## 目录结构与模块边界

```
src/
  engine/
    game/         # 游戏主流程与状态管理（GameStateManager, GameActionHandler）
    card/         # 卡牌相关逻辑（CardPoolManager, CardEffectHandler）
    validation/   # 配置与数据校验（ConfigValidator, SchemaValidator）
  types/          # 按领域拆分的类型定义（gamecore, card, config, event, character, faction 等）
  utils/          # 通用工具函数
```

### 设计原则
- 各模块通过类型和接口交互，严禁跨层直接依赖
- core 不引入任何配置管理、UI、文件系统等外部依赖
- 类型定义集中管理，所有模块统一从 `types/` 导入

### 迁移与重构说明
- 详见 `plan-006.md` 和 `plan-006-report.md`，包含每次迁移 checklist、遇到的问题及解决方案
- 旧文件已归档，遗留适配器已清理，详见迁移报告

### 文档与协作建议
- 关键设计决策、模块边界、接口说明需补充注释和文档
- 拆分和重构过程全程记录在 `plan-006-report.md`，并同步到本 README
- 定期评审迁移进度，及时调整方案

## 功能特性

- 🎮 **完整的游戏引擎** - 处理游戏状态、回合逻辑、事件触发
- 🃏 **三卡池系统** - 待定、主动、弃用卡池的智能管理
- 👥 **角色关系系统** - 复杂的角色间关系网络和派系系统
- 🎯 **策略模式** - 支持多种AI玩家策略
- 🔍 **配置验证** - 完整的游戏数据验证系统
- 🧪 **游戏模拟** - 支持批量模拟和性能分析
- 📊 **数据提供器** - 灵活的数据加载机制

## 安装

```bash
npm install crownchronicle-core
```

## 快速开始

### 基本游戏流程

```typescript
import { 
  GameEngine, 
  CardPoolManager, 
  FileSystemDataProvider,
  RandomPlayerStrategy 
} from 'crownchronicle-core';

// 创建数据提供器
const dataProvider = new FileSystemDataProvider('./data');

// 创建玩家策略
const playerStrategy = new RandomPlayerStrategy();

// 创建新游戏
const gameState = GameEngine.createNewGame('normal');

// 游戏循环示例
while (!gameState.gameOver) {
  // 更新卡池
  CardPoolManager.updatePendingPool(gameState);
  
  // 选择下一个事件
  const nextEvent = CardPoolManager.selectNextEvent(gameState);
  if (!nextEvent) break;
  
  // 让策略选择选项
  const choiceId = await playerStrategy.chooseOption(gameState, nextEvent);
  const choice = nextEvent.choices.find(c => c.id === choiceId);
  
  if (choice) {
    // 应用选择效果
    GameEngine.applyChoiceEffects(gameState, choice);
    GameEngine.recordGameEvent(gameState, nextEvent, choice);
  }
  
  CardPoolManager.discardEvent(gameState, nextEvent.id);
  
  // 处理回合结束
  GameEngine.processTurnEnd(gameState);
  
  // 检查游戏结束条件
  const gameOverCheck = GameEngine.checkGameOver(gameState);
  if (gameOverCheck.gameOver) {
    gameState.gameOver = true;
    gameState.gameOverReason = gameOverCheck.reason;
  }
}
```

### 游戏模拟

```typescript
import { 
  GameSimulator, 
  FileSystemDataProvider,
  BalancedPlayerStrategy 
} from 'crownchronicle-core';

const dataProvider = new FileSystemDataProvider('./data');
const strategy = new BalancedPlayerStrategy();
const simulator = new GameSimulator(dataProvider, strategy);

// 运行单次模拟
const result = await simulator.runSimulation({
  difficulty: 'normal',
  minCharacters: 3,
  maxCharacters: 5
});

console.log(`游戏结束: ${result.gameOverReason}`);
console.log(`回合数: ${result.turns}`);
console.log(`耗时: ${result.duration}ms`);

// 批量模拟
const batchResults = await simulator.runBatchSimulation(100);
const analysis = GameSimulator.analyzeResults(batchResults);

console.log(`成功率: ${analysis.successRate * 100}%`);
console.log(`平均回合数: ${analysis.averageTurns}`);
console.log(`平均属性:`, analysis.averageStats);
```

### 配置验证

```typescript
import { 
  ConfigValidator, 
  FileSystemDataProvider 
} from 'crownchronicle-core';

const dataProvider = new FileSystemDataProvider('./data');
const validator = new ConfigValidator(dataProvider);

// 验证所有配置
const result = await validator.validateAll();

if (!result.valid) {
  console.log('发现配置问题:');
  result.issues.forEach(issue => {
    console.log(`${issue.type}: ${issue.message}`);
    if (issue.suggestion) {
      console.log(`建议: ${issue.suggestion}`);
    }
  });
}
```

## API 参考

### 核心类

#### GameEngine
游戏引擎的核心类，处理游戏状态和逻辑。

- `createNewGame(difficulty)` - 创建新游戏
- `checkGameOver(gameState)` - 检查游戏结束条件
- `applyChoiceEffects(gameState, choice)` - 应用选择效果
- `processTurnEnd(gameState)` - 处理回合结束
- `checkEventConditions(event, gameState)` - 检查事件触发条件

#### CardPoolManager
管理三卡池系统的类。

- `updatePendingPool(gameState)` - 更新待定卡池
- `selectNextEvent(gameState)` - 选择下一个事件
- `discardEvent(gameState, eventId)` - 移除事件到弃卡池
- `forceActivate(gameState, eventId)` - 强制激活事件

#### GameSimulator
用于批量模拟游戏的类。

- `runSimulation(config)` - 运行单次模拟
- `runBatchSimulation(count, config)` - 批量模拟
- `analyzeResults(results)` - 分析模拟结果

### 策略类

#### RandomPlayerStrategy
随机选择策略，适合快速测试。

#### ConservativePlayerStrategy
保守策略，优先选择风险较低的选项。

#### AggressivePlayerStrategy
激进策略，优先选择潜在收益较高的选项。

#### BalancedPlayerStrategy
平衡策略，在风险和收益之间寻找平衡。

### 数据提供器

#### FileSystemDataProvider
从文件系统加载游戏数据。

#### MemoryDataProvider
从内存中加载预定义的游戏数据。

## 数据格式

### 角色配置格式 (character.yaml)

```yaml
id: "character_id"
name: "角色真实姓名"
displayName: "游戏中显示名称"
role: "角色身份"
description: "角色描述"
category: "角色类别"
rarity: "common" # common, rare, epic, legendary

initialAttributes:
  power: 50
  loyalty: 70
  ambition: 30
  competence: 80
  reputation: 60
  health: 90
  age: 35

initialRelationshipWithEmperor:
  affection: 20
  trust: 50
  fear: 10
  respect: 70
  dependency: 40
  threat: 5

factionInfo:
  primaryFaction: "改革派"
  secondaryFactions: []
  factionLoyalty: 80
  leadershipRole: "core"

relationshipNetwork:
  - targetCharacter: "other_character_id"
    relationType: "ally"
    relationshipStrength: 60
    secretLevel: 30
    historicalBasis: "共同经历"

influence:
  health: 5
  authority: 10
  treasury: 15
  military: 8
  popularity: 12

traits:
  - "智慧"
  - "忠诚"

hiddenTraits:
  - "野心"

backgroundClues:
  appearance: "外貌描述"
  mannerisms: "行为特征"
  preferences: "喜好偏向"
  relationships: "关系线索"
  secrets: "秘密信息"
```

### 事件配置格式 (event.yaml)

```yaml
id: "event_id"
title: "事件标题"
description: "事件描述"
speaker: "说话者"
dialogue: "对话内容"

weight: 10

choices:
  - id: "choice_1"
    text: "选项文本"
    effects:
      authority: 5
      treasury: -10
    consequences: "选择后果"
    characterEffects:
      - characterId: "character_id"
        attributeChanges:
          loyalty: 10
        relationshipChanges:
          trust: 5

activationConditions:
  minReignYears: 1
  minAuthority: 30

triggerConditions:
  minHealth: 20
```

## 开发

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化）
npm run dev

# 构建
npm run build

# 运行测试
npm test

# 监听测试
npm run test:watch
```

## 许可证

MIT License
