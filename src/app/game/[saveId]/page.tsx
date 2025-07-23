'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GameState } from '@/types/game';
import { ApiClient } from '@/utils/apiClient';
import EmperorStats from '@/components/EmperorStats';
import CharacterPanel from '@/components/CharacterPanel';
import EventDisplay from '@/components/EventDisplay';
import GameHistory from '@/components/GameHistory';

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const saveId = params.saveId as string;

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (saveId) {
      loadGame();
    }
  }, [saveId]);

  const loadGame = async () => {
    try {
      setLoading(true);
      const response = await ApiClient.loadSave(saveId);
      
      if (response.success && response.data) {
        setGameState(response.data.gameState);
      } else {
        setError(response.error || '加载游戏失败');
      }
    } catch (err) {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const handleChoice = async (choiceId: string) => {
    if (!gameState || actionLoading) return;

    try {
      setActionLoading(true);
      
      const response = await ApiClient.makeChoice(saveId, choiceId);

      if (response.success && response.data) {
        setGameState(response.data.gameState);
        
        if (response.data.gameState?.gameOver) {
          // 游戏结束，显示结果
          setTimeout(() => {
            alert(`游戏结束！${response.data.gameState.gameOverReason}`);
          }, 1000);
        }
      } else {
        alert('执行选择失败：' + (response.error || '未知错误'));
      }
    } catch (err) {
      alert('网络错误');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveGame = async () => {
    try {
      const response = await ApiClient.saveGame(saveId);
      
      if (response.success) {
        alert('游戏已保存');
      } else {
        alert('保存失败：' + (response.error || '未知错误'));
      }
    } catch (err) {
      alert('保存失败：网络错误');
    }
  };

  const handleBackToHome = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-imperial-600"></div>
      </div>
    );
  }

  if (error || !gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">
            {error || '游戏数据无效'}
          </div>
          <button onClick={handleBackToHome} className="btn-primary">
            返回主页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-imperial-50 to-dragon-50">
      {/* 顶部工具栏 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button 
                onClick={handleBackToHome}
                className="btn-secondary"
              >
                返回主页
              </button>
              <div className="text-sm text-gray-600">
                第 {gameState.currentTurn} 回合 | 
                年龄 {gameState.emperor.age} 岁 | 
                在位 {gameState.emperor.reignYears} 年
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {gameState.gameOver && (
                <div className="text-red-600 font-semibold">
                  游戏结束：{gameState.gameOverReason}
                </div>
              )}
              <button 
                onClick={handleSaveGame}
                className="btn-primary"
                disabled={gameState.gameOver}
              >
                保存游戏
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 左侧：皇帝属性 */}
          <div className="lg:col-span-1">
            <EmperorStats stats={gameState.emperor} />
          </div>

          {/* 中央：事件显示 */}
          <div className="lg:col-span-2">
            {gameState.currentEvent ? (
              <EventDisplay 
                event={gameState.currentEvent}
                onChoice={handleChoice}
                loading={actionLoading}
                gameOver={gameState.gameOver}
              />
            ) : (
              <div className="card text-center py-12">
                <div className="text-gray-500 text-lg">
                  {gameState.gameOver ? '游戏已结束' : '暂无事件'}
                </div>
              </div>
            )}
          </div>

          {/* 右侧：角色和历史 */}
          <div className="lg:col-span-1 space-y-6">
            <CharacterPanel characters={gameState.activeCharacters} />
            <GameHistory 
              history={gameState.gameHistory} 
              maxDisplay={5}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
