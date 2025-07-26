'use client';

import { CharacterCard } from 'crownchronicle-core';

interface CharacterPanelProps {
  characters: CharacterCard[];
}

export default function CharacterPanel({ characters }: CharacterPanelProps) {
  const getRelationshipColor = (affection: number): string => {
    if (affection >= 50) return 'text-green-600';
    if (affection >= 0) return 'text-blue-600';
    if (affection >= -50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getRelationshipLabel = (affection: number): string => {
    if (affection >= 70) return '亲密';
    if (affection >= 30) return '友好';
    if (affection >= -30) return '中立';
    if (affection >= -70) return '冷淡';
    return '敌对';
  };

  const getThreatLevel = (threat: number): string => {
    if (threat >= 80) return '极危险';
    if (threat >= 60) return '高威胁';
    if (threat >= 40) return '中威胁';
    if (threat >= 20) return '低威胁';
    return '无威胁';
  };

  const getThreatColor = (threat: number): string => {
    if (threat >= 80) return 'text-red-600';
    if (threat >= 60) return 'text-orange-600';
    if (threat >= 40) return 'text-yellow-600';
    if (threat >= 20) return 'text-blue-600';
    return 'text-green-600';
  };

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
          {characters
            .filter(char => char.statusFlags.alive && char.statusFlags.inCourt)
            .map((character) => (
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
                
                {/* 状态标记 */}
                <div className="text-xs space-y-1">
                  {character.statusFlags.plotting && (
                    <div className="bg-red-100 text-red-600 px-2 py-1 rounded">
                      密谋中
                    </div>
                  )}
                  {character.statusFlags.suspicious && (
                    <div className="bg-yellow-100 text-yellow-600 px-2 py-1 rounded">
                      可疑
                    </div>
                  )}
                  {character.statusFlags.promoted && (
                    <div className="bg-green-100 text-green-600 px-2 py-1 rounded">
                      晋升
                    </div>
                  )}
                </div>
              </div>

              {/* 关系信息 */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">关系：</span>
                  <span className={getRelationshipColor(character.relationshipWithEmperor.affection)}>
                    {getRelationshipLabel(character.relationshipWithEmperor.affection)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">威胁：</span>
                  <span className={getThreatColor(character.relationshipWithEmperor.threat)}>
                    {getThreatLevel(character.relationshipWithEmperor.threat)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">信任：</span>
                  <span className="font-medium">
                    {character.relationshipWithEmperor.trust}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">依赖：</span>
                  <span className="font-medium">
                    {character.relationshipWithEmperor.dependency}
                  </span>
                </div>
              </div>

              {/* 已揭示的特性 */}
              {character.revealedTraits.length > 0 && (
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
              {character.discoveredClues.length > 0 && (
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

      {/* 流放或死亡的角色 */}
      {characters.some(char => !char.statusFlags.alive || char.statusFlags.inExile) && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">
            已离开朝廷
          </h3>
          <div className="space-y-2">
            {characters
              .filter(char => !char.statusFlags.alive || char.statusFlags.inExile)
              .map((character) => (
              <div key={character.id} className="text-sm text-gray-500">
                <span>{character.currentTitle}</span>
                <span className="mx-2">•</span>
                <span>
                  {!character.statusFlags.alive ? '已故' : '流放'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
