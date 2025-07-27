// 游戏主流程与状态管理相关代码迁移自 GameEngine.ts
// TODO: 从 GameEngine.ts 迁移相关类和函数

import { CharacterAttributes, EventCard, GameState, CharacterCard, EventChoice, GameEvent } from '../../types/game';
import { GAME_CONSTANTS } from '../../utils/constants';

export class GameStateManager {
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
        if (emperor.health <= 0) {
            return { gameOver: true, reason: '皇帝因健康问题驾崩' };
        }
        if (emperor.power <= 0) {
            return { gameOver: true, reason: '皇帝权势尽失，被迫退位' };
        }
        if (emperor.wealth <= 0) {
            return { gameOver: true, reason: '财富耗尽，国库空虚，政权覆灭' };
        }
        if (emperor.military <= 0) {
            return { gameOver: true, reason: '军队哗变，皇帝被推翻' };
        }
        if (emperor.popularity <= 0) {
            return { gameOver: true, reason: '民心尽失，起义四起，王朝覆灭' };
        }
        if (emperor.age >= GAME_CONSTANTS.MAX_AGE) {
            return { gameOver: true, reason: '皇帝寿终正寝，享年' + emperor.age + '岁' };
        }
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
        if (choice.effects) {
            Object.entries(choice.effects).forEach(([key, value]) => {
                if (value !== undefined && key in newGameState.emperor) {
                    const currentValue = newGameState.emperor[key as keyof CharacterAttributes] as number;
                    const newValue = Math.max(0, Math.min(100, currentValue + value));
                    (newGameState.emperor as any)[key] = newValue;
                }
            });
        }
        if (choice.characterEffects) {
            choice.characterEffects.forEach(effect => {
                const character = newGameState.activeCharacters.find(c => c.id === effect.characterId);
                if (character && effect.attributeChanges) {
                    Object.entries(effect.attributeChanges).forEach(([key, value]) => {
                        if (value !== undefined && key in character.attributes) {
                            const currentValue = character.attributes[key as keyof typeof character.attributes] as number;
                            const newValue = Math.max(0, Math.min(100, currentValue + value));
                            (character.attributes as any)[key] = newValue;
                        }
                    });
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
        newGameState.emperor.age += 1;
        newGameState.currentTurn += 1;
        newGameState.currentEvent = null;
        this.updateCourtPolitics(newGameState);
        return newGameState;
    }

    /**
     * 更新朝堂政治状态
     */
    private static updateCourtPolitics(gameState: GameState): void {
        const { courtPolitics, factionSystem } = gameState;
        const factionInfluences = factionSystem.activeFactions.map(f => f.influence);
        const maxInfluence = Math.max(...factionInfluences, 0);
        const avgInfluence = factionInfluences.length > 0 ? 
            factionInfluences.reduce((sum, inf) => sum + inf, 0) / factionInfluences.length : 50;
        courtPolitics.stability = Math.max(0, Math.min(100, 100 - (maxInfluence - avgInfluence)));
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
        if (conditions.minHealth && emperor.health < conditions.minHealth) return false;
        if (conditions.minPower && emperor.power < conditions.minPower) return false;
        if (conditions.maxPower && emperor.power > conditions.maxPower) return false;
        if (conditions.minAge && emperor.age < conditions.minAge) return false;
        if (conditions.maxAge && emperor.age > conditions.maxAge) return false;
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
        return true;
    }

    /**
     * 计算事件权重
     */
    static calculateEventWeight(event: EventCard, gameState: GameState): number {
        let weight = event.weight || GAME_CONSTANTS.DEFAULT_EVENT_WEIGHT;
        if (event.dynamicWeight) {
            Object.entries(event.dynamicWeight).forEach(([attribute, ranges]) => {
                const currentValue = gameState.emperor[attribute as keyof CharacterAttributes] as number;
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
