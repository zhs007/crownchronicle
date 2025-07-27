import type { GameState, PlayerStrategy } from '../types/gamecore';
import type { EventCard, EventChoice } from '../types/event';
import type { CharacterAttributes } from '../types/character';

/**
 * 随机选择策略
 */
export class RandomPlayerStrategy implements PlayerStrategy {
  name = 'Random Strategy';

  async chooseOption(gameState: GameState, event: EventCard): Promise<string> {
    // 过滤出满足条件的选项
    const availableChoices = event.choices.filter(choice => {
      if (!choice.conditions) return true;
      
      // 简单的条件检查逻辑
      const { emperor } = gameState;
      
      if (choice.conditions.minHealth && emperor.health < choice.conditions.minHealth) return false;
      if (choice.conditions.minPower && emperor.power < choice.conditions.minPower) return false;
      if (choice.conditions.maxPower && emperor.power > choice.conditions.maxPower) return false;
      
      return true;
    });
    
    if (availableChoices.length === 0) {
      return event.choices[0].id; // 备用选择
    }
    
    const randomIndex = Math.floor(Math.random() * availableChoices.length);
    return availableChoices[randomIndex].id;
  }
}

/**
 * 保守策略 - 优先选择风险较低的选项
 */
export class ConservativePlayerStrategy implements PlayerStrategy {
  name = 'Conservative Strategy';

  async chooseOption(gameState: GameState, event: EventCard): Promise<string> {
    const { emperor } = gameState;
    
    // 过滤出满足条件的选项
    const availableChoices = event.choices.filter(choice => {
      if (!choice.conditions) return true;
      
      if (choice.conditions.minHealth && emperor.health < choice.conditions.minHealth) return false;
      if (choice.conditions.minPower && emperor.power < choice.conditions.minPower) return false;
      if (choice.conditions.maxPower && emperor.power > choice.conditions.maxPower) return false;
      
      return true;
    });
    
    if (availableChoices.length === 0) {
      return event.choices[0].id;
    }
    
    // 优先选择负面影响最小的选项
    let bestChoice = availableChoices[0];
    let minNegativeImpact = this.calculateNegativeImpact(bestChoice, emperor);
    
    for (const choice of availableChoices) {
      const negativeImpact = this.calculateNegativeImpact(choice, emperor);
      if (negativeImpact < minNegativeImpact) {
        minNegativeImpact = negativeImpact;
        bestChoice = choice;
      }
    }
    
    return bestChoice.id;
  }

  private calculateNegativeImpact(choice: EventChoice, emperor: CharacterAttributes): number {
    let impact = 0;
    if (choice.effects) {
      Object.entries(choice.effects).forEach(([key, value]) => {
        if (typeof value === 'number' && value < 0) {
          const currentValue = (emperor as any)[key] ?? 50;
          if (currentValue + value < 20) {
            impact += Math.abs(value) * 2;
          } else {
            impact += Math.abs(value);
          }
        }
      });
    }
    return impact;
  }
}

/**
 * 激进策略 - 优先选择潜在收益较高的选项
 */
export class AggressivePlayerStrategy implements PlayerStrategy {
  name = 'Aggressive Strategy';

  async chooseOption(gameState: GameState, event: EventCard): Promise<string> {
    const { emperor } = gameState;
    
    // 过滤出满足条件的选项
    const availableChoices = event.choices.filter(choice => {
      if (!choice.conditions) return true;
      
      if (choice.conditions.minHealth && emperor.health < choice.conditions.minHealth) return false;
      if (choice.conditions.minPower && emperor.power < choice.conditions.minPower) return false;
      if (choice.conditions.maxPower && emperor.power > choice.conditions.maxPower) return false;
      
      return true;
    });
    
    if (availableChoices.length === 0) {
      return event.choices[0].id;
    }
    
    // 优先选择正面影响最大的选项
    let bestChoice = availableChoices[0];
    let maxPositiveImpact = this.calculatePositiveImpact(bestChoice);
    
    for (const choice of availableChoices) {
      const positiveImpact = this.calculatePositiveImpact(choice);
      if (positiveImpact > maxPositiveImpact) {
        maxPositiveImpact = positiveImpact;
        bestChoice = choice;
      }
    }
    
    return bestChoice.id;
  }

  private calculatePositiveImpact(choice: EventChoice): number {
    let impact = 0;
    if (choice.effects) {
      Object.entries(choice.effects).forEach(([key, value]) => {
        if (typeof value === 'number' && value > 0) {
          impact += value;
        }
      });
    }
    return impact;
  }
}

/**
 * 平衡策略 - 在风险和收益之间寻找平衡
 */
export class BalancedPlayerStrategy implements PlayerStrategy {
  name = 'Balanced Strategy';

  async chooseOption(gameState: GameState, event: EventCard): Promise<string> {
    const { emperor } = gameState;
    
    // 过滤出满足条件的选项
    const availableChoices = event.choices.filter(choice => {
      if (!choice.conditions) return true;
      
      if (choice.conditions.minHealth && emperor.health < choice.conditions.minHealth) return false;
      if (choice.conditions.minPower && emperor.power < choice.conditions.minPower) return false;
      if (choice.conditions.maxPower && emperor.power > choice.conditions.maxPower) return false;
      
      return true;
    });
    
    if (availableChoices.length === 0) {
      return event.choices[0].id;
    }
    
    // 计算每个选项的综合评分
    let bestChoice = availableChoices[0];
    let bestScore = this.calculateScore(bestChoice, emperor);
    
    for (const choice of availableChoices) {
      const score = this.calculateScore(choice, emperor);
      if (score > bestScore) {
        bestScore = score;
        bestChoice = choice;
      }
    }
    
    return bestChoice.id;
  }

  private calculateScore(choice: EventChoice, emperor: CharacterAttributes): number {
    let score = 0;
    if (choice.effects) {
      Object.entries(choice.effects).forEach(([key, value]) => {
        if (typeof value === 'number') {
          const currentValue = (emperor as any)[key] ?? 50;
          if (value > 0) {
            if (currentValue > 80) {
              score += value * 0.5;
            } else {
              score += value;
            }
          } else {
            if (currentValue < 30) {
              score += value * 2;
            } else {
              score += value;
            }
          }
        }
      });
    }
    return score;
  }
}
