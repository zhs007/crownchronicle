import { NextRequest, NextResponse } from 'next/server';
import { SaveManager } from '@/lib/saveManager';
import { GameEngine, CardPoolManager } from 'crownchronicle-core';
import { GameActionRequest } from '@/types/api';

interface RouteParams {
  params: {
    saveId: string;
  };
}

// POST /api/saves/[saveId]/action - 执行游戏行动
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { saveId } = params;
    const body = await request.json();
    
    // 支持两种格式：
    // 1. 新格式: { action: 'choose_option', payload: { choiceId } }
    // 2. 简化格式: { choiceId }
    let action: string;
    let payload: any;
    
    if (body.action && body.payload) {
      // 新格式
      action = body.action;
      payload = body.payload;
    } else if (body.choiceId) {
      // 简化格式
      action = 'choose_option';
      payload = { choiceId: body.choiceId };
    } else {
      return NextResponse.json({
        success: false,
        error: '请求格式错误',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // 加载存档
    const saveFile = await SaveManager.loadSave(saveId);
    if (!saveFile) {
      return NextResponse.json({
        success: false,
        error: '存档不存在',
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    let gameState = saveFile.gameState;
    let eventUpdated = false;
    let gameOverInfo = { gameOver: false, gameOverReason: undefined };

    switch (action) {
      case 'choose_option':
        // 处理事件选择
        if (!payload.choiceId || !gameState.currentEvent) {
          return NextResponse.json({
            success: false,
            error: '无效的选择',
            timestamp: new Date().toISOString()
          }, { status: 400 });
        }

        const choice = gameState.currentEvent.choices.find(c => c.id === payload.choiceId);
        if (!choice) {
          return NextResponse.json({
            success: false,
            error: '选择不存在',
            timestamp: new Date().toISOString()
          }, { status: 400 });
        }

        // 应用选择效果
        gameState = GameEngine.applyChoiceEffects(gameState, choice);

        // 收集关系变化信息 (简化版本，实际应该从choice.characterEffects计算)
        const relationshipChanges: Record<string, number> = {};
        if (choice.characterEffects) {
          choice.characterEffects.forEach(effect => {
            if (effect.relationshipChanges) {
              Object.entries(effect.relationshipChanges).forEach(([key, value]) => {
                if (key === 'affection' && value !== undefined && typeof value === 'number') {
                  relationshipChanges[effect.characterId] = value;
                }
              });
            }
          });
        }

        // 收集角色发现 (从角色线索推断)
        const characterDiscoveries: string[] = [];
        if (gameState.currentEvent.characterClues) {
          if (gameState.currentEvent.characterClues.personalityHints) {
            characterDiscoveries.push(...gameState.currentEvent.characterClues.personalityHints);
          }
          if (gameState.currentEvent.characterClues.backgroundHints) {
            characterDiscoveries.push(...gameState.currentEvent.characterClues.backgroundHints);
          }
        }

        // 记录游戏事件
        GameEngine.recordGameEvent(
          gameState, 
          gameState.currentEvent, 
          choice,
          Object.keys(relationshipChanges).length > 0 ? relationshipChanges : undefined,
          characterDiscoveries.length > 0 ? characterDiscoveries : undefined
        );

        // 处理回合结束
        gameState = GameEngine.processTurnEnd(gameState);

        // 检查游戏结束条件
        const gameOverCheck = GameEngine.checkGameOver(gameState);
        if (gameOverCheck.gameOver) {
          gameState.gameOver = true;
          gameState.gameOverReason = gameOverCheck.reason;
          gameState.endTime = Date.now();
          gameOverInfo = {
            gameOver: true,
            gameOverReason: gameOverCheck.reason
          };
        } else {
          // 更新卡池并选择下一个事件
          gameState = CardPoolManager.updatePendingPool(gameState);
          const nextEvent = CardPoolManager.selectNextEvent(gameState);
          
          if (nextEvent) {
            gameState.currentEvent = nextEvent;
            gameState = CardPoolManager.discardEvent(gameState, nextEvent.id);
            eventUpdated = true;
          } else {
            // 没有可用事件，游戏结束
            gameState.gameOver = true;
            gameState.gameOverReason = '朝政平稳，皇帝安然退位';
            gameState.endTime = Date.now();
            gameOverInfo = {
              gameOver: true,
              gameOverReason: '朝政平稳，皇帝安然退位'
            };
          }
        }
        break;

      case 'save_game':
        // 保存游戏（不改变游戏状态）
        break;

      case 'next_turn':
        // 强制进入下一回合（调试用）
        if (process.env.NODE_ENV === 'development') {
          gameState = GameEngine.processTurnEnd(gameState);
          eventUpdated = true;
        }
        break;

      default:
        return NextResponse.json({
          success: false,
          error: '无效的行动类型',
          timestamp: new Date().toISOString()
        }, { status: 400 });
    }

    // 保存游戏状态
    const success = await SaveManager.updateSave(saveId, gameState);
    
    if (!success) {
      return NextResponse.json({
        success: false,
        error: '保存游戏状态失败',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        gameState,
        eventUpdated,
        ...gameOverInfo
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to execute game action:', error);
    return NextResponse.json({
      success: false,
      error: '执行游戏行动失败',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
