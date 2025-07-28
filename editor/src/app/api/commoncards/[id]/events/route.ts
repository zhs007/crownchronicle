import { NextRequest } from 'next/server';
import { getAllCommonCards } from '@/lib/dataManager';

// 假设每个通用卡的事件列表在 card.eventIds 数组中
// 并通过 getAllCommonCards() 拿到所有通用卡和事件

export async function GET(req: NextRequest) {
  // Next.js 13+ 获取 params 需用 URL
  const url = new URL(req.url);
  // /api/commoncards/[id]/events
  // pathname: /api/commoncards/chancellor_common/events
  const parts = url.pathname.split('/');
  // ['','api','commoncards','chancellor_common','events']
  const id = parts[3];
  const allCommonCards = await getAllCommonCards();
  const card = allCommonCards.find((c: any) => c.id === id);
  if (!card) {
    return new Response(JSON.stringify([]), { status: 200 });
  }
  // 事件ID列表
  const eventIds: string[] = Array.isArray(card.eventIds) ? card.eventIds : [];
  // 假设所有事件都在 card.events 或 card._events
  let events: any[] = [];
  if (Array.isArray(card.events)) {
    events = card.events.filter((e: any) => eventIds.includes(e.id));
  } else if (Array.isArray(card._events)) {
    events = card._events.filter((e: any) => eventIds.includes(e.id));
  }
  // 如果没有 events 字段，则只返回 eventIds
  if (events.length === 0 && eventIds.length > 0) {
    events = eventIds.map(id => ({ id, title: id }));
  }
  return new Response(JSON.stringify(events), { status: 200 });
}
