import { EmperorStats, EventCard, GameState, CharacterCard, EventChoice, GameEvent } from '../types/game';
import { GAME_CONSTANTS, DIFFICULTY_CONFIG } from '../utils/constants';

export class GameEngine {
  /**
   * 创建新游戏状态
   */
  static createNewGame(difficulty: 'easy' | 'normal' | 'hard' = 'normal'): GameState {
    const initialAge = Math.floor(Math.random() * (GAME_CONSTANTS.MAX_INITIAL_AGE - GAME_CONSTANTS.MIN_INITIAL_AGE + 1)) + GAME_CONSTANTS.MIN_INITIAL_AGE;
    
    const gameState: GameState = {
      emperor: {
        ...GAME_CONSTANTS.INITIAL_EMPEROR_STATS,
        age: initialAge
      },
      activeCharacters: [],
      cardPools: {
        pending: [],
        active: [],
        discarded: []
      },
      gameHistory: [],
      currentEvent: null,
      characterStates: [],
      factionSystem: {
        activeFactions: [],
        factionBalance: 0
      },
      courtPolitics: {
        tension: 30,
        stability: 70,
        corruption: 20,
        efficiency: 60,
        recentEvents: []
      },
      gameOver: false,
      startTime: Date.now(),
      currentTurn: 1
    };

    return gameState;
  }

  /**
   * 检查游戏结束条件
   */
  static checkGameOver(gameState: GameState): { gameOver: boolean; reason?: string } {
    const { emperor, cardPools } = gameState;
    
    // 检查属性是否降到0或以下
    if (emperor.health <= 0) {
      return { gameOver: true, reason: '皇帝因健康问题驾崩' };
    }
    if (emperor.authority <= 0) {
      return { gameOver: true, reason: '皇帝威望尽失，被迫退位' };
    }
    if (emperor.treasury <= 0) {
      return { gameOver: true, reason: '国库空虚，民不聊生，政权覆灭' };
    }
    if (emperor.military <= 0) {
      return { gameOver: true, reason: '军队哗变，皇帝被推翻' };
    }
    if (emperor.popularity <= 0) {
      return { gameOver: true, reason: '民心尽失，起义四起，王朝覆灭' };
    }
    
    // 检查年龄
    if (emperor.age >= GAME_CONSTANTS.MAX_AGE) {
      return { gameOver: true, reason: '皇帝寿终正寝，享年' + emperor.age + '岁' };
    }
    
    // 检查是否还有可用事件
    if (cardPools.active.length === 0 && cardPools.pending.length === 0) {
      return { gameOver: true, reason: '朝政平稳，皇帝安然退位' };
    }
    
    return { gameOver: false };
  }

  /**
   * 应用选择效果
   */
  static applyChoiceEffects(gameState: GameState, choice: EventChoice): GameState {
    const newGameState = JSON.parse(JSON.stringify(gameState)) as GameState;
    
    // 应用皇帝属性变化
    if (choice.effects) {
      Object.entries(choice.effects).forEach(([key, value]) => {
        if (value !== undefined && key in newGameState.emperor) {
          const currentValue = newGameState.emperor[key as keyof EmperorStats] as number;
          const newValue = Math.max(0, Math.min(100, currentValue + value));
          (newGameState.emperor as any)[key] = newValue;
        }
      });
    }
    
    // 应用角色效果
    if (choice.characterEffects) {
      choice.characterEffects.forEach(effect => {
        const character = newGameState.activeCharacters.find(c => c.id === effect.characterId);
        if (character) {
          // 应用属性变化
          if (effect.attributeChanges) {
            Object.entries(effect.attributeChanges).forEach(([key, value]) => {
              if (value !== undefined && key in character.attributes) {
                const currentValue = character.attributes[key as keyof typeof character.attributes] as number;
                const newValue = Math.max(0, Math.min(100, currentValue + value));
                (character.attributes as any)[key] = newValue;
              }
            });
          }
          
          // 应用关系变化
          if (effect.relationshipChanges) {
            Object.entries(effect.relationshipChanges).forEach(([key, value]) => {
              if (value !== undefined && key in character.relationshipWithEmperor) {
                const currentValue = character.relationshipWithEmperor[key as keyof typeof character.relationshipWithEmperor] as number;
                let newValue = currentValue + value;
                
                // 特殊处理：affection 和 trust 可以是负数
                if (key === 'affection' || key === 'trust') {
                  newValue = Math.max(-100, Math.min(100, newValue));
                } else {
                  newValue = Math.max(0, Math.min(100, newValue));
                }
                
                (character.relationshipWithEmperor as any)[key] = newValue;
              }
            });
          }
          
          // 应用状态变化
          if (effect.statusChanges) {
            Object.entries(effect.statusChanges).forEach(([key, value]) => {
              if (value !== undefined && key in character.statusFlags) {
                (character.statusFlags as any)[key] = value;
              }
            });
          }
        }
      });
    }
    
    // 应用角色间关系效果
    if (choice.interCharacterEffects) {
      choice.interCharacterEffects.forEach(effect => {
        const char1 = newGameState.activeCharacters.find(c => c.id === effect.character1);
        const char2 = newGameState.activeCharacters.find(c => c.id === effect.character2);
        
        if (char1 && char2) {
          // 更新char1对char2的关系
          const relationship1 = char1.relationshipNetwork.find(r => r.targetCharacterId === effect.character2);
          if (relationship1) {
            relationship1.relationshipStrength = Math.max(-100, Math.min(100, 
              relationship1.relationshipStrength + effect.relationshipChange));
          }
          
          // 更新char2对char1的关系
          const relationship2 = char2.relationshipNetwork.find(r => r.targetCharacterId === effect.character1);
          if (relationship2) {
            relationship2.relationshipStrength = Math.max(-100, Math.min(100, 
              relationship2.relationshipStrength + effect.relationshipChange));
          }
        }
      });
    }
    
    // 应用派系效果
    if (choice.factionEffects) {
      choice.factionEffects.forEach(effect => {
        const faction = newGameState.factionSystem.activeFactions.find(f => f.name === effect.faction);
        if (faction) {
          faction.influence = Math.max(0, Math.min(100, faction.influence + effect.influenceChange));
        }
      });
    }
    
    return newGameState;
  }

