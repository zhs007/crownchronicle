import yaml from 'js-yaml';
import { CharacterCard, EventCard, CharacterConfig, EventConfig, DataProvider, CommonCard } from '../types/game';

export class FileSystemDataProvider implements DataProvider {
  private commonCardsDirectory: string;
  private dataDirectory: string;
  private charactersDirectory: string;

  constructor(dataDirectory: string) {
    this.dataDirectory = dataDirectory;
    this.charactersDirectory = `${dataDirectory}/characters`;
    this.commonCardsDirectory = `${dataDirectory}/commoncards`;
  }
  /**
   * 加载所有通用卡配置
   */
  async loadAllCommonCards(): Promise<CommonCard[]> {
    try {
      const commonCards: CommonCard[] = [];
      if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        const fs = await import('fs');
        const path = await import('path');
        const files = await fs.promises.readdir(this.commonCardsDirectory);
        for (const file of files) {
          if (file.endsWith('.json') || file.endsWith('.yaml') || file.endsWith('.yml')) {
            const filePath = path.join(this.commonCardsDirectory, file);
            const fileContent = await fs.promises.readFile(filePath, 'utf8');
            let card: CommonCard;
            if (file.endsWith('.json')) {
              card = JSON.parse(fileContent);
            } else {
              card = yaml.load(fileContent) as CommonCard;
            }
            commonCards.push(card);
          }
        }
      }
      return commonCards;
    } catch (error) {
      console.error('Failed to load common cards:', error);
      return [];
    }
  }

  /**
   * 校验通用卡配置
   */
  validateCommonCardConfig(config: any): boolean {
    const requiredFields = ['id', 'name', 'eventIds'];
    return requiredFields.every(field => field in config) && Array.isArray(config.eventIds);
  }

  /**
   * 加载所有角色配置
   */
  async loadAllCharacters(): Promise<CharacterConfig[]> {
    try {
      const characters: CharacterConfig[] = [];
      
      // 这里需要根据具体的文件系统实现来加载
      // 在浏览器环境中，可能需要预定义角色列表
      // 在Node.js环境中，可以使用fs模块
      
      // 示例实现（需要根据环境调整）
      if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        // Node.js 环境
        const fs = await import('fs');
        const path = await import('path');
        
        const characterDirs = await fs.promises.readdir(this.charactersDirectory);
        
        for (const dir of characterDirs) {
          const characterPath = path.join(this.charactersDirectory, dir);
          const stat = await fs.promises.stat(characterPath);
          
          if (stat.isDirectory()) {
            const character = await this.loadCharacter(dir);
            if (character) {
              characters.push(character);
            }
          }
        }
      }
      
      return characters;
    } catch (error) {
      console.error('Failed to load characters:', error);
      return [];
    }
  }

  /**
   * 加载单个角色配置
   */
  async loadCharacter(characterId: string): Promise<CharacterConfig | null> {
    try {
      if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        // Node.js 环境
        const fs = await import('fs');
        const path = await import('path');
        
        const characterFile = path.join(this.charactersDirectory, characterId, 'character.yaml');
        const fileContent = await fs.promises.readFile(characterFile, 'utf8');
        const config = yaml.load(fileContent) as CharacterConfig;
        
        return config;
      }
      
      return null;
    } catch (error) {
      console.error(`Failed to load character ${characterId}:`, error);
      return null;
    }
  }

  /**
   * 加载角色的所有事件
   */
  async loadCharacterEvents(characterId: string): Promise<EventConfig[]> {
    try {
      const events: EventConfig[] = [];
      
      if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        // Node.js 环境
        const fs = await import('fs');
        const path = await import('path');
        
        const eventsDir = path.join(this.charactersDirectory, characterId, 'events');
        const eventFiles = await fs.promises.readdir(eventsDir);
        
        for (const file of eventFiles) {
          if (file.endsWith('.yaml') || file.endsWith('.yml')) {
            const eventFile = path.join(eventsDir, file);
            const fileContent = await fs.promises.readFile(eventFile, 'utf8');
            const eventConfig = yaml.load(fileContent) as EventConfig;
            
            events.push(eventConfig);
          }
        }
      }
      
      return events;
    } catch (error) {
      console.error(`Failed to load events for character ${characterId}:`, error);
      return [];
    }
  }

  /**
   * 验证角色配置
   */
  validateCharacterConfig(config: any): boolean {
    const requiredFields = [
      'id', 'name', 'displayName', 'role', 'description',
      'initialAttributes', 'initialRelationshipWithEmperor',
      'factionInfo', 'influence'
    ];
    
    return requiredFields.every(field => field in config);
  }

  /**
   * 验证事件配置
   */
  validateEventConfig(config: any): boolean {
    const requiredFields = [
      'id', 'title', 'description', 'speaker', 'dialogue',
      'choices', 'weight'
    ];
    
    return requiredFields.every(field => field in config) &&
           Array.isArray(config.choices) &&
           config.choices.length > 0;
  }
}

export class MemoryDataProvider implements DataProvider {
  private commonCards: CommonCard[] = [];
  private characters: CharacterConfig[] = [];
  private events: Map<string, EventConfig[]> = new Map();

  constructor(characters: CharacterConfig[], events: Map<string, EventConfig[]>, commonCards: CommonCard[] = []) {
    this.characters = characters;
    this.events = events;
    this.commonCards = commonCards;
  }
  async loadAllCommonCards(): Promise<CommonCard[]> {
    return [...this.commonCards];
  }

