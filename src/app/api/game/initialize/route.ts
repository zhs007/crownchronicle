import { NextRequest, NextResponse } from 'next/server';
import { GameEngine } from '@/lib/gameEngine';
import { ConfigLoader } from '@/lib/configLoader';
import { CardPoolManager } from '@/lib/cardPoolManager';

export async function POST(request: NextRequest) {
  try {
    const { difficulty = 'normal' } = await request.json();

    // 创建新游戏状态
    let gameState = GameEngine.createNewGame(difficulty);

    try {
      // 加载角色配置
      const characterConfigs = await ConfigLoader.loadAllCharacters();
      
      // 随机选择初始角色并转换为游戏卡牌
      const selectedConfigs = ConfigLoader.selectRandomCharacters(characterConfigs, 3);
      const initialCharacters = selectedConfigs.map(config => 
        ConfigLoader.configToCharacterCard(config)
      );
      gameState.activeCharacters = initialCharacters;

      // 加载所有角色的事件
      const allEvents: any[] = [];
      for (const characterConfig of selectedConfigs) {
        const characterEvents = await ConfigLoader.loadCharacterEvents(characterConfig.id);
        const eventCards = characterEvents.map(eventConfig => 
          ConfigLoader.configToEventCard(eventConfig, characterConfig.id)
        );
        allEvents.push(...eventCards);
      }

      // 初始化卡池
      gameState.cardPools.pending = allEvents;
      gameState.cardPools.active = [];
      gameState.cardPools.discarded = [];

      // 选择第一个事件
      const firstEvent = CardPoolManager.selectNextEvent(gameState);
      if (firstEvent) {
        gameState.currentEvent = firstEvent;
        gameState = CardPoolManager.discardEvent(gameState, firstEvent.id);
      }

    } catch (configError) {
      console.error('加载配置时出错:', configError);
      // 如果配置加载失败，仍然返回基础游戏状态
      // 只是没有角色和事件
    }

    return NextResponse.json({
      success: true,
      data: { gameState }
    });

  } catch (error) {
    console.error('初始化游戏时出错:', error);
    return NextResponse.json({
      success: false,
      error: '初始化游戏失败'
    }, { status: 500 });
  }
}