  /**
   * 执行回合结束处理
   */
  static processTurnEnd(gameState: GameState): GameState {
    const newGameState = JSON.parse(JSON.stringify(gameState)) as GameState;
    
    // 年龄+1
    newGameState.emperor.age += 1;
    newGameState.emperor.reignYears += 1;
    newGameState.currentTurn += 1;
    
    // 清除当前事件
    newGameState.currentEvent = null;
    
    // 更新朝堂政治状态
    this.updateCourtPolitics(newGameState);
    
    return newGameState;
  }

  /**
   * 更新朝堂政治状态
   */
  private static updateCourtPolitics(gameState: GameState): void {
    const { courtPolitics, activeCharacters, factionSystem } = gameState;
    
    // 根据角色关系计算紧张度
    let totalTension = 0;
    let relationshipCount = 0;
    
    activeCharacters.forEach(char => {
      char.relationshipNetwork.forEach(rel => {
        if (rel.relationType === 'enemy' && rel.relationshipStrength < -50) {
          totalTension += 20;
        }
        relationshipCount++;
      });
    });
    
    courtPolitics.tension = Math.max(0, Math.min(100, totalTension / Math.max(1, relationshipCount)));
    
    // 根据派系平衡计算稳定度
    const factionInfluences = factionSystem.activeFactions.map(f => f.influence);
    const maxInfluence = Math.max(...factionInfluences, 0);
    const avgInfluence = factionInfluences.length > 0 ? 
      factionInfluences.reduce((sum, inf) => sum + inf, 0) / factionInfluences.length : 50;
    
    courtPolitics.stability = Math.max(0, Math.min(100, 100 - (maxInfluence - avgInfluence)));
    
    // 效率基于稳定度和腐败程度
    courtPolitics.efficiency = Math.max(0, Math.min(100, 
      courtPolitics.stability - courtPolitics.corruption * 0.5));
  }

  /**
   * 检查事件条件
   */
  static checkEventConditions(event: EventCard, gameState: GameState): boolean {
    const conditions = event.triggerConditions;
    if (!conditions) return true;
    
    const { emperor } = gameState;
    
    // 检查皇帝属性条件
    if (conditions.minHealth && emperor.health < conditions.minHealth) return false;
    if (conditions.minAuthority && emperor.authority < conditions.minAuthority) return false;
    if (conditions.maxAuthority && emperor.authority > conditions.maxAuthority) return false;
    if (conditions.minAge && emperor.age < conditions.minAge) return false;
    if (conditions.maxAge && emperor.age > conditions.maxAge) return false;
    if (conditions.minReignYears && emperor.reignYears < conditions.minReignYears) return false;
    if (conditions.maxReignYears && emperor.reignYears > conditions.maxReignYears) return false;
    
    // 检查事件历史
    if (conditions.requiredEvents) {
      const pastEvents = gameState.gameHistory.map(h => h.eventId);
      if (!conditions.requiredEvents.every(reqEvent => pastEvents.includes(reqEvent))) {
        return false;
      }
    }
    
    if (conditions.excludedEvents) {
      const pastEvents = gameState.gameHistory.map(h => h.eventId);
      if (conditions.excludedEvents.some(excludedEvent => pastEvents.includes(excludedEvent))) {
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
      }
    }
    
    return true;
  }

  /**
   * 计算事件权重
   */
  static calculateEventWeight(event: EventCard, gameState: GameState): number {
    let weight = event.weight || GAME_CONSTANTS.DEFAULT_EVENT_WEIGHT;
    
    // 应用动态权重
    if (event.dynamicWeight) {
      Object.entries(event.dynamicWeight).forEach(([attribute, ranges]) => {
        const currentValue = gameState.emperor[attribute as keyof EmperorStats] as number;
        
        for (const range of ranges) {
          if (currentValue >= range.range[0] && currentValue <= range.range[1]) {
            weight *= range.multiplier;
            break;
          }
        }
      });
    }
    
    return Math.max(0, weight);
  }

  /**
   * 记录游戏事件到历史
   */
  static recordGameEvent(
    gameState: GameState, 
    event: EventCard, 
    choice: EventChoice,
    relationshipChanges?: Record<string, number>,
    characterDiscoveries?: string[]
  ): void {
    const gameEvent: GameEvent = {
      eventId: event.id,
      eventTitle: event.title,
      turn: gameState.currentTurn,
      choiceId: choice.id,
      chosenAction: choice.text,
      effects: choice.effects,
      consequences: choice.consequences || '',
      timestamp: Date.now(),
      relationshipChanges,
      characterDiscoveries,
      importance: event.importance || 'normal'
    };

    gameState.gameHistory.push(gameEvent);
  }
}
