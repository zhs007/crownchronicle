import { GameSimulator, SimulationResult } from '../src/engine/GameSimulator';

describe('GameSimulator', () => {
  it('analyzeResults: should return zeros for empty input', () => {
    const result = GameSimulator.analyzeResults([]);
    expect(result.successRate).toBe(0);
    expect(result.averageTurns).toBe(0);
    expect(result.averageDuration).toBe(0);
    expect(result.gameOverReasons).toEqual({});
    expect(result.averageStats).toEqual({ power: 0, military: 0, wealth: 0, popularity: 0, health: 0, age: 0 });
  });

  it('analyzeResults: should compute correct stats for non-empty input', () => {
    const results: SimulationResult[] = [
      {
        gameState: { emperor: { power: 10, military: 20, wealth: 30, popularity: 40, health: 50, age: 60 } } as any,
        success: true,
        turns: 5,
        duration: 100,
        gameOverReason: 'A'
      },
      {
        gameState: { emperor: { power: 20, military: 30, wealth: 40, popularity: 50, health: 60, age: 70 } } as any,
        success: false,
        turns: 15,
        duration: 200,
        gameOverReason: 'B'
      }
    ];
    const result = GameSimulator.analyzeResults(results);
    expect(result.successRate).toBe(0.5);
    expect(result.averageTurns).toBe(10);
    expect(result.averageDuration).toBe(150);
    expect(result.gameOverReasons).toEqual({ A: 1, B: 1 });
    expect(result.averageStats).toEqual({ power: 15, military: 25, wealth: 35, popularity: 45, health: 55, age: 65 });
  });

  it('runSimulation: should return failed result if no characters', async () => {
    const mockDataProvider = {
      loadAllCharacters: jest.fn().mockResolvedValue([])
    };
    const mockStrategy = { chooseOption: jest.fn() };
    const sim = new GameSimulator(mockDataProvider as any, mockStrategy as any);
    const result = await sim.runSimulation();
    expect(result.success).toBe(false);
    expect(result.gameOverReason).toMatch(/Failed to initialize game/);
  });

  it('runBatchSimulation: should run multiple times and return array', async () => {
    const mockDataProvider = {
      loadAllCharacters: jest.fn().mockResolvedValue([])
    };
    const mockStrategy = { chooseOption: jest.fn() };
    const sim = new GameSimulator(mockDataProvider as any, mockStrategy as any);
    const results = await sim.runBatchSimulation(3);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(3);
    expect(results.every(r => r.success === false)).toBe(true);
  });
});
