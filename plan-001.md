### 需求

这是一个游戏的原型项目，还会有一个编辑器项目，以后还会有正式的游戏项目，所以我觉得应该把核心游戏逻辑部分也单独分拆成一个项目，这个项目是一个纯逻辑项目，ts 来实现。

最终应该会需要放在后端执行。

基础的卡牌定义、卡牌数据读取，游戏进程推进都应该包含在内。

还需要能验证卡牌数据合法。
还需要能快速进行游戏流程（这里可以要求传入一个玩家选择的 callback，外部调用者可以实现一个随机或有一定智能的玩家选择，让游戏进程飞快推进）。
这样才能让编辑器项目快速验证卡牌数据配置的合理性。

### 实现方案

基于对原型项目和编辑器项目的分析，核心游戏逻辑拆分的实现方案如下：

#### 1. 项目结构重新设计

##### 1.1 整体项目布局

```
workspace/
├── core/                          # 核心游戏逻辑项目
│   ├── src/
│   │   ├── engine/                # 游戏引擎
│   │   │   ├── GameEngine.ts
│   │   │   ├── CardPoolManager.ts
│   │   │   ├── GameSimulator.ts
│   │   │   └── ConfigValidator.ts
│   │   ├── strategies/            # 玩家策略
│   │   │   ├── RandomPlayerStrategy.ts
│   │   │   ├── ConservativePlayerStrategy.ts
│   │   │   └── AggressivePlayerStrategy.ts
│   │   ├── data/                  # 数据层
│   │   │   ├── DataProvider.ts
│   │   │   ├── FileSystemDataProvider.ts
│   │   │   └── MemoryDataProvider.ts
│   │   ├── types/                 # 类型定义
│   │   │   ├── game.ts
│   │   │   ├── character.ts
│   │   │   ├── event.ts
│   │   │   └── config.ts
│   │   ├── utils/                 # 工具函数
│   │   │   ├── constants.ts
│   │   │   ├── calculations.ts
│   │   │   └── gameHelpers.ts
│   │   └── index.ts               # 导出入口
│   ├── tests/                     # 测试文件
│   │   ├── engine/
│   │   ├── strategies/
│   │   └── integration/
│   ├── package.json
│   ├── tsconfig.json
│   ├── rollup.config.js
│   ├── jest.config.js
│   └── README.md

├── prototype/                     # 原型项目 (调整后)
│   ├── src/
│   │   ├── app/                   # Next.js 应用
│   │   │   ├── api/               # API 路由 (简化)
│   │   │   │   ├── saves/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   └── [saveId]/
│   │   │   │   │       ├── route.ts
│   │   │   │   │       └── action/
│   │   │   │   │           └── route.ts
│   │   │   │   └── characters/
│   │   │   │       └── route.ts
│   │   │   ├── game/
│   │   │   │   └── [saveId]/
│   │   │   │       └── page.tsx
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/            # UI 组件
│   │   │   ├── game/
│   │   │   │   ├── EmperorStats.tsx
│   │   │   │   ├── CharacterPanel.tsx
│   │   │   │   ├── EventDisplay.tsx
│   │   │   │   └── GameHistory.tsx
│   │   │   └── SaveManager.tsx
│   │   ├── lib/                   # 适配层
│   │   │   ├── gameAdapter.ts     # 核心逻辑适配器
│   │   │   ├── saveManager.ts     # 存档管理
│   │   │   └── uiPlayerStrategy.ts # UI 玩家策略
│   │   ├── types/                 # UI 特有类型
│   │   │   ├── ui.ts
│   │   │   └── api.ts
│   │   └── utils/                 # UI 工具
│   │       ├── apiClient.ts
│   │       └── constants.ts
│   ├── data/                      # 游戏数据 (保持不变)
│   │   └── characters/
│   ├── saves/                     # 存档文件
│   ├── package.json
│   ├── tsconfig.json
│   └── next.config.js

└── editor/                       # 编辑器项目
    ├── src/
    │   ├── app/                   # Next.js 应用
    │   │   ├── api/
    │   │   │   ├── gemini/
    │   │   │   │   └── route.ts
    │   │   │   ├── data/
    │   │   │   │   ├── characters/
    │   │   │   │   └── events/
    │   │   │   ├── simulation/
    │   │   │   │   └── route.ts   # 模拟测试 API
    │   │   │   └── validation/
    │   │   │       └── route.ts   # 配置验证 API
    │   │   ├── simulation/
    │   │   │   └── page.tsx       # 模拟测试页面
    │   │   ├── validation/
    │   │   │   └── page.tsx       # 配置验证页面
    │   │   ├── globals.css
    │   │   ├── layout.tsx
    │   │   └── page.tsx
    │   ├── components/
    │   │   ├── editor/
    │   │   │   ├── CharacterEditor.tsx
    │   │   │   ├── EventEditor.tsx
    │   │   │   └── CodeEditor.tsx
    │   │   ├── simulation/
    │   │   │   ├── SimulationRunner.tsx
    │   │   │   ├── SimulationResults.tsx
    │   │   │   └── StrategySelector.tsx
    │   │   ├── validation/
    │   │   │   ├── ValidationPanel.tsx
    │   │   │   └── ValidationResults.tsx
    │   │   └── ChatInterface.tsx
    │   ├── lib/
    │   │   ├── coreIntegration.ts  # 核心逻辑集成
    │   │   ├── simulationRunner.ts # 模拟运行器
    │   │   ├── validationHelper.ts # 验证助手
    │   │   └── gemini.ts
    │   ├── types/
    │   │   ├── editor.ts
    │   │   └── gemini.ts
    │   └── data/                   # 编辑中的数据
    │       └── characters/
    ├── package.json
    ├── tsconfig.json
    └── next.config.js
```

##### 1.2 核心项目详细结构

**core 包配置**

```json
// core/package.json
{
  "name": "crownchronicle-core",
  "version": "1.0.0",
  "description": "Core game logic for Crown Chronicle",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist/"
  ],
  "scripts": {
    "build": "rollup -c",
    "test": "jest",
    "test:watch": "jest --watch",
    "dev": "rollup -c -w",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "js-yaml": "^4.1.0"
  },
  "devDependencies": {
    "@rollup/plugin-typescript": "^11.1.5",
    "@types/js-yaml": "^4.0.9",
    "@types/jest": "^29.5.8",
    "jest": "^29.7.0",
    "rollup": "^4.4.0",
    "typescript": "^5.2.2",
    "ts-jest": "^29.1.1"
  },
  "peerDependencies": {
    "typescript": "^5.0.0"
  }
}
```

**构建配置**

```javascript
// core/rollup.config.js
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true
    },
    {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true
    }
  ],
  external: ['js-yaml'],
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: 'dist'
    })
  ]
};
```

##### 1.3 原型项目结构调整

**移除的文件/模块**
```
src/lib/
├── ❌ gameEngine.ts        # 移到 core
├── ❌ cardPoolManager.ts   # 移到 core  
├── ❌ configLoader.ts      # 移到 core
└── ❌ constants.ts         # 游戏逻辑常量移到 core

src/types/
├── ❌ game.ts              # 移到 core
└── ❌ saves.ts             # 部分移到 core
```

**新增的适配层**
```
src/lib/
├── ✅ gameAdapter.ts       # 核心逻辑适配器
├── ✅ uiPlayerStrategy.ts  # UI 玩家策略实现
└── ✅ saveAdapter.ts       # 存档系统适配

src/types/
├── ✅ ui.ts                # UI 特有类型
└── ✅ api.ts               # API 接口类型 (简化版)
```

**包依赖调整**
```json
// prototype/package.json 新增依赖
{
  "dependencies": {
    "crownchronicle-core": "file:../core",
    // ... 其他现有依赖
  }
}
```

##### 1.4 编辑器项目结构设计

**核心集成模块**
```
src/lib/
├── coreIntegration.ts      # 核心逻辑集成
├── simulationRunner.ts     # 批量模拟运行
├── validationHelper.ts     # 配置验证助手
├── memoryDataProvider.ts   # 内存数据提供器扩展
└── strategiesManager.ts    # 策略管理器
```

**新增页面和组件**
```
src/app/
├── simulation/
│   └── page.tsx            # 模拟测试页面
├── validation/
│   └── page.tsx            # 配置验证页面
└── debug/
    └── page.tsx            # 游戏调试页面

src/components/
├── simulation/
│   ├── SimulationRunner.tsx     # 运行模拟测试
│   ├── SimulationResults.tsx    # 显示测试结果
│   ├── StrategySelector.tsx     # 选择测试策略
│   └── PerformanceChart.tsx     # 性能图表
├── validation/
│   ├── ValidationPanel.tsx     # 验证控制面板
│   ├── ValidationResults.tsx   # 验证结果显示
│   └── IssuesList.tsx          # 问题列表
└── debug/
    ├── GameStateViewer.tsx     # 游戏状态查看器
    ├── EventTracker.tsx        # 事件追踪器
    └── StepByStepRunner.tsx    # 步进式运行器
```

#### 2. 核心架构设计

##### 2.1 核心游戏引擎 (crownchronicle-core)

```typescript
// src/index.ts - 主要导出接口
export { GameEngine } from './engine/GameEngine';
export { GameSimulator } from './engine/GameSimulator';
export { ConfigValidator } from './engine/ConfigValidator';
export * from './types';

// 主要API接口
export interface CoreGameEngine {
  // 创建新游戏
  createGame(config: GameDataConfig): GameState;
  
  // 处理玩家选择
  processChoice(gameState: GameState, choiceId: string): GameUpdateResult;
  
  // 快速模拟游戏 (供编辑器使用)
  simulateGame(
    config: GameDataConfig, 
    playerStrategy: PlayerStrategy,
    maxTurns?: number
  ): SimulationResult;
  
  // 验证配置数据
  validateConfig(config: GameDataConfig): ValidationResult;
  
  // 步进式游戏推进 (用于逐步调试)
  stepGame(gameState: GameState): GameStepResult;
}

// 玩家策略接口 - 支持AI和真人玩家
export interface PlayerStrategy {
  makeChoice(gameState: GameState, event: EventCard): Promise<string>;
  getName(): string;
}
```

##### 1.2 游戏引擎核心实现

