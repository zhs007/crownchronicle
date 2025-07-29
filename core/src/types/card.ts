
// 卡牌相关类型定义
import type { EventCard } from './event';

// 角色属性类型（原 character.ts）
export interface CharacterAttributes {
  power: number;
  military: number;
  wealth: number;
  popularity: number;
  health: number;
  age: number;
}

// 角色卡牌类型（原 character.ts）
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

export interface CommonCard {
  id: string;
  name: string;
  description?: string;
  eventIds: string[];
}

export interface CardPools {
  pending: EventCard[];
  active: EventCard[];
  discarded: EventCard[];
}
