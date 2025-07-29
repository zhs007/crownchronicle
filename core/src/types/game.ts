
/**
 * 游戏主类型定义入口（仅 re-export 主类型，不定义重复/废弃类型）
 * 请统一从 card.ts、character.ts、event.ts、config.ts、gamecore.ts 导入类型。
 * 本文件不再定义 CardPools、CommonCard、EventConditions、Faction、FactionSystem、CourtPolitics 等类型。
 */
import type { CharacterAttributes, CharacterCard } from './card';
import type { CharacterState, CharacterConfig } from './character';
import type { CommonCard, CardPools } from './card';
import type { EventCard, EventOption, EventConfig } from './event';

// 角色状态
// ...已移除，统一使用 character.ts 类型...

// 游戏事件
export interface GameEvent {
  eventId: string;
  eventTitle: string;            // 事件标题
  turn: number;
  choiceId: string;
  chosenAction: string;          // 选择的行动描述
  effects: Partial<CharacterAttributes>;
  consequences: string;
  timestamp: number;
  relationshipChanges?: Record<string, number>; // 角色关系变化
  characterDiscoveries?: string[]; // 角色发现
  importance?: 'normal' | 'major' | 'critical'; // 事件重要性
}

// 游戏状态
export interface GameState {
  emperor: CharacterAttributes;
  activeCharacters: CharacterCard[];  // 当前出场的角色
  cardPools: CardPools;               // 三卡池系统
  gameHistory: GameEvent[];           // 游戏历史记录
  currentEvent: EventCard | null;     // 当前事件
  characterStates: CharacterState[];  // 角色状态追踪
  factionSystem: any;                 // 派系系统（已移除，后续如需扩展请在 faction.ts 定义）
  courtPolitics: any;                 // 朝堂政治状态（已移除，后续如需扩展请在 faction.ts 定义）
  gameOver: boolean;
  gameOverReason?: string;
  startTime: number;
  endTime?: number;
  currentTurn: number;                // 当前回合数
}

// 玩家策略接口
export interface PlayerStrategy {
  /**
   * 选择事件处理方式
   * @param gameState 当前游戏状态
   * @param event 当前事件
   * @returns 选择的选项ID
   */
  chooseOption(gameState: GameState, event: EventCard): Promise<string>;
  
  /**
   * 策略名称
   */
  name: string;
}

// 游戏配置
export interface GameConfig {
  difficulty: 'easy' | 'normal' | 'hard';
  minCharacters: number;
  maxCharacters: number;
  maxTurns?: number;
  enableAutoSave?: boolean;
  playerStrategy?: PlayerStrategy;
}

// 数据提供器接口
export interface DataProvider {
  /**
   * 加载所有通用卡配置
   */
  loadAllCommonCards(): Promise<CommonCard[]>;

  /**
   * 校验通用卡配置
   */
  validateCommonCardConfig(config: any): boolean;
  /**
   * 加载所有角色配置
   */
  loadAllCharacters(): Promise<CharacterConfig[]>;
  /**
   * 加载角色的事件
   */
  loadCharacterEvents(characterId: string): Promise<EventConfig[]>;
  /**
   * 验证角色配置
   */
  validateCharacterConfig(config: any): boolean;
  /**
   * 验证事件配置
   */
  validateEventConfig(config: any): boolean;
}

// 角色配置结构
// ...已移除，统一使用 character.ts 类型...

// 事件配置结构
