import { 
  FileSystemDataProvider, 
  ConfigValidator,
  type CharacterCard, 
  type EventCard,
  type CharacterConfig,
  type EventConfig
} from 'crownchronicle-core';
import { ValidationReport } from '@/types/editor';
import { dump } from 'js-yaml';

export class EditorDataManager {
  private dataProvider: FileSystemDataProvider;
  private validator: ConfigValidator;
  
  constructor(dataPath: string = './src/data') {
    this.dataProvider = new FileSystemDataProvider(dataPath);
    this.validator = new ConfigValidator(this.dataProvider);
  }
  
  async saveCharacter(characterId: string, data: CharacterCard) {
    // 由于 Core 包的 FileSystemDataProvider 主要用于读取，
    // 我们需要自己实现保存功能
    // TODO: 实现文件保存逻辑
    console.log('Saving character:', characterId, data);
  }
  
  async loadCharacter(characterId: string): Promise<CharacterCard | null> {
    const config = await this.dataProvider.loadCharacter(characterId);
    if (!config) return null;
    
    // 将 CharacterConfig 转换为 CharacterCard
    return this.convertConfigToCard(config);
  }
  
  async saveEvent(characterId: string, eventId: string, data: EventCard) {
    // 由于 Core 包的 FileSystemDataProvider 主要用于读取，
    // 我们需要自己实现保存功能
    // TODO: 实现文件保存逻辑
    console.log('Saving event:', characterId, eventId, data);
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
    // 将 CharacterConfig 转换为 CharacterCard
    // 这个转换需要根据实际的类型定义来实现
    return config as unknown as CharacterCard;
  }
  
  private convertEventConfigToCard(config: EventConfig): EventCard {
    // 将 EventConfig 转换为 EventCard
    // 这个转换需要根据实际的类型定义来实现
    return config as unknown as EventCard;
  }
}
