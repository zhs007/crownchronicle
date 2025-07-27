// 卡牌相关类型定义
import type { EventCard } from './event';

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
