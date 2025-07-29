# 角色生成与合成机制

## 角色生成（基于标签/tag）

为提升可玩性，Crown Chronicle 支持通过标签（tags）组合生成新角色，而非简单随机历史角色卡。

- 每张角色卡需配置 `tags: string[]` 字段（如“丞相”、“忠臣”、“奸臣”等），便于灵活筛选。
- 角色生成器支持通过指定 tag list，筛选多张角色卡，组合生成新角色。
- 生成的新角色属性按如下规则合成：
  - `power`、`military`、`wealth`、`popularity` 取所有合成卡的最大值
  - `health`、`age` 取所有合成卡的平均值（向下取整）
  - 其余属性如有新增，需在实现时补充规则
- 角色姓名生成时，姓氏取自事件最多的角色卡，名和字可用常用字库/算法生成，并自动避开黑名单（如“武则天”、“刘备”等，见 `gameconfig/forbidden_names.json`）
- 角色生成接口：
  ```typescript
  // core/src/engine/CharacterGenerator.ts
  export function generateCharacterByTags(tags: string[], options?: GenerateOptions): CharacterCard
  ```

## 角色数据结构关键字段

```yaml
id: char001
name: "诸葛 亮"
tags:
  - 丞相
  - 忠臣
power: 90
military: 80
wealth: 60
popularity: 95
health: 70
age: 54
events:
  - 草船借箭
  - 三气周瑜
```

> `tags` 字段为必填，`name` 字段建议“姓 名”格式，便于解析与展示。

## 名字生成与校验
- 黑名单校验：生成姓名不得与历史人物重名，自动避开 `gameconfig/forbidden_names.json`
- 可维护常用名/字词库于 `gameconfig/names/`

```typescript

const tags = ['丞相', '忠臣'];
const newCharacter = generateCharacterByTags(tags);
console.log(newCharacter);
```

## 数据一致性与校验

- 所有角色卡需补全 `tags` 字段，避免老数据缺失导致异常
- 推荐通过 core 的 `ConfigValidator` 进行批量校验
- 建议维护 JSON Schema，确保数据结构一致性

## 文档同步与维护

- 每次主要实现或数据结构调整后，需同步更新本 README 及相关文档
- 变更/迁移建议记录于 `plan-007-report.md` 等

---
# Crown Chronicle Core

Crown Chronicle 的核心游戏逻辑库，采用模块化架构，便于维护和扩展。该包包含游戏主流程、卡牌系统、配置校验、类型定义等核心功能，可独立运行或被 prototype/editor 等项目引用。

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
tags:
  - "丞相"
  - "忠臣"
description: "角色描述"
attributes:
  power: 50
  military: 80
  wealth: 60
  popularity: 95
  health: 90
  age: 35
eventIds:
  - "event_1"
  - "event_2"
commonCardIds:
  - "chancellor_common"
```

### 事件配置格式 (event.yaml)
## 迁移指引

1. 角色卡 YAML/JSON 数据需批量移除所有已废弃字段，仅保留 id、name、tags、description、attributes、eventIds、commonCardIds。
2. 代码层所有类型定义、适配器、UI、测试用例均需同步上述字段。
3. 旧字段如 displayName、role、category、rarity、traits、hiddenTraits、backgroundClues、conditions 等全部移除。
4. 角色属性请统一放入 attributes 字段。
5. 事件 ID 统一放入 eventIds 字段。

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
