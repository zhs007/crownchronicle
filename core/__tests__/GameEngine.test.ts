import { GameEngine } from '../src/engine/GameEngine';
import { CharacterCard } from '../src/types/game';

describe('GameEngine.mergeCharacterAndCommonCardEvents', () => {
  it('should merge and deduplicate eventIds from character and common cards', () => {
    const character: CharacterCard = {
      id: 'char1',
      name: '角色A',
      tags: [],
      events: [],
      description: '',
      attributes: { power: 0, military: 0, wealth: 0, popularity: 0, health: 0, age: 0 },
      eventIds: ['e1', 'e2'],
      commonCardIds: ['c1', 'c2']
    };
    const allCommonCards = [
      { id: 'c1', eventIds: ['e2', 'e3'] },
      { id: 'c2', eventIds: ['e4'] }
    ];
    const result = GameEngine.mergeCharacterAndCommonCardEvents(character, allCommonCards);
    expect(result.sort()).toEqual(['e1', 'e2', 'e3', 'e4'].sort());
  });

  it('should handle character with no commonCardIds', () => {
    const character: CharacterCard = {
      id: 'char2',
      name: '角色B',
      tags: [],
      events: [],
      description: '',
      attributes: { power: 0, military: 0, wealth: 0, popularity: 0, health: 0, age: 0 },
      eventIds: ['e5'],
      commonCardIds: []
    };
    const allCommonCards = [
      { id: 'c1', eventIds: ['e6'] }
    ];
    const result = GameEngine.mergeCharacterAndCommonCardEvents(character, allCommonCards);
    expect(result).toEqual(['e5']);
  });

  it('should handle character with no eventIds', () => {
    const character: CharacterCard = {
      id: 'char3',
      name: '角色C',
      tags: [],
      events: [],
      description: '',
      attributes: { power: 0, military: 0, wealth: 0, popularity: 0, health: 0, age: 0 },
      eventIds: [],
      commonCardIds: ['c1']
    };
    const allCommonCards = [
      { id: 'c1', eventIds: ['e7', 'e8'] }
    ];
    const result = GameEngine.mergeCharacterAndCommonCardEvents(character, allCommonCards);
    expect(result.sort()).toEqual(['e7', 'e8'].sort());
  });

  it('should return empty array if both eventIds and commonCardIds are empty', () => {
    const character: CharacterCard = {
      id: 'char4',
      name: '角色D',
      tags: [],
      events: [],
      description: '',
      attributes: { power: 0, military: 0, wealth: 0, popularity: 0, health: 0, age: 0 },
      eventIds: [],
      commonCardIds: []
    };
    const allCommonCards: { id: string; eventIds: string[] }[] = [];
    const result = GameEngine.mergeCharacterAndCommonCardEvents(character, allCommonCards);
    expect(result).toEqual([]);
  });
});