  validateCommonCardConfig(config: any): boolean {
    const requiredFields = ['id', 'name', 'eventIds'];
    return requiredFields.every(field => field in config) && Array.isArray(config.eventIds);
  }

  async loadAllCharacters(): Promise<CharacterConfig[]> {
    return [...this.characters];
  }

  async loadCharacter(characterId: string): Promise<CharacterConfig | null> {
    return this.characters.find(c => c.id === characterId) || null;
  }

  async loadCharacterEvents(characterId: string): Promise<EventConfig[]> {
    return this.events.get(characterId) || [];
  }

  validateCharacterConfig(config: any): boolean {
    const requiredFields = [
      'id', 'name', 'displayName', 'role', 'description',
      'initialAttributes', 'initialRelationshipWithEmperor',
      'factionInfo', 'influence'
    ];
    
    return requiredFields.every(field => field in config);
  }

  validateEventConfig(config: any): boolean {
    const requiredFields = [
      'id', 'title', 'description', 'speaker', 'dialogue',
      'choices', 'weight'
    ];
    
    return requiredFields.every(field => field in config) &&
           Array.isArray(config.choices) &&
           config.choices.length > 0;
  }
}

/**
 * 配置转换工具类
 */
export class ConfigConverter {
  /**
   * 将配置转换为游戏角色卡
   */
  static configToCharacterCard(config: CharacterConfig): CharacterCard {
    return {
      id: config.id,
      name: config.name,
      displayName: config.displayName,
      currentTitle: config.displayName,
      role: config.role,
      description: config.description,
      identityRevealed: false,
      attributes: {
        power: config.initialAttributes.power,
        military: config.initialAttributes.military,
        wealth: config.initialAttributes.wealth,
        popularity: config.initialAttributes.popularity,
        health: config.initialAttributes.health,
        age: config.initialAttributes.age
      },
      revealedTraits: [],
      hiddenTraits: [
        ...(config.traits || []), 
        ...(config.hiddenTraits || [])
      ],
      discoveredClues: [],
      totalClues: config.backgroundClues ? Object.keys(config.backgroundClues).length : 0,
      eventIds: []
    };
  }

  /**
   * 将配置转换为游戏事件卡
   */
  static configToEventCard(config: EventConfig, characterId: string): EventCard {
    return {
      id: config.id,
      characterId: characterId,
      title: config.title,
      description: config.description,
      speaker: config.speaker,
      dialogue: config.dialogue,
      
      choices: config.choices.map(choice => ({
        id: choice.id,
        text: choice.text,
        effects: choice.effects || {},
        consequences: choice.consequences,
        characterEffects: choice.characterEffects || [],
        interCharacterEffects: choice.interCharacterEffects || [],
        factionEffects: choice.factionEffects || [],
        characterClues: choice.characterClues || [],
        nextEvents: choice.nextEvents || [],
        conditions: choice.conditions
      })),
      
      activationConditions: config.activationConditions,
      removalConditions: config.removalConditions,
      triggerConditions: config.triggerConditions,
      
      weight: config.weight,
      dynamicWeight: config.dynamicWeight,
      
      characterClues: config.characterClues
    };
  }

  /**
   * 随机选择角色
   */
  static selectRandomCharacters(
    characters: CharacterConfig[], 
    minCount: number = 3, 
    maxCount: number = 5
  ): CharacterConfig[] {
    const availableCharacters = [...characters];
    const selectedCount = Math.min(Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount, availableCharacters.length);
    const selected: CharacterConfig[] = [];
    
    // 如果角色总数不足，直接返回所有角色
    if (availableCharacters.length <= selectedCount) {
      return availableCharacters;
    }
    
    // 尝试确保每种类型至少有一个角色（如果可能的话）
    const preferredTypes = ['皇族', '文臣', '武将'];
    const typeGroups = new Map<string, CharacterConfig[]>();
    
    availableCharacters.forEach(char => {
      if (!typeGroups.has(char.category)) {
        typeGroups.set(char.category, []);
      }
      typeGroups.get(char.category)!.push(char);
    });
    
    // 先从每个可用类型中选择一个
    for (const type of preferredTypes) {
      const group = typeGroups.get(type);
      if (group && group.length > 0 && selected.length < selectedCount) {
        const randomIndex = Math.floor(Math.random() * group.length);
        const selectedChar = group[randomIndex];
        selected.push(selectedChar);
        
        // 从可用列表中移除
        const index = availableCharacters.indexOf(selectedChar);
        if (index > -1) {
          availableCharacters.splice(index, 1);
        }
      }
    }
    
    // 随机填充剩余位置
    while (selected.length < selectedCount && availableCharacters.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableCharacters.length);
      const selectedChar = availableCharacters.splice(randomIndex, 1)[0];
      
      // 检查冲突条件
      if (this.checkCharacterCompatibility(selectedChar, selected)) {
        selected.push(selectedChar);
      }
    }
    
    return selected;
  }

  /**
   * 检查角色兼容性
   */
  private static checkCharacterCompatibility(
    character: CharacterConfig, 
    selectedCharacters: CharacterConfig[]
  ): boolean {
    if (!character.conditions) return true;
    
    // 检查排除的角色
    if (character.conditions.excludeCharacters) {
      const selectedIds = selectedCharacters.map(c => c.id);
      if (character.conditions.excludeCharacters.some(id => selectedIds.includes(id))) {
        return false;
      }
    }
    
    // ...已移除派系冲突检查...
    
    return true;
  }
}
