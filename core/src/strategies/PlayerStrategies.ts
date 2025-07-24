import { GameState, EventCard, PlayerStrategy } from '../types/game';

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
      if (choice.conditions.minAuthority && emperor.authority < choice.conditions.minAuthority) return false;
      if (choice.conditions.maxAuthority && emperor.authority > choice.conditions.maxAuthority) return false;
      
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
      if (choice.conditions.minAuthority && emperor.authority < choice.conditions.minAuthority) return false;
      if (choice.conditions.maxAuthority && emperor.authority > choice.conditions.maxAuthority) return false;
      
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

  private calculateNegativeImpact(choice: any, emperor: any): number {
    let impact = 0;
    
    if (choice.effects) {
      // 计算负面效果的总和
      Object.entries(choice.effects).forEach(([key, value]) => {
        if (typeof value === 'number' && value < 0) {
          // 根据当前属性值权衡影响
          const currentValue = emperor[key] || 50;
          if (currentValue + value < 20) {
            impact += Math.abs(value) * 2; // 如果会导致属性过低，增加惩罚
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
      if (choice.conditions.minAuthority && emperor.authority < choice.conditions.minAuthority) return false;
      if (choice.conditions.maxAuthority && emperor.authority > choice.conditions.maxAuthority) return false;
      
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

  private calculatePositiveImpact(choice: any): number {
    let impact = 0;
    
    if (choice.effects) {
      // 计算正面效果的总和
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
      if (choice.conditions.minAuthority && emperor.authority < choice.conditions.minAuthority) return false;
      if (choice.conditions.maxAuthority && emperor.authority > choice.conditions.maxAuthority) return false;
      
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

  private calculateScore(choice: any, emperor: any): number {
    let score = 0;
    
    if (choice.effects) {
      Object.entries(choice.effects).forEach(([key, value]) => {
        if (typeof value === 'number') {
          const currentValue = emperor[key] || 50;
          
          if (value > 0) {
            // 正面效果，但如果属性已经很高则收益递减
            if (currentValue > 80) {
              score += value * 0.5;
            } else {
              score += value;
            }
          } else {
            // 负面效果，如果属性已经很低则惩罚加重
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
