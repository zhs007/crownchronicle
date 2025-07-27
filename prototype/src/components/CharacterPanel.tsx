'use client';

import { CharacterCard } from 'crownchronicle-core';

interface CharacterPanelProps {
  characters: CharacterCard[];
}

export default function CharacterPanel({ characters }: CharacterPanelProps) {
  // ...已移除与皇帝关系和威胁相关的辅助函数...

  return (
    <div className="card">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        朝廷重臣
      </h2>
      {characters.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          暂无朝廷重臣
        </div>
      ) : (
        <div className="space-y-4">
          {characters.map((character) => (
            <div 
              key={character.id} 
              className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {/* 角色基本信息 */}
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-semibold text-gray-800">
                    {character.currentTitle}
                  </div>
                  <div className="text-sm text-gray-600">
                    {character.role}
                  </div>
                  {character.identityRevealed && (
                    <div className="text-xs text-yellow-600 font-medium">
                      真实身份：{character.name}
                    </div>
                  )}
                </div>
              </div>

              {/* 已揭示的特性 */}
              {character.revealedTraits && character.revealedTraits.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs text-gray-500 mb-1">已知特性：</div>
                  <div className="flex flex-wrap gap-1">
                    {character.revealedTraits.map((trait, index) => (
                      <span 
                        key={index}
                        className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded"
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 已发现的线索 */}
              {character.discoveredClues && character.discoveredClues.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs text-gray-500 mb-1">
                    线索进度：{character.discoveredClues.length}/{character.totalClues}
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill bg-blue-500"
                      style={{ 
                        width: `${(character.discoveredClues.length / character.totalClues) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
