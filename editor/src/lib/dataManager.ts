// 通用卡保存方法，支持新建/编辑
import { 
  FileSystemDataProvider, 
  ConfigValidator,
  type CharacterCard, 
  type EventCard,
  type EventOption,
  type CharacterConfig,
  type EventConfig
} from 'crownchronicle-core';
import { GameConfigManager } from './configManager';
import { ValidationReport } from '@/types/editor';
import { dump } from 'js-yaml';
import { promises as fs } from 'fs';
import path from 'path';

export async function saveCommonCard(card: Record<string, unknown>) {
  const dataPath = GameConfigManager.getConfigPath('editor');
  const commonCardsDir = path.join(dataPath, 'commoncards');
  const cardId = (card.id as string) || (card.name as string);
  if (!cardId) throw new Error('通用卡缺少 id 或 name');
  const cardDir = path.join(commonCardsDir, cardId);
  await fs.mkdir(cardDir, { recursive: true });
  const cardFile = path.join(cardDir, 'commoncard.yaml');
  const yamlContent = dump(card, { indent: 2, quotingType: '"', lineWidth: -1 });
  await fs.writeFile(cardFile, yamlContent, 'utf8');
  return cardId;
}

// ...existing imports...

export class EditorDataManager {
  // ...existing code...

  private normalizeTitle(title: string): string {
    return title.trim().replace(/\s+/g, '').toLowerCase();
  }

  /**
   * 获取所有通用卡（直接用 core 的递归方法）
   */
  async getAllCommonCards(): Promise<Record<string, unknown>[]> {
    const cards = await this.dataProvider.loadAllCommonCards();
    console.log('[EditorDataManager] Loaded common cards from core:', Array.isArray(cards) ? cards.length : 0);
    return cards as unknown as Record<string, unknown>[];
  }

  private dataProvider: FileSystemDataProvider;
  private validator: ConfigValidator;
  private dataPath: string;

  constructor(dataPath?: string) {
    const actualDataPath = dataPath || GameConfigManager.getConfigPath('editor');
    this.dataPath = actualDataPath;
    this.dataProvider = new FileSystemDataProvider(actualDataPath);
    this.validator = new ConfigValidator(this.dataProvider);
  }
  
