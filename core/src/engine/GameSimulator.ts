import { GameState, EventCard, GameConfig, PlayerStrategy, DataProvider } from '../types/game';
import { GameEngine } from './GameEngine';
import { CardPoolManager } from './CardPoolManager';
import { ConfigConverter } from '../data/DataProvider';
import { GAME_CONSTANTS } from '../utils/constants';

export interface SimulationResult {
  gameState: GameState;
  success: boolean;
  turns: number;
  duration: number;
  gameOverReason?: string;
}

export class GameSimulator {
  private dataProvider: DataProvider;
  private playerStrategy: PlayerStrategy;

  constructor(dataProvider: DataProvider, playerStrategy: PlayerStrategy) {
    this.dataProvider = dataProvider;
    this.playerStrategy = playerStrategy;
  }

  /**
   * 运行完整的游戏模拟
   */
  async runSimulation(config?: Partial<GameConfig>): Promise<SimulationResult> {
    const startTime = Date.now();
    
    try {
      // 初始化游戏
      const gameState = await this.initializeGame(config);
      if (!gameState) {
        return {
          gameState: GameEngine.createNewGame(),
          success: false,
          turns: 0,
          duration: Date.now() - startTime,
          gameOverReason: 'Failed to initialize game'
        };
      }

      // 运行游戏循环
      let turns = 0;
      const maxTurns = config?.maxTurns || 1000; // 防止无限循环

      while (!gameState.gameOver && turns < maxTurns) {
        // 更新卡池
        CardPoolManager.updatePendingPool(gameState);
        
        // 选择下一个事件
        const nextEvent = CardPoolManager.selectNextEvent(gameState);
        if (!nextEvent) {
          gameState.gameOver = true;
          gameState.gameOverReason = '没有可用事件';
          break;
        }

        gameState.currentEvent = nextEvent;

        // 让策略选择选项
        const choiceId = await this.playerStrategy.chooseOption(gameState, nextEvent);
        const choice = nextEvent.choices.find(c => c.id === choiceId);
        
        if (!choice) {
          // 如果选择无效，使用第一个选项
          const fallbackChoice = nextEvent.choices[0];
          GameEngine.applyChoiceEffects(gameState, fallbackChoice);
          GameEngine.recordGameEvent(gameState, nextEvent, fallbackChoice);
        } else {
          // 应用选择效果
          GameEngine.applyChoiceEffects(gameState, choice);
          GameEngine.recordGameEvent(gameState, nextEvent, choice);
        }

        // 移除已使用的事件
        CardPoolManager.discardEvent(gameState, nextEvent.id);

        // 处理回合结束
        GameEngine.processTurnEnd(gameState);

        // 检查游戏结束条件
        const gameOverCheck = GameEngine.checkGameOver(gameState);
        if (gameOverCheck.gameOver) {
          gameState.gameOver = true;
          gameState.gameOverReason = gameOverCheck.reason;
          gameState.endTime = Date.now();
        }

        turns++;
      }

      if (turns >= maxTurns && !gameState.gameOver) {
        gameState.gameOver = true;
        gameState.gameOverReason = '达到最大回合数限制';
        gameState.endTime = Date.now();
      }

      return {
        gameState,
        success: !gameState.gameOver || gameState.gameOverReason !== 'Failed to initialize game',
        turns,
        duration: Date.now() - startTime,
        gameOverReason: gameState.gameOverReason
      };

    } catch (error) {
      console.error('Simulation error:', error);
      return {
        gameState: GameEngine.createNewGame(),
        success: false,
        turns: 0,
        duration: Date.now() - startTime,
        gameOverReason: `Simulation error: ${error}`
      };
    }
  }

  /**
   * 批量运行模拟
   */
  async runBatchSimulation(
    count: number, 
    config?: Partial<GameConfig>
  ): Promise<SimulationResult[]> {
    const results: SimulationResult[] = [];
    
    for (let i = 0; i < count; i++) {
      const result = await this.runSimulation(config);
      results.push(result);
    }
    
    return results;
  }

