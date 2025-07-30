import type { EventCard } from '../../types/event';
import type { GameState } from '../../types/game';
import type { CardPools } from '../../types/card';
import type { EventConditions } from '../../types/event';
import { GameEngine } from '../GameEngine';

export class CardPoolManager {
  /**
   * 更新待定卡池，检查激活和移除条件
   */
  static updatePendingPool(gameState: GameState): GameState {
    const newGameState = JSON.parse(JSON.stringify(gameState)) as GameState;
    const { pending, active, discarded } = newGameState.cardPools;
    const cardsToActivate: EventCard[] = [];
    const cardsToRemove: EventCard[] = [];
    const remainingPending: EventCard[] = [];
    pending.forEach(card => {
      if (this.checkRemovalConditions(card, newGameState)) {
        cardsToRemove.push(card);
      } else if (this.checkActivationConditions(card, newGameState)) {
        cardsToActivate.push(card);
      } else {
        remainingPending.push(card);
      }
    });
    newGameState.cardPools.pending = remainingPending;
    newGameState.cardPools.active = [...active, ...cardsToActivate];
    newGameState.cardPools.discarded = [...discarded, ...cardsToRemove];
    return newGameState;
  }

  /**
   * 从主卡池中选择下一个事件
   */
  static selectNextEvent(gameState: GameState): EventCard | null {
    const { active } = gameState.cardPools;
    const availableEvents = active.filter(event => 
      GameEngine.checkEventConditions(event, gameState)
    );
    if (availableEvents.length === 0) {
      return null;
    }
    const weightedEvents = availableEvents.map(event => ({
      event,
      weight: GameEngine.calculateEventWeight(event, gameState)
    }));
    const totalWeight = weightedEvents.reduce((sum, item) => sum + item.weight, 0);
    if (totalWeight === 0) {
      return availableEvents[Math.floor(Math.random() * availableEvents.length)];
    }
    let random = Math.random() * totalWeight;
    for (const item of weightedEvents) {
      random -= item.weight;
      if (random <= 0) {
        return item.event;
      }
    }
    return availableEvents[0];
  }

  /**
   * 移除已使用的事件到弃卡池
   */
  static discardEvent(gameState: GameState, eventId: string): GameState {
    const newGameState = JSON.parse(JSON.stringify(gameState)) as GameState;
    const { active, discarded } = newGameState.cardPools;
    const eventIndex = active.findIndex(event => event.id === eventId);
    if (eventIndex !== -1) {
      const [event] = active.splice(eventIndex, 1);
      discarded.push(event);
    }
    return newGameState;
  }

  /**
   * 添加新事件到待定卡池
   */
  static addToPendingPool(gameState: GameState, events: EventCard[]): GameState {
    const newGameState = JSON.parse(JSON.stringify(gameState)) as GameState;
    newGameState.cardPools.pending.push(...events);
    return newGameState;
  }

  /**
   * 强制激活事件
   */
  static forceActivate(gameState: GameState, eventId: string): GameState {
    const newGameState = JSON.parse(JSON.stringify(gameState)) as GameState;
    const { pending, active } = newGameState.cardPools;
    const eventIndex = pending.findIndex(event => event.id === eventId);
    if (eventIndex !== -1) {
      const [event] = pending.splice(eventIndex, 1);
      active.push(event);
    }
    return newGameState;
  }

  /**
   * 强制移除事件
   */
  static forceRemove(gameState: GameState, eventId: string): GameState {
    const newGameState = JSON.parse(JSON.stringify(gameState)) as GameState;
    const { pending, active, discarded } = newGameState.cardPools;
    const pendingIndex = pending.findIndex(event => event.id === eventId);
    if (pendingIndex !== -1) {
      const [event] = pending.splice(pendingIndex, 1);
      discarded.push(event);
      return newGameState;
    }
    const activeIndex = active.findIndex(event => event.id === eventId);
    if (activeIndex !== -1) {
      const [event] = active.splice(activeIndex, 1);
      discarded.push(event);
    }
    return newGameState;
  }

  /**
   * 获取卡池状态
   */
  static getPoolStatus(gameState: GameState): {
    pendingCount: number;
    activeCount: number;
    discardedCount: number;
    totalEvents: number;
  } {
    const { pending, active, discarded } = gameState.cardPools;
    return {
      pendingCount: pending.length,
      activeCount: active.length,
      discardedCount: discarded.length,
      totalEvents: pending.length + active.length + discarded.length
    };
  }

  /**
   * 检查激活条件
   */
  private static checkActivationConditions(event: EventCard, gameState: GameState): boolean {
    const conditions = event.activationConditions;
    if (!conditions) return true;
    return this.evaluateConditions(conditions, gameState);
  }

  /**
   * 检查移除条件
   */
  private static checkRemovalConditions(event: EventCard, gameState: GameState): boolean {
    const conditions = event.removalConditions;
    if (!conditions) return false;
    return this.evaluateConditions(conditions, gameState);
  }

  /**
   * 评估条件
   */
  private static evaluateConditions(conditions: EventConditions, gameState: GameState): boolean {
    // 新结构：遍历 attributeConditions
    if (conditions.attributeConditions) {
      for (const cond of conditions.attributeConditions) {
        let targetObj: import('../../types/card').CharacterAttributes | undefined;
        if (cond.target === 'player') {
          targetObj = gameState.emperor;
        } else if (cond.target === 'self' && gameState.currentEvent) {
          // 通过当前事件的 selfCharacterId 获取角色
          const selfCharId = (gameState.currentEvent as any).selfCharacterId;
          const selfChar = gameState.activeCharacters.find(c => c.id === selfCharId);
          targetObj = selfChar?.attributes;
        }
        if (!targetObj) return false;
        const value = targetObj[cond.attribute];
        if (typeof value !== 'number') return false;
        if (cond.min !== undefined && value < cond.min) return false;
        if (cond.max !== undefined && value > cond.max) return false;
      }
    }
    // requiredEvents/excludedEvents 已移除
    return true;
  }
}