  async saveCharacter(characterName: string, data: CharacterCard) {
    try {
      // 根据角色名称自动生成规范的ID
      const characterId = this.generateCharacterId(characterName);
      
      // 将生成的ID设置到数据中
      data.id = characterId;
      
      // 将 CharacterCard 转换为 CharacterConfig 格式以兼容 YAML 结构
      const characterConfig: CharacterConfig = this.convertCardToConfig(data);
      
      // 创建角色目录
      const characterDir = path.join(this.dataPath, 'characters', characterId);
      await fs.mkdir(characterDir, { recursive: true });
      
      // 创建 events 子目录
      const eventsDir = path.join(characterDir, 'events');
      await fs.mkdir(eventsDir, { recursive: true });
      
      // 保存角色配置文件
      const characterFile = path.join(characterDir, 'character.yaml');
      const yamlContent = dump(characterConfig, {
        indent: 2,
        quotingType: '"',
        lineWidth: -1
      });
      
      await fs.writeFile(characterFile, yamlContent, 'utf8');
      console.log(`✅ 角色文件已保存: ${characterFile}`);
      
      return characterId;
      
    } catch (error) {
      console.error('保存角色文件失败:', error);
      throw new Error(`保存角色 ${characterName} 失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async loadCharacter(characterId: string): Promise<CharacterCard | null> {
    const config = await this.dataProvider.loadCharacter(characterId);
    if (!config) return null;
    
    // 将 CharacterConfig 转换为 CharacterCard
    return this.convertConfigToCard(config);
  }
  
  async saveEvent(characterId: string, eventTitle: string, data: EventCard) {
    try {
      // 获取角色的现有事件，先做重复标题检测
      const existingEvents = await this.getCharacterEvents(characterId);
      const normNew = this.normalizeTitle(eventTitle);
      const dup = existingEvents.find(e => this.normalizeTitle(e.title) === normNew);
      if (dup) {
        throw new Error(`该角色已存在同标题事件：${eventTitle}`);
      }

      // 计算下一个序号
      const nextNumber = existingEvents.length + 1;
      
      // 根据角色ID和序号自动生成规范的事件ID
      const eventId = this.generateEventId(characterId, nextNumber);
      
      // 将生成的ID设置到数据中
      data.id = eventId;
      
      // 自动生成选项ID（新版结构，只有 options 字段）
      if (data.options && Array.isArray(data.options)) {
        data.options.forEach((option, index) => {
          option.optionId = this.generateChoiceId(characterId, nextNumber, index);
        });
      }
      
      // 将 EventCard 转换为 EventConfig 格式以兼容 YAML 结构
      const eventConfig: EventConfig = this.convertEventCardToConfig(data);
      
      // 确保角色目录和 events 子目录存在
      const eventsDir = path.join(this.dataPath, 'characters', characterId, 'events');
      await fs.mkdir(eventsDir, { recursive: true });
      
      // 保存事件配置文件
      const eventFile = path.join(eventsDir, `${eventId}.yaml`);
      const yamlContent = dump(eventConfig, {
        indent: 2,
        quotingType: '"',
        lineWidth: -1
      });
      
      await fs.writeFile(eventFile, yamlContent, 'utf8');
      console.log(`✅ 事件文件已保存: ${eventFile}`);
      
      return eventId;
      
    } catch (error) {
      console.error('保存事件文件失败:', error);
      throw new Error(`保存事件 ${eventTitle} 失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async loadEvent(characterId: string, eventId: string): Promise<EventCard | null> {
    const events = await this.dataProvider.loadCharacterEvents(characterId);
    const eventConfig = events.find(e => e.id === eventId);
    if (!eventConfig) return null;
    
    // 将 EventConfig 转换为 EventCard
    return this.convertEventConfigToCard(eventConfig);
  }
  
  async getAllCharacters(): Promise<CharacterCard[]> {
    const configs = await this.dataProvider.loadAllCharacters();
    return configs.map(config => this.convertConfigToCard(config));
  }
  
  async getCharacterEvents(characterId: string): Promise<EventCard[]> {
    const eventConfigs = await this.dataProvider.loadCharacterEvents(characterId);
    return eventConfigs.map(config => this.convertEventConfigToCard(config));
  }
  
  async exportCharacterAsYaml(characterId: string): Promise<string> {
    const character = await this.loadCharacter(characterId);
    if (!character) return '';
    
    return dump(character, {
      indent: 2,
      quotingType: '"',
      lineWidth: -1
    });
  }
  
  async exportEventAsYaml(characterId: string, eventId: string): Promise<string> {
    const event = await this.loadEvent(characterId, eventId);
    if (!event) return '';
    
    return dump(event, {
      indent: 2,
      quotingType: '"',
      lineWidth: -1
    });
  }
  
  async exportProject(): Promise<Blob> {
    // TODO: 实现项目导出功能
    throw new Error('Project export not implemented yet');
  }
  
  async validateAllData(): Promise<ValidationReport> {
    const report: ValidationReport = {
      characters: [],
      events: [],
      isValid: true
    };
    
    try {
      // 使用 Core 包的验证器验证所有数据
      const validationResult = await this.validator.validateAll();
      
      // 暂时返回基本报告，TODO: 解析详细的验证结果
      report.isValid = validationResult.valid;
      
      // 获取角色列表用于报告
      const characters = await this.getAllCharacters();
      for (const character of characters) {
        report.characters.push({
          id: character.id,
          name: character.name,
          isValid: true, // TODO: 从详细验证结果中提取
          issues: []
        });
        
        const events = await this.getCharacterEvents(character.id);
        for (const event of events) {
          report.events.push({
            id: event.id,
            characterId: character.id,
            title: event.title,
            isValid: true, // TODO: 从详细验证结果中提取
            issues: []
          });
        }
      }
    } catch (error) {
      console.error('Validation failed:', error);
      report.isValid = false;
    }
    
    return report;
  }
  
  private convertConfigToCard(config: CharacterConfig): CharacterCard {
    // 只保留 core 类型定义字段，兼容必填字段
    return {
      id: config.id,
      name: config.name,
      description: config.description,
      attributes: config.initialAttributes,
      commonCardIds: config.commonCardIds ?? [],
      events: [],
      tags: [],
      eventIds: []
    };
  }
  
  private convertEventConfigToCard(config: EventConfig): EventCard {
    // 严格转换 EventConfig -> EventCard，兼容新版结构
    // 只保留核心字段，确保 options 字段存在且为两个选项
    let options: [EventOption, EventOption];
    if (Array.isArray(config.options) && config.options.length === 2) {
      options = [config.options[0], config.options[1]];
    } else {
      options = [
        {
          optionId: '',
          reply: '',
          effects: [{ target: 'player', attribute: 'power', offset: 0 }]
        },
        {
          optionId: '',
          reply: '',
          effects: [{ target: 'self', attribute: 'power', offset: 0 }]
        }
      ];
    }
    return {
      eventId: config.id ?? '',
      id: config.id,
      title: config.title,
      dialogue: typeof ((config as unknown) as Record<string, unknown>)['dialogue'] === 'string' ? ((config as unknown) as Record<string, unknown>)['dialogue'] as string : '',
      options,
      activationConditions: config.activationConditions,
      removalConditions: config.removalConditions,
      triggerConditions: config.triggerConditions,
      weight: typeof config.weight === 'number' ? config.weight : 1
    };
  }

  private convertCardToConfig(card: CharacterCard): CharacterConfig {
    // 只保留 core 类型定义字段
    return {
      id: card.id,
      name: card.name,
      description: card.description,
      initialAttributes: card.attributes,
      commonCardIds: card.commonCardIds ?? []
      // 不写入 tags/eventIds 字段到 YAML
    };
  }

  private convertEventCardToConfig(card: EventCard): EventConfig {
    // 严格转换 EventCard -> EventConfig，兼容新版结构
    return {
      id: card.id,
      title: card.title,
      options: card.options,
      activationConditions: card.activationConditions,
      removalConditions: card.removalConditions,
      triggerConditions: card.triggerConditions,
      weight: card.weight
    };
  }

  /**
   * 根据角色名生成规范的角色ID
   * 规则：
   * 1. 将中文名转为拼音（如果有特殊映射规则）
   * 2. 移除空格和标点符号
   * 3. 转换为小写
   * 4. 保持简洁明了
   */
  private generateCharacterId(characterName: string): string {
    // 只允许小写字母和数字，移除空格、标点、特殊符号
    const cleanName = characterName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const charMap: { [key: string]: string } = {
      '武则天': 'wuzetian',
      '李隆基': 'lilongji',
      '杨贵妃': 'yangguifei',
      '霍光': 'huoguang',
      '李牧': 'limu',
      '安禄山': 'anlushan',
      '狄仁杰': 'direnjie',
      '上官婉儿': 'shangguanwaner'
    };
    const id = charMap[characterName] || cleanName;
    if (!/^[a-z][a-z0-9]*$/.test(id)) {
      throw new Error('角色ID必须为拼音小写字母开头，仅包含小写字母和数字');
    }
    return id;
  }

  /**
   * 根据角色ID和事件序号生成事件ID
   * 格式：{characterId}_event_{number}
   */
  private generateEventId(characterId: string, eventNumber: number): string {
    const id = `${characterId}_event_${eventNumber.toString().padStart(3, '0')}`;
    if (!/^[a-z][a-z0-9_]*$/.test(id)) {
      throw new Error('事件ID必须为拼音+_event_+数字，且仅包含小写字母、数字、下划线');
    }
    return id;
  }

  /**
   * 根据角色ID、事件序号和选项索引生成选项ID
   * 格式：{characterId}_event_{number}_choice_{index}
   */
  private generateChoiceId(characterId: string, eventNumber: number, choiceIndex: number): string {
    const eventNum = eventNumber.toString().padStart(3, '0');
    const choiceNum = (choiceIndex + 1).toString().padStart(2, '0');
    const id = `${characterId}_event_${eventNum}_choice_${choiceNum}`;
    if (!/^[a-z][a-z0-9_]*$/.test(id)) {
      throw new Error('选项ID必须为拼音+_event_+数字+_choice_+数字，且仅包含小写字母、数字、下划线');
    }
    return id;
  }
}

// 便于 API 路由直接调用（放在文件末尾，确保类已声明）
export const _defaultManager = new EditorDataManager();
export const getAllCommonCards = _defaultManager.getAllCommonCards.bind(_defaultManager);