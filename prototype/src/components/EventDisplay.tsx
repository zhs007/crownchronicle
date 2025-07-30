'use client';

import { EventCard } from 'crownchronicle-core';

interface EventDisplayProps {
  event: EventCard;
  onChoice: (choiceId: string) => void;
  loading?: boolean;
  gameOver?: boolean;
}

export default function EventDisplay({ event, onChoice, loading = false, gameOver = false }: EventDisplayProps) {
  const handleOptionClick = (optionId: string) => {
    if (loading || gameOver) return;
    onChoice(optionId);
  };

  return (
    <div className="card">
      {/* 事件标题 */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {event.title}
        </h2>
      </div>

      {/* 选项按钮（新版结构，只用 options 字段） */}
      {!gameOver && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700 mb-3">
            请选择你的应对方式：
          </div>
          {Array.isArray(event.options) && event.options.length === 2 && event.options.map((option, index) => (
            <button
              key={option.optionId}
              onClick={() => handleOptionClick(option.optionId)}
              disabled={loading}
              className={`w-full text-left p-4 border-2 rounded-lg transition-all duration-200 ${
                loading 
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                  : 'border-gray-200 hover:border-yellow-400 hover:bg-yellow-50 cursor-pointer'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-700 text-sm font-bold">
                  {String.fromCharCode(65 + index)}
                </div>
                <div className="flex-1">
                  <div className="text-gray-800 font-medium mb-1">
                    {option.reply}
                  </div>
                  {Array.isArray(option.effects) && option.effects.length > 0 ? (
                    option.effects.map((eff, effIdx) => (
                      <div key={effIdx} className="text-xs text-gray-500 mt-1">
                        目标：{eff.target === 'player' ? '玩家（皇帝）' : '当前角色'}
                        <br />
                        属性变动：{eff.attribute} {eff.offset > 0 ? '+' : ''}{eff.offset}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-gray-400 mt-1">无属性变动</div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      {/* 加载状态 */}
      {loading && (
        <div className="mt-6 flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600 mr-3"></div>
          <span className="text-gray-600">处理中...</span>
        </div>
      )}
      {/* 游戏结束状态 */}
      {gameOver && (
        <div className="mt-6 p-4 bg-gray-100 rounded-lg text-center">
          <div className="text-gray-600">
            游戏已结束，无法继续操作
          </div>
        </div>
      )}
    </div>
  );
}
