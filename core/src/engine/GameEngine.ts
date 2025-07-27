
import { CharacterAttributes, EventCard, GameState, CharacterCard, EventChoice, GameEvent } from '../types/game';
import { GAME_CONSTANTS, DIFFICULTY_CONFIG } from '../utils/constants';
import { GameStateManager } from './game/GameStateManager';

export class GameEngine {

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
  static applyChoiceEffects(gameState: GameState, choice: EventChoice): GameState {
    return GameStateManager.applyChoiceEffects(gameState, choice);
  }

  /**
   * 执行回合结束处理
   */
  static processTurnEnd(gameState: GameState): GameState {
    return GameStateManager.processTurnEnd(gameState);
  }

  /**
   * 更新朝堂政治状态
   */
  private static updateCourtPolitics(gameState: GameState): void {
    const { courtPolitics, activeCharacters, factionSystem } = gameState;
    
    // ...已移除角色关系紧张度计算...
    
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
    return GameStateManager.checkEventConditions(event, gameState);
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
    choice: EventChoice,
    relationshipChanges?: Record<string, number>,
    characterDiscoveries?: string[]
  ): void {
    return GameStateManager.recordGameEvent(gameState, event, choice, relationshipChanges, characterDiscoveries);
  }
}
