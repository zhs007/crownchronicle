// 游戏主流程与状态管理相关代码迁移自 GameEngine.ts
// TODO: 从 GameEngine.ts 迁移相关类和函数

import type { EventCard, EventOption } from '../../types/event';
import type { GameState, GameEvent } from '../../types/game';
import type { CharacterAttributes, CharacterCard } from '../../types/card';
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
    static applyChoiceEffects(gameState: GameState, option: EventOption): GameState {
        const newGameState = JSON.parse(JSON.stringify(gameState)) as GameState;
        if (!option || !Array.isArray(option.effects)) return newGameState;
        for (const effect of option.effects) {
            if (effect.target === 'player') {
                const attr = effect.attribute;
                if (attr in newGameState.emperor) {
                    const currentValue = newGameState.emperor[attr] as number;
                    const newValue = Math.max(0, Math.min(100, currentValue + effect.offset));
                    (newGameState.emperor as any)[attr] = newValue;
                }
            } else if (effect.target === 'self') {
                // 这里需要传入当前角色ID，或在调用时补充逻辑
                // 可根据实际需求补充
            }
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
        const factionInfluences = factionSystem.activeFactions.map((f: { influence: number }) => f.influence);
        const maxInfluence = Math.max(...factionInfluences, 0);
        const avgInfluence = factionInfluences.length > 0 ? 
            factionInfluences.reduce((sum: number, inf: number) => sum + inf, 0) / factionInfluences.length : 50;
        courtPolitics.stability = Math.max(0, Math.min(100, 100 - (maxInfluence - avgInfluence)));
        courtPolitics.efficiency = Math.max(0, Math.min(100, 
            courtPolitics.stability - courtPolitics.corruption * 0.5));
    }

    /**
     * 检查事件条件
     */
    /**
     * 检查事件激活/触发条件（新结构）
     */
    static checkEventConditions(eventConditions: import('../../types/event').EventConditions, context: {
        gameState: import('../../types/game').GameState,
        selfCharacterId?: string
    }): boolean {
        if (!eventConditions || !eventConditions.attributeConditions) return true;
        const { gameState, selfCharacterId } = context;
        for (const cond of eventConditions.attributeConditions) {
            let targetObj: import('../../types/card').CharacterAttributes | undefined;
            if (cond.target === 'player') {
                targetObj = gameState.emperor;
            } else if (cond.target === 'self' && selfCharacterId) {
                const selfChar = gameState.activeCharacters.find(c => c.id === selfCharacterId);
                targetObj = selfChar?.attributes;
            }
            if (!targetObj) return false;
            const value = targetObj[cond.attribute];
            if (typeof value !== 'number') return false;
            if (cond.min !== undefined && value < cond.min) return false;
            if (cond.max !== undefined && value > cond.max) return false;
        }
        return true;
    }

    /**
     * 计算事件权重
     */
    static calculateEventWeight(event: EventCard, gameState: GameState): number {
        let weight = event.weight || GAME_CONSTANTS.DEFAULT_EVENT_WEIGHT;
        return Math.max(0, weight);
    }

    /**
     * 记录游戏事件到历史
     */
    static recordGameEvent(
        gameState: GameState, 
        event: EventCard, 
        option: EventOption,
        relationshipChanges?: Record<string, number>,
        characterDiscoveries?: string[]
    ): void {
        const gameEvent: GameEvent = {
            eventId: event.eventId,
            eventTitle: event.title,
            turn: gameState.currentTurn,
            choiceId: option.reply,
            chosenAction: option.reply,
            effects: Array.isArray(option.effects)
                ? option.effects.map(eff => ({ target: eff.target, attribute: eff.attribute, offset: eff.offset }))
                : [],
            consequences: '',
            timestamp: Date.now(),
            relationshipChanges,
            characterDiscoveries
        };
        gameState.gameHistory.push(gameEvent);
    }
}
