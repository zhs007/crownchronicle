import { GameEngine } from '../src/engine/GameEngine';
import { CharacterCard } from '../src/types/game';

describe('GameEngine.mergeCharacterAndCommonCardEvents', () => {

describe('GameEngine.applyChoiceEffects', () => {
  it('should apply offset to player attribute', () => {
    const gameState = {
      emperor: { power: 10, military: 20, wealth: 30, popularity: 40, health: 50, age: 60 },
      activeCharacters: [],
      cardPools: { pending: [], active: [], discarded: [] },
      gameHistory: [],
      currentEvent: null,
      characterStates: [],
      factionSystem: { activeFactions: [], factionBalance: 0 },
      courtPolitics: { tension: 0, stability: 0, corruption: 0, efficiency: 0, recentEvents: [] },
      gameOver: false,
      startTime: 0,
      currentTurn: 1
    };
    const option = { optionId: 'o1', description: '', target: 'player' as 'player', attribute: 'power' as keyof typeof gameState.emperor, offset: 5 };
    const newState = GameEngine.applyChoiceEffects(gameState, option);
    expect(newState.emperor.power).toBe(15);
  });

  it('should clamp player attribute between 0 and 100', () => {
    const gameState = {
      emperor: { power: 98, military: 20, wealth: 30, popularity: 40, health: 50, age: 60 },
      activeCharacters: [],
      cardPools: { pending: [], active: [], discarded: [] },
      gameHistory: [],
      currentEvent: null,
      characterStates: [],
      factionSystem: { activeFactions: [], factionBalance: 0 },
      courtPolitics: { tension: 0, stability: 0, corruption: 0, efficiency: 0, recentEvents: [] },
      gameOver: false,
      startTime: 0,
      currentTurn: 1
    };
    const option = { optionId: 'o2', description: '', target: 'player' as 'player', attribute: 'power' as keyof typeof gameState.emperor, offset: 10 };
    const newState = GameEngine.applyChoiceEffects(gameState, option);
    expect(newState.emperor.power).toBe(100);
    const option2 = { optionId: 'o3', description: '', target: 'player' as 'player', attribute: 'power' as keyof typeof gameState.emperor, offset: -200 };
    const newState2 = GameEngine.applyChoiceEffects(gameState, option2);
    expect(newState2.emperor.power).toBe(0);
  });

  // 如需测试 self 角色属性变动，请根据 GameEngine 实现补充

  it('should ignore invalid target', () => {
    const gameState = {
      emperor: { power: 10, military: 20, wealth: 30, popularity: 40, health: 50, age: 60 },
      activeCharacters: [],
      cardPools: { pending: [], active: [], discarded: [] },
      gameHistory: [],
      currentEvent: null,
      characterStates: [],
      factionSystem: { activeFactions: [], factionBalance: 0 },
      courtPolitics: { tension: 0, stability: 0, corruption: 0, efficiency: 0, recentEvents: [] },
      gameOver: false,
      startTime: 0,
      currentTurn: 1
    };
    const option = { optionId: 'o5', description: '', target: 'enemy' as any, attribute: 'power' as keyof typeof gameState.emperor, offset: 5 };
    const newState = GameEngine.applyChoiceEffects(gameState, option);
    expect(newState.emperor.power).toBe(10);
  });

  it('should ignore invalid attribute', () => {
    const gameState = {
      emperor: { power: 10, military: 20, wealth: 30, popularity: 40, health: 50, age: 60 },
      activeCharacters: [],
      cardPools: { pending: [], active: [], discarded: [] },
      gameHistory: [],
      currentEvent: null,
      characterStates: [],
      factionSystem: { activeFactions: [], factionBalance: 0 },
      courtPolitics: { tension: 0, stability: 0, corruption: 0, efficiency: 0, recentEvents: [] },
      gameOver: false,
      startTime: 0,
      currentTurn: 1
    };
    const option = { optionId: 'o6', description: '', target: 'player' as 'player', attribute: 'unknown' as any, offset: 5 };
    const newState = GameEngine.applyChoiceEffects(gameState, option);
    expect(newState.emperor.power).toBe(10);
  });
});
  it('should merge and deduplicate eventIds from character and common cards', () => {
    const character: CharacterCard = {
      id: 'char1',
      name: '角色A',
      tags: [],
      events: [],
      description: '',
      attributes: { power: 0, military: 0, wealth: 0, popularity: 0, health: 0, age: 0 },
            eventIds: [],
      commonCardIds: ['c1', 'c2']
    };
    const allCommonCards = [
      { id: 'c1', eventIds: ['e1', 'e2'] },
      { id: 'c2', eventIds: ['e3', 'e4'] }
    ];
    expect(GameEngine.mergeCharacterAndCommonCardEvents(character, allCommonCards).sort()).toEqual(['e1', 'e2', 'e3', 'e4'].sort());
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
    expect(GameEngine.mergeCharacterAndCommonCardEvents(character, allCommonCards)).toEqual(['e5']);
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
    expect(GameEngine.mergeCharacterAndCommonCardEvents(character, allCommonCards).sort()).toEqual(['e7', 'e8'].sort());
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
    expect(GameEngine.mergeCharacterAndCommonCardEvents(character, allCommonCards)).toEqual([]);
  });
});