```typescript
// src/engine/GameEngine.ts
export class GameEngine implements CoreGameEngine {
  private dataProvider: DataProvider;
  
  constructor(dataProvider: DataProvider) {
    this.dataProvider = dataProvider;
  }
  
  createGame(config: GameDataConfig): GameState {
    // 1. 验证配置
    const validation = this.validateConfig(config);
    if (!validation.isValid) {
      throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
    }
    
    // 2. 初始化游戏状态
    const gameState: GameState = {
      emperor: this.createInitialEmperor(config.difficulty),
      activeCharacters: [],
      cardPools: { pending: [], active: [], discarded: [] },
      gameHistory: [],
      currentEvent: null,
      currentTurn: 1,
      gameOver: false,
      // ... 其他初始状态
    };
    
    // 3. 选择角色并加载事件
    const selectedCharacters = this.selectCharacters(config);
    gameState.activeCharacters = selectedCharacters;
    
    const allEvents = selectedCharacters.flatMap(char => 
      this.dataProvider.loadCharacterEvents(char.id)
    );
    gameState.cardPools.pending = allEvents;
    
    // 4. 激活初始事件
    this.updateCardPools(gameState);
    gameState.currentEvent = this.selectNextEvent(gameState);
    
    return gameState;
  }
  
  processChoice(gameState: GameState, choiceId: string): GameUpdateResult {
    if (!gameState.currentEvent) {
      throw new Error('当前没有可处理的事件');
    }
    
    // 1. 查找选择
    const choice = gameState.currentEvent.choices.find(c => c.id === choiceId);
    if (!choice) {
      throw new Error(`无效的选择ID: ${choiceId}`);
    }
    
    // 2. 创建新状态副本 (纯函数)
    const newState = this.cloneGameState(gameState);
    
    // 3. 应用选择效果
    this.applyChoiceEffects(newState, choice);
    
    // 4. 记录历史
    this.recordGameEvent(newState, gameState.currentEvent, choice);
    
    // 5. 检查游戏结束
    const gameOverCheck = this.checkGameOver(newState);
    if (gameOverCheck.isGameOver) {
      newState.gameOver = true;
      newState.gameOverReason = gameOverCheck.reason;
      return { gameState: newState, gameOver: true };
    }
    
    // 6. 进入下一回合
    this.nextTurn(newState);
    
    return { 
      gameState: newState, 
      gameOver: false,
      eventChanged: newState.currentEvent?.id !== gameState.currentEvent?.id
    };
  }
  
  // 核心逻辑：更新卡池状态
  private updateCardPools(gameState: GameState): void {
    const { pending, active, discarded } = gameState.cardPools;
    
    // 检查待定卡池，移动符合条件的事件到激活池
    const toActivate: EventCard[] = [];
    const toRemove: EventCard[] = [];
    const remaining: EventCard[] = [];
    
    pending.forEach(event => {
      if (this.shouldRemoveEvent(event, gameState)) {
        toRemove.push(event);
      } else if (this.shouldActivateEvent(event, gameState)) {
        toActivate.push(event);
      } else {
        remaining.push(event);
      }
    });
    
    gameState.cardPools.pending = remaining;
    gameState.cardPools.active = [...active, ...toActivate];
    gameState.cardPools.discarded = [...discarded, ...toRemove];
  }
  
  // 事件选择算法
  private selectNextEvent(gameState: GameState): EventCard | null {
    const availableEvents = gameState.cardPools.active.filter(event =>
      this.checkEventTriggerConditions(event, gameState)
    );
    
    if (availableEvents.length === 0) return null;
    
    // 权重计算
    const weightedEvents = availableEvents.map(event => ({
      event,
      weight: this.calculateEventWeight(event, gameState)
    }));
    
    // 权重随机选择
    return this.selectByWeight(weightedEvents);
  }
}
```

##### 1.3 游戏模拟器实现

```typescript
// src/engine/GameSimulator.ts
export class GameSimulator {
  private gameEngine: GameEngine;
  
  constructor(gameEngine: GameEngine) {
    this.gameEngine = gameEngine;
  }
  
  async simulateGame(
    config: GameDataConfig,
    playerStrategy: PlayerStrategy,
    options: SimulationOptions = {}
  ): Promise<SimulationResult> {
    const maxTurns = options.maxTurns || 1000;
    const gameState = this.gameEngine.createGame(config);
    
    const startTime = Date.now();
    let turnCount = 0;
    const eventHistory: string[] = [];
    
    while (!gameState.gameOver && turnCount < maxTurns) {
      if (!gameState.currentEvent) break;
      
      // 使用策略选择
      const choiceId = await playerStrategy.makeChoice(gameState, gameState.currentEvent);
      eventHistory.push(`${gameState.currentEvent.id}:${choiceId}`);
      
      // 执行选择
      const result = this.gameEngine.processChoice(gameState, choiceId);
      Object.assign(gameState, result.gameState);
      
      turnCount++;
      
      if (result.gameOver) break;
    }
    
    return {
      gameLength: turnCount,
      endReason: gameState.gameOverReason || '达到最大回合数',
      finalStats: gameState.emperor,
      eventSequence: eventHistory,
      executionTime: Date.now() - startTime,
      charactersUsed: gameState.activeCharacters.map(c => c.id),
      survived: !gameState.gameOver || gameState.emperor.health > 0
    };
  }
  
  // 批量模拟 - 用于配置验证
  async batchSimulate(
    config: GameDataConfig,
    simulations: number = 100
  ): Promise<BatchSimulationResult> {
    const strategies = [
      new RandomPlayerStrategy(),
      new ConservativePlayerStrategy(),
      new AggressivePlayerStrategy()
    ];
    
    const results: SimulationResult[] = [];
    
    for (let i = 0; i < simulations; i++) {
      const strategy = strategies[i % strategies.length];
      const result = await this.simulateGame(config, strategy);
      results.push(result);
    }
    
    return this.analyzeResults(results);
  }
  
  private analyzeResults(results: SimulationResult[]): BatchSimulationResult {
    const totalGames = results.length;
    const survivedGames = results.filter(r => r.survived).length;
    
    return {
      totalSimulations: totalGames,
      survivalRate: survivedGames / totalGames,
      averageGameLength: results.reduce((sum, r) => sum + r.gameLength, 0) / totalGames,
      commonEndReasons: this.getCommonEndReasons(results),
      characterUsageStats: this.getCharacterUsageStats(results),
      eventUsageStats: this.getEventUsageStats(results),
      recommendations: this.generateRecommendations(results)
    };
  }
}
```

##### 1.4 玩家策略实现

```typescript
// src/strategies/PlayerStrategies.ts

// 随机策略 - 用于快速测试
export class RandomPlayerStrategy implements PlayerStrategy {
  getName(): string {
    return 'Random';
  }
  
  async makeChoice(gameState: GameState, event: EventCard): Promise<string> {
    const choices = event.choices;
    const randomIndex = Math.floor(Math.random() * choices.length);
    return choices[randomIndex].id;
  }
}

// 保守策略 - 优先保持稳定
export class ConservativePlayerStrategy implements PlayerStrategy {
  getName(): string {
    return 'Conservative';
  }
  
  async makeChoice(gameState: GameState, event: EventCard): Promise<string> {
    const choices = event.choices;
    
    // 选择对健康和威望影响最小的选项
    let bestChoice = choices[0];
    let bestScore = this.evaluateChoice(bestChoice, gameState);
    
    for (const choice of choices.slice(1)) {
      const score = this.evaluateChoice(choice, gameState);
      if (score > bestScore) {
        bestChoice = choice;
        bestScore = score;
      }
    }
    
    return bestChoice.id;
  }
  
  private evaluateChoice(choice: EventChoice, gameState: GameState): number {
    const effects = choice.effects;
    let score = 0;
    
    // 健康最重要
    score += (effects.health || 0) * 2;
    // 威望其次
    score += (effects.authority || 0) * 1.5;
    // 避免负面军事影响
    score += Math.max(0, effects.military || 0) * 1.2;
    
    return score;
  }
}

// 激进策略 - 追求高收益
export class AggressivePlayerStrategy implements PlayerStrategy {
  getName(): string {
    return 'Aggressive';
  }
  
  async makeChoice(gameState: GameState, event: EventCard): Promise<string> {
    const choices = event.choices;
    
    // 选择总效果最大的选项
    let bestChoice = choices[0];
    let bestScore = this.evaluateChoice(bestChoice);
    
    for (const choice of choices.slice(1)) {
      const score = this.evaluateChoice(choice);
      if (score > bestScore) {
        bestChoice = choice;
        bestScore = score;
      }
    }
    
    return bestChoice.id;
  }
  
  private evaluateChoice(choice: EventChoice): number {
    const effects = choice.effects;
    // 简单求和所有正向效果
    return Object.values(effects).reduce((sum, value) => sum + (value || 0), 0);
  }
}
```

##### 2.2 原型项目适配层实现

```typescript
// src/lib/gameAdapter.ts - 核心逻辑适配器
import { 
  GameEngine, 
  FileSystemDataProvider, 
  GameState,
  GameUpdateResult,
  GameDataConfig 
} from 'crownchronicle-core';
import { UIPlayerStrategy } from './uiPlayerStrategy';
import { SaveManager } from './saveManager';

export class GameAdapter {
  private gameEngine: GameEngine;
  private dataProvider: FileSystemDataProvider;
  
  constructor() {
    this.dataProvider = new FileSystemDataProvider('./data');
    this.gameEngine = new GameEngine(this.dataProvider);
  }
  
  // 适配现有的 createNewGame API
  async createNewGame(difficulty: string): Promise<GameState> {
    const characters = await this.dataProvider.loadAllCharacters();
    const events = new Map();
    
    for (const char of characters) {
      const charEvents = await this.dataProvider.loadCharacterEvents(char.id);
      events.set(char.id, charEvents);
    }
    
    const config: GameDataConfig = {
      characters,
      events,
      difficulty: difficulty as any
    };
    
    return this.gameEngine.createGame(config);
  }
  
  // 适配现有的 processChoice API
  async processChoice(gameState: GameState, choiceId: string): Promise<GameUpdateResult> {
    return this.gameEngine.processChoice(gameState, choiceId);
  }
  
  // 新增：验证配置
  async validateGameData(): Promise<ValidationResult> {
    const characters = await this.dataProvider.loadAllCharacters();
    const events = new Map();
    
    for (const char of characters) {
      const charEvents = await this.dataProvider.loadCharacterEvents(char.id);
      events.set(char.id, charEvents);
    }
    
    const config: GameDataConfig = { characters, events, difficulty: 'normal' };
    return this.gameEngine.validateConfig(config);
  }
}

// src/lib/saveAdapter.ts - 存档系统适配
import { GameState } from 'crownchronicle-core';
import { SaveFile, SaveSummary } from '../types/saves';

export class SaveAdapter {
  // 适配核心逻辑的 GameState 到存档格式
  static gameStateToSaveFile(
    saveId: string, 
    saveName: string, 
    gameState: GameState,
    difficulty: string
  ): SaveFile {
    return {
      id: saveId,
      name: saveName,
      gameState,
      createdAt: new Date().toISOString(),
      lastSavedAt: new Date().toISOString(),
      metadata: {
        difficulty,
        totalPlayTime: 0,
        currentTurn: gameState.currentTurn,
        maxAuthority: gameState.emperor.authority,
        maxPopularity: gameState.emperor.popularity,
        charactersCount: gameState.activeCharacters.length,
        eventsTriggered: gameState.gameHistory.length
      }
    };
  }
  
  // 从存档文件提取 GameState
  static saveFileToGameState(saveFile: SaveFile): GameState {
    return saveFile.gameState;
  }
  
  // 生成存档摘要
  static generateSaveSummary(saveFile: SaveFile): SaveSummary {
    const { gameState } = saveFile;
    return {
      id: saveFile.id,
      name: saveFile.name,
      difficulty: saveFile.metadata.difficulty,
      currentTurn: gameState.currentTurn,
      emperorAge: gameState.emperor.age,
      reignYears: gameState.emperor.reignYears,
      gameOver: gameState.gameOver,
      lastSavedAt: saveFile.lastSavedAt,
      charactersCount: gameState.activeCharacters.length,
      totalPlayTime: saveFile.metadata.totalPlayTime
    };
  }
}
```

