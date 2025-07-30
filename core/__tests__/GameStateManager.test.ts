import { GameStateManager } from '../src/engine/game/GameStateManager';
import { GAME_CONSTANTS } from '../src/utils/constants';
import { GameState } from '../src/types/game';
import type { EventCard, EventOption } from '../src/types/event';

describe('GameStateManager', () => {
  it('should create a new game state with valid emperor stats', () => {
    const gameState = GameStateManager.createNewGame('normal');
    expect(gameState.emperor).toBeDefined();
    expect(gameState.emperor.age).toBeGreaterThanOrEqual(GAME_CONSTANTS.MIN_INITIAL_AGE);
    expect(gameState.emperor.age).toBeLessThanOrEqual(GAME_CONSTANTS.MAX_INITIAL_AGE);
    expect(gameState.currentTurn).toBe(1);
    expect(gameState.gameOver).toBe(false);
  });

  it('should detect game over by emperor health', () => {
    const gameState = GameStateManager.createNewGame();
    gameState.emperor.health = 0;
    const result = GameStateManager.checkGameOver(gameState);
    expect(result.gameOver).toBe(true);
    expect(result.reason).toMatch(/健康/);
  });

  it('should apply option effects to emperor', () => {
    const gameState = GameStateManager.createNewGame();
    const option: EventOption = {
      optionId: 'c1_001',
      reply: 'Test',
      effects: [{ target: 'player', attribute: 'power', offset: -5 }]
    };
    const newState = GameStateManager.applyChoiceEffects(gameState, option);
    expect(newState.emperor.power).toBeLessThan(gameState.emperor.power);
    // 再测 wealth
    const option2: EventOption = {
      optionId: 'c1_002',
      reply: 'Test',
      effects: [{ target: 'player', attribute: 'wealth', offset: 10 }]
    };
    const newState2 = GameStateManager.applyChoiceEffects(gameState, option2);
    expect(newState2.emperor.wealth).toBeGreaterThan(gameState.emperor.wealth);
  });

  it('should process turn end and increment age/turn', () => {
    const gameState = GameStateManager.createNewGame();
    const newState = GameStateManager.processTurnEnd(gameState);
    expect(newState.emperor.age).toBe(gameState.emperor.age + 1);
    expect(newState.currentTurn).toBe(gameState.currentTurn + 1);
    expect(newState.currentEvent).toBeNull();
  });

  it('should check event conditions (minHealth)', () => {
    const gameState = GameStateManager.createNewGame();
    const event: EventCard = {
      eventId: 'e1',
      id: 'e1',
      title: 'Test Event',
      dialogue: '',
      options: [
        { optionId: 'o1', reply: '', effects: [{ target: 'player', attribute: 'power', offset: 0 }] },
        { optionId: 'o2', reply: '', effects: [{ target: 'player', attribute: 'power', offset: 0 }] }
      ],
      triggerConditions: { minHealth: 200 },
      weight: 1
    } as any;
    expect(GameStateManager.checkEventConditions(event, gameState)).toBe(false);
  });

  it('should calculate event weight with dynamicWeight', () => {
    const gameState = GameStateManager.createNewGame();
    const event: EventCard = {
      eventId: 'e2',
      id: 'e2',
      title: 'Event',
      dialogue: '',
      options: [
        { optionId: 'o1', reply: '', effects: [{ target: 'player', attribute: 'power', offset: 0 }] },
        { optionId: 'o2', reply: '', effects: [{ target: 'player', attribute: 'power', offset: 0 }] }
      ],
      dynamicWeight: {
        power: [
          { range: [0, 50], multiplier: 2 },
          { range: [51, 100], multiplier: 0.5 },
        ],
      },
      weight: 1
    } as any;
    gameState.emperor.power = 30;
    const weight = GameStateManager.calculateEventWeight(event, gameState);
    expect(weight).toBeGreaterThan(0);
  });

  it('should record game event to history', () => {
    const gameState = GameStateManager.createNewGame();
    const event: EventCard = {
      eventId: 'e3',
      id: 'e3',
      title: 'Event',
      dialogue: '',
      options: [
        {
          optionId: 'e3_001',
          reply: 'A',
          effects: [{ target: 'player', attribute: 'power', offset: 1 }]
        },
        {
          optionId: 'e3_002',
          reply: 'B',
          effects: [{ target: 'self', attribute: 'military', offset: -1 }]
        }
      ],
      weight: 1
    } as any;
    const option: EventOption = {
      optionId: 'e3_001',
      reply: 'A',
      effects: [{ target: 'player', attribute: 'power', offset: 1 }]
    };
    GameStateManager.recordGameEvent(gameState, event, option);
    expect(gameState.gameHistory.length).toBe(1);
    expect(gameState.gameHistory[0].eventId).toBe('e3');
  });
});
