import type { CharacterConfig } from '../../types/character';
import type { DataProvider } from '../../types/game';
import type { EventConfig } from '../../types/event';
import type { EventOption } from '../../types/event';

export interface ValidationIssue {
  type: 'error' | 'warning';
  code: string;
  message: string;
  context?: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export class ConfigValidator {
  /**
   * 验证所有通用卡配置
   */
  async validateAllCommonCards(): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    try {
      const commonCards = await this.dataProvider.loadAllCommonCards();
      if (commonCards.length === 0) {
        issues.push({
          type: 'warning',
          code: 'NO_COMMON_CARDS',
          message: '没有找到任何通用卡配置',
          suggestion: '可选：添加至少一张通用卡'
        });
      }
      // 检查ID唯一性
      const ids = new Set<string>();
      for (const card of commonCards) {
        if (ids.has(card.id)) {
          issues.push({
            type: 'error',
            code: 'DUPLICATE_COMMON_CARD_ID',
            message: `通用卡ID重复: ${card.id}`,
            context: card.id,
            suggestion: '请确保每张通用卡都有唯一的ID'
          });
        }
        ids.add(card.id);
        // 结构校验
        if (!this.dataProvider.validateCommonCardConfig(card)) {
          issues.push({
            type: 'error',
            code: 'INVALID_COMMON_CARD_STRUCTURE',
            message: `通用卡结构不完整: ${card.id}`,
            context: card.id,
            suggestion: '请检查通用卡字段是否齐全'
          });
        }
      }
    } catch (error) {
      issues.push({
        type: 'error',
        code: 'COMMON_CARD_VALIDATION_ERROR',
        message: `通用卡校验出错: ${error}`,
        context: 'system'
      });
    }
    return {
      valid: issues.filter(issue => issue.type === 'error').length === 0,
      issues
    };
  }
  /**
   * 校验角色卡引用的通用卡ID是否存在
   */
  async validateCharacterCommonCardRefs(): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    try {
      const [characters, commonCards] = await Promise.all([
        this.dataProvider.loadAllCharacters(),
        this.dataProvider.loadAllCommonCards()
      ]);
      const commonCardIdSet = new Set(commonCards.map(c => c.id));
      for (const character of characters) {
        if (character.commonCardIds) {
          for (const cid of character.commonCardIds) {
            if (!commonCardIdSet.has(cid)) {
              issues.push({
                type: 'error',
                code: 'INVALID_COMMON_CARD_REF',
                message: `角色 ${character.id} 引用了不存在的通用卡ID: ${cid}`,
                context: character.id,
                suggestion: '请确保所有引用的通用卡ID都存在'
              });
            }
          }
        }
      }
    } catch (error) {
      issues.push({
        type: 'error',
        code: 'COMMON_CARD_REF_VALIDATION_ERROR',
        message: `通用卡引用校验出错: ${error}`,
        context: 'system'
      });
    }
    return {
      valid: issues.filter(issue => issue.type === 'error').length === 0,
      issues
    };
  }
  private dataProvider: DataProvider;

  constructor(dataProvider: DataProvider) {
    this.dataProvider = dataProvider;
  }

  /**
   * 验证所有配置
   */
  async validateAll(): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    try {
      // 验证角色配置
      const characters = await this.dataProvider.loadAllCharacters();
      const characterValidation = await this.validateCharacters(characters);
      issues.push(...characterValidation.issues);
      // 验证事件配置
      for (const character of characters) {
        const events = await this.dataProvider.loadCharacterEvents(character.id);
        const eventValidation = this.validateEvents(events, character.id);
        issues.push(...eventValidation.issues);
      }
      // ...已移除角色间关系一致性校验...
    } catch (error) {
      issues.push({
        type: 'error',
        code: 'VALIDATION_ERROR',
        message: `验证过程中发生错误: ${error}`,
        context: 'system'
      });
    }
    return {
      valid: issues.filter(issue => issue.type === 'error').length === 0,
      issues
    };
  }

  /**
   * 验证角色配置
   */
  async validateCharacters(characters: CharacterConfig[]): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    if (characters.length === 0) {
      issues.push({
        type: 'error',
        code: 'NO_CHARACTERS',
        message: '没有找到任何角色配置',
        suggestion: '请添加至少一个角色配置文件'
      });
      return { valid: false, issues };
    }
    const ids = new Set<string>();
    characters.forEach(character => {
      if (ids.has(character.id)) {
        issues.push({
          type: 'error',
          code: 'DUPLICATE_CHARACTER_ID',
          message: `角色ID重复: ${character.id}`,
          context: character.id,
          suggestion: '请确保每个角色都有唯一的ID'
        });
      }
      ids.add(character.id);
    });
    for (const character of characters) {
      const characterIssues = this.validateSingleCharacter(character, characters);
      issues.push(...characterIssues);
    }
    return {
      valid: issues.filter(issue => issue.type === 'error').length === 0,
      issues
    };
  }

  /**
   * 验证单个角色配置
   */
  private validateSingleCharacter(character: CharacterConfig, allCharacters: CharacterConfig[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const context = `角色 ${character.id}`;
    if (!this.dataProvider.validateCharacterConfig(character)) {
      issues.push({
        type: 'error',
        code: 'INVALID_CHARACTER_STRUCTURE',
        message: '角色配置结构不完整',
        context,
        suggestion: '请检查是否包含所有必需字段'
      });
    }
    const { initialAttributes } = character;
    Object.entries(initialAttributes).forEach(([attr, value]) => {
      if (typeof value !== 'number' || value < 0 || value > 100) {
        issues.push({
          type: 'error',
          code: 'INVALID_ATTRIBUTE_VALUE',
          message: `属性 ${attr} 的值 ${value} 超出有效范围 (0-100)`,
          context,
          suggestion: '请将属性值设置在0-100之间'
        });
      }
    });
    // 关系值范围验证
    // ...已移除冗余关系/派系校验...
    return issues;
  }

  /**
   * 验证事件配置
   */
  validateEvents(events: EventConfig[], characterId: string): ValidationResult {
    const issues: ValidationIssue[] = [];
    const context = `角色 ${characterId} 的事件`;
    const ids = new Set<string>();
    events.forEach(event => {
      if (ids.has(event.id)) {
        issues.push({
          type: 'error',
          code: 'DUPLICATE_EVENT_ID',
          message: `事件ID重复: ${event.id}`,
          context,
          suggestion: '请确保每个事件都有唯一的ID'
        });
      }
      ids.add(event.id);
    });
    events.forEach(event => {
      const eventIssues = this.validateSingleEvent(event, characterId);
      issues.push(...eventIssues);
    });
    return {
      valid: issues.filter(issue => issue.type === 'error').length === 0,
      issues
    };
  }

  /**
   * 验证单个事件配置
   */
  private validateSingleEvent(event: EventConfig, characterId: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const context = `事件 ${event.id} (角色 ${characterId})`;
    if (!this.dataProvider.validateEventConfig(event)) {
      issues.push({
        type: 'error',
        code: 'INVALID_EVENT_STRUCTURE',
        message: '事件配置结构不完整',
        context,
        suggestion: '请检查是否包含所有必需字段'
      });
    }
    if (typeof event.weight !== 'number' || event.weight < 0) {
      issues.push({
        type: 'error',
        code: 'INVALID_EVENT_WEIGHT',
        message: `事件权重 ${event.weight} 无效`,
        context,
        suggestion: '请设置大于等于0的权重值'
      });
    }
    // 新事件卡结构校验
    if (!event.options || !Array.isArray(event.options) || event.options.length !== 2) {
      issues.push({
        type: 'error',
        code: 'INVALID_EVENT_OPTIONS_LENGTH',
        message: '事件卡必须且只能有2个选项',
        context,
        suggestion: '请确保 options 字段为长度为2的数组'
      });
    } else {
      (event.options as EventOption[]).forEach((opt: EventOption, idx: number) => {
        if (!opt.reply || typeof opt.reply !== 'string') {
          issues.push({
            type: 'error',
            code: 'INVALID_OPTION_REPLY',
            message: `第${idx + 1}个选项缺少或非法的 reply`,
            context,
            suggestion: '请填写玩家回应文本'
          });
        }
        if (!opt.effects || !Array.isArray(opt.effects) || opt.effects.length === 0) {
          issues.push({
            type: 'error',
            code: 'INVALID_OPTION_EFFECTS',
            message: `第${idx + 1}个选项缺少或非法的 effects 配置`,
            context,
            suggestion: '请填写至少一个属性修改配置'
          });
        } else {
          opt.effects.forEach((eff, effIdx) => {
            if (eff.target !== 'player' && eff.target !== 'self') {
              issues.push({
                type: 'error',
                code: 'INVALID_EFFECT_TARGET',
                message: `第${idx + 1}个选项第${effIdx + 1}个效果 target 非法: ${eff.target}`,
                context,
                suggestion: 'target 仅允许 "player" 或 "self"'
              });
            }
            const validAttributes = ['power', 'military', 'wealth', 'popularity', 'health', 'age'];
            if (!validAttributes.includes(eff.attribute)) {
              issues.push({
                type: 'error',
                code: 'INVALID_EFFECT_ATTRIBUTE',
                message: `第${idx + 1}个选项第${effIdx + 1}个效果 attribute 非法: ${eff.attribute}`,
                context,
                suggestion: `属性名必须为: ${validAttributes.join(', ')}`
              });
            }
            if (typeof eff.offset !== 'number' || isNaN(eff.offset)) {
              issues.push({
                type: 'error',
                code: 'INVALID_EFFECT_OFFSET',
                message: `第${idx + 1}个选项第${effIdx + 1}个效果 offset 非法: ${eff.offset}`,
                context,
                suggestion: 'offset 必须为数字'
              });
            }
          });
        }
      });
    }
    return issues;
  }

  /**
   * 验证角色间关系一致性
   */
  // ...已移除validateRelationshipConsistency方法...
}
