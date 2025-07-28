import { generateCharacterByTags } from '../src/engine/CharacterGenerator';
import { CharacterCard } from '../src/types/character';

describe('角色生成器 - generateCharacterByTags', () => {
  it('可以根据单一tag生成丞相角色', () => {
    const card: CharacterCard = generateCharacterByTags(['丞相']);
    expect(card).toBeDefined();
    expect(card.tags).toContain('丞相');
    expect(card.name).toMatch(/^\S+ \S+$/); // 姓 名
    expect(card.displayName).toMatch(/^\S+ \S+ 字 \S+$/); // 姓 名 字 字号
    expect(card.power).toBeGreaterThan(0);
    expect(card.attributes).toBeDefined();
    expect(card.attributes?.power).toBe(card.power);
  });

  it('生成角色属性合成规则正确', () => {
    // 多tag筛选，确保属性为最大值/平均值
    const card: CharacterCard = generateCharacterByTags(['丞相', '奸臣']);
    expect(card.tags).toEqual(expect.arrayContaining(['丞相', '奸臣']));
    // 假设样例数据中奸臣有power 95、wealth 99
    expect(card.power).toBeGreaterThanOrEqual(95);
    expect(card.wealth).toBeGreaterThanOrEqual(99);
    expect(card.health).toBeGreaterThan(0);
    expect(card.age).toBeGreaterThan(0);
  });

  it('生成角色姓名不会命中黑名单', () => {
    const forbidden = ['武则天', '刘备', '曹操'];
    for (let i = 0; i < 10; i++) {
      const card: CharacterCard = generateCharacterByTags(['丞相']);
      expect(forbidden).not.toContain(card.name);
    }
  });

  it('生成角色事件为合成卡片事件合集', () => {
    const card: CharacterCard = generateCharacterByTags(['丞相']);
    expect(Array.isArray(card.events)).toBe(true);
    expect(card.events?.length).toBeGreaterThan(0);
  });
});
