import type { GameState, PlayerStrategy } from '../types/gamecore';
import type { EventCard, EventOption } from '../types/event';
import type { CharacterAttributes } from '../types/character';

/**
 * 随机选择策略
 */
export class RandomPlayerStrategy implements PlayerStrategy {
  name = 'Random Strategy';

  async chooseOption(gameState: GameState, event: EventCard): Promise<string> {
    // 过滤出满足条件的选项
        const availableOptions = event.options.filter(option => {
            if (!(option as any).conditions) return true;
            const conditions = (option as any).conditions;
            const { emperor } = gameState;
            if (conditions.minHealth && emperor.health < conditions.minHealth) return false;
            if (conditions.minPower && emperor.power < conditions.minPower) return false;
            if (conditions.maxPower && emperor.power > conditions.maxPower) return false;
            return true;
        });
        if (availableOptions.length === 0) {
            return event.options[0].optionId; // 备用选择
        }
        const randomIndex = Math.floor(Math.random() * availableOptions.length);
        return availableOptions[randomIndex].optionId;
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
        const availableOptions = event.options.filter(option => {
            if (!(option as any).conditions) return true;
            const conditions = (option as any).conditions;
            if (conditions.minHealth && emperor.health < conditions.minHealth) return false;
            if (conditions.minPower && emperor.power < conditions.minPower) return false;
            if (conditions.maxPower && emperor.power > conditions.maxPower) return false;
            return true;
        });
        if (availableOptions.length === 0) {
            return event.options[0].optionId;
        }
        // 优先选择负面影响最小的选项
        let bestOption = availableOptions[0];
        let minNegativeImpact = this.calculateNegativeImpact(bestOption, emperor);
        for (const option of availableOptions) {
            const negativeImpact = this.calculateNegativeImpact(option, emperor);
            if (negativeImpact < minNegativeImpact) {
                minNegativeImpact = negativeImpact;
                bestOption = option;
            }
        }
        return bestOption.optionId;
  }

  private calculateNegativeImpact(option: EventOption, emperor: CharacterAttributes): number {
    let impact = 0;
    if ((option as any).effects) {
      Object.entries((option as any).effects).forEach(([key, value]) => {
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
        const availableOptions = event.options.filter(option => {
            if (!(option as any).conditions) return true;
            const conditions = (option as any).conditions;
            if (conditions.minHealth && emperor.health < conditions.minHealth) return false;
            if (conditions.minPower && emperor.power < conditions.minPower) return false;
            if (conditions.maxPower && emperor.power > conditions.maxPower) return false;
            return true;
        });
        if (availableOptions.length === 0) {
            return event.options[0].optionId;
        }
        // 优先选择正面影响最大的选项
        let bestOption = availableOptions[0];
        let maxPositiveImpact = this.calculatePositiveImpact(bestOption);
        for (const option of availableOptions) {
            const positiveImpact = this.calculatePositiveImpact(option);
            if (positiveImpact > maxPositiveImpact) {
                maxPositiveImpact = positiveImpact;
                bestOption = option;
            }
        }
        return bestOption.optionId;
  }

  private calculatePositiveImpact(option: EventOption): number {
    let impact = 0;
    if ((option as any).effects) {
      Object.entries((option as any).effects).forEach(([key, value]) => {
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
        const availableOptions = event.options.filter(option => {
            if (!(option as any).conditions) return true;
            const conditions = (option as any).conditions;
            if (conditions.minHealth && emperor.health < conditions.minHealth) return false;
            if (conditions.minPower && emperor.power < conditions.minPower) return false;
            if (conditions.maxPower && emperor.power > conditions.maxPower) return false;
            return true;
        });
        if (availableOptions.length === 0) {
            return event.options[0].optionId;
        }
        // 计算每个选项的综合评分
        let bestOption = availableOptions[0];
        let bestScore = this.calculateScore(bestOption, emperor);
        for (const option of availableOptions) {
            const score = this.calculateScore(option, emperor);
            if (score > bestScore) {
                bestScore = score;
                bestOption = option;
            }
        }
        return bestOption.optionId;
  }

  private calculateScore(option: EventOption, emperor: CharacterAttributes): number {
    let score = 0;
    if ((option as any).effects) {
      Object.entries((option as any).effects).forEach(([key, value]) => {
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
