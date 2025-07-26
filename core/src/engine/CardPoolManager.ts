import { EventCard, GameState, CardPools, EventConditions } from '../types/game';
import { GameEngine } from './GameEngine';

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
    
    // 更新卡池
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
    
    // 过滤出符合触发条件的事件
    const availableEvents = active.filter(event => 
      GameEngine.checkEventConditions(event, gameState)
    );
    
    if (availableEvents.length === 0) {
      return null;
    }
    
    // 计算权重并随机选择
    const weightedEvents = availableEvents.map(event => ({
      event,
      weight: GameEngine.calculateEventWeight(event, gameState)
    }));
    
    const totalWeight = weightedEvents.reduce((sum, item) => sum + item.weight, 0);
    
    if (totalWeight === 0) {
      // 如果所有权重都是0，随机选择一个
      return availableEvents[Math.floor(Math.random() * availableEvents.length)];
    }
    
    let random = Math.random() * totalWeight;
    
    for (const item of weightedEvents) {
      random -= item.weight;
      if (random <= 0) {
        return item.event;
      }
    }
    
    return availableEvents[0]; // 备用选择
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
    
    // 从待定卡池移除
    const pendingIndex = pending.findIndex(event => event.id === eventId);
    if (pendingIndex !== -1) {
      const [event] = pending.splice(pendingIndex, 1);
      discarded.push(event);
      return newGameState;
    }
    
    // 从主卡池移除
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
    const { emperor } = gameState;
    
    // 检查皇帝属性条件
    if (conditions.minHealth && emperor.health < conditions.minHealth) return false;
    if (conditions.minPower && emperor.power < conditions.minPower) return false;
    if (conditions.maxPower && emperor.power > conditions.maxPower) return false;
    if (conditions.minAge && emperor.age < conditions.minAge) return false;
    if (conditions.maxAge && emperor.age > conditions.maxAge) return false;
    // 已移除 reignYears 字段，如需判断可用 currentTurn 或其他机制
    
    // 检查属性要求
    if (conditions.attributeRequirements) {
      for (const [attr, value] of Object.entries(conditions.attributeRequirements)) {
        if (value !== undefined) {
          // 处理最小值要求
          if (attr.startsWith('min')) {
            const emperorAttr = attr.replace('min', '').toLowerCase();
            const currentValue = emperor[emperorAttr as keyof typeof emperor] as number;
            if (currentValue < value) return false;
          }
          // 处理最大值要求
          else if (attr.startsWith('max')) {
            const emperorAttr = attr.replace('max', '').toLowerCase();
            const currentValue = emperor[emperorAttr as keyof typeof emperor] as number;
            if (currentValue > value) return false;
          }
          // 处理精确值要求
          else {
            const currentValue = emperor[attr as keyof typeof emperor] as number;
            if (currentValue !== value) return false;
          }
        }
      }
    }
    
    // 检查事件历史
    if (conditions.requiredEvents) {
      const pastEvents = gameState.gameHistory.map(h => h.eventId);
      if (!conditions.requiredEvents.every(reqEvent => pastEvents.indexOf(reqEvent) !== -1)) {
        return false;
      }
    }
    
    if (conditions.excludedEvents) {
      const pastEvents = gameState.gameHistory.map(h => h.eventId);
      if (conditions.excludedEvents.some(excludedEvent => pastEvents.indexOf(excludedEvent) !== -1)) {
        return false;
      }
    }
    
    // 检查角色关系条件
    if (conditions.characterRelationships) {
      for (const charCondition of conditions.characterRelationships) {
        const character = gameState.activeCharacters.find(c => c.id === charCondition.characterId);
        if (!character) return false;
        
        if (charCondition.alive !== undefined && character.statusFlags.alive !== charCondition.alive) {
          return false;
        }
        
        // 检查角色属性
        if (charCondition.attributes) {
          for (const [attr, value] of Object.entries(charCondition.attributes)) {
            if (value !== undefined) {
              const currentValue = character.attributes[attr as keyof typeof character.attributes] as number;
              if (attr.startsWith('min') && currentValue < value) return false;
              if (attr.startsWith('max') && currentValue > value) return false;
            }
          }
        }
        
        // 检查与皇帝的关系
        if (charCondition.relationshipWithEmperor) {
          for (const [rel, value] of Object.entries(charCondition.relationshipWithEmperor)) {
            if (value !== undefined) {
              const currentValue = character.relationshipWithEmperor[rel as keyof typeof character.relationshipWithEmperor] as number;
              if (rel.startsWith('min') && currentValue < value) return false;
              if (rel.startsWith('max') && currentValue > value) return false;
            }
          }
        }
        
        // 检查状态标记
        if (charCondition.statusFlags) {
          for (const [flag, value] of Object.entries(charCondition.statusFlags)) {
            if (value !== undefined && character.statusFlags[flag as keyof typeof character.statusFlags] !== value) {
              return false;
            }
          }
        }
      }
    }
    
    // 检查角色间关系条件
    if (conditions.interCharacterRelations) {
      for (const relation of conditions.interCharacterRelations) {
        const char1 = gameState.activeCharacters.find(c => c.id === relation.character1);
        const char2 = gameState.activeCharacters.find(c => c.id === relation.character2);
        
        if (!char1 || !char2) return false;
        
        const relationship = char1.relationshipNetwork.find(r => r.targetCharacterId === relation.character2);
        if (!relationship) return false;
        
        if (relation.minRelationshipStrength !== undefined && 
            relationship.relationshipStrength < relation.minRelationshipStrength) {
          return false;
        }
        
        if (relation.maxRelationshipStrength !== undefined && 
            relationship.relationshipStrength > relation.maxRelationshipStrength) {
          return false;
        }
        
        if (relation.relationType && relationship.relationType !== relation.relationType) {
          return false;
        }
      }
    }
    
    // 检查派系条件
    if (conditions.factionRequirements) {
      for (const factionReq of conditions.factionRequirements) {
        const faction = gameState.factionSystem.activeFactions.find(f => f.name === factionReq.faction);
        if (!faction) return false;
        
        if (factionReq.minInfluence !== undefined && faction.influence < factionReq.minInfluence) {
          return false;
        }
        
        if (factionReq.maxInfluence !== undefined && faction.influence > factionReq.maxInfluence) {
          return false;
        }
        
        if (factionReq.leaderPresent && faction.leaderCharacterId) {
          const leader = gameState.activeCharacters.find(c => c.id === faction.leaderCharacterId);
          if (!leader || !leader.statusFlags.alive || !leader.statusFlags.inCourt) {
            return false;
          }
        }
      }
    }
    
    return true;
  }
}
