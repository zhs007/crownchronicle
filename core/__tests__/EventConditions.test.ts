import { GameStateManager } from '../src/engine/game/GameStateManager';
import type { EventConditions } from '../src/types/event';
import type { GameState } from '../src/types/game';

describe('EventConditions (attributeConditions)', () => {
  function makeGameState(attrs: Partial<GameState['emperor']> = {}): GameState {
    return {
      emperor: { power: 50, military: 50, wealth: 50, popularity: 50, health: 50, age: 30, ...attrs },
      activeCharacters: [
        { id: 'c1', name: '角色1', tags: [], events: [], description: '', attributes: { power: 20, military: 80, wealth: 10, popularity: 60, health: 90, age: 25 }, eventIds: [], commonCardIds: [] }
      ],
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
  }

  it('should pass when all conditions met', () => {
    const conditions: EventConditions = {
      attributeConditions: [
        { target: 'player', attribute: 'power', min: 40, max: 60 },
        { target: 'self', attribute: 'military', min: 80 }
      ]
    };
    const state = makeGameState();
    expect(GameStateManager.checkEventConditions(conditions, { gameState: state, selfCharacterId: 'c1' })).toBe(true);
  });

  it('should fail if player attribute below min', () => {
    const conditions: EventConditions = {
      attributeConditions: [
        { target: 'player', attribute: 'power', min: 60 }
      ]
    };
    const state = makeGameState({ power: 50 });
    expect(GameStateManager.checkEventConditions(conditions, { gameState: state })).toBe(false);
  });

  it('should fail if self attribute above max', () => {
    const conditions: EventConditions = {
      attributeConditions: [
        { target: 'self', attribute: 'military', max: 70 }
      ]
    };
    const state = makeGameState();
    expect(GameStateManager.checkEventConditions(conditions, { gameState: state, selfCharacterId: 'c1' })).toBe(false);
  });

  it('should pass with only min or only max', () => {
    const conditions: EventConditions = {
      attributeConditions: [
        { target: 'player', attribute: 'health', min: 40 },
        { target: 'self', attribute: 'popularity', max: 100 }
      ]
    };
    const state = makeGameState();
    expect(GameStateManager.checkEventConditions(conditions, { gameState: state, selfCharacterId: 'c1' })).toBe(true);
  });

  it('should fail if no matching self character', () => {
    const conditions: EventConditions = {
      attributeConditions: [
        { target: 'self', attribute: 'power', min: 10 }
      ]
    };
    const state = makeGameState();
    expect(GameStateManager.checkEventConditions(conditions, { gameState: state, selfCharacterId: 'not_exist' })).toBe(false);
  });

  it('should pass if attributeConditions is empty or undefined', () => {
    const state = makeGameState();
    expect(GameStateManager.checkEventConditions({}, { gameState: state })).toBe(true);
    expect(GameStateManager.checkEventConditions({ attributeConditions: [] }, { gameState: state })).toBe(true);
  });
});
