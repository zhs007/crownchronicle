'use client';

import { useState } from 'react';
import { SaveSummary } from '@/types/saves';
import { ApiClient } from '@/utils/apiClient';
import SaveCard from './SaveCard';
import { useRouter } from 'next/navigation';

interface SaveManagerProps {
  saves: SaveSummary[];
  onSavesUpdate: () => void;
  error: string | null;
}

export default function SaveManager({ saves, onSavesUpdate, error }: SaveManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newGameName, setNewGameName] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [createError, setCreateError] = useState<string | null>(null);
  const router = useRouter();

  const handleCreateGame = async () => {
    if (!newGameName.trim()) {
      setCreateError('请输入存档名称');
      return;
    }

    try {
      setIsCreating(true);
      setCreateError(null);

      const response = await ApiClient.createGame({
        saveName: newGameName.trim(),
        difficulty: selectedDifficulty
      });

      if (response.success && response.data) {
        // 跳转到游戏页面
        router.push(`/game/${response.data.saveId}`);
      } else {
        setCreateError(response.error || '创建游戏失败');
      }
    } catch (err) {
      setCreateError('网络错误');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSave = async (saveId: string) => {
    if (!confirm('确定要删除这个存档吗？此操作不可撤销。')) {
      return;
    }

    try {
      const response = await ApiClient.deleteSave(saveId);
      
      if (response.success) {
        onSavesUpdate();
      } else {
        alert('删除失败：' + (response.error || '未知错误'));
      }
    } catch (err) {
      alert('删除失败：网络错误');
    }
  };

  const handleContinueGame = (saveId: string) => {
    router.push(`/game/${saveId}`);
  };

  const difficultyOptions = [
    { value: 'easy', label: '简单', description: '适合新手，事件后果较轻' },
    { value: 'normal', label: '普通', description: '标准难度，平衡的游戏体验' },
    { value: 'hard', label: '困难', description: '挑战模式，事件后果严重' }
  ];

  return (
    <div className="space-y-6">
      {/* 创建新游戏 */}
      <div className="card card-imperial">
        <h2 className="text-2xl font-bold text-imperial mb-6">开始新游戏</h2>
        
        <div className="space-y-4">
          {/* 存档名称 */}
          <div>
            <label htmlFor="gameName" className="block text-sm font-medium text-gray-700 mb-2">
              存档名称
            </label>
            <input
              id="gameName"
              type="text"
              value={newGameName}
              onChange={(e) => setNewGameName(e.target.value)}
              placeholder="请输入存档名称..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              maxLength={50}
            />
          </div>

          {/* 难度选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              游戏难度
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {difficultyOptions.map((option) => (
                <div
                  key={option.value}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedDifficulty === option.value
                      ? 'border-yellow-500 bg-yellow-50'
                      : 'border-gray-300 hover:border-yellow-300'
                  }`}
                  onClick={() => setSelectedDifficulty(option.value as any)}
                >
                  <div className="font-semibold text-sm">{option.label}</div>
                  <div className="text-xs text-gray-600 mt-1">{option.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 错误信息 */}
          {createError && (
            <div className="text-red-600 text-sm bg-red-50 p-2 rounded border border-red-200">
              {createError}
            </div>
          )}

          {/* 创建按钮 */}
          <button
            onClick={handleCreateGame}
            disabled={isCreating || !newGameName.trim()}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? '创建中...' : '开始新游戏'}
          </button>
        </div>
      </div>

      {/* 存档列表 */}
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">存档列表</h2>
        
        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded border border-red-200 mb-4">
            {error}
          </div>
        )}

        {saves.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-lg mb-2">暂无存档</p>
            <p className="text-sm">创建你的第一个游戏开始你的皇帝之路</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {saves.map((save) => (
              <SaveCard
                key={save.saveId}
                save={save}
                onContinue={handleContinueGame}
                onDelete={handleDeleteSave}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
