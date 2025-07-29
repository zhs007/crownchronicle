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
  events: string[];
  description: string;
  attributes: CharacterAttributes;
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
}

// 角色配置结构
export interface CharacterConfig {
  id: string;
  name: string;
  description: string;
  initialAttributes: CharacterAttributes;
  commonCardIds?: string[];
}
