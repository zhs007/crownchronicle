'use client';

import { EventCard } from 'crownchronicle-core';

interface EventDisplayProps {
  event: EventCard;
  onChoice: (choiceId: string) => void;
  loading?: boolean;
  gameOver?: boolean;
}

export default function EventDisplay({ event, onChoice, loading = false, gameOver = false }: EventDisplayProps) {
  const handleChoiceClick = (choiceId: string) => {
    if (loading || gameOver) return;
    onChoice(choiceId);
  };

  return (
    <div className="card">
      {/* 事件标题 */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {event.title}
        </h2>
        <p className="text-gray-600">
          {event.description}
        </p>
      </div>

      {/* 角色对话 */}
      <div className="mb-8 p-4 bg-gradient-to-r from-yellow-50 to-blue-50 rounded-lg border-l-4 border-yellow-500">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-yellow-600 rounded-full flex items-center justify-center text-white font-bold">
              {event.speaker.charAt(0)}
            </div>
          </div>
          <div className="flex-1">
            <div className="font-semibold text-yellow-700 mb-2">
              {event.speaker}
            </div>
            <div className="text-gray-700 leading-relaxed">
              {event.dialogue}
            </div>
          </div>
        </div>
      </div>

      {/* 选项按钮 */}
      {!gameOver && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700 mb-3">
            请选择你的应对方式：
          </div>
          
          {event.choices.map((choice, index) => (
            <button
              key={choice.id}
              onClick={() => handleChoiceClick(choice.id)}
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
                    {choice.text}
                  </div>
                  
                  {/* 显示效果预览 */}
                  {choice.effects && Object.keys(choice.effects).length > 0 && (
                    <div className="text-xs text-gray-500 flex flex-wrap gap-2">
                      {Object.entries(choice.effects).map(([key, value]) => {
                        if (value === 0) return null;
                        
                        const labels: Record<string, string> = {
                          health: '健康',
                          authority: '威望',
                          treasury: '国库',
                          military: '军事',
                          popularity: '民心'
                        };
                        
                        return (
                          <span 
                            key={key}
                            className={`px-2 py-1 rounded ${
                              (value || 0) > 0 
                                ? 'bg-green-100 text-green-600' 
                                : 'bg-red-100 text-red-600'
                            }`}
                          >
                            {labels[key] || key}: {value > 0 ? '+' : ''}{value}
                          </span>
                        );
                      })}
                    </div>
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

      {/* 角色线索提示 */}
      {event.characterClues && (
        <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-blue-700 text-sm font-medium mb-2">
            💡 观察所得
          </div>
          
          {event.characterClues.personalityHints && event.characterClues.personalityHints.length > 0 && (
            <div className="mb-2">
              <div className="text-blue-600 text-xs font-medium mb-1">性格线索：</div>
              {event.characterClues.personalityHints.map((hint, index) => (
                <div key={index} className="text-blue-600 text-xs ml-2">
                  • {hint}
                </div>
              ))}
            </div>
          )}
          
          {event.characterClues.backgroundHints && event.characterClues.backgroundHints.length > 0 && (
            <div>
              <div className="text-blue-600 text-xs font-medium mb-1">背景线索：</div>
              {event.characterClues.backgroundHints.map((hint, index) => (
                <div key={index} className="text-blue-600 text-xs ml-2">
                  • {hint}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
