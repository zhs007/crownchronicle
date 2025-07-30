// 事件相关类型
import type { CharacterAttributes } from './card';

// 事件卡选项结构（严格限制字段）
export type OptionTarget = 'player' | 'self';

export interface EventOption {
  optionId: string; // 唯一标识，加载时自动生成
  reply: string; // 玩家对角色的回应（原 description，重命名）
  effects: Array<{
    target: OptionTarget;
    attribute: keyof CharacterAttributes;
    offset: number;
  }>;
// ...existing code...
}


export type EventConditionItem = {
  target: OptionTarget;
  attribute: keyof CharacterAttributes;
  min?: number;
  max?: number;
};

export interface EventConditions {
  attributeConditions?: EventConditionItem[];
}

export interface EventCard {
  eventId: string; // 全局唯一标识，自动生成
  id: string;      // 由 title 拼音自动生成
  title: string;
  dialogue: string; // 当前角色卡说的一句话
  options: [EventOption, EventOption]; // 必须且只能有两个选项
  activationConditions?: EventConditions;
  removalConditions?: EventConditions;
  triggerConditions?: EventConditions;
  weight: number; // 必填，默认 1
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