##### 2.3 编辑器项目集成层

```typescript
// src/lib/coreIntegration.ts - 编辑器核心逻辑集成
import { 
  GameEngine,
  GameSimulator,
  MemoryDataProvider,
  GameDataConfig,
  ValidationResult,
  SimulationResult,
  BatchSimulationResult,
  RandomPlayerStrategy,
  ConservativePlayerStrategy,
  AggressivePlayerStrategy
} from 'crownchronicle-core';

export class EditorCoreIntegration {
  private gameEngine: GameEngine;
  private simulator: GameSimulator;
  private dataProvider: MemoryDataProvider;
  
  constructor() {
    this.dataProvider = new MemoryDataProvider([], new Map());
    this.gameEngine = new GameEngine(this.dataProvider);
    this.simulator = new GameSimulator(this.gameEngine);
  }
  
  // 动态更新编辑中的数据
  updateGameData(characters: CharacterConfig[], events: Map<string, EventConfig[]>): void {
    // 清空现有数据
    this.dataProvider = new MemoryDataProvider(characters, events);
    this.gameEngine = new GameEngine(this.dataProvider);
    this.simulator = new GameSimulator(this.gameEngine);
  }
  
  // 实时配置验证
  async validateCurrentConfig(): Promise<ValidationResult> {
    const config = await this.buildCurrentConfig();
    return this.gameEngine.validateConfig(config);
  }
  
  // 快速单次模拟
  async quickSimulation(strategy?: 'random' | 'conservative' | 'aggressive'): Promise<SimulationResult> {
    const config = await this.buildCurrentConfig();
    const playerStrategy = this.getStrategy(strategy || 'random');
    
    return this.simulator.simulateGame(config, playerStrategy, { maxTurns: 500 });
  }
  
  // 批量模拟测试
  async batchSimulation(options: {
    count?: number;
    strategies?: string[];
    maxTurns?: number;
  } = {}): Promise<BatchSimulationResult> {
    const config = await this.buildCurrentConfig();
    const { count = 100, maxTurns = 1000 } = options;
    
    return this.simulator.batchSimulate(config, count);
  }
  
  // 调试模拟 - 返回详细步骤
  async debugSimulation(): Promise<{
    result: SimulationResult;
    steps: GameStepInfo[];
  }> {
    const config = await this.buildCurrentConfig();
    let gameState = this.gameEngine.createGame(config);
    
    const steps: GameStepInfo[] = [];
    const strategy = new RandomPlayerStrategy();
    
    while (!gameState.gameOver && steps.length < 100) {
      if (!gameState.currentEvent) break;
      
      const choiceId = await strategy.makeChoice(gameState, gameState.currentEvent);
      const result = this.gameEngine.processChoice(gameState, choiceId);
      
      steps.push({
        turn: gameState.currentTurn,
        event: gameState.currentEvent,
        choice: choiceId,
        beforeStats: { ...gameState.emperor },
        afterStats: { ...result.gameState.emperor },
        consequences: gameState.currentEvent.choices.find(c => c.id === choiceId)?.consequences
      });
      
      gameState = result.gameState;
      if (result.gameOver) break;
    }
    
    return {
      result: {
        gameLength: steps.length,
        endReason: gameState.gameOverReason || '调试结束',
        finalStats: gameState.emperor,
        eventSequence: steps.map(s => `${s.event.id}:${s.choice}`),
        executionTime: 0,
        charactersUsed: gameState.activeCharacters.map(c => c.id),
        survived: !gameState.gameOver
      },
      steps
    };
  }
  
  private async buildCurrentConfig(): Promise<GameDataConfig> {
    const characters = await this.dataProvider.loadAllCharacters();
    const events = new Map<string, EventConfig[]>();
    
    for (const character of characters) {
      const characterEvents = await this.dataProvider.loadCharacterEvents(character.id);
      events.set(character.id, characterEvents);
    }
    
    return {
      characters,
      events,
      difficulty: 'normal'
    };
  }
  
  private getStrategy(type: string): PlayerStrategy {
    switch (type) {
      case 'conservative': return new ConservativePlayerStrategy();
      case 'aggressive': return new AggressivePlayerStrategy();
      default: return new RandomPlayerStrategy();
    }
  }
}

// src/lib/validationHelper.ts - 验证助手
export class ValidationHelper {
  static formatValidationResult(result: ValidationResult): {
    summary: string;
    errorCount: number;
    warningCount: number;
    issues: Array<{
      type: 'error' | 'warning';
      message: string;
      category: string;
    }>;
  } {
    const issues = [
      ...result.errors.map(error => ({
        type: 'error' as const,
        message: error,
        category: this.categorizeIssue(error)
      })),
      ...result.warnings.map(warning => ({
        type: 'warning' as const,
        message: warning,
        category: this.categorizeIssue(warning)
      }))
    ];
    
    return {
      summary: result.isValid ? '配置有效' : `发现 ${result.errors.length} 个错误`,
      errorCount: result.errors.length,
      warningCount: result.warnings.length,
      issues
    };
  }
  
  private static categorizeIssue(message: string): string {
    if (message.includes('角色')) return '角色配置';
    if (message.includes('事件')) return '事件配置';
    if (message.includes('平衡')) return '游戏平衡';
    if (message.includes('属性')) return '属性设置';
    return '其他';
  }
}
```

##### 2.4 依赖管理和工作流

**开发环境设置**
```bash
# 1. 首先开发核心逻辑
cd crownchronicle-core
npm install
npm run dev     # 监听模式开发

# 2. 链接到原型项目
cd ../crownchronicle
npm install
npm link ../crownchronicle-core
npm run dev

# 3. 链接到编辑器项目
cd ../crownchronicle-editor
npm install
npm link ../crownchronicle-core
npm run dev
```

**生产环境发布**
```bash
# 1. 发布核心包到 npm
cd crownchronicle-core
npm run build
npm publish

# 2. 更新项目依赖
cd ../crownchronicle
npm install crownchronicle-core@latest
npm run build

cd ../crownchronicle-editor
npm install crownchronicle-core@latest
npm run build
```

#### 3. 迁移步骤和数据流

##### 3.1 现有代码迁移映射

**从原型项目迁移到核心项目的文件映射：**

```
原型项目 → 核心项目
├── src/lib/gameEngine.ts → src/engine/GameEngine.ts
├── src/lib/cardPoolManager.ts → src/engine/CardPoolManager.ts  
├── src/lib/configLoader.ts → src/data/FileSystemDataProvider.ts
├── src/utils/constants.ts → src/utils/constants.ts (游戏逻辑部分)
├── src/types/game.ts → src/types/game.ts
├── src/types/saves.ts → src/types/config.ts (部分)
└── (新增) → src/strategies/PlayerStrategies.ts
└── (新增) → src/engine/GameSimulator.ts
└── (新增) → src/data/MemoryDataProvider.ts
```

**原型项目保留和新增的文件：**

```
保留的文件 (UI 相关)
├── src/components/ (全部保留)
├── src/app/ (全部保留，API 路由需要适配)
├── src/utils/apiClient.ts (保留)
├── src/utils/constants.ts (UI 常量部分)
└── src/types/api.ts (保留，简化)

新增的适配文件
├── src/lib/gameAdapter.ts
├── src/lib/saveAdapter.ts  
├── src/lib/uiPlayerStrategy.ts
└── src/types/ui.ts
```

##### 3.2 API 路由适配

**原型项目 API 路由调整：**

```typescript
// prototype/src/app/api/saves/route.ts - 适配核心逻辑
import { GameAdapter } from '@/lib/gameAdapter';
import { SaveAdapter } from '@/lib/saveAdapter';

export async function POST(request: NextRequest) {
  try {
    const { saveName, difficulty } = await request.json();
    
    // 使用适配器创建游戏
    const gameAdapter = new GameAdapter();
    const gameState = await gameAdapter.createNewGame(difficulty);
    
    // 转换为存档格式
    const saveFile = SaveAdapter.gameStateToSaveFile(
      generateSaveId(),
      saveName,
      gameState,
      difficulty
    );
    
    // 保存到文件系统
    await SaveManager.saveToDisk(saveFile);
    
    return NextResponse.json({
      success: true,
      data: { saveId: saveFile.id, gameState }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// prototype/src/app/api/saves/[saveId]/action/route.ts - 适配选择处理
export async function POST(request: NextRequest, { params }: { params: { saveId: string } }) {
  try {
    const { action, payload } = await request.json();
    const { saveId } = params;
    
    // 加载存档
    const saveFile = await SaveManager.loadFromDisk(saveId);
    const gameState = SaveAdapter.saveFileToGameState(saveFile);
    
    // 使用适配器处理选择
    const gameAdapter = new GameAdapter();
    const result = await gameAdapter.processChoice(gameState, payload.choiceId);
    
    // 更新存档
    const updatedSaveFile = SaveAdapter.gameStateToSaveFile(
      saveId,
      saveFile.name,
      result.gameState,
      saveFile.metadata.difficulty
    );
    await SaveManager.saveToDisk(updatedSaveFile);
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
```

##### 3.3 编辑器项目新增 API

