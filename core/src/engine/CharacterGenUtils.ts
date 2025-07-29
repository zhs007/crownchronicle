import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { CharacterCard, CharacterAttributes } from '../types/character';

// 工具函数：读取指定目录下所有 yaml 角色卡
export function loadCharacterCardsFromDir(dir: string): CharacterCard[] {
  const files = fs.readdirSync(dir);
  const cards: CharacterCard[] = [];
  for (const file of files) {
    if (file.endsWith('.yaml') || file.endsWith('.yml')) {
      const content = fs.readFileSync(path.join(dir, file), 'utf8');
      const docs = yaml.loadAll(content) as any[];
      for (const doc of docs) {
        if (Array.isArray(doc)) {
          for (const c of doc) cards.push(c as CharacterCard);
        } else if (doc) {
          cards.push(doc as CharacterCard);
        }
      }
    }
  }
  return cards;
}

// 工具函数：按 tags 筛选角色卡
export function filterCharacterCardsByTags(cards: CharacterCard[], tags: string[]): CharacterCard[] {
  return cards.filter(card => tags.every(tag => (card.tags || []).includes(tag)));
}

// 工具函数：合成属性
export function mergeCharacterAttributes(cards: CharacterCard[]): CharacterAttributes {
  const attrs: CharacterAttributes = {
    power: 0, military: 0, wealth: 0, popularity: 0, health: 0, age: 0
  };
  if (cards.length === 0) return attrs;
  attrs.power = Math.max(...cards.map(c => c.attributes?.power ?? 0));
  attrs.military = Math.max(...cards.map(c => c.attributes?.military ?? 0));
  attrs.wealth = Math.max(...cards.map(c => c.attributes?.wealth ?? 0));
  attrs.popularity = Math.max(...cards.map(c => c.attributes?.popularity ?? 0));
  attrs.health = Math.floor(cards.reduce((sum, c) => sum + (c.attributes?.health ?? 0), 0) / cards.length);
  attrs.age = Math.floor(cards.reduce((sum, c) => sum + (c.attributes?.age ?? 0), 0) / cards.length);
  return attrs;
}
