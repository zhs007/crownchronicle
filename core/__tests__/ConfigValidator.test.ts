import { ConfigValidator } from '../src/engine/validation/ConfigValidator';
import { CharacterConfig, EventConfig } from '../src/types/game';

describe('ConfigValidator', () => {
  const mockDataProvider = {
    loadAllCommonCards: jest.fn(),
    validateCommonCardConfig: jest.fn(),
    loadAllCharacters: jest.fn(),
    validateCharacterConfig: jest.fn(),
    loadCharacterEvents: jest.fn(),
    validateEventConfig: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validateCharacters: should detect duplicate IDs and invalid attributes', async () => {
    const validator = new ConfigValidator(mockDataProvider as any);
    const baseChar = {
      name: 'n', description: 'desc', initialAttributes: { power: 0, military: 0, wealth: 0, popularity: 0, health: 0, age: 0 }, commonCardIds: []
    };
    const characters: CharacterConfig[] = [
      { id: 'c1', name: '角色1', description: '', initialAttributes: { power: 10, military: 20, wealth: 30, popularity: 40, health: 50, age: 60 }, commonCardIds: [] },
      { id: 'c1', name: '角色1', description: '', initialAttributes: { power: 200, military: -1, wealth: 30, popularity: 40, health: 50, age: 60 }, commonCardIds: [] }
    ];
    mockDataProvider.validateCharacterConfig.mockReturnValue(true);
    const result = await validator.validateCharacters(characters);
    expect(result.issues.some(i => i.code === 'DUPLICATE_CHARACTER_ID')).toBe(true);
    expect(result.issues.some(i => i.code === 'INVALID_ATTRIBUTE_VALUE')).toBe(true);
  });

  it('validateEvents: should detect duplicate event IDs, missing choices, and extreme effect values', () => {
    const validator = new ConfigValidator(mockDataProvider as any);
    const baseEvent = { speaker: '', dialogue: '' };
    const events: EventConfig[] = [
      { id: 'e1', weight: 1, choices: [], title: '', description: '', ...baseEvent },
      { id: 'e1', weight: -1, choices: [{ id: 'c1', text: '', effects: { power: 200 } }], title: '', description: '', ...baseEvent }
    ];
    mockDataProvider.validateEventConfig.mockReturnValue(true);
    const result = validator.validateEvents(events, 'c1');
    expect(result.issues.some(i => i.code === 'DUPLICATE_EVENT_ID')).toBe(true);
    expect(result.issues.some(i => i.code === 'NO_EVENT_CHOICES')).toBe(true);
    expect(result.issues.some(i => i.code === 'INVALID_EVENT_WEIGHT')).toBe(true);
    expect(result.issues.some(i => i.code === 'EXTREME_EFFECT_VALUE')).toBe(true);
  });

  it('validateAllCommonCards: should warn if no common cards', async () => {
    mockDataProvider.loadAllCommonCards.mockResolvedValue([]);
    const validator = new ConfigValidator(mockDataProvider as any);
    const result = await validator.validateAllCommonCards();
    expect(result.issues.some(i => i.code === 'NO_COMMON_CARDS')).toBe(true);
  });

  it('validateAllCommonCards: should detect duplicate and invalid structure', async () => {
    mockDataProvider.loadAllCommonCards.mockResolvedValue([
      { id: 'a' }, { id: 'a' }, { id: 'b' }
    ]);
    mockDataProvider.validateCommonCardConfig.mockImplementation(card => card.id !== 'b');
    const validator = new ConfigValidator(mockDataProvider as any);
    const result = await validator.validateAllCommonCards();
    expect(result.issues.some(i => i.code === 'DUPLICATE_COMMON_CARD_ID')).toBe(true);
    expect(result.issues.some(i => i.code === 'INVALID_COMMON_CARD_STRUCTURE')).toBe(true);
  });

  it('validateCharacterCommonCardRefs: should detect invalid refs', async () => {
    mockDataProvider.loadAllCharacters.mockResolvedValue([
      { id: 'c1', initialAttributes: { power: 10, military: 10, wealth: 10, popularity: 10, health: 10, age: 10 }, commonCardIds: ['a', 'b'] }
    ]);
    mockDataProvider.loadAllCommonCards.mockResolvedValue([{ id: 'a' }]);
    const validator = new ConfigValidator(mockDataProvider as any);
    const result = await validator.validateCharacterCommonCardRefs();
    expect(result.issues.some(i => i.code === 'INVALID_COMMON_CARD_REF')).toBe(true);
  });
});