```typescript
// editor/src/app/api/simulation/route.ts - 模拟测试 API
import { EditorCoreIntegration } from '@/lib/coreIntegration';

export async function POST(request: NextRequest) {
  try {
    const { type, options, gameData } = await request.json();
    
    const integration = new EditorCoreIntegration();
    
    // 更新游戏数据
    if (gameData) {
      integration.updateGameData(gameData.characters, gameData.events);
    }
    
    let result;
    switch (type) {
      case 'quick':
        result = await integration.quickSimulation(options?.strategy);
        break;
      case 'batch':
        result = await integration.batchSimulation(options);
        break;
      case 'debug':
        result = await integration.debugSimulation();
        break;
      default:
        throw new Error('Invalid simulation type');
    }
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// editor/src/app/api/validation/route.ts - 配置验证 API
export async function POST(request: NextRequest) {
  try {
    const { gameData } = await request.json();
    
    const integration = new EditorCoreIntegration();
    integration.updateGameData(gameData.characters, gameData.events);
    
    const validationResult = await integration.validateCurrentConfig();
    const formattedResult = ValidationHelper.formatValidationResult(validationResult);
    
    return NextResponse.json({
      success: true,
      data: formattedResult
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
```

#### 4. 数据抽象层设计

```typescript
// src/data/DataProvider.ts
export interface DataProvider {
  // 加载所有角色配置
  loadAllCharacters(): Promise<CharacterConfig[]>;
  
  // 加载指定角色的事件
  loadCharacterEvents(characterId: string): Promise<EventConfig[]>;
  
  // 验证数据完整性
  validateData(): Promise<ValidationResult>;
  
  // 获取游戏配置
  getGameConfig(): Promise<GameConfig>;
}

// 文件系统实现 (用于原型项目)
export class FileSystemDataProvider implements DataProvider {
  constructor(private basePath: string) {}
  
  async loadAllCharacters(): Promise<CharacterConfig[]> {
    const charactersDir = path.join(this.basePath, 'characters');
    const characterDirs = await fs.readdir(charactersDir);
    
    const characters: CharacterConfig[] = [];
    for (const dir of characterDirs) {
      const configPath = path.join(charactersDir, dir, 'character.yaml');
      const config = yaml.load(await fs.readFile(configPath, 'utf8')) as CharacterConfig;
      characters.push(config);
    }
    
    return characters;
  }
  
  async loadCharacterEvents(characterId: string): Promise<EventConfig[]> {
    const eventsDir = path.join(this.basePath, 'characters', characterId, 'events');
    const eventFiles = await fs.readdir(eventsDir);
    
    const events: EventConfig[] = [];
    for (const file of eventFiles.filter(f => f.endsWith('.yaml'))) {
      const eventPath = path.join(eventsDir, file);
      const config = yaml.load(await fs.readFile(eventPath, 'utf8')) as EventConfig;
      events.push(config);
    }
    
    return events;
  }
}

// 内存实现 (用于编辑器项目)
export class MemoryDataProvider implements DataProvider {
  constructor(
    private characters: CharacterConfig[],
    private events: Map<string, EventConfig[]>
  ) {}
  
  async loadAllCharacters(): Promise<CharacterConfig[]> {
    return [...this.characters];
  }
  
  async loadCharacterEvents(characterId: string): Promise<EventConfig[]> {
    return [...(this.events.get(characterId) || [])];
  }
  
  // 动态更新数据 (编辑器使用)
  updateCharacter(character: CharacterConfig): void {
    const index = this.characters.findIndex(c => c.id === character.id);
    if (index >= 0) {
      this.characters[index] = character;
    } else {
      this.characters.push(character);
    }
  }
  
  updateEvents(characterId: string, events: EventConfig[]): void {
    this.events.set(characterId, events);
  }
}
```

##### 2.2 配置验证器

```typescript
// src/engine/ConfigValidator.ts
export class ConfigValidator {
  validateConfig(config: GameDataConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // 验证角色配置
    for (const character of config.characters) {
      const characterValidation = this.validateCharacter(character);
      errors.push(...characterValidation.errors);
      warnings.push(...characterValidation.warnings);
    }
    
    // 验证事件配置
    for (const [characterId, events] of config.events) {
      for (const event of events) {
        const eventValidation = this.validateEvent(event, characterId);
        errors.push(...eventValidation.errors);
        warnings.push(...eventValidation.warnings);
      }
    }
    
    // 验证游戏平衡性
    const balanceValidation = this.validateGameBalance(config);
    warnings.push(...balanceValidation.warnings);
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  private validateCharacter(character: CharacterConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // 必填字段检查
    if (!character.id) errors.push('角色ID不能为空');
    if (!character.name) errors.push('角色姓名不能为空');
    
    // 属性范围检查
    const attributes = character.attributes;
    Object.entries(attributes).forEach(([key, value]) => {
      if (value < 0 || value > 100) {
        errors.push(`角色${character.name}的${key}属性值${value}超出范围[0,100]`);
      }
    });
    
    // 平衡性检查
    const totalPower = Object.values(attributes).reduce((sum, val) => sum + val, 0);
    if (totalPower > 500) {
      warnings.push(`角色${character.name}总属性值过高(${totalPower})，可能影响游戏平衡`);
    }
    
    return { isValid: errors.length === 0, errors, warnings };
  }
  
  private validateEvent(event: EventConfig, characterId: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // 基础字段检查
    if (!event.id) errors.push(`事件ID不能为空`);
    if (!event.title) errors.push(`事件${event.id}标题不能为空`);
    if (!event.choices || event.choices.length === 0) {
      errors.push(`事件${event.id}必须至少有一个选择`);
    }
    
    // 选择效果检查
    event.choices.forEach(choice => {
      if (!choice.id) errors.push(`事件${event.id}的选择ID不能为空`);
      if (!choice.text) errors.push(`事件${event.id}的选择${choice.id}文本不能为空`);
      
      // 效果平衡性检查
      if (choice.effects) {
        const totalEffect = Object.values(choice.effects).reduce((sum, val) => sum + Math.abs(val || 0), 0);
        if (totalEffect > 50) {
          warnings.push(`事件${event.id}选择${choice.id}效果过强(${totalEffect})`);
        }
      }
    });
    
    return { isValid: errors.length === 0, errors, warnings };
  }
}
```

#### 3. 项目集成方案

##### 3.1 原型项目集成

```typescript
// 原型项目中的适配器
// src/lib/gameAdapter.ts
import { GameEngine, FileSystemDataProvider, PlayerStrategy } from 'crownchronicle-core';

export class UIPlayerStrategy implements PlayerStrategy {
  private pendingChoice: Promise<string> | null = null;
  private resolveChoice: ((choice: string) => void) | null = null;
  
  getName(): string {
    return 'Human Player';
  }
  
  async makeChoice(gameState: GameState, event: EventCard): Promise<string> {
    // 创建等待用户输入的Promise
    this.pendingChoice = new Promise<string>(resolve => {
      this.resolveChoice = resolve;
    });
    
    return this.pendingChoice;
  }
  
  // UI调用此方法提供用户选择
  provideChoice(choiceId: string): void {
    if (this.resolveChoice) {
      this.resolveChoice(choiceId);
      this.resolveChoice = null;
      this.pendingChoice = null;
    }
  }
}

export class GameAdapter {
  private gameEngine: GameEngine;
  private playerStrategy: UIPlayerStrategy;
  
  constructor() {
    const dataProvider = new FileSystemDataProvider('./src/data');
    this.gameEngine = new GameEngine(dataProvider);
    this.playerStrategy = new UIPlayerStrategy();
  }
  
  // 适配现有API
  async createNewGame(difficulty: string): Promise<GameState> {
    const config = await this.loadGameConfig();
    return this.gameEngine.createGame({ ...config, difficulty });
  }
  
  async makeChoice(gameState: GameState, choiceId: string): Promise<GameUpdateResult> {
    return this.gameEngine.processChoice(gameState, choiceId);
  }
}
```

##### 3.2 编辑器项目集成

```typescript
// 编辑器项目中的集成
// src/lib/coreIntegration.ts
import { 
  GameSimulator, 
  GameEngine, 
  MemoryDataProvider,
  RandomPlayerStrategy,
  ConservativePlayerStrategy 
} from 'crownchronicle-core';

export class EditorCoreIntegration {
  private simulator: GameSimulator;
  private dataProvider: MemoryDataProvider;
  
  constructor() {
    this.dataProvider = new MemoryDataProvider([], new Map());
    const gameEngine = new GameEngine(this.dataProvider);
    this.simulator = new GameSimulator(gameEngine);
  }
  
  // 更新编辑中的数据
  updateGameData(characters: CharacterConfig[], events: Map<string, EventConfig[]>): void {
    characters.forEach(char => this.dataProvider.updateCharacter(char));
    events.forEach((eventList, characterId) => {
      this.dataProvider.updateEvents(characterId, eventList);
    });
  }
  
  // 快速验证配置
  async validateConfiguration(): Promise<ValidationResult> {
    const config = await this.buildGameConfig();
    const gameEngine = new GameEngine(this.dataProvider);
    return gameEngine.validateConfig(config);
  }
  
  // 运行模拟测试
  async runSimulation(simulationCount: number = 50): Promise<BatchSimulationResult> {
    const config = await this.buildGameConfig();
    return this.simulator.batchSimulate(config, simulationCount);
  }
  
  // 单次模拟调试
  async debugSimulation(playerStrategy?: PlayerStrategy): Promise<SimulationResult> {
    const config = await this.buildGameConfig();
    const strategy = playerStrategy || new RandomPlayerStrategy();
    return this.simulator.simulateGame(config, strategy);
  }
  
  private async buildGameConfig(): Promise<GameDataConfig> {
    const characters = await this.dataProvider.loadAllCharacters();
    const events = new Map<string, EventConfig[]>();
    
    for (const character of characters) {
      const characterEvents = await this.dataProvider.loadCharacterEvents(character.id);
      events.set(character.id, characterEvents);
    }
    
    return {
      characters,
      events,
      difficulty: 'normal'
    };
  }
}
```

#### 5. 原型项目与核心项目调用关系

##### 5.1 整体调用架构图

```
原型项目 (crownchronicle) 调用流程：

UI层 (React Components)
    ↓
API路由层 (Next.js API Routes)
    ↓
适配器层 (GameAdapter, SaveAdapter)
    ↓
核心逻辑包 (crownchronicle-core)
    ↓
数据提供器 (FileSystemDataProvider)
    ↓
文件系统 (YAML配置文件)
```

##### 5.2 详细调用链路

**1. 创建新游戏的调用链路：**

