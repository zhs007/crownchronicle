// 配置相关类型
import type { CharacterConfig } from './character';
import type { EventConfig } from './event';

export interface DataProvider {
  loadAllCommonCards(): Promise<any[]>;
  validateCommonCardConfig(config: any): boolean;
  loadAllCharacters(): Promise<CharacterConfig[]>;
  loadCharacterEvents(characterId: string): Promise<EventConfig[]>;
  validateCharacterConfig(config: any): boolean;
  validateEventConfig(config: any): boolean;
}
