// 游戏主流程与状态、历史、配置等核心类型
import type { CharacterAttributes, CharacterCard, CharacterState, CharacterConfig } from './character';
import type { CardPools } from './card';
import type { EventCard, EventConfig } from './event';
import type { FactionSystem, CourtPolitics } from './faction';

export interface GameEvent {
  eventId: string;
  eventTitle: string;
  turn: number;
  choiceId: string;
  chosenAction: string;
  effects: Partial<CharacterAttributes>;
  consequences: string;
  timestamp: number;
  relationshipChanges?: Record<string, number>;
  characterDiscoveries?: string[];
  importance?: 'normal' | 'major' | 'critical';
}

export interface GameState {
  emperor: CharacterAttributes;
  activeCharacters: CharacterCard[];
  cardPools: CardPools;
  gameHistory: GameEvent[];
  currentEvent: EventCard | null;
  characterStates: CharacterState[];
  factionSystem: FactionSystem;
  courtPolitics: CourtPolitics;
  gameOver: boolean;
  gameOverReason?: string;
  startTime: number;
  endTime?: number;
  currentTurn: number;
}

export interface GameConfig {
  difficulty: 'easy' | 'normal' | 'hard';
  minCharacters: number;
  maxCharacters: number;
  maxTurns?: number;
  enableAutoSave?: boolean;
  playerStrategy?: PlayerStrategy;
}

export interface PlayerStrategy {
  chooseOption(gameState: GameState, event: EventCard): Promise<string>;
  name: string;
}
