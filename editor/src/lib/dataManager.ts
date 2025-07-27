import { 
  FileSystemDataProvider, 
  ConfigValidator,
  type CharacterCard, 
  type EventCard,
  type CharacterConfig,
  type EventConfig
} from 'crownchronicle-core';
import { GameConfigManager } from './configManager';
import { ValidationReport } from '@/types/editor';
import { dump } from 'js-yaml';
import yaml from 'js-yaml';
import { promises as fs } from 'fs';
import path from 'path';

// ...existing imports...

export class EditorDataManager {
  // ...existing code...

  /**
   * 获取所有通用卡（仅基础信息）
   */
  async getAllCommonCards(): Promise<any[]> {
    const commonCardsDir = path.join(this.dataPath, 'commoncards');
    let cardDirs: string[] = [];
    try {
      cardDirs = await fs.readdir(commonCardsDir);
    } catch (e) {
      return [];
    }
    const cards: any[] = [];
    for (const dir of cardDirs) {
      const cardFile = path.join(commonCardsDir, dir, 'commoncard.yaml');
      try {
        const content = await fs.readFile(cardFile, 'utf8');
        // 这里假设通用卡结构简单，直接用 js-yaml 解析
        const card = yaml.load(content);
        cards.push(card);
      } catch (e) {
        // 跳过无效或损坏的通用卡
      }
    }
    return cards;
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
      // 获取角色的现有事件，计算下一个序号
      const existingEvents = await this.getCharacterEvents(characterId);
      const nextNumber = existingEvents.length + 1;
      
      // 根据角色ID和序号自动生成规范的事件ID
      const eventId = this.generateEventId(characterId, nextNumber);
      
      // 将生成的ID设置到数据中
      data.id = eventId;
      data.characterId = characterId;
      
      // 自动生成选项ID
      if (data.choices && Array.isArray(data.choices)) {
        data.choices.forEach((choice, index) => {
          choice.id = this.generateChoiceId(characterId, nextNumber, index);
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
    // 将 CharacterConfig 转换为 CharacterCard，正确映射字段名
    return {
      id: config.id,
      name: config.name,
      displayName: config.displayName,
      currentTitle: config.displayName, // 如果没有单独的 currentTitle，使用 displayName
      role: config.role,
      description: config.description,
      identityRevealed: false, // 默认值
      
      attributes: config.initialAttributes, // 将 initialAttributes 映射到 attributes
      relationshipWithEmperor: config.initialRelationshipWithEmperor, // 映射关系字段
      relationshipNetwork: (config.relationshipNetwork || []).map(rel => ({
        targetCharacterId: rel.targetCharacter, // 映射字段名
        relationType: rel.relationType,
        relationshipStrength: rel.relationshipStrength,
        secretLevel: rel.secretLevel,
        historicalBasis: rel.historicalBasis
      })),
      factionInfo: config.factionInfo,
      influence: config.influence,
      
      revealedTraits: [], // 默认空数组
      hiddenTraits: [], // 默认空数组
      discoveredClues: [], // 默认空数组
      totalClues: 0, // 默认值
      statusFlags: {
        alive: true,
        inCourt: true,
        inExile: false,
        imprisoned: false,
        promoted: false,
        demoted: false,
        suspicious: false,
        plotting: false
      }, // 默认状态标志
      eventIds: [] // 默认空数组
    };
  }
  
  private convertEventConfigToCard(config: EventConfig): EventCard {
    // 将 EventConfig 转换为 EventCard
    // 这个转换需要根据实际的类型定义来实现
    return config as unknown as EventCard;
  }

  private convertCardToConfig(card: CharacterCard): CharacterConfig {
    // 将 CharacterCard 转换回 CharacterConfig 格式以保存为 YAML
    return {
      id: card.id,
      name: card.name,
      displayName: card.displayName,
      role: card.role,
      description: card.description,
      category: '权臣', // 默认分类，应该从 card 中获取
      rarity: 'common', // 默认稀有度，应该从 card 中获取
      
      initialAttributes: card.attributes,
      initialRelationshipWithEmperor: card.relationshipWithEmperor,
      relationshipNetwork: card.relationshipNetwork.map(rel => ({
        targetCharacter: rel.targetCharacterId,
        relationType: rel.relationType,
        relationshipStrength: rel.relationshipStrength,
        secretLevel: rel.secretLevel,
        historicalBasis: rel.historicalBasis
      })),
      factionInfo: card.factionInfo,
      influence: card.influence,
      
      // 必需字段设为默认值
      traits: card.revealedTraits || [],
      hiddenTraits: card.hiddenTraits || [],
      backgroundClues: {
        appearance: '',
        mannerisms: '',
        preferences: '',
        relationships: '',
        secrets: ''
      }
    };
  }

  private convertEventCardToConfig(card: EventCard): EventConfig {
    // 将 EventCard 转换回 EventConfig 格式以保存为 YAML
    return {
      id: card.id,
      title: card.title,
      description: card.description,
      speaker: card.speaker,
      dialogue: card.dialogue,
      weight: card.weight,
      choices: card.choices,
      activationConditions: card.activationConditions,
      characterClues: card.characterClues
    } as EventConfig;
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
