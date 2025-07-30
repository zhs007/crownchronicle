import type { EventOption, EventCard } from '../types/event';
import type { GameState } from '../types/game';
import type { CharacterCard } from '../types/card';
import { GameStateManager } from './game/GameStateManager';

export class GameEngine {
  /**
   * 应用事件卡选项效果（新结构）
   */
  static applyEventOptionEffects(gameState: any, event: any, optionIdx: 0 | 1, selfCharacterId?: string): any {
    const newGameState = JSON.parse(JSON.stringify(gameState));
    const option: EventOption = event.options[optionIdx];
    if (!option || !Array.isArray(option.effects)) return newGameState;
    for (const effect of option.effects) {
      if (effect.target === 'player') {
        // 玩家（emperor）属性修改
        const attr = effect.attribute;
        if (attr in newGameState.emperor) {
          const currentValue = newGameState.emperor[attr] as number;
          const newValue = Math.max(0, Math.min(100, currentValue + effect.offset));
          (newGameState.emperor as any)[attr] = newValue;
        }
      } else if (effect.target === 'self' && selfCharacterId) {
        // 当前角色属性修改
        const character = newGameState.activeCharacters.find((c: any) => c.id === selfCharacterId);
        if (character && effect.attribute in character.attributes) {
          const currentValue = character.attributes[effect.attribute] as number;
          const newValue = Math.max(0, Math.min(100, currentValue + effect.offset));
          (character.attributes as any)[effect.attribute] = newValue;
        }
      }
    }
    return newGameState;
  }

  /**
   * 合并角色卡自身事件和通用卡事件，去重
   * @param character 角色卡
   * @param allCommonCards 所有通用卡
   * @returns 合并后的事件ID数组
   */
  static mergeCharacterAndCommonCardEvents(character: CharacterCard, allCommonCards: { id: string; eventIds: string[] }[]): string[] {
    const eventSet = new Set<string>(character.eventIds || []);
    if (character.commonCardIds && character.commonCardIds.length > 0) {
      for (const cid of character.commonCardIds) {
        const common = allCommonCards.find(c => c.id === cid);
        if (common && Array.isArray(common.eventIds)) {
          for (const eid of common.eventIds) {
            eventSet.add(eid);
          }
        }
      }
    }
    return Array.from(eventSet);
  }
  /**
   * 创建新游戏状态
   */
  static createNewGame(difficulty: 'easy' | 'normal' | 'hard' = 'normal'): GameState {
    return GameStateManager.createNewGame(difficulty);
  }

  /**
   * 检查游戏结束条件
   */
  static checkGameOver(gameState: GameState): { gameOver: boolean; reason?: string } {
    return GameStateManager.checkGameOver(gameState);
  }

  /**
   * 应用选择效果
   */
  static applyChoiceEffects(gameState: GameState, choice: EventOption): GameState {
    return GameStateManager.applyChoiceEffects(gameState, choice);
  }

  /**
   * 执行回合结束处理
   */
  static processTurnEnd(gameState: GameState): GameState {
    return GameStateManager.processTurnEnd(gameState);
  }


  /**
   * 检查事件条件（新结构）
   */
  static checkEventConditions(event: EventCard, gameState: GameState, selfCharacterId?: string): boolean {
    // 兼容旧调用方式：event.activationConditions/triggerConditions
    // 推荐直接传 event.activationConditions 或 event.triggerConditions
    // selfCharacterId 用于 self target
    const eventConditions = event.activationConditions || event.triggerConditions || {};
    return GameStateManager.checkEventConditions(
      eventConditions,
      { gameState, selfCharacterId }
    );
  }

  /**
   * 计算事件权重
   */
  static calculateEventWeight(event: EventCard, gameState: GameState): number {
    return GameStateManager.calculateEventWeight(event, gameState);
  }

  /**
   * 记录游戏事件到历史
   */
  static recordGameEvent(
    gameState: GameState, 
    event: EventCard, 
    choice: EventOption,
    relationshipChanges?: Record<string, number>,
    characterDiscoveries?: string[]
  ): void {
    return GameStateManager.recordGameEvent(gameState, event, choice, relationshipChanges, characterDiscoveries);
  }
}