```typescript
// 用户在UI点击"新游戏" → 前端发起API请求
fetch('/api/saves', {
  method: 'POST',
  body: JSON.stringify({ saveName: '新游戏', difficulty: 'normal' })
})

// ↓ Next.js API路由处理
// src/app/api/saves/route.ts
export async function POST(request: NextRequest) {
  const { saveName, difficulty } = await request.json();
  
  // ↓ 调用适配器
  const gameAdapter = new GameAdapter();
  const gameState = await gameAdapter.createNewGame(difficulty);
  
  // ... 保存逻辑
}

// ↓ 适配器调用核心逻辑
// src/lib/gameAdapter.ts
export class GameAdapter {
  async createNewGame(difficulty: string): Promise<GameState> {
    // ↓ 加载配置数据
    const characters = await this.dataProvider.loadAllCharacters();
    const events = new Map();
    
    for (const char of characters) {
      const charEvents = await this.dataProvider.loadCharacterEvents(char.id);
      events.set(char.id, charEvents);
    }
    
    // ↓ 构建配置对象
    const config: GameDataConfig = {
      characters,
      events,
      difficulty: difficulty as any
    };
    
    // ↓ 调用核心游戏引擎
    return this.gameEngine.createGame(config);
  }
}

// ↓ 核心引擎处理
// crownchronicle-core/src/engine/GameEngine.ts
export class GameEngine {
  createGame(config: GameDataConfig): GameState {
    // 1. 验证配置
    const validation = this.validateConfig(config);
    
    // 2. 初始化游戏状态
    const gameState: GameState = {
      emperor: this.createInitialEmperor(config.difficulty),
      activeCharacters: [],
      cardPools: { pending: [], active: [], discarded: [] },
      // ...
    };
    
    // 3. 选择角色并设置事件
    const selectedCharacters = this.selectCharacters(config);
    gameState.activeCharacters = selectedCharacters;
    
    // 4. 初始化卡池
    const allEvents = selectedCharacters.flatMap(char => 
      this.dataProvider.loadCharacterEvents(char.id)
    );
    gameState.cardPools.pending = allEvents;
    
    // 5. 激活初始事件
    this.updateCardPools(gameState);
    gameState.currentEvent = this.selectNextEvent(gameState);
    
    return gameState;
  }
}
```

**2. 处理玩家选择的调用链路：**

```typescript
// 用户选择选项 → 前端发起API请求
fetch(`/api/saves/${saveId}/action`, {
  method: 'POST',
  body: JSON.stringify({ 
    action: 'choose_option', 
    payload: { choiceId: 'choice_1' } 
  })
})

// ↓ API路由处理
// src/app/api/saves/[saveId]/action/route.ts
export async function POST(request: NextRequest, { params }) {
  const { action, payload } = await request.json();
  const { saveId } = params;
  
  // ↓ 加载存档
  const saveFile = await SaveManager.loadFromDisk(saveId);
  const gameState = SaveAdapter.saveFileToGameState(saveFile);
  
  // ↓ 调用适配器处理选择
  const gameAdapter = new GameAdapter();
  const result = await gameAdapter.processChoice(gameState, payload.choiceId);
  
  // ↓ 保存更新后的状态
  const updatedSaveFile = SaveAdapter.gameStateToSaveFile(
    saveId, saveFile.name, result.gameState, saveFile.metadata.difficulty
  );
  await SaveManager.saveToDisk(updatedSaveFile);
  
  return NextResponse.json({ success: true, data: result });
}

// ↓ 适配器调用核心逻辑
// src/lib/gameAdapter.ts
export class GameAdapter {
  async processChoice(gameState: GameState, choiceId: string): Promise<GameUpdateResult> {
    // ↓ 直接调用核心引擎
    return this.gameEngine.processChoice(gameState, choiceId);
  }
}

// ↓ 核心引擎处理选择
// crownchronicle-core/src/engine/GameEngine.ts
export class GameEngine {
  processChoice(gameState: GameState, choiceId: string): GameUpdateResult {
    // 1. 验证选择
    const choice = gameState.currentEvent.choices.find(c => c.id === choiceId);
    
    // 2. 创建新状态副本 (纯函数)
    const newState = this.cloneGameState(gameState);
    
    // 3. 应用选择效果
    this.applyChoiceEffects(newState, choice);
    
    // 4. 记录历史
    this.recordGameEvent(newState, gameState.currentEvent, choice);
    
    // 5. 检查游戏结束
    const gameOverCheck = this.checkGameOver(newState);
    if (gameOverCheck.isGameOver) {
      newState.gameOver = true;
      newState.gameOverReason = gameOverCheck.reason;
      return { gameState: newState, gameOver: true };
    }
    
    // 6. 进入下一回合
    this.nextTurn(newState);
    
    return { 
      gameState: newState, 
      gameOver: false,
      eventChanged: newState.currentEvent?.id !== gameState.currentEvent?.id
    };
  }
}
```

##### 5.3 数据流转图

```
[用户操作] 
    ↓
[前端组件] (EventDisplay, EmperorStats, etc.)
    ↓ HTTP请求
[API路由] (saves/route.ts, saves/[saveId]/action/route.ts)
    ↓ 函数调用
[适配器层] (GameAdapter, SaveAdapter)
    ↓ 方法调用
[核心逻辑] (GameEngine, CardPoolManager)
    ↓ 数据访问
[数据提供器] (FileSystemDataProvider)
    ↓ 文件读取
[YAML文件] (characters/*.yaml, events/*.yaml)
    ↓ 返回数据
[核心逻辑] 处理并返回新状态
    ↓ 返回结果
[适配器层] 格式转换
    ↓ JSON响应
[API路由] 返回HTTP响应
    ↓ 状态更新
[前端组件] 重新渲染
    ↓
[用户界面] 显示更新结果
```

##### 5.4 关键接口映射

**原型项目现有API → 核心逻辑调用：**

```typescript
// 1. 游戏初始化
原型项目: GameEngine.createNewGame(difficulty)
    ↓ 适配器转换
核心逻辑: GameEngine.createGame(GameDataConfig)

// 2. 选择处理  
原型项目: GameEngine.applyChoiceEffects(gameState, choice)
    ↓ 适配器转换
核心逻辑: GameEngine.processChoice(gameState, choiceId)

// 3. 卡池管理
原型项目: CardPoolManager.updatePendingPool(gameState)
    ↓ 直接使用 (内部调用)
核心逻辑: GameEngine.updateCardPools(gameState)

// 4. 事件选择
原型项目: CardPoolManager.selectNextEvent(gameState)
    ↓ 直接使用 (内部调用)  
核心逻辑: GameEngine.selectNextEvent(gameState)

// 5. 配置加载
原型项目: ConfigLoader.loadAllCharacters()
    ↓ 适配器转换
核心逻辑: DataProvider.loadAllCharacters()
```

##### 5.5 适配器的作用

**GameAdapter 的职责：**

```typescript
export class GameAdapter {
  // 1. 数据格式转换
  async createNewGame(difficulty: string): Promise<GameState> {
    // 将原型项目的简单参数转换为核心逻辑需要的完整配置
    const config = await this.buildGameDataConfig(difficulty);
    return this.gameEngine.createGame(config);
  }
  
  // 2. 接口适配
  async processChoice(gameState: GameState, choiceId: string): Promise<GameUpdateResult> {
    // 直接传递，保持接口一致性
    return this.gameEngine.processChoice(gameState, choiceId);
  }
  
  // 3. 新功能暴露
  async validateGameData(): Promise<ValidationResult> {
    // 暴露核心逻辑的新功能给原型项目
    const config = await this.buildGameDataConfig('normal');
    return this.gameEngine.validateConfig(config);
  }
  
  // 4. 数据源管理
  private async buildGameDataConfig(difficulty: string): Promise<GameDataConfig> {
    // 负责从文件系统加载数据并构建核心逻辑需要的配置对象
    const characters = await this.dataProvider.loadAllCharacters();
    const events = new Map();
    
    for (const char of characters) {
      const charEvents = await this.dataProvider.loadCharacterEvents(char.id);
      events.set(char.id, charEvents);
    }
    
    return { characters, events, difficulty: difficulty as any };
  }
}
```

**SaveAdapter 的职责：**

```typescript
export class SaveAdapter {
  // 1. 存档格式转换
  static gameStateToSaveFile(
    saveId: string, 
    saveName: string, 
    gameState: GameState,    // 核心逻辑的状态格式
    difficulty: string
  ): SaveFile {               // 原型项目的存档格式
    return {
      id: saveId,
      name: saveName,
      gameState,              // 直接嵌入核心状态
      createdAt: new Date().toISOString(),
      lastSavedAt: new Date().toISOString(),
      metadata: {
        difficulty,
        totalPlayTime: 0,
        currentTurn: gameState.currentTurn,
        maxAuthority: gameState.emperor.authority,
        maxPopularity: gameState.emperor.popularity,
        charactersCount: gameState.activeCharacters.length,
        eventsTriggered: gameState.gameHistory.length
      }
    };
  }
  
  // 2. 状态提取
  static saveFileToGameState(saveFile: SaveFile): GameState {
    // 从存档文件中提取核心游戏状态
    return saveFile.gameState;
  }
  
  // 3. 元数据管理
  static generateSaveSummary(saveFile: SaveFile): SaveSummary {
    // 生成UI需要的存档摘要信息
    const { gameState } = saveFile;
    return {
      id: saveFile.id,
      name: saveFile.name,
      difficulty: saveFile.metadata.difficulty,
      currentTurn: gameState.currentTurn,
      emperorAge: gameState.emperor.age,
      reignYears: gameState.emperor.reignYears,
      gameOver: gameState.gameOver,
      lastSavedAt: saveFile.lastSavedAt,
      charactersCount: gameState.activeCharacters.length,
      totalPlayTime: saveFile.metadata.totalPlayTime
    };
  }
}
```

##### 5.6 依赖注入和初始化

**核心逻辑的初始化：**

```typescript
// src/lib/gameAdapter.ts
export class GameAdapter {
  private gameEngine: GameEngine;
  private dataProvider: FileSystemDataProvider;
  
  constructor() {
    // 1. 创建数据提供器 - 指向原型项目的数据目录
    this.dataProvider = new FileSystemDataProvider('./data');
    
    // 2. 创建游戏引擎 - 注入数据提供器
    this.gameEngine = new GameEngine(this.dataProvider);
  }
}

// 在API路由中使用
// src/app/api/saves/route.ts
export async function POST(request: NextRequest) {
  // 每次请求创建新的适配器实例
  const gameAdapter = new GameAdapter();
  const gameState = await gameAdapter.createNewGame(difficulty);
  // ...
}
```

**错误处理和边界情况：**

```typescript
// src/lib/gameAdapter.ts
export class GameAdapter {
  async createNewGame(difficulty: string): Promise<GameState> {
    try {
      // 验证数据完整性
      const validation = await this.dataProvider.validateData();
      if (!validation.isValid) {
        throw new Error(`数据验证失败: ${validation.errors.join(', ')}`);
      }
      
      const config = await this.buildGameDataConfig(difficulty);
      return this.gameEngine.createGame(config);
    } catch (error) {
      // 包装核心逻辑的错误，提供更友好的错误信息
      if (error.message.includes('配置验证失败')) {
        throw new Error(`游戏配置有误，请检查角色和事件文件: ${error.message}`);
      }
      throw new Error(`创建游戏失败: ${error.message}`);
    }
  }
  
  async processChoice(gameState: GameState, choiceId: string): Promise<GameUpdateResult> {
    try {
      return this.gameEngine.processChoice(gameState, choiceId);
    } catch (error) {
      // 处理核心逻辑抛出的错误
      if (error.message.includes('无效的选择ID')) {
        throw new Error(`选择无效，请刷新页面重试: ${error.message}`);
      }
      throw new Error(`处理选择失败: ${error.message}`);
    }
  }
}
```

