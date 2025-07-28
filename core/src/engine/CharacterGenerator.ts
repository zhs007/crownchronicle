// 角色生成器核心接口与类型定义
import { CharacterCard, CharacterAttributes } from '../types/character';
import path from 'path';
import { loadCharacterCardsFromDir, filterCharacterCardsByTags, mergeCharacterAttributes } from './CharacterGenUtils';
import fs from 'fs';
import yaml from 'js-yaml';

export interface NameGenOptions {
  avoidNames?: string[];
}

export interface GenerateOptions {
  count?: number;
  // 可扩展更多生成参数
}

// 工具：加载 forbidden_names.json
function loadForbiddenNames(): string[] {
  const file = path.resolve(__dirname, '../../../gameconfig/forbidden_names.json');
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// 工具：加载常用名/字词库
function loadNamePool(type: 'name' | 'courtesy'): string[] {
  const file = path.resolve(__dirname, `../../../gameconfig/names/common_${type === 'name' ? 'names' : 'courtesy_names'}.json`);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// 随机取数组元素
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 生成姓名，自动避开黑名单
export function generateCharacterName(
  baseSurnames: string[],
  options?: NameGenOptions
): { surname: string; name: string; courtesyName: string } {
  // 1. 取第一个姓氏（事件最多角色）
  const surname = baseSurnames[0] || '张';
  const forbidden = loadForbiddenNames();
  const namePool = loadNamePool('name');
  const courtesyPool = loadNamePool('courtesy');
  let name = pickRandom(namePool) || '三';
  let courtesyName = pickRandom(courtesyPool) || '子明';
  // 2. 避开黑名单（只比对“姓 名”）
  let tryCount = 0;
  while (forbidden.includes(`${surname} ${name}`) && tryCount < 10) {
    name = pickRandom(namePool) || '三';
    tryCount++;
  }
  tryCount = 0;
  while (forbidden.includes(`${surname} ${name} 字 ${courtesyName}`) && tryCount < 10) {
    courtesyName = pickRandom(courtesyPool) || '子明';
    tryCount++;
  }
  return { surname, name, courtesyName };
}

export function generateCharacterByTags(
  tags: string[],
  options?: GenerateOptions
): CharacterCard {
  // 1. 读取角色卡目录（以 dev 版本为例，可根据实际项目调整）
  const charDir = path.resolve(__dirname, '../../../gameconfig/versions/dev/characters');
  const allCards = loadCharacterCardsFromDir(charDir);
  // 2. 按 tags 筛选
  const candidates = filterCharacterCardsByTags(allCards, tags);
  if (candidates.length === 0) throw new Error('No character cards found for tags: ' + tags.join(','));
  // 3. 随机组合多张卡片（默认取3张，若不足则全用）
  const pickCount = Math.min(3, candidates.length);
  const picked: CharacterCard[] = [];
  const usedIdx = new Set<number>();
  while (picked.length < pickCount) {
    const idx = Math.floor(Math.random() * candidates.length);
    if (!usedIdx.has(idx)) {
      picked.push(candidates[idx]);
      usedIdx.add(idx);
    }
  }
  // 4. 合成属性
  const attributes: CharacterAttributes = mergeCharacterAttributes(picked);
  // 5. 事件最多的角色卡用于确定姓氏
  let maxEventCard = picked[0];
  let maxEvents = (picked[0].events?.length || 0);
  for (const c of picked) {
    if ((c.events?.length || 0) > maxEvents) {
      maxEventCard = c;
      maxEvents = c.events?.length || 0;
    }
  }
  // 6. 生成姓名（姓、名、字）
  const surname = (maxEventCard.name || '').split(' ')[0] || '张';
  const { name, courtesyName } = generateCharacterName([surname]);
  // 7. 组装全名
  const fullName = `${surname} ${name}`;
  // 8. 组装新角色卡
  const newCard: CharacterCard = {
    id: 'gen_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    name: fullName,
    tags: tags || [],
    power: attributes.power,
    military: attributes.military,
    wealth: attributes.wealth,
    popularity: attributes.popularity,
    health: attributes.health,
    age: attributes.age,
    attributes: { ...attributes },
    events: picked.flatMap(c => c.events || []),
    displayName: `${fullName} 字 ${courtesyName}`,
    currentTitle: '',
    role: '',
    description: '',
    identityRevealed: false,
    revealedTraits: [],
    hiddenTraits: [],
    discoveredClues: [],
    totalClues: 0,
    eventIds: [],
    commonCardIds: [],
  };
  return newCard;
}
