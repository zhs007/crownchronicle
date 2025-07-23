import yaml from 'js-yaml';
import { promises as fs } from 'fs';
import { join } from 'path';
import { CharacterCard, EventCard } from '@/types/game';

// 角色配置结构
export interface CharacterConfig {
  id: string;
  name: string;
  displayName: string;
  role: string;
  description: string;
  category: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  
  initialAttributes: {
    power: number;
    loyalty: number;
    ambition: number;
    competence: number;
    reputation: number;
    health: number;
    age: number;
  };
  
  initialRelationshipWithEmperor: {
    affection: number;
    trust: number;
    fear: number;
    respect: number;
    dependency: number;
    threat: number;
  };
  
  factionInfo: {
    primaryFaction?: string;
    secondaryFactions: string[];
    factionLoyalty: number;
    leadershipRole: 'leader' | 'core' | 'member' | 'sympathizer';
  };
  
  relationshipNetwork: Array<{
    targetCharacter: string;
    relationType: 'ally' | 'enemy' | 'neutral' | 'superior' | 'subordinate' | 'family';
    relationshipStrength: number;
    secretLevel: number;
    historicalBasis: string;
  }>;
  
  influence: {
    health: number;
    authority: number;
    treasury: number;
    military: number;
    popularity: number;
  };
  
  traits: string[];
  hiddenTraits: string[];
  
  conditions?: {
    minReignYears?: number;
    maxAge?: number;
    excludeCharacters?: string[];
    requiredFactions?: string[];
    conflictingFactions?: string[];
  };
  
  backgroundClues: {
    appearance: string;
    mannerisms: string;
    preferences: string;
    relationships: string;
    secrets: string;
  };
}

// 事件配置结构
export interface EventConfig {
  id: string;
  title: string;
  description: string;
  speaker: string;
  dialogue: string;
  
  characterClues?: {
    revealedTraits?: string[];
    personalityHints?: string[];
    backgroundHints?: string[];
  };
  
  activationConditions?: any;
  removalConditions?: any;
  triggerConditions?: any;
  
  weight: number;
  dynamicWeight?: any;
  
  choices: Array<{
    id: string;
    text: string;
    effects?: any;
    consequences?: string;
    characterClues?: string[];
    nextEvents?: string[];
    conditions?: any;
    characterEffects?: any[];
    interCharacterEffects?: any[];
    factionEffects?: any[];
  }>;
}

export class ConfigLoader {
  private static dataDirectory = join(process.cwd(), 'src', 'data');
  private static charactersDirectory = join(this.dataDirectory, 'characters');

  /**
   * 加载所有角色配置
   */
  static async loadAllCharacters(): Promise<CharacterConfig[]> {
    try {
      const characters: CharacterConfig[] = [];
      const characterDirs = await fs.readdir(this.charactersDirectory);
      
      for (const dir of characterDirs) {
        const characterPath = join(this.charactersDirectory, dir);
        const stat = await fs.stat(characterPath);
        
        if (stat.isDirectory()) {
          const character = await this.loadCharacter(dir);
          if (character) {
            characters.push(character);
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
  static async loadCharacter(characterId: string): Promise<CharacterConfig | null> {
    try {
      const characterFile = join(this.charactersDirectory, characterId, 'character.yaml');
      const fileContent = await fs.readFile(characterFile, 'utf8');
      const config = yaml.load(fileContent) as CharacterConfig;
      
      return config;
    } catch (error) {
      console.error(`Failed to load character ${characterId}:`, error);
      return null;
    }
  }

  /**
   * 加载角色的所有事件
   */
  static async loadCharacterEvents(characterId: string): Promise<EventConfig[]> {
    try {
      const eventsDir = join(this.charactersDirectory, characterId, 'events');
      const eventFiles = await fs.readdir(eventsDir);
      
      const events: EventConfig[] = [];
      
      for (const file of eventFiles) {
        if (file.endsWith('.yaml') || file.endsWith('.yml')) {
          const eventFile = join(eventsDir, file);
          const fileContent = await fs.readFile(eventFile, 'utf8');
          const eventConfig = yaml.load(fileContent) as EventConfig;
          
          events.push(eventConfig);
        }
      }
      
      return events;
    } catch (error) {
      console.error(`Failed to load events for character ${characterId}:`, error);
      return [];
    }
  }

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
        loyalty: config.initialAttributes.loyalty,
        ambition: config.initialAttributes.ambition,
        competence: config.initialAttributes.competence,
        reputation: config.initialAttributes.reputation,
        health: config.initialAttributes.health,
        age: config.initialAttributes.age
      },
      
      relationshipWithEmperor: {
        affection: config.initialRelationshipWithEmperor.affection,
        trust: config.initialRelationshipWithEmperor.trust,
        fear: config.initialRelationshipWithEmperor.fear,
        respect: config.initialRelationshipWithEmperor.respect,
        dependency: config.initialRelationshipWithEmperor.dependency,
        threat: config.initialRelationshipWithEmperor.threat
      },
      
      relationshipNetwork: config.relationshipNetwork.map(rel => ({
        targetCharacterId: rel.targetCharacter,
        relationType: rel.relationType,
        relationshipStrength: rel.relationshipStrength,
        secretLevel: rel.secretLevel,
        historicalBasis: rel.historicalBasis
      })),
      
      factionInfo: {
        primaryFaction: config.factionInfo.primaryFaction,
        secondaryFactions: config.factionInfo.secondaryFactions,
        factionLoyalty: config.factionInfo.factionLoyalty,
        leadershipRole: config.factionInfo.leadershipRole
      },
      
      influence: config.influence,
      
      revealedTraits: [],
      hiddenTraits: [
        ...(config.traits || []), 
        ...(config.hiddenTraits || [])
      ],
      discoveredClues: [],
      totalClues: config.backgroundClues ? Object.keys(config.backgroundClues).length : 0,
      
      statusFlags: {
        alive: true,
        inCourt: true,
        inExile: false,
        imprisoned: false,
        promoted: false,
        demoted: false,
        suspicious: false,
        plotting: false
      },
      
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
    
    // 检查冲突的派系
    if (character.conditions.conflictingFactions) {
      const selectedFactions = selectedCharacters.map(c => c.factionInfo.primaryFaction);
      if (character.conditions.conflictingFactions.some(faction => 
        selectedFactions.includes(faction))) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 验证配置文件格式
   */
  static validateCharacterConfig(config: any): boolean {
    const requiredFields = [
      'id', 'name', 'displayName', 'role', 'description',
      'initialAttributes', 'initialRelationshipWithEmperor',
      'factionInfo', 'influence'
    ];
    
    return requiredFields.every(field => field in config);
  }

  /**
   * 验证事件配置格式
   */
  static validateEventConfig(config: any): boolean {
    const requiredFields = [
      'id', 'title', 'description', 'speaker', 'dialogue',
      'choices', 'weight'
    ];
    
    return requiredFields.every(field => field in config) &&
           Array.isArray(config.choices) &&
           config.choices.length > 0;
  }
}
