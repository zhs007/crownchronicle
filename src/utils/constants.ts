export const GAME_CONSTANTS = {
  // 皇帝初始属性
  INITIAL_EMPEROR_STATS: {
    health: 50,
    authority: 50,
    treasury: 50,
    military: 50,
    popularity: 50,
    age: 20, // 将在初始化时随机调整为18-25
    reignYears: 0
  },
  
  // 年龄范围
  MIN_INITIAL_AGE: 18,
  MAX_INITIAL_AGE: 25,
  MAX_AGE: 80,
  
  // 属性范围
  MIN_STAT: 0,
  MAX_STAT: 100,
  
  // 游戏结束条件
  GAME_OVER_CONDITIONS: {
    HEALTH_DEATH: 'health_death',
    AUTHORITY_LOST: 'authority_lost',
    TREASURY_BANKRUPT: 'treasury_bankrupt',
    MILITARY_DEFEAT: 'military_defeat',
    POPULARITY_REVOLT: 'popularity_revolt',
    OLD_AGE: 'old_age',
    NO_EVENTS: 'no_events',
    SPECIAL_EVENT: 'special_event'
  },
  
  // 角色数量
  MIN_CHARACTERS: 3,
  MAX_CHARACTERS: 5,
  
  // 事件权重
  DEFAULT_EVENT_WEIGHT: 1,
  MAX_EVENT_WEIGHT: 10,
  
  // 卡池状态
  CARD_POOLS: {
    PENDING: 'pending',
    ACTIVE: 'active',
    DISCARDED: 'discarded'
  } as const,
  
  // 关系强度范围
  MIN_RELATIONSHIP: -100,
  MAX_RELATIONSHIP: 100,
  
  // 派系影响力
  MIN_FACTION_INFLUENCE: 0,
  MAX_FACTION_INFLUENCE: 100,
  
  // 游戏版本
  GAME_VERSION: '1.0.0'
} as const;

// 游戏难度配置
export const DIFFICULTY_CONFIG = {
  easy: {
    name: '简单',
    description: '适合新手，事件后果较轻',
    statMultiplier: 0.7, // 负面效果减少30%
    eventFrequency: 0.8, // 事件频率降低20%
    gameOverThreshold: 10 // 属性低于10才死亡
  },
  normal: {
    name: '普通',
    description: '标准难度，平衡的游戏体验',
    statMultiplier: 1.0,
    eventFrequency: 1.0,
    gameOverThreshold: 0
  },
  hard: {
    name: '困难',
    description: '挑战模式，事件后果严重',
    statMultiplier: 1.3, // 负面效果增加30%
    eventFrequency: 1.2, // 事件频率增加20%
    gameOverThreshold: 0
  }
} as const;

// 角色类型配置
export const CHARACTER_TYPES = {
  IMPERIAL_FAMILY: '皇族',
  CIVIL_MINISTER: '文臣',
  MILITARY_GENERAL: '武将',
  EUNUCH: '宦官',
  POWERFUL_MINISTER: '权臣'
} as const;

// 派系类型
export const FACTION_TYPES = {
  IMPERIAL_COURT: '皇室派系',
  REFORM_FACTION: '改革派',
  CONSERVATIVE_FACTION: '保守派',
  MILITARY_GROUP: '军事集团',
  EUNUCH_GROUP: '宦官集团',
  WOMEN_POLITICAL_GROUP: '女性政治集团',
  TRADITIONAL_BUREAUCRATS: '传统官僚集团'
} as const;