  /**
   * 分析模拟结果
   */
  static analyzeResults(results: SimulationResult[]): {
    successRate: number;
    averageTurns: number;
    averageDuration: number;
    gameOverReasons: Record<string, number>;
    averageStats: {
      power: number;
      military: number;
      wealth: number;
      popularity: number;
      health: number;
      age: number;
    };
  } {
    if (results.length === 0) {
      return {
        successRate: 0,
        averageTurns: 0,
        averageDuration: 0,
        gameOverReasons: {},
        averageStats: {
          power: 0,
          military: 0,
          wealth: 0,
          popularity: 0,
          health: 0,
          age: 0
        }
      };
    }

    const successCount = results.filter(r => r.success).length;
    const totalTurns = results.reduce((sum, r) => sum + r.turns, 0);
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    // 统计游戏结束原因
    const gameOverReasons: Record<string, number> = {};
    results.forEach(r => {
      if (r.gameOverReason) {
        gameOverReasons[r.gameOverReason] = (gameOverReasons[r.gameOverReason] || 0) + 1;
      }
    });

    // 计算平均属性
    const totalStats = results.reduce((acc, r) => {
      const { emperor } = r.gameState;
      return {
        power: acc.power + emperor.power,
        military: acc.military + emperor.military,
        wealth: acc.wealth + emperor.wealth,
        popularity: acc.popularity + emperor.popularity,
        health: acc.health + emperor.health,
        age: acc.age + emperor.age
      };
    }, { power: 0, military: 0, wealth: 0, popularity: 0, health: 0, age: 0 });

    return {
      successRate: successCount / results.length,
      averageTurns: totalTurns / results.length,
      averageDuration: totalDuration / results.length,
      gameOverReasons,
      averageStats: {
        power: totalStats.power / results.length,
        military: totalStats.military / results.length,
        wealth: totalStats.wealth / results.length,
        popularity: totalStats.popularity / results.length,
        health: totalStats.health / results.length,
        age: totalStats.age / results.length
      }
    };
  }

  /**
   * 初始化游戏状态
   */
  private async initializeGame(config?: Partial<GameConfig>): Promise<GameState | null> {
    try {
      // 创建新游戏状态
      const difficulty = config?.difficulty || 'normal';
      const gameState = GameEngine.createNewGame(difficulty);

      // 加载角色配置
      const allCharacters = await this.dataProvider.loadAllCharacters();
      if (allCharacters.length === 0) {
        console.error('No characters found');
        return null;
      }

      // 选择随机角色
      const minCharacters = config?.minCharacters || GAME_CONSTANTS.MIN_CHARACTERS;
      const maxCharacters = config?.maxCharacters || GAME_CONSTANTS.MAX_CHARACTERS;
      const selectedCharacters = ConfigConverter.selectRandomCharacters(
        allCharacters,
        minCharacters,
        maxCharacters
      );

      // 转换为游戏角色卡
      gameState.activeCharacters = selectedCharacters.map(config => 
        ConfigConverter.configToCharacterCard(config)
      );

      // 加载并初始化事件卡池
      const allEvents: EventCard[] = [];
      for (const character of selectedCharacters) {
        const events = await this.dataProvider.loadCharacterEvents(character.id);
        events.forEach(eventConfig => {
          const eventCard = ConfigConverter.configToEventCard(eventConfig, character.id);
          allEvents.push(eventCard);
        });
      }

      // 将事件分配到不同的卡池
      allEvents.forEach(event => {
        if (event.activationConditions) {
          // 有激活条件的事件放入待定卡池
          gameState.cardPools.pending.push(event);
        } else {
          // 无激活条件的事件直接放入主卡池
          gameState.cardPools.active.push(event);
        }
      });

      return gameState;

    } catch (error) {
      console.error('Failed to initialize game:', error);
      return null;
    }
  }
}
