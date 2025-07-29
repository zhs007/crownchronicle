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
              {/* 角色基本信息（仅保留新结构字段） */}
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-semibold text-gray-800">
                    {character.name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {character.description}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
