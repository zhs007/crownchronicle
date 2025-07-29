
/**
 * 角色相关类型定义入口（如需扩展请在主类型文件 card.ts、event.ts、gamecore.ts 中定义）
 * 本文件已移除 FactionEffect、CharacterEffect、InterCharacterEffect 类型。
 */

import type { CharacterAttributes } from './card';

export interface CharacterState {
  characterId: string;
  alive: boolean;
}

// 角色配置结构

export interface CharacterConfig {
  id: string;
  name: string;
  description: string;
  initialAttributes: CharacterAttributes;
  commonCardIds?: string[];
}
