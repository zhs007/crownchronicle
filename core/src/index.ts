// 核心引擎
export { GameEngine } from './engine/GameEngine';
export { CardPoolManager } from './engine/CardPoolManager';
export { GameSimulator, type SimulationResult } from './engine/GameSimulator';
export { ConfigValidator, type ValidationIssue, type ValidationResult } from './engine/ConfigValidator';

// 数据提供器
export { 
  FileSystemDataProvider, 
  MemoryDataProvider, 
  ConfigConverter 
} from './data/DataProvider';

// 策略
export {
  RandomPlayerStrategy,
  ConservativePlayerStrategy,
  AggressivePlayerStrategy,
  BalancedPlayerStrategy
} from './strategies/PlayerStrategies';

// 类型定义
export type {
  // 游戏状态相关
  GameState,
  GameEvent,
  
  // 角色相关
  CharacterCard,
  CharacterAttributes,
  CharacterState,
  
  // 事件相关
  EventCard,
  EventChoice,
  CharacterEffect,
  InterCharacterEffect,
  FactionEffect,
  EventConditions,
  DynamicWeight,
  
  // 卡池和派系
  CardPools,
  Faction,
  FactionSystem,
  CourtPolitics,
  
  // 配置相关
  CharacterConfig,
  EventConfig,
  GameConfig,
  
  // 接口
  PlayerStrategy,
  DataProvider
} from './types/game';

// 常量
export {
  GAME_CONSTANTS,
  DIFFICULTY_CONFIG,
  CHARACTER_TYPES,
  FACTION_TYPES
} from './utils/constants';