这样，原型项目通过适配器层调用核心逻辑，保持了现有API的兼容性，同时获得了核心逻辑的所有功能和优化。核心逻辑包专注于游戏逻辑本身，而适配器负责处理数据格式转换、错误处理和系统集成。

#### 6. 包引用关系和依赖管理

##### 6.1 项目依赖层次结构

```
依赖关系图:
                    ┌─────────────────────────┐
                    │        core             │
                    │   (核心逻辑包)            │
                    │   - 无外部业务依赖        │
                    │   - 纯TypeScript逻辑     │
                    └─────────────────────────┘
                              ▲         ▲
                              │         │
                    ┌─────────┴───┐   ┌─┴─────────────┐
                    │             │   │               │
            ┌───────▼─────────┐   │   │   ┌───────────▼────┐
            │   prototype     │   │   │   │     editor     │
            │ (原型项目)       │   │   │   │ (编辑器项目)     │
            │ - Next.js       │   │   │   │ - Next.js      │
            │ - UI组件         │   │   │   │ - 编辑功能      │
            │ - 存档管理       │   │   │   │ - 模拟测试      │
            └─────────────────┘   │   │   └────────────────┘
                                  │   │
                          ┌───────▼───▼─────────┐
                          │ 可能的未来项目:      │
                          │ - 移动端游戏         │
                          │ - 后端服务          │
                          │ - 桌面客户端         │
                          └─────────────────────┘
```

##### 6.2 包配置详细对比

**1. 核心逻辑包 (crownchronicle-core)**

```json
{
  "name": "crownchronicle-core",
  "version": "1.0.0",
  "description": "Core game logic for Crown Chronicle card game",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist/",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "build": "rollup -c",
    "build:watch": "rollup -c -w",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "type-check": "tsc --noEmit",
    "prepublishOnly": "npm run build && npm run test"
  },
  "keywords": [
    "game",
    "card-game",
    "typescript",
    "simulation",
    "game-engine"
  ],
  "dependencies": {
    "js-yaml": "^4.1.0"
  },
  "devDependencies": {
    "@rollup/plugin-typescript": "^11.1.5",
    "@types/js-yaml": "^4.0.9",
    "@types/jest": "^29.5.8",
    "@typescript-eslint/eslint-plugin": "^6.10.0",
    "@typescript-eslint/parser": "^6.10.0",
    "eslint": "^8.53.0",
    "jest": "^29.7.0",
    "rollup": "^4.4.0",
    "typescript": "^5.2.2",
    "ts-jest": "^29.1.1"
  },
  "peerDependencies": {
    "typescript": "^5.0.0"
  },
  "engines": {
    "node": ">=16.0.0"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/crownchronicle-core.git"
  },
  "license": "MIT"
}
```

**特点：**
- 最小化依赖，只包含必要的运行时依赖 (js-yaml)
- 支持 CommonJS 和 ESM 双格式输出
- 完整的TypeScript类型定义
- 无框架依赖，可在任何JavaScript环境运行

**2. 原型项目 (prototype)**

```json
{
  "name": "crownchronicle-prototype",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "next": "14.0.3",
    "react": "^18",
    "react-dom": "^18",
    "tailwindcss": "^3.3.0",
    "crownchronicle-core": "^1.0.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10.0.1",
    "eslint": "^8",
    "eslint-config-next": "14.0.3",
    "postcss": "^8",
    "typescript": "^5"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

**特点：**
- 依赖 crownchronicle-core 作为核心逻辑
- 保持Next.js应用的标准结构
- 专注于UI和用户体验
- 通过适配器层与核心逻辑交互

**3. 编辑器项目 (editor)**

```json
{
  "name": "crownchronicle-editor",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "next": "14.0.3",
    "react": "^18",
    "react-dom": "^18",
    "tailwindcss": "^3.3.0",
    "crownchronicle-core": "^1.0.0",
    "@monaco-editor/react": "^4.6.0",
    "recharts": "^2.8.0",
    "js-yaml": "^4.1.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "@types/js-yaml": "^4.0.9",
    "autoprefixer": "^10.0.1",
    "eslint": "^8",
    "eslint-config-next": "14.0.3",
    "postcss": "^8",
    "typescript": "^5"
  },
  "scripts": {
    "dev": "next dev --port 3001",
    "build": "next build",
    "start": "next start --port 3001",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

**特点：**
- 同样依赖 crownchronicle-core
- 额外包含编辑器特有依赖 (Monaco Editor, 图表库)
- 运行在不同端口避免冲突
- 重度使用核心逻辑的模拟和验证功能

##### 6.3 开发环境依赖管理

**开发环境设置流程：**

```bash
# 1. 设置工作空间根目录
mkdir crown-chronicle-workspace
cd crown-chronicle-workspace

# 2. 克隆/创建各个项目
git clone <core-repo> core
git clone <prototype-repo> prototype
git clone <editor-repo> editor

# 3. 安装核心逻辑包依赖
cd core
npm install

# 4. 开发模式：使用 npm link 进行本地链接
npm link

# 5. 在原型项目中链接核心包
cd ../prototype
npm install
npm link crownchronicle-core

# 6. 在编辑器项目中链接核心包  
cd ../editor
npm install
npm link crownchronicle-core

# 7. 同时开发多个项目
# 终端1: 核心逻辑监听模式
cd core && npm run build:watch

# 终端2: 原型项目开发
cd prototype && npm run dev

# 终端3: 编辑器项目开发
cd editor && npm run dev
```

**package.json 脚本协调：**

```json
// 工作空间根目录可以添加 package.json 统一管理
{
  "name": "crown-chronicle-workspace",
  "private": true,
  "scripts": {
    "bootstrap": "npm run install:all && npm run link:all",
    "install:all": "npm run install:core && npm run install:prototype && npm run install:editor",
    "install:core": "cd core && npm install",
    "install:prototype": "cd prototype && npm install", 
    "install:editor": "cd editor && npm install",
    "link:all": "cd core && npm link && cd ../prototype && npm link crownchronicle-core && cd ../editor && npm link crownchronicle-core",
    "build:core": "cd core && npm run build",
    "build:all": "npm run build:core && cd prototype && npm run build && cd ../editor && npm run build",
    "dev:core": "cd core && npm run build:watch",
    "dev:prototype": "cd prototype && npm run dev",
    "dev:editor": "cd editor && npm run dev",
    "test:all": "cd core && npm test && cd ../prototype && npm run type-check && cd ../editor && npm run type-check"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

##### 6.4 生产环境包分发

**核心包发布流程：**

```bash
# 1. 核心逻辑包发布到npm
cd core
npm version patch  # 或 minor/major
npm run build
npm test
npm publish

# 2. 更新其他项目的依赖
cd ../prototype
npm update crownchronicle-core
npm run build

cd ../editor
npm update crownchronicle-core
npm run build
```

**版本管理策略：**

```json
// crownchronicle-core 语义化版本
{
  "version": "1.2.3",
  // 1 - 主版本: 破坏性API变更
  // 2 - 次版本: 新功能，向后兼容  
  // 3 - 补丁版本: Bug修复
}

// 其他项目使用范围版本
{
  "dependencies": {
    "crownchronicle-core": "^1.2.0"  // 允许1.x.x的兼容更新
  }
}
```

##### 6.5 包导入导出详解

**核心包导出结构：**

```typescript
// crownchronicle-core/src/index.ts
export { GameEngine } from './engine/GameEngine';
export { GameSimulator } from './engine/GameSimulator';
export { ConfigValidator } from './engine/ConfigValidator';
export { CardPoolManager } from './engine/CardPoolManager';

export { DataProvider } from './data/DataProvider';
export { FileSystemDataProvider } from './data/FileSystemDataProvider';
export { MemoryDataProvider } from './data/MemoryDataProvider';

export { PlayerStrategy } from './strategies/PlayerStrategy';
export { RandomPlayerStrategy } from './strategies/RandomPlayerStrategy';
export { ConservativePlayerStrategy } from './strategies/ConservativePlayerStrategy';
export { AggressivePlayerStrategy } from './strategies/AggressivePlayerStrategy';

export * from './types/game';
export * from './types/character';
export * from './types/event';
export * from './types/config';

// 便捷的工厂函数
export { createGameEngine, createSimulator } from './utils/factory';
```

**原型项目导入示例：**

```typescript
// prototype/src/lib/gameAdapter.ts
import { 
  GameEngine,
  FileSystemDataProvider,
  type GameState,
  type GameUpdateResult,
  type GameDataConfig,
  type ValidationResult
} from 'crownchronicle-core';

// prototype/src/components/EmperorStats.tsx
import type { EmperorStats } from 'crownchronicle-core';

// prototype/src/app/api/saves/route.ts
import { GameEngine, FileSystemDataProvider } from 'crownchronicle-core';
```

**编辑器项目导入示例：**

```typescript
// editor/src/lib/coreIntegration.ts
import {
  GameEngine,
  GameSimulator,
  MemoryDataProvider,
  RandomPlayerStrategy,
  ConservativePlayerStrategy,
  AggressivePlayerStrategy,
  type SimulationResult,
  type BatchSimulationResult,
  type ValidationResult
} from 'crownchronicle-core';

// editor/src/components/simulation/SimulationRunner.tsx
import { 
  type SimulationResult,
  type PlayerStrategy
} from 'crownchronicle-core';
```

##### 6.6 构建产物和兼容性

**核心包构建产物：**

```
core/dist/
├── index.js          # CommonJS 格式 (Node.js)
├── index.js.map      # Source map
├── index.esm.js      # ES Module 格式 (现代打包器)
├── index.esm.js.map  # Source map
├── index.d.ts        # TypeScript 类型定义
└── types/            # 详细类型定义文件夹
    ├── game.d.ts
    ├── character.d.ts
    ├── event.d.ts
    └── config.d.ts
```

**TypeScript模块解析：**

```typescript
// 消费项目的 tsconfig.json 配置
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,    // 跳过node_modules类型检查
    "types": ["node"],
    "baseUrl": ".",
    "paths": {
      "crownchronicle-core": ["node_modules/crownchronicle-core/dist/index.d.ts"]
    }
  }
}
```

##### 6.7 依赖冲突避免

**版本锁定策略：**

```json
// package-lock.json 确保一致的依赖版本
{
  "name": "crownchronicle",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "node_modules/crownchronicle-core": {
      "version": "1.2.3",
      "resolved": "https://registry.npmjs.org/crownchronicle-core/-/crownchronicle-core-1.2.3.tgz",
      "dependencies": {
        "js-yaml": "^4.1.0"
      }
    }
  }
}
```

**Peer Dependencies 处理：**

```json
// crownchronicle-core 不直接依赖 React 等 UI 框架
{
  "peerDependencies": {
    "typescript": "^5.0.0"  // 只要求 TypeScript 版本兼容
  },
  "peerDependenciesMeta": {
    "typescript": {
      "optional": true  // 在纯 JavaScript 项目中可选
    }
  }
}
```

##### 6.8 包大小优化

**Tree Shaking 支持：**

```typescript
// 支持按需导入，减少打包体积
import { GameEngine } from 'crownchronicle-core/dist/engine/GameEngine';
import { RandomPlayerStrategy } from 'crownchronicle-core/dist/strategies/RandomPlayerStrategy';

