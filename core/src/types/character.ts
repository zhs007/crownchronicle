// 派系效果类型（为事件选项用）
export interface FactionEffect {
  faction: string;
  influenceChange: number;
}
// 角色相关类型
export interface CharacterAttributes {
  power: number;
  military: number;
  wealth: number;
  popularity: number;
  health: number;
  age: number;
}

// 兼容 YAML 卡片的扁平属性与 tags 字段
export interface CharacterCard {
  id: string;
  name: string;
  tags: string[];
  // 兼容扁平属性（YAML）与 attributes（核心类型）
  power: number;
  military: number;
  wealth: number;
  popularity: number;
  health: number;
  age: number;
  events: string[];
  // 兼容核心类型
  displayName: string;
  currentTitle: string;
  role: string;
  description: string;
  identityRevealed: boolean;
  attributes: CharacterAttributes;
  revealedTraits: string[];
  hiddenTraits: string[];
  discoveredClues: string[];
  totalClues: number;
  eventIds: string[];
  commonCardIds: string[];
}

export interface CharacterEffect {
  characterId: string;
  attributeChanges?: Partial<CharacterAttributes>;
}

export interface InterCharacterEffect {
  character1: string;
  character2: string;
  relationshipChange: number;
  reason: string;
}

export interface CharacterState {
  characterId: string;
  alive: boolean;
  relationship: 'friendly' | 'neutral' | 'hostile';
  influence: number;
  lastEventTurn?: number;
  identityProgress: {
    revealed: boolean;
    cluesFound: string[];
    traitsRevealed: string[];
    discoveryProgress: number;
  };
  currentTitle: string;
  titleHistory: Array<{
    title: string;
    changedAt: number;
    reason: string;
  }>;
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
  initialAttributes: CharacterAttributes;
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
  commonCardIds?: string[];
}
