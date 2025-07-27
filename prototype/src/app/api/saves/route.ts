import { NextRequest, NextResponse } from 'next/server';
import { SaveManager } from '@/lib/saveManager';
import { 
  GameEngine, 
  FileSystemDataProvider, 
  ConfigConverter, 
  CardPoolManager 
} from 'crownchronicle-core';
import { GameConfigManager } from '../../../lib/configManager';
import { CreateGameRequest } from '@/types/api';

// GET /api/saves - 获取所有存档
export async function GET() {
  try {
    const saves = await SaveManager.getAllSaves();
    
    return NextResponse.json({
      success: true,
      data: { saves },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get saves:', error);
    return NextResponse.json({
      success: false,
      error: '获取存档列表失败',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// POST /api/saves - 创建新游戏
export async function POST(request: NextRequest) {
  try {
    const body: CreateGameRequest = await request.json();
    const { saveName, difficulty = 'normal' } = body;

    if (!saveName || !saveName.trim()) {
      return NextResponse.json({
        success: false,
        error: '存档名称不能为空',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // 创建新游戏状态
    let gameState = GameEngine.createNewGame(difficulty);

    // 创建数据提供器，使用配置管理器
    const dataPath = GameConfigManager.getConfigPath('prototype');
    const dataProvider = new FileSystemDataProvider(dataPath);
    
    // 加载角色配置
    const allCharacters = await dataProvider.loadAllCharacters();
    if (allCharacters.length === 0) {
      return NextResponse.json({
        success: false,
        error: '未找到角色配置文件',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    // 随机选择角色
    const selectedConfigs = ConfigConverter.selectRandomCharacters(allCharacters, 3, 5);
    const characters = selectedConfigs.map(config => ConfigConverter.configToCharacterCard(config));
    
    // 加载角色事件
    const allEvents = [];
    for (const config of selectedConfigs) {
      const events = await dataProvider.loadCharacterEvents(config.id);
      const eventCards = events.map(event => ConfigConverter.configToEventCard(event, config.id));
      allEvents.push(...eventCards);
      
      // 记录角色关联的事件ID
      const character = characters.find(c => c.id === config.id);
      if (character) {
        character.eventIds = eventCards.map(e => e.id);
      }
    }

    // 设置游戏状态
    gameState.activeCharacters = characters;
    
    // 初始化角色状态
    gameState.characterStates = characters.map(char => ({
      characterId: char.id,
      alive: true,
      relationship: 'neutral',
      influence: 50,
      identityProgress: {
        revealed: false,
        cluesFound: [],
        traitsRevealed: [],
        discoveryProgress: 0
      },
      currentTitle: char.displayName,
      titleHistory: [{
        title: char.displayName,
        changedAt: 1,
        reason: '初始称谓'
      }]
    }));

    // 初始化派系系统
    // ...已移除派系系统初始化逻辑（factionInfo 字段已废弃）...

    // 将事件添加到待定卡池
    gameState = CardPoolManager.addToPendingPool(gameState, allEvents);
    console.log('添加到待定卡池的事件数量:', gameState.cardPools.pending.length);
    console.log('待定卡池中的事件:', gameState.cardPools.pending.map(e => e.id));
    
    // 更新卡池状态
    gameState = CardPoolManager.updatePendingPool(gameState);
    console.log('更新后激活卡池事件数量:', gameState.cardPools.active.length);
    console.log('激活卡池中的事件:', gameState.cardPools.active.map(e => e.id));
    
    // 选择第一个事件
    const firstEvent = CardPoolManager.selectNextEvent(gameState);
    console.log('选择的第一个事件:', firstEvent ? firstEvent.id : 'null');
    if (firstEvent) {
      gameState.currentEvent = firstEvent;
      gameState = CardPoolManager.discardEvent(gameState, firstEvent.id);
      console.log('设置当前事件成功:', gameState.currentEvent?.id);
    } else {
      console.log('警告：没有选择到第一个事件');
      console.log('游戏状态:', {
        pendingCount: gameState.cardPools.pending.length,
        activeCount: gameState.cardPools.active.length,
        discardedCount: gameState.cardPools.discarded.length
      });
    }

    // 创建存档
    const saveId = await SaveManager.createSave(saveName.trim(), gameState, difficulty);

    return NextResponse.json({
      success: true,
      data: {
        saveId,
        gameState
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to create game:', error);
    return NextResponse.json({
      success: false,
      error: '创建游戏失败',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
