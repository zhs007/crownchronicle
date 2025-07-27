import { GameStateManager } from '../src/engine/game/GameStateManager';
import { GAME_CONSTANTS } from '../src/utils/constants';
import { GameState, EventCard, EventChoice } from '../src/types/game';

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

  it('should apply choice effects to emperor', () => {
    const gameState = GameStateManager.createNewGame();
    const choice: EventChoice = {
      id: 'c1',
      text: 'Test',
      effects: { power: -5, wealth: 10 },
    };
    const newState = GameStateManager.applyChoiceEffects(gameState, choice);
    expect(newState.emperor.power).toBeLessThan(gameState.emperor.power);
    expect(newState.emperor.wealth).toBeGreaterThan(gameState.emperor.wealth);
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
      id: 'e1',
      title: 'Test Event',
      triggerConditions: { minHealth: 200 },
    } as any;
    expect(GameStateManager.checkEventConditions(event, gameState)).toBe(false);
  });

  it('should calculate event weight with dynamicWeight', () => {
    const gameState = GameStateManager.createNewGame();
    const event: EventCard = {
      id: 'e2',
      title: 'Event',
      dynamicWeight: {
        power: [
          { range: [0, 50], multiplier: 2 },
          { range: [51, 100], multiplier: 0.5 },
        ],
      },
    } as any;
    gameState.emperor.power = 30;
    const weight = GameStateManager.calculateEventWeight(event, gameState);
    expect(weight).toBeGreaterThan(0);
  });

  it('should record game event to history', () => {
    const gameState = GameStateManager.createNewGame();
    const event: EventCard = { id: 'e3', title: 'Event' } as any;
    const choice: EventChoice = { id: 'c1', text: 'Choose', effects: {} };
    GameStateManager.recordGameEvent(gameState, event, choice);
    expect(gameState.gameHistory.length).toBe(1);
    expect(gameState.gameHistory[0].eventId).toBe('e3');
  });
});
