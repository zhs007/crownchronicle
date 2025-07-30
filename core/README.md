# Crown Chronicle Core

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

## 事件激活条件（EventConditions）新结构

事件卡的激活/移除/触发条件统一采用新版结构：

```typescript
export interface EventConditions {
  attributeConditions?: EventConditionItem[];
}

type EventConditionItem = {
  target: 'self' | 'player';
  attribute: keyof CharacterAttributes;
  min?: number;
  max?: number;
};
```

示例：

```typescript
const conditions: EventConditions = {
  attributeConditions: [
    { target: 'player', attribute: 'power', min: 40, max: 60 },
    { target: 'self', attribute: 'military', min: 80 },
    { target: 'player', attribute: 'health', min: 30 },
    { target: 'self', attribute: 'popularity', max: 100 }
  ]
};
```

内容编辑注意事项：
- 每个 EventConditionItem 表示一个判定条件，target 可选 'self' 或 'player'。
- attribute 必须为 CharacterAttributes 的 key（如 power、military、wealth、popularity、health、age）。
- min/max 可选，若都存在则判定区间，单独存在则判定下限或上限。
- 可组合多个条件，全部满足才激活事件。
- 严禁使用旧字段（如 minPower、maxHealth 等），仅允许 attributeConditions。

  Crown Chronicle 的核心游戏逻辑库，采用模块化架构，便于维护和扩展。该包包含游戏主流程、卡牌系统、配置校验、类型定义等核心功能，可独立运行或被 prototype/editor 等项目引用。

 目录结构：
    game/         # 游戏主流程与状态管理（GameStateManager, GameActionHandler）
    card/         # 卡牌相关逻辑（CardPoolManager, CardEffectHandler）
    validation/   # 配置与数据校验（ConfigValidator, SchemaValidator）
    types/        # 主类型定义文件（仅保留 card.ts、character.ts、event.ts、config.ts、gamecore.ts、game.ts）
    utils/        # 通用工具函数

### 类型结构精简与迁移说明

1. 类型定义全部集中于主类型文件：
   - card.ts
   - character.ts
   - event.ts
   - config.ts
   - gamecore.ts
   - game.ts
2. 已移除所有重复和废弃类型（如 FactionEffect、CharacterEffect、InterCharacterEffect、Faction、FactionSystem、CourtPolitics 等），如需扩展请在主类型文件补充。
3. 其它类型文件仅做 re-export 或注释说明，不再定义重复类型。
4. 依赖请统一从主类型文件导入，避免跨文件重复定义。
5. EventConditions、DynamicWeight 类型已精简，后续如有业务需求可再优化。

### 事件卡新版结构与自动迁移说明

#### 新版 EventCard 类型定义

```typescript
export interface EventOption {
  optionId: string;
  reply: string; // 玩家对角色的回应（原 description，可重命名）
  effects: Array<{
    target: OptionTarget;
    attribute: keyof CharacterAttributes;
    offset: number;
  }>;
}

export interface EventCard {
  eventId: string; // 全局唯一标识，自动生成
  id: string;      // 由 title 拼音自动生成
  title: string;
  dialogue: string; // 当前角色卡说的一句话
  options: [EventOption, EventOption];
  activationConditions?: EventConditions;
  removalConditions?: EventConditions;
  triggerConditions?: EventConditions;
  weight: number; // 必填，默认 1
}
```

- `importance`、`characterId` 字段已移除。
- `weight` 必填，默认 1。
- `id` 字段自动由 `title` 的拼音生成（仅在 editor 项目中，使用 tiny-pinyin）。
- 新增 `eventId` 字段，规则为角色 `characterId` + 事件 `id`，通用卡事件为角色 `characterId` + 通用卡 `id` + 通用卡事件 `id`。
- 新增 `dialogue` 字段，表示当前角色卡说的一句话。

#### 自动迁移与校验

- 推荐使用 `gameconfig/fix-config.js` 脚本批量迁移和修复所有事件卡配置：
  - 自动升级旧版字段为新版结构（如 description/target/attribute/offset 升级为 reply/effects）。
  - 自动补全 eventId、dialogue、weight、options 等字段，确保符合最新 schema。
  - 校验规则：
    - eventId 必须全局唯一，不能重复。
    - 同一角色下 title 不能重复。
    - dialogue 字段必须有内容，不能为空。
    - options 必须为两个选项，且每个选项的 reply 和 effects 字段必须完整。
    - effects 数组每项都需校验 target、attribute、offset 是否有效。
  - 所有自动修复和迁移操作均会直接写回原配置文件，并输出修复日志。
  - 如需扩展迁移逻辑，可在该脚本基础上补充字段映射、结构转换等代码。

### 类型迁移指引

请参考 `plan-011.md`，如需扩展新类型或字段，务必在主类型文件补充并同步更新所有依赖。
所有 YAML 配置、测试、适配器、业务逻辑需与主类型定义保持一致。

#### 主类型文件一览

| 文件         | 说明 |
|--------------|------|
| card.ts      | 卡牌与角色属性类型 |
| character.ts | 角色状态与配置类型 |
| event.ts     | 事件与选项类型 |
| config.ts    | 数据提供器类型 |
| gamecore.ts  | 游戏主流程类型（仅 re-export，不定义重复类型） |
| game.ts      | 游戏主类型入口 |

#### 已移除类型（如需扩展请在主类型文件定义）

- CharacterEffect
- InterCharacterEffect
- FactionEffect
- Faction
- FactionSystem
- CourtPolitics
- CardPools（重复）
- CommonCard（重复）
- EventConditions（重复）

#### 迁移/精简方案

1. 仅保留主类型文件，移除所有重复/废弃类型。
2. 所有依赖统一从主类型文件导入。
3. 配置、测试、适配器等需同步主类型结构。
4. 变更记录与迁移方案详见 `plan-011.md`。
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
### 事件配置格式 (event.yaml)
```yaml
id: "event_id"
title: "事件标题"
dialogue: "对话内容"
weight: 10
options:
  - optionId: "choice_1"
    reply: "选项文本"
    effects:
      - target: "player"
        attribute: "power"
        offset: 5
      - target: "self"
        attribute: "military"
        offset: -10
activationConditions:
  attributeConditions:
    - target: "player"
      attribute: "power"
      min: 40
      max: 60
    - target: "self"
      attribute: "military"
      min: 80
```

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