// 而不是全量导入
import { GameEngine, RandomPlayerStrategy } from 'crownchronicle-core';
```

**Bundle 分析：**

```json
// core/package.json
{
  "scripts": {
    "analyze": "rollup -c --environment ANALYZE",
    "size": "size-limit"
  },
  "size-limit": [
    {
      "path": "dist/index.js",
      "limit": "50 KB"
    },
    {
      "path": "dist/index.esm.js", 
      "limit": "45 KB"
    }
  ]
}
```

这种包引用关系设计确保了：
1. **清晰的依赖层次** - 核心包无业务依赖，其他项目依赖核心包
2. **开发效率** - 通过 npm link 实现本地开发时的热更新
3. **版本管理** - 语义化版本控制，避免破坏性变更
4. **构建优化** - 支持 Tree Shaking 和按需导入
5. **类型安全** - 完整的 TypeScript 类型定义和检查

#### 7. 错误处理策略设计

核心逻辑需要支持不同使用场景的错误处理需求，通过错误处理器模式实现灵活的错误响应机制。

##### 7.1 错误分类和层次

```typescript
// crownchronicle-core/src/types/errors.ts
export enum ErrorSeverity {
  INFO = 'info',           // 信息性错误，可以继续
  WARNING = 'warning',     // 警告，建议处理但不阻断
  ERROR = 'error',         // 错误，需要处理但可恢复
  CRITICAL = 'critical'    // 严重错误，必须停止
}

export enum ErrorCategory {
  VALIDATION = 'validation',       // 数据验证错误
  GAME_LOGIC = 'game_logic',      // 游戏逻辑错误
  DATA_ACCESS = 'data_access',    // 数据访问错误
  CONFIGURATION = 'configuration', // 配置错误
  RUNTIME = 'runtime',            // 运行时错误
  USER_INPUT = 'user_input'       // 用户输入错误
}

export interface GameError {
  id: string;                     // 错误唯一标识
  severity: ErrorSeverity;
  category: ErrorCategory;
  message: string;               // 技术错误信息
  userMessage?: string;          // 用户友好信息
  details?: Record<string, any>; // 详细错误信息
  context?: {                    // 错误上下文
    gameState?: Partial<GameState>;
    event?: string;
    choice?: string;
    characterId?: string;
  };
  timestamp: number;
  stackTrace?: string;
}

export interface ErrorHandler {
  handleError(error: GameError): ErrorHandlingResult;
}

export interface ErrorHandlingResult {
  shouldContinue: boolean;        // 是否继续执行
  shouldRetry: boolean;          // 是否可以重试
  fallbackAction?: string;       // 回退操作
  userNotification?: string;     // 用户通知信息
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}
```

##### 7.2 核心逻辑错误处理基础

```typescript
// crownchronicle-core/src/engine/GameEngine.ts
export class GameEngine implements CoreGameEngine {
  private errorHandler: ErrorHandler;
  
  constructor(dataProvider: DataProvider, errorHandler?: ErrorHandler) {
    this.dataProvider = dataProvider;
    this.errorHandler = errorHandler || new DefaultErrorHandler();
  }
  
  createGame(config: GameDataConfig): GameState {
    try {
      // 验证配置
      const validation = this.validateConfig(config);
      if (!validation.isValid) {
        const error: GameError = {
          id: 'config_validation_failed',
          severity: ErrorSeverity.ERROR,
          category: ErrorCategory.VALIDATION,
          message: `配置验证失败: ${validation.errors.join(', ')}`,
          userMessage: '游戏配置存在问题，请检查角色和事件设置',
          details: { errors: validation.errors, warnings: validation.warnings },
          timestamp: Date.now()
        };
        
        const result = this.errorHandler.handleError(error);
        if (!result.shouldContinue) {
          throw new GameEngineError(error);
        }
      }
      
      // ... 其他初始化逻辑
      return gameState;
    } catch (error) {
      return this.handleUnexpectedError(error, 'createGame');
    }
  }
  
  processChoice(gameState: GameState, choiceId: string): GameUpdateResult {
    try {
      if (!gameState.currentEvent) {
        const error: GameError = {
          id: 'no_current_event',
          severity: ErrorSeverity.ERROR,
          category: ErrorCategory.GAME_LOGIC,
          message: '当前没有可处理的事件',
          userMessage: '游戏状态异常，请重新加载游戏',
          context: { gameState: { currentTurn: gameState.currentTurn } },
          timestamp: Date.now()
        };
        
        const result = this.errorHandler.handleError(error);
        if (!result.shouldContinue) {
          throw new GameEngineError(error);
        }
      }
      
      // 查找选择
      const choice = gameState.currentEvent.choices.find(c => c.id === choiceId);
      if (!choice) {
        const error: GameError = {
          id: 'invalid_choice_id',
          severity: ErrorSeverity.WARNING,
          category: ErrorCategory.USER_INPUT,
          message: `无效的选择ID: ${choiceId}`,
          userMessage: '选择无效，请重新选择',
          context: { 
            event: gameState.currentEvent.id,
            choice: choiceId,
            availableChoices: gameState.currentEvent.choices.map(c => c.id)
          },
          timestamp: Date.now()
        };
        
        const result = this.errorHandler.handleError(error);
        if (result.shouldRetry) {
          // 返回当前状态，允许重新选择
          return { gameState, gameOver: false, canRetry: true };
        }
        throw new GameEngineError(error);
      }
      
      // ... 处理选择逻辑
      return { gameState: newState, gameOver: false };
    } catch (error) {
      return this.handleUnexpectedError(error, 'processChoice', { choiceId });
    }
  }
  
  private handleUnexpectedError(error: any, operation: string, context?: any): never {
    const gameError: GameError = {
      id: `unexpected_error_${operation}`,
      severity: ErrorSeverity.CRITICAL,
      category: ErrorCategory.RUNTIME,
      message: `${operation}操作发生未预期错误: ${error.message}`,
      userMessage: '游戏遇到了未知问题',
      details: { originalError: error.message },
      context,
      timestamp: Date.now(),
      stackTrace: error.stack
    };
    
    this.errorHandler.handleError(gameError);
    throw new GameEngineError(gameError);
  }
}

// 自定义错误类
export class GameEngineError extends Error {
  public readonly gameError: GameError;
  
  constructor(gameError: GameError) {
    super(gameError.message);
    this.name = 'GameEngineError';
    this.gameError = gameError;
  }
}
```

##### 7.3 不同场景的错误处理器

**原型项目错误处理器 (用户友好)**

```typescript
// prototype/src/lib/userErrorHandler.ts
import { ErrorHandler, GameError, ErrorHandlingResult, ErrorSeverity } from 'crownchronicle-core';

export class UserFriendlyErrorHandler implements ErrorHandler {
  handleError(error: GameError): ErrorHandlingResult {
    // 记录详细错误用于调试
    this.logError(error);
    
    switch (error.severity) {
      case ErrorSeverity.INFO:
        return {
          shouldContinue: true,
          shouldRetry: false,
          userNotification: error.userMessage || '游戏提示信息',
          logLevel: 'info'
        };
        
      case ErrorSeverity.WARNING:
        return {
          shouldContinue: true,
          shouldRetry: error.category === 'user_input',
          userNotification: error.userMessage || '请注意：' + this.simplifyMessage(error.message),
          fallbackAction: this.suggestFallback(error),
          logLevel: 'warn'
        };
        
      case ErrorSeverity.ERROR:
        return {
          shouldContinue: false,
          shouldRetry: this.canRetry(error),
          userNotification: error.userMessage || '发生错误：' + this.simplifyMessage(error.message),
          fallbackAction: this.suggestRecovery(error),
          logLevel: 'error'
        };
        
      case ErrorSeverity.CRITICAL:
        return {
          shouldContinue: false,
          shouldRetry: false,
          userNotification: '游戏遇到严重问题，请重新开始或联系技术支持',
          logLevel: 'error'
        };
    }
  }
  
  private logError(error: GameError): void {
    // 发送到错误追踪服务 (如 Sentry)
    console.error('[Game Error]', {
      id: error.id,
      message: error.message,
      context: error.context,
      timestamp: new Date(error.timestamp).toISOString()
    });
  }
  
  private simplifyMessage(message: string): string {
    // 简化技术错误信息为用户友好的描述
    const simplifications = {
      '配置验证失败': '游戏设置有问题',
      '无效的选择ID': '选择无效',
      '当前没有可处理的事件': '游戏状态异常',
      '数据加载失败': '游戏数据加载失败'
    };
    
    for (const [technical, friendly] of Object.entries(simplifications)) {
      if (message.includes(technical)) {
        return friendly;
      }
    }
    
    return message;
  }
  
  private canRetry(error: GameError): boolean {
    return ['user_input', 'data_access'].includes(error.category);
  }
  
  private suggestFallback(error: GameError): string {
    switch (error.category) {
      case 'user_input':
        return 'retry_choice';
      case 'data_access':
        return 'reload_data';
      case 'game_logic':
        return 'reset_to_last_save';
      default:
        return 'show_help';
    }
  }
  
  private suggestRecovery(error: GameError): string {
    if (error.context?.gameState) {
      return 'auto_save_and_reload';
    }
    return 'restart_game';
  }
}
```

**2. 编辑器项目错误处理器 (开发调试)**

```typescript
// editor/src/lib/editorErrorHandler.ts
import { ErrorHandler, GameError, ErrorHandlingResult, ErrorSeverity } from 'crownchronicle-core';

export class EditorErrorHandler implements ErrorHandler {
  private errorCollector: GameError[] = [];
  private onErrorCallback?: (error: GameError) => void;
  
  constructor(onErrorCallback?: (error: GameError) => void) {
    this.onErrorCallback = onErrorCallback;
  }
  
