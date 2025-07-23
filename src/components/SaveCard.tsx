'use client';

import { SaveSummary } from '@/types/saves';

interface SaveCardProps {
  save: SaveSummary;
  onContinue: (saveId: string) => void;
  onDelete: (saveId: string) => void;
}

export default function SaveCard({ save, onContinue, onDelete }: SaveCardProps) {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'easy': return 'text-green-600';
      case 'hard': return 'text-red-600';
      default: return 'text-blue-600';
    }
  };

  const getDifficultyLabel = (difficulty: string): string => {
    switch (difficulty) {
      case 'easy': return '简单';
      case 'hard': return '困难';
      default: return '普通';
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      {/* 头部信息 */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-lg text-gray-800 truncate">
            {save.saveName}
          </h3>
          <div className="text-sm text-gray-500 mt-1">
            {save.gameOver ? (
              <span className="text-red-600 font-medium">游戏结束</span>
            ) : (
              <span className="text-green-600">进行中</span>
            )}
            <span className="mx-2">•</span>
            <span className={getDifficultyColor(save.metadata.difficulty)}>
              {getDifficultyLabel(save.metadata.difficulty)}
            </span>
          </div>
        </div>
        
        {/* 操作按钮 */}
        <div className="flex space-x-2">
          <button
            onClick={() => onContinue(save.saveId)}
            className="btn-primary text-sm px-3 py-1"
          >
            {save.gameOver ? '查看' : '继续'}
          </button>
          <button
            onClick={() => onDelete(save.saveId)}
            className="btn-secondary text-sm px-3 py-1 text-red-600 hover:bg-red-50"
          >
            删除
          </button>
        </div>
      </div>

      {/* 游戏信息 */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-gray-600">皇帝年龄</div>
          <div className="font-semibold">{save.emperorAge} 岁</div>
        </div>
        <div>
          <div className="text-gray-600">在位年数</div>
          <div className="font-semibold">{save.reignYears} 年</div>
        </div>
        <div>
          <div className="text-gray-600">游戏回合</div>
          <div className="font-semibold">第 {save.currentTurn} 回合</div>
        </div>
        <div>
          <div className="text-gray-600">游戏时长</div>
          <div className="font-semibold">{formatTime(save.metadata.totalPlayTime)}</div>
        </div>
      </div>

      {/* 成就展示 */}
      <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-gray-600">最高威望</div>
          <div className="font-semibold text-imperial-600">{save.metadata.maxAuthority}</div>
        </div>
        <div>
          <div className="text-gray-600">最高民心</div>
          <div className="font-semibold text-dragon-600">{save.metadata.maxPopularity}</div>
        </div>
      </div>

      {/* 时间信息 */}
      <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
        <div>创建时间：{formatDate(save.createdAt)}</div>
        <div>最后保存：{formatDate(save.lastSavedAt)}</div>
      </div>
    </div>
  );
}
