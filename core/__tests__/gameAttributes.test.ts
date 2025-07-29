import type { CharacterAttributes } from '../src/types/card';

describe('CharacterAttributes', () => {
  it('should have all six core properties', () => {
    const attrs: CharacterAttributes = {
      power: 10,
      military: 20,
      wealth: 30,
      popularity: 40,
      health: 50,
      age: 60
    };
    expect(attrs.power).toBe(10);
    expect(attrs.military).toBe(20);
    expect(attrs.wealth).toBe(30);
    expect(attrs.popularity).toBe(40);
    expect(attrs.health).toBe(50);
    expect(attrs.age).toBe(60);
  });

  it('should not allow missing properties (type check)', () => {
    // @ts-expect-error
    const attrs: CharacterAttributes = { power: 1, military: 2, wealth: 3, popularity: 4, health: 5 };
    // @ts-expect-error
    const attrs2: CharacterAttributes = { power: 1, military: 2, wealth: 3, popularity: 4, health: 5, age: 6, extra: 7 };
    expect(true).toBe(true);
  });
});