  handleError(error: GameError): ErrorHandlingResult {
    // 收集所有错误用于分析
    this.errorCollector.push(error);
    
    // 立即通知编辑器UI
    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }
    
    switch (error.severity) {
      case ErrorSeverity.INFO:
      case ErrorSeverity.WARNING:
        return {
          shouldContinue: true,
          shouldRetry: false,
          userNotification: this.formatForEditor(error),
          logLevel: error.severity === ErrorSeverity.INFO ? 'info' : 'warn'
        };
        
      case ErrorSeverity.ERROR:
      case ErrorSeverity.CRITICAL:
        // 编辑器中的错误需要中断并返回详细信息
        return {
          shouldContinue: false,
          shouldRetry: false,
          userNotification: this.formatForEditor(error),
          fallbackAction: 'interrupt_and_report',
          logLevel: 'error'
        };
    }
  }
  
  // 获取收集的所有错误
  getCollectedErrors(): GameError[] {
    return [...this.errorCollector];
  }
  
  // 清空错误收集器
  clearErrors(): void {
    this.errorCollector = [];
  }
  
  // 生成错误报告给Agent
  generateErrorReport(): EditorErrorReport {
    const errors = this.errorCollector;
    const errorsByCategory = this.groupErrorsByCategory(errors);
    const criticalErrors = errors.filter(e => e.severity === ErrorSeverity.CRITICAL);
    
    return {
      summary: {
        totalErrors: errors.length,
        criticalCount: criticalErrors.length,
        categoryCounts: Object.fromEntries(
          Object.entries(errorsByCategory).map(([cat, errs]) => [cat, errs.length])
        )
      },
      criticalErrors: criticalErrors.map(e => this.formatForAgent(e)),
      recommendations: this.generateRecommendations(errorsByCategory),
      detailedErrors: errors.map(e => this.formatForAgent(e)),
      timestamp: Date.now()
    };
  }
  
  private formatForEditor(error: GameError): string {
    return `[${error.category.toUpperCase()}] ${error.message}\n` +
           `Context: ${JSON.stringify(error.context, null, 2)}\n` +
           `Time: ${new Date(error.timestamp).toLocaleString()}`;
  }
  
  private formatForAgent(error: GameError): AgentErrorInfo {
    return {
      id: error.id,
      type: `${error.severity}_${error.category}`,
      message: error.message,
      context: error.context,
      suggestions: this.generateSuggestions(error),
      affectedComponents: this.identifyAffectedComponents(error)
    };
  }
  
  private groupErrorsByCategory(errors: GameError[]): Record<string, GameError[]> {
    return errors.reduce((groups, error) => {
      const category = error.category;
      if (!groups[category]) groups[category] = [];
      groups[category].push(error);
      return groups;
    }, {} as Record<string, GameError[]>);
  }
  
  private generateRecommendations(errorsByCategory: Record<string, GameError[]>): string[] {
    const recommendations: string[] = [];
    
    if (errorsByCategory.validation?.length > 0) {
      recommendations.push('建议检查角色和事件配置文件的格式和必填字段');
    }
    
    if (errorsByCategory.game_logic?.length > 0) {
      recommendations.push('建议检查事件的触发条件和选择效果配置');
    }
    
    if (errorsByCategory.data_access?.length > 0) {
      recommendations.push('建议检查文件路径和YAML格式是否正确');
    }
    
    return recommendations;
  }
  
  private generateSuggestions(error: GameError): string[] {
    const suggestions: string[] = [];
    
    switch (error.category) {
      case 'validation':
        if (error.details?.errors) {
          suggestions.push(`修复验证错误: ${error.details.errors.join(', ')}`);
        }
        break;
        
      case 'game_logic':
        if (error.context?.event) {
          suggestions.push(`检查事件 ${error.context.event} 的配置`);
        }
        break;
        
      case 'configuration':
        suggestions.push('检查游戏配置文件的完整性');
        break;
    }
    
    return suggestions;
  }
  
  private identifyAffectedComponents(error: GameError): string[] {
    const components: string[] = [];
    
    if (error.context?.characterId) {
      components.push(`角色: ${error.context.characterId}`);
    }
    
    if (error.context?.event) {
      components.push(`事件: ${error.context.event}`);
    }
    
    return components;
  }
}

// 编辑器错误报告接口
interface EditorErrorReport {
  summary: {
    totalErrors: number;
    criticalCount: number;
    categoryCounts: Record<string, number>;
  };
  criticalErrors: AgentErrorInfo[];
  recommendations: string[];
  detailedErrors: AgentErrorInfo[];
  timestamp: number;
}

interface AgentErrorInfo {
  id: string;
  type: string;
  message: string;
  context?: any;
  suggestions: string[];
  affectedComponents: string[];
}
```

##### 7.4 适配器层的错误处理整合

**原型项目适配器错误处理：**

```typescript
// prototype/src/lib/gameAdapter.ts
import { GameEngine, FileSystemDataProvider, GameEngineError } from 'crownchronicle-core';
import { UserFriendlyErrorHandler } from './userErrorHandler';

export class GameAdapter {
  private gameEngine: GameEngine;
  private errorHandler: UserFriendlyErrorHandler;
  
  constructor() {
    this.errorHandler = new UserFriendlyErrorHandler();
    this.dataProvider = new FileSystemDataProvider('./data');
    this.gameEngine = new GameEngine(this.dataProvider, this.errorHandler);
  }
  
  async createNewGame(difficulty: string): Promise<{
    success: boolean;
    gameState?: GameState;
    error?: string;
    userMessage?: string;
    canRetry?: boolean;
  }> {
    try {
      const config = await this.buildGameDataConfig(difficulty);
      const gameState = this.gameEngine.createGame(config);
      
      return {
        success: true,
        gameState
      };
    } catch (error) {
      if (error instanceof GameEngineError) {
        const result = this.errorHandler.handleError(error.gameError);
        return {
          success: false,
          error: error.gameError.message,
          userMessage: result.userNotification,
          canRetry: result.shouldRetry
        };
      }
      
      return {
        success: false,
        error: '创建游戏失败',
        userMessage: '游戏初始化遇到问题，请稍后重试'
      };
    }
  }
  
  async processChoice(gameState: GameState, choiceId: string): Promise<{
    success: boolean;
    result?: GameUpdateResult;
    userMessage?: string;
    canRetry?: boolean;
  }> {
    try {
      const result = this.gameEngine.processChoice(gameState, choiceId);
      return {
        success: true,
        result
      };
    } catch (error) {
      if (error instanceof GameEngineError) {
        const handlingResult = this.errorHandler.handleError(error.gameError);
        return {
          success: false,
          userMessage: handlingResult.userNotification,
          canRetry: handlingResult.shouldRetry
        };
      }
      
      return {
        success: false,
        userMessage: '处理选择时发生错误，请重试'
      };
    }
  }
}
```

**编辑器项目适配器错误处理：**

```typescript
// editor/src/lib/coreIntegration.ts
import { GameEngine, GameSimulator, MemoryDataProvider, GameEngineError } from 'crownchronicle-core';
import { EditorErrorHandler, EditorErrorReport } from './editorErrorHandler';

export class EditorCoreIntegration {
  private errorHandler: EditorErrorHandler;
  private gameEngine: GameEngine;
  private simulator: GameSimulator;
  
  constructor(onError?: (error: GameError) => void) {
    this.errorHandler = new EditorErrorHandler(onError);
    this.dataProvider = new MemoryDataProvider([], new Map());
    this.gameEngine = new GameEngine(this.dataProvider, this.errorHandler);
    this.simulator = new GameSimulator(this.gameEngine);
  }
  
  async validateCurrentConfig(): Promise<{
    isValid: boolean;
    validation?: ValidationResult;
    errorReport?: EditorErrorReport;
  }> {
    try {
      this.errorHandler.clearErrors();
      const config = await this.buildCurrentConfig();
      const validation = this.gameEngine.validateConfig(config);
      
      const collectedErrors = this.errorHandler.getCollectedErrors();
      if (collectedErrors.length > 0) {
        return {
          isValid: false,
          validation,
          errorReport: this.errorHandler.generateErrorReport()
        };
      }
      
      return {
        isValid: validation.isValid,
        validation
      };
    } catch (error) {
      return {
        isValid: false,
        errorReport: this.errorHandler.generateErrorReport()
      };
    }
  }
  
  async batchSimulation(options: SimulationOptions = {}): Promise<{
    success: boolean;
    result?: BatchSimulationResult;
    errorReport?: EditorErrorReport;
    interrupted?: boolean;
  }> {
    try {
      this.errorHandler.clearErrors();
      const config = await this.buildCurrentConfig();
      const result = await this.simulator.batchSimulate(config, options.count || 50);
      
      const collectedErrors = this.errorHandler.getCollectedErrors();
      const criticalErrors = collectedErrors.filter(e => e.severity === 'critical');
      
      if (criticalErrors.length > 0) {
        return {
          success: false,
          interrupted: true,
          errorReport: this.errorHandler.generateErrorReport()
        };
      }
      
      return {
        success: true,
        result,
        errorReport: collectedErrors.length > 0 ? this.errorHandler.generateErrorReport() : undefined
      };
    } catch (error) {
      return {
        success: false,
        interrupted: true,
        errorReport: this.errorHandler.generateErrorReport()
      };
    }
  }
  
  // 获取详细错误报告供Agent分析
  getErrorReport(): EditorErrorReport {
    return this.errorHandler.generateErrorReport();
  }
}
```

这种错误处理策略设计实现了：

1. **场景化错误处理** - 原型项目用户友好，编辑器项目开发调试
2. **错误分级管理** - 信息/警告/错误/严重四个级别
3. **上下文保存** - 错误发生时的完整游戏状态和操作信息
4. **智能恢复** - 根据错误类型提供相应的恢复建议
5. **Agent集成** - 编辑器错误可以中断并返回结构化报告给Agent分析

#### 8. 核心优势

##### 4.1 纯函数设计
- 游戏状态不被直接修改，每次返回新状态
- 便于测试、调试和并发处理
- 支持游戏状态的时间旅行和回放

##### 4.2 策略模式
- 支持不同的AI策略
- 用户界面通过特殊策略处理用户输入
- 编辑器可以使用多种策略进行测试

##### 4.3 数据抽象
- 支持文件系统、内存、网络等多种数据源
- 编辑器可以在内存中动态修改数据
- 便于未来扩展到数据库存储

##### 4.4 快速模拟
- 编辑器可以快速验证配置合理性
- 支持批量模拟和统计分析
- 提供游戏平衡性建议

这个实现方案将核心游戏逻辑完全独立，通过清晰的接口设计，让三个项目都能高效使用同一套游戏引擎。