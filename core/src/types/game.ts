// 兼容性 re-export，供所有依赖通过本文件导入类型
import type { CharacterAttributes, CharacterCard, CharacterState, CharacterConfig } from './character';
export type { CharacterAttributes, CharacterCard, CharacterState, CharacterConfig } from './character';
// 通用卡（CommonCard）类型
export interface CommonCard {
  id: string;
  name: string;
  description?: string;
  eventIds: string[];
}

// ...已移除重复导入...

// ...existing code...


// 事件选项
export interface EventChoice {
  id: string;
  text: string;         // 选项文本
  effects: Partial<CharacterAttributes>; // 选择后的属性变化
  consequences?: string; // 选择后的结果描述
  characterEffects?: CharacterEffect[]; // 对角色的影响
  interCharacterEffects?: InterCharacterEffect[]; // 角色间关系影响
  factionEffects?: FactionEffect[]; // 派系影响
  characterClues?: string[]; // 角色线索
  nextEvents?: string[]; // 可能触发的后续事件
  conditions?: EventConditions; // 选项显示条件
}

// 角色效果（已移除冗余关系/状态变更）
export interface CharacterEffect {
  characterId: string;
  attributeChanges?: Partial<CharacterAttributes>;
}

// 角色间关系效果
export interface InterCharacterEffect {
  character1: string;
  character2: string;
  relationshipChange: number;
  reason: string;
}

// 派系效果
export interface FactionEffect {
  faction: string;
  influenceChange: number;
}

// 事件条件（已移除冗余关系/派系相关字段）
export interface EventConditions {
  minHealth?: number;
  minPower?: number;
  maxPower?: number;
  minAge?: number;
  maxAge?: number;
  requiredEvents?: string[];
  excludedEvents?: string[];
  attributeRequirements?: Partial<CharacterAttributes>;
}

// 事件卡牌
export interface EventCard {
  id: string;
  characterId: string;  // 关联的角色ID
  title: string;        // 事件标题
  description: string;  // 事件描述
  speaker: string;      // 说话的角色
  dialogue: string;     // 角色对话内容
  choices: EventChoice[]; // 玩家选项
  
  // 激活条件
  activationConditions?: EventConditions;
  // 移除条件
  removalConditions?: EventConditions;
  // 触发条件
  triggerConditions?: EventConditions;
  
  weight: number;       // 在卡池中的权重
  dynamicWeight?: DynamicWeight; // 动态权重调整
  importance?: 'normal' | 'major' | 'critical'; // 事件重要性
  
  // 身份线索
  characterClues?: {
    revealedTraits?: string[];
    personalityHints?: string[];
    backgroundHints?: string[];
  };
}

// 动态权重
export interface DynamicWeight {
  [attribute: string]: Array<{
    range: [number, number];
    multiplier: number;
  }>;
}

// 卡池
export interface CardPools {
  pending: EventCard[];    // 待定卡池
  active: EventCard[];     // 主卡池
  discarded: EventCard[];  // 弃卡池
}

// 派系
export interface Faction {
  id: string;
  name: string;
  influence: number;              // 派系影响力 (0-100)
  leaderCharacterId?: string;     // 派系领袖角色ID
  memberCharacterIds: string[];  // 派系成员角色ID列表
  agenda: string;                 // 派系议程描述
  conflictingFactions: string[];  // 敌对派系
  alliedFactions: string[];       // 盟友派系
}

// 派系系统
export interface FactionSystem {
  activeFactions: Faction[];
  factionBalance: number;           // 整体派系平衡度 (-100 到 +100)
}

// 朝堂政治状态
export interface CourtPolitics {
  tension: number;                  // 朝堂紧张度 (0-100)
  stability: number;                // 政治稳定度 (0-100)
  corruption: number;               // 腐败程度 (0-100)
  efficiency: number;               // 行政效率 (0-100)
  recentEvents: Array<{            // 近期重大政治事件
    eventId: string;
    impact: 'minor' | 'moderate' | 'major';
    faction: string;
    turn: number;
  }>;
}

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
  factionSystem: FactionSystem;       // 派系系统
  courtPolitics: CourtPolitics;       // 朝堂政治状态
  
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
export interface EventConfig {
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
  
  activationConditions?: any;
  removalConditions?: any;
  triggerConditions?: any;
  
  weight: number;
  dynamicWeight?: any;
  
  choices: Array<{
    id: string;
    text: string;
    effects?: any;
    consequences?: string;
    characterClues?: string[];
    nextEvents?: string[];
    conditions?: any;
    characterEffects?: any[];
    interCharacterEffects?: any[];
    factionEffects?: any[];
  }>;
}
