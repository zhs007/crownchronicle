// 事件相关类型
import type { CharacterAttributes, CharacterEffect, InterCharacterEffect, FactionEffect } from './character';

export interface EventChoice {
  id: string;
  text: string;
  effects: Partial<CharacterAttributes>;
  consequences?: string;
  characterEffects?: CharacterEffect[];
  interCharacterEffects?: InterCharacterEffect[];
  factionEffects?: FactionEffect[];
  characterClues?: string[];
  nextEvents?: string[];
  conditions?: EventConditions;
}

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

export interface EventCard {
  id: string;
  characterId: string;
  title: string;
  description: string;
  speaker: string;
  dialogue: string;
  choices: EventChoice[];
  activationConditions?: EventConditions;
  removalConditions?: EventConditions;
  triggerConditions?: EventConditions;
  weight: number;
  dynamicWeight?: DynamicWeight;
  importance?: 'normal' | 'major' | 'critical';
  characterClues?: {
    revealedTraits?: string[];
    personalityHints?: string[];
    backgroundHints?: string[];
  };
}

export interface DynamicWeight {
  [attribute: string]: Array<{
    range: [number, number];
    multiplier: number;
  }>;
}

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
