'use client';

import { GameEvent } from 'crownchronicle-core';

interface GameHistoryProps {
  history: GameEvent[];
  maxDisplay?: number;
}

export default function GameHistory({ history, maxDisplay = 10 }: GameHistoryProps) {
  // 显示最新的历史记录，限制显示数量
  const displayHistory = history.slice(-maxDisplay).reverse();

  if (displayHistory.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">历史记录</h3>
        <div className="text-gray-500 text-center py-8">
          暂无历史记录
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        历史记录
        <span className="text-sm text-gray-500 ml-2">
          (显示最近 {displayHistory.length} 条)
        </span>
      </h3>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {displayHistory.map((event, index) => (
          <div 
            key={`${event.turn}-${index}`}
            className="border-l-4 border-gray-200 pl-4 pb-3"
          >
            {/* 回合信息 */}
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-500">
                第 {event.turn} 回合
              </div>
              <div className="text-xs text-gray-400">
                {new Date(event.timestamp).toLocaleString('zh-CN', {
                  month: 'numeric',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>

            {/* 事件标题 */}
            <div className="font-medium text-gray-800 mb-2">
              {event.eventTitle}
            </div>

            {/* 选择的决策 */}
            <div className="bg-gray-50 rounded px-3 py-2 mb-2">
              <div className="text-sm text-gray-700">
                <span className="font-medium">决策：</span>
                {event.chosenAction}
              </div>
            </div>

            {/* 效果展示 */}
            {event.effects && Object.keys(event.effects).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {Object.entries(event.effects).map(([key, value]) => {
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
                      className={`text-xs px-2 py-1 rounded ${
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

            {/* 角色关系变化 */}
            {event.relationshipChanges && Object.keys(event.relationshipChanges).length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-gray-600 mb-1">关系变化：</div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(event.relationshipChanges).map(([characterId, change]) => (
                    <span 
                      key={characterId}
                      className={`text-xs px-2 py-1 rounded ${
                        change > 0 
                          ? 'bg-blue-100 text-blue-600' 
                          : 'bg-orange-100 text-orange-600'
                      }`}
                    >
                      {characterId}: {change > 0 ? '+' : ''}{change}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 角色发现 */}
            {event.characterDiscoveries && event.characterDiscoveries.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-gray-600 mb-1">新发现：</div>
                <div className="flex flex-wrap gap-1">
                  {event.characterDiscoveries.map((discovery, discoveryIndex) => (
                    <span 
                      key={discoveryIndex}
                      className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-600"
                    >
                      💡 {discovery}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 重要事件标记 */}
            {event.importance === 'critical' && (
              <div className="mt-2">
                <span className="text-xs px-2 py-1 rounded bg-red-500 text-white">
                  ⚠️ 重要事件
                </span>
              </div>
            )}

            {event.importance === 'major' && (
              <div className="mt-2">
                <span className="text-xs px-2 py-1 rounded bg-yellow-500 text-white">
                  ❗ 重大事件
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 显示更多提示 */}
      {history.length > maxDisplay && (
        <div className="mt-4 pt-3 border-t border-gray-200 text-center">
          <div className="text-xs text-gray-500">
            还有 {history.length - maxDisplay} 条更早的记录未显示
          </div>
        </div>
      )}
    </div>
  );
}
