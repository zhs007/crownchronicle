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
   * 加载所有通用卡配置（递归子目录）
   */
  async loadAllCommonCards(): Promise<CommonCard[]> {
    try {
      const commonCards: CommonCard[] = [];
      if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        const fs = await import('fs');
        const path = await import('path');

        // 递归读取所有 yaml/yml/json 文件
        async function readAllFiles(dir: string): Promise<string[]> {
          let results: string[] = [];
          const list = await fs.promises.readdir(dir);
          for (const file of list) {
            const filePath = path.join(dir, file);
            const stat = await fs.promises.stat(filePath);
            if (stat.isDirectory()) {
              results = results.concat(await readAllFiles(filePath));
            } else if (file === 'commoncard.yaml' || file.endsWith('.json')) {
              results.push(filePath);
            }
          }
          return results;
        }

        const files = await readAllFiles(this.commonCardsDirectory);
        // 日志：输出所有找到的文件
        console.log('[CommonCard] Found files:', files);
        for (const filePath of files) {
          const fileContent = await fs.promises.readFile(filePath, 'utf8');
          let card: CommonCard;
          if (filePath.endsWith('.json')) {
            card = JSON.parse(fileContent);
          } else {
            card = yaml.load(fileContent) as CommonCard;
          }
          commonCards.push(card);
        }
        // 日志：输出加载到的卡片数量和 id
        console.log(`[CommonCard] Loaded ${commonCards.length} cards:`, commonCards.map(c => c.id));
      } else {
        // 浏览器环境下也输出日志
        console.log('[CommonCard] Not running in Node.js, skipping file load.');
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
        let eventFiles: string[] = [];
        try {
          eventFiles = await fs.promises.readdir(eventsDir);
        } catch (err: any) {
          if (err.code === 'ENOENT') {
            // 目录不存在，返回空数组（不输出 error 日志）
            return [];
          }
          // 其他异常才输出 error
          console.error(`Failed to load events for character ${characterId}:`, err);
          return [];
        }
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
      tags: [],
      events: [],
      description: config.description,
      attributes: {
        power: config.initialAttributes.power,
        military: config.initialAttributes.military,
        wealth: config.initialAttributes.wealth,
        popularity: config.initialAttributes.popularity,
        health: config.initialAttributes.health,
        age: config.initialAttributes.age
      },
      eventIds: [],
      commonCardIds: []
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
  if (availableCharacters.length <= selectedCount) {
    return availableCharacters;
  }
  const selected: CharacterConfig[] = [];
  while (selected.length < selectedCount && availableCharacters.length > 0) {
    const randomIndex = Math.floor(Math.random() * availableCharacters.length);
    const selectedChar = availableCharacters.splice(randomIndex, 1)[0];
    selected.push(selectedChar);
  }
  return selected;
}

}