// 事件相关类型
import type { CharacterAttributes } from './card';

// 事件卡选项结构（严格限制字段）
export type OptionTarget = 'player' | 'self';

export interface EventOption {
  optionId: string; // 唯一标识，加载时自动生成
  description: string; // 玩家可见文本
  target: OptionTarget; // 只能为 player 或 self
  attribute: keyof CharacterAttributes; // 角色属性名
  offset: number; // 属性变动值
// ...existing code...
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
  characterId?: string;
  title: string;
  options: [EventOption, EventOption]; // 必须且只能有两个选项
  activationConditions?: EventConditions;
  removalConditions?: EventConditions;
  triggerConditions?: EventConditions;
  weight?: number;
  importance?: 'normal' | 'major' | 'critical';
  // 其他字段可按需补充
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
  options: [EventOption, EventOption]; // 必须且只能有两个选项
  activationConditions?: any;
  removalConditions?: any;
  triggerConditions?: any;
  weight?: number;
  importance?: 'normal' | 'major' | 'critical';
  // 其他字段可按需补充
}
