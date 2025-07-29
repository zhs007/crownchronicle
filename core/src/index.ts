// 核心引擎
export { GameEngine } from './engine/GameEngine';
export { CardPoolManager } from './engine/CardPoolManager';
export { GameSimulator, type SimulationResult } from './engine/GameSimulator';
export { ConfigValidator, type ValidationIssue, type ValidationResult } from './engine/validation/ConfigValidator';

// 数据提供器
export { FileSystemDataProvider, MemoryDataProvider, ConfigConverter } from './data/DataProvider';
export type { GameState } from './types/game';
export type { GameEvent } from './types/game';
export type { GameConfig } from './types/game';
export type { PlayerStrategy } from './types/game';
export type { DataProvider } from './types/game';
export type { CardPools } from './types/card';
export type { CharacterCard } from './types/card';
export type { CharacterAttributes } from './types/card';
export type { CharacterState } from './types/character';
export type { CharacterConfig } from './types/character';
export type { EventConditions } from './types/event';
export type { EventCard } from './types/event';
export type { EventOption } from './types/event';
export type { EventConfig } from './types/event';
export type { DynamicWeight } from './types/event';
