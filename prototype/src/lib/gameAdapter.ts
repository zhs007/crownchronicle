import { 
  GameEngine, 
  CardPoolManager, 
  FileSystemDataProvider,
  ConfigConverter,
  GameState,
  EventCard,
  EventChoice,
  CharacterCard,
  PlayerStrategy
} from 'crownchronicle-core';
import { GameConfigManager } from './configManager';

// UI 玩家策略 - 通过回调函数让UI做选择
export class UIPlayerStrategy implements PlayerStrategy {
  name = 'UI Player Strategy';
  private choiceCallback: (gameState: GameState, event: EventCard) => Promise<string>;

  constructor(choiceCallback: (gameState: GameState, event: EventCard) => Promise<string>) {
    this.choiceCallback = choiceCallback;
  }

  async chooseOption(gameState: GameState, event: EventCard): Promise<string> {
    return await this.choiceCallback(gameState, event);
  }
}

export class GameAdapter {
  private dataProvider: FileSystemDataProvider;
  private currentGameState: GameState | null = null;
  private playerStrategy: UIPlayerStrategy | null = null;

  constructor() {
    // 使用配置管理器获取数据路径
    const dataPath = GameConfigManager.getConfigPath('prototype');
    this.dataProvider = new FileSystemDataProvider(dataPath);
  }

  /**
   * 初始化新游戏
   */
  async initializeGame(
    difficulty: 'easy' | 'normal' | 'hard' = 'normal',
    choiceCallback: (gameState: GameState, event: EventCard) => Promise<string>
  ): Promise<GameState> {
    // 创建UI玩家策略
    this.playerStrategy = new UIPlayerStrategy(choiceCallback);
    
    // 创建新游戏状态
    this.currentGameState = GameEngine.createNewGame(difficulty);

    try {
      // 加载角色配置
      const allCharacters = await this.dataProvider.loadAllCharacters();
      if (allCharacters.length === 0) {
        throw new Error('No characters found');
      }

      // 选择随机角色
      const selectedCharacters = ConfigConverter.selectRandomCharacters(allCharacters, 3, 5);

      // 转换为游戏角色卡
      this.currentGameState.activeCharacters = selectedCharacters.map(config => 
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
          this.currentGameState!.cardPools.pending.push(event);
        } else {
          this.currentGameState!.cardPools.active.push(event);
        }
      });

      return this.currentGameState;

    } catch (error) {
      console.error('Failed to initialize game:', error);
      throw error;
    }
  }

  /**
   * 获取当前游戏状态
   */
  getCurrentGameState(): GameState | null {
    return this.currentGameState;
  }

  /**
   * 获取下一个事件
   */
  getNextEvent(): EventCard | null {
    if (!this.currentGameState) return null;

    // 更新卡池
    CardPoolManager.updatePendingPool(this.currentGameState);
    
    // 选择下一个事件
    const nextEvent = CardPoolManager.selectNextEvent(this.currentGameState);
    if (nextEvent) {
      this.currentGameState.currentEvent = nextEvent;
    }
    
    return nextEvent;
  }

  /**
   * 处理玩家选择
   */
  processPlayerChoice(choiceId: string): GameState {
    if (!this.currentGameState || !this.currentGameState.currentEvent) {
      throw new Error('No current event to process');
    }

    const event = this.currentGameState.currentEvent;
    const choice = event.choices.find(c => c.id === choiceId);
    
    if (!choice) {
      throw new Error(`Invalid choice ID: ${choiceId}`);
    }

    // 应用选择效果
    this.currentGameState = GameEngine.applyChoiceEffects(this.currentGameState, choice);
    
    // 记录游戏事件
    GameEngine.recordGameEvent(this.currentGameState, event, choice);
    
    // 移除已使用的事件
    this.currentGameState = CardPoolManager.discardEvent(this.currentGameState, event.id);
    
    // 处理回合结束
    this.currentGameState = GameEngine.processTurnEnd(this.currentGameState);
    
    // 检查游戏结束条件
    const gameOverCheck = GameEngine.checkGameOver(this.currentGameState);
    if (gameOverCheck.gameOver) {
      this.currentGameState.gameOver = true;
      this.currentGameState.gameOverReason = gameOverCheck.reason;
      this.currentGameState.endTime = Date.now();
    }

    return this.currentGameState;
  }

  /**
   * 检查游戏是否结束
   */
  isGameOver(): boolean {
    return this.currentGameState?.gameOver ?? false;
  }

  /**
   * 获取游戏结束原因
   */
  getGameOverReason(): string | undefined {
    return this.currentGameState?.gameOverReason;
  }

  /**
   * 获取卡池状态
   */
  getPoolStatus() {
    if (!this.currentGameState) return null;
    return CardPoolManager.getPoolStatus(this.currentGameState);
  }

  /**
   * 重置游戏
   */
  resetGame(): void {
    this.currentGameState = null;
    this.playerStrategy = null;
  }
}
