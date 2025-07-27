// 通用卡（CommonCard）类型
export interface CommonCard {
  id: string;
  name: string;
  description?: string;
  eventIds: string[];
}
// 角色属性（包括皇帝和所有角色，六项核心属性）
export interface CharacterAttributes {
  power: number;        // 权势
  military: number;     // 军队
  wealth: number;       // 财富
  popularity: number;   // 民心
  health: number;       // 健康（0-100）
  age: number;          // 年龄
}

// 与皇帝的关系
export interface RelationshipWithEmperor {
  affection: number;      // 感情值 (-100 到 +100)
  trust: number;         // 信任度 (-100 到 +100)
  fear: number;          // 恐惧值 (0-100)
  respect: number;       // 尊敬度 (0-100)
  dependency: number;    // 依赖度 (0-100)
  threat: number;        // 威胁度 (0-100)
}

// 角色间关系
export interface CharacterRelationship {
  targetCharacterId: string;
  relationType: 'ally' | 'enemy' | 'neutral' | 'superior' | 'subordinate' | 'family';
  relationshipStrength: number; // -100 到 +100
  secretLevel: number;          // 关系保密程度 (0-100)
  historicalBasis: string;      // 历史关系基础描述
}

// 派系信息
export interface FactionInfo {
  primaryFaction?: string;
  secondaryFactions: string[];
  factionLoyalty: number;
  leadershipRole: 'leader' | 'core' | 'member' | 'sympathizer';
}

// 角色对皇帝属性的影响（与主属性结构一致）
export interface CharacterInfluence {
  power: number;
  military: number;
  wealth: number;
  popularity: number;
  health: number;
  age: number;
}

// 角色状态标记
export interface CharacterStatusFlags {
  alive: boolean;
  inCourt: boolean;          // 是否在朝
  inExile: boolean;          // 是否被流放
  imprisoned: boolean;       // 是否被囚禁
  promoted: boolean;         // 是否刚被提升
  demoted: boolean;          // 是否刚被降职
  suspicious: boolean;       // 是否被怀疑
  plotting: boolean;         // 是否在密谋
}

// 角色卡牌
export interface CharacterCard {
  id: string;
  name: string;           // 真实姓名 (隐藏)
  displayName: string;    // 游戏中显示的称谓
  currentTitle: string;   // 当前称谓
  role: string;           // 角色身份
  description: string;    // 角色外观和行为描述
  identityRevealed: boolean; // 是否已揭示真实身份
  
  attributes: CharacterAttributes;
  relationshipWithEmperor: RelationshipWithEmperor;
  relationshipNetwork: CharacterRelationship[];
  factionInfo: FactionInfo;
  influence: CharacterInfluence;
  
  revealedTraits: string[];   // 已揭示的特性
  hiddenTraits: string[];     // 尚未揭示的特性
  discoveredClues: string[];  // 玩家已发现的线索
  totalClues: number;         // 总线索数量
  statusFlags: CharacterStatusFlags;
  eventIds: string[];         // 关联的事件卡牌ID列表
  commonCardIds?: string[];   // 关联的通用卡ID列表
}

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

// 角色效果
export interface CharacterEffect {
  characterId: string;
  attributeChanges?: Partial<CharacterAttributes>;
  relationshipChanges?: Partial<RelationshipWithEmperor>;
  statusChanges?: Partial<CharacterStatusFlags>;
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

// 事件条件
export interface EventConditions {
  minHealth?: number;
  minPower?: number;
  maxPower?: number;
  minAge?: number;
  maxAge?: number;
  requiredEvents?: string[];
  excludedEvents?: string[];
  attributeRequirements?: Partial<CharacterAttributes>;
  characterRelationships?: CharacterRelationshipCondition[];
  interCharacterRelations?: InterCharacterRelationCondition[];
  factionRequirements?: FactionRequirement[];
}

export interface CharacterRelationshipCondition {
  characterId: string;
  alive?: boolean;
  attributes?: Partial<CharacterAttributes>;
  relationshipWithEmperor?: Partial<RelationshipWithEmperor>;
  statusFlags?: Partial<CharacterStatusFlags>;
}

export interface InterCharacterRelationCondition {
  character1: string;
  character2: string;
  minRelationshipStrength?: number;
  maxRelationshipStrength?: number;
  relationType?: string;
}

export interface FactionRequirement {
  faction: string;
  minInfluence?: number;
  maxInfluence?: number;
  leaderPresent?: boolean;
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
export interface CharacterState {
  characterId: string;
  alive: boolean;
  relationship: 'friendly' | 'neutral' | 'hostile';
  influence: number;                  // 影响力值 (0-100)
  lastEventTurn?: number;             // 最后触发事件的回合
  
  // 身份发现系统
  identityProgress: {
    revealed: boolean;                // 是否已完全揭示身份
    cluesFound: string[];            // 已发现的线索
    traitsRevealed: string[];        // 已揭示的特性
    discoveryProgress: number;        // 发现进度 (0-100)
  };
  
  // 称谓系统
  currentTitle: string;              // 当前使用的称谓
  titleHistory: Array<{             // 称谓变化历史
    title: string;
    changedAt: number;               // 变化的回合数
    reason: string;                  // 变化原因
  }>;
}

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
export interface CharacterConfig {
  id: string;
  name: string;
  displayName: string;
  role: string;
  description: string;
  category: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  
  initialAttributes: {
    power: number;
    military: number;
    wealth: number;
    popularity: number;
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
    primaryFaction?: string;
    secondaryFactions: string[];
    factionLoyalty: number;
    leadershipRole: 'leader' | 'core' | 'member' | 'sympathizer';
  };
  
  relationshipNetwork: Array<{
    targetCharacter: string;
    relationType: 'ally' | 'enemy' | 'neutral' | 'superior' | 'subordinate' | 'family';
    relationshipStrength: number;
    secretLevel: number;
    historicalBasis: string;
  }>;
  
  influence: {
    power: number;
    military: number;
    wealth: number;
    popularity: number;
    health: number;
    age: number;
  };
  
  traits: string[];
  hiddenTraits: string[];
  
  conditions?: {
    minReignYears?: number;
    maxAge?: number;
    excludeCharacters?: string[];
    requiredFactions?: string[];
    conflictingFactions?: string[];
  };
  
  backgroundClues: {
    appearance: string;
    mannerisms: string;
    preferences: string;
    relationships: string;
    secrets: string;
  };

  /**
   * 关联的通用卡ID列表
   */
  commonCardIds?: string[];
}

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
