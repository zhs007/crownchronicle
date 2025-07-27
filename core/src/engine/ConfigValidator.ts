import { CharacterConfig, EventConfig, DataProvider } from '../types/game';

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

      // 验证角色间关系一致性
      const relationshipValidation = this.validateRelationshipConsistency(characters);
      issues.push(...relationshipValidation.issues);

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

    // 检查是否有角色
    if (characters.length === 0) {
      issues.push({
        type: 'error',
        code: 'NO_CHARACTERS',
        message: '没有找到任何角色配置',
        suggestion: '请添加至少一个角色配置文件'
      });
      return { valid: false, issues };
    }

    // 检查角色ID重复
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

    // 验证每个角色
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

    // 基础字段验证
    if (!this.dataProvider.validateCharacterConfig(character)) {
      issues.push({
        type: 'error',
        code: 'INVALID_CHARACTER_STRUCTURE',
        message: '角色配置结构不完整',
        context,
        suggestion: '请检查是否包含所有必需字段'
      });
    }

    // 属性值范围验证
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
    const { initialRelationshipWithEmperor } = character;
    Object.entries(initialRelationshipWithEmperor).forEach(([rel, value]) => {
      const min = (rel === 'affection' || rel === 'trust') ? -100 : 0;
      if (typeof value !== 'number' || value < min || value > 100) {
        issues.push({
          type: 'error',
          code: 'INVALID_RELATIONSHIP_VALUE',
          message: `关系属性 ${rel} 的值 ${value} 超出有效范围 (${min}-100)`,
          context,
          suggestion: `请将关系属性设置在${min}-100之间`
        });
      }
    });

    // 角色关系网络验证
    character.relationshipNetwork.forEach(rel => {
      // 检查目标角色是否存在
      if (!allCharacters.find(c => c.id === rel.targetCharacter)) {
        issues.push({
          type: 'error',
          code: 'INVALID_RELATIONSHIP_TARGET',
          message: `关系网络中引用了不存在的角色: ${rel.targetCharacter}`,
          context,
          suggestion: '请确保关系网络中引用的角色都存在'
        });
      }

      // 检查关系强度范围
      if (rel.relationshipStrength < -100 || rel.relationshipStrength > 100) {
        issues.push({
          type: 'error',
          code: 'INVALID_RELATIONSHIP_STRENGTH',
          message: `与 ${rel.targetCharacter} 的关系强度 ${rel.relationshipStrength} 超出有效范围 (-100到100)`,
          context,
          suggestion: '请将关系强度设置在-100到100之间'
        });
      }
    });

    // 派系信息验证
    if (character.factionInfo.factionLoyalty < 0 || character.factionInfo.factionLoyalty > 100) {
      issues.push({
        type: 'error',
        code: 'INVALID_FACTION_LOYALTY',
        message: `派系忠诚度 ${character.factionInfo.factionLoyalty} 超出有效范围 (0-100)`,
        context,
        suggestion: '请将派系忠诚度设置在0-100之间'
      });
    }

    return issues;
  }

  /**
   * 验证事件配置
   */
  validateEvents(events: EventConfig[], characterId: string): ValidationResult {
    const issues: ValidationIssue[] = [];
    const context = `角色 ${characterId} 的事件`;

    // 检查事件ID重复
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

    // 验证每个事件
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

    // 基础结构验证
    if (!this.dataProvider.validateEventConfig(event)) {
      issues.push({
        type: 'error',
        code: 'INVALID_EVENT_STRUCTURE',
        message: '事件配置结构不完整',
        context,
        suggestion: '请检查是否包含所有必需字段'
      });
    }

    // 权重验证
    if (typeof event.weight !== 'number' || event.weight < 0) {
      issues.push({
        type: 'error',
        code: 'INVALID_EVENT_WEIGHT',
        message: `事件权重 ${event.weight} 无效`,
        context,
        suggestion: '请设置大于等于0的权重值'
      });
    }

    // 选项验证
    if (!event.choices || event.choices.length === 0) {
      issues.push({
        type: 'error',
        code: 'NO_EVENT_CHOICES',
        message: '事件没有任何选项',
        context,
        suggestion: '请为事件添加至少一个选项'
      });
    } else {
      // 检查选项ID重复
      const choiceIds = new Set<string>();
      event.choices.forEach(choice => {
        if (choiceIds.has(choice.id)) {
          issues.push({
            type: 'error',
            code: 'DUPLICATE_CHOICE_ID',
            message: `选项ID重复: ${choice.id}`,
            context,
            suggestion: '请确保事件中每个选项都有唯一的ID'
          });
        }
        choiceIds.add(choice.id);

        // 验证选项效果
        if (choice.effects) {
          Object.entries(choice.effects).forEach(([attr, value]) => {
            if (typeof value === 'number' && (value < -100 || value > 100)) {
              issues.push({
                type: 'warning',
                code: 'EXTREME_EFFECT_VALUE',
                message: `选项 ${choice.id} 对属性 ${attr} 的影响 ${value} 可能过于极端`,
                context,
                suggestion: '考虑将效果值设置在合理范围内'
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
  private validateRelationshipConsistency(characters: CharacterConfig[]): ValidationResult {
    const issues: ValidationIssue[] = [];

    characters.forEach(character => {
      character.relationshipNetwork.forEach(rel => {
        const targetCharacter = characters.find(c => c.id === rel.targetCharacter);
        if (!targetCharacter) return;

        // 查找目标角色对当前角色的关系定义
        const reverseRel = targetCharacter.relationshipNetwork.find(r => r.targetCharacter === character.id);
        
        if (!reverseRel) {
          issues.push({
            type: 'warning',
            code: 'MISSING_REVERSE_RELATIONSHIP',
            message: `${character.id} 定义了与 ${rel.targetCharacter} 的关系，但 ${rel.targetCharacter} 没有定义反向关系`,
            context: `角色关系一致性`,
            suggestion: '考虑为双方都定义关系以保持一致性'
          });
        } else {
          // 检查关系类型一致性
          const typeMap: Record<string, string> = {
            'ally': 'ally',
            'enemy': 'enemy',
            'superior': 'subordinate',
            'subordinate': 'superior',
            'family': 'family',
            'neutral': 'neutral'
          };

          const expectedType = typeMap[rel.relationType];
          if (expectedType && reverseRel.relationType !== expectedType) {
            issues.push({
              type: 'warning',
              code: 'INCONSISTENT_RELATIONSHIP_TYPE',
              message: `${character.id} 与 ${rel.targetCharacter} 的关系类型不一致: ${rel.relationType} vs ${reverseRel.relationType}`,
              context: '角色关系一致性',
              suggestion: '请确保双方的关系类型相互对应'
            });
          }
        }
      });
    });

    return {
      valid: issues.filter(issue => issue.type === 'error').length === 0,
      issues
    };
  }
}
