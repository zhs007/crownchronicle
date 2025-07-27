'use client';

import React, { useState } from 'react';
import { CharacterCard, EventCard } from '@/types/game';
import { dump } from 'js-yaml';

interface DataPreviewProps {
  selectedFile?: {
    type: 'character' | 'event';
    data: CharacterCard | EventCard;
    id: string;
    name: string;
  };
}

export default function DataPreview({ selectedFile }: DataPreviewProps) {
  const [viewMode, setViewMode] = useState<'preview' | 'yaml'>('preview');

  if (!selectedFile) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">📋</div>
          <div className="text-lg font-medium">选择文件预览</div>
          <div className="text-sm mt-2">从左侧文件列表中选择角色或事件</div>
        </div>
      </div>
    );
  }

  const renderCharacterPreview = (character: CharacterCard) => (
    <div className="space-y-6">
      {/* 基本信息 */}
      <div className="bg-white rounded-lg p-4 shadow-sm border">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">基本信息</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-600">真实姓名</label>
            <div className="text-gray-800">{character.name}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">显示称谓</label>
            <div className="text-gray-800">{character.displayName}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">身份</label>
            <div className="text-gray-800">{character.role}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">当前称谓</label>
            <div className="text-gray-800">{character.currentTitle}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">身份揭示</label>
            <div className="text-gray-800">{character.identityRevealed ? '已揭示' : '未揭示'}</div>
          </div>
        </div>
        <div className="mt-4">
          <label className="text-sm font-medium text-gray-600">描述</label>
          <div className="text-gray-800 mt-1">{character.description}</div>
        </div>
      </div>

      {/* 属性 */}
      <div className="bg-white rounded-lg p-4 shadow-sm border">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">初始属性</h3>
        <div className="grid grid-cols-2 gap-4">
          {character.attributes && Object.entries(character.attributes).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">{getAttributeLabel(key)}</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${Number(value)}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-800 w-8">{Number(value)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderEventPreview = (event: EventCard) => (
    <div className="space-y-6">
      {/* 基本信息 */}
      <div className="bg-white rounded-lg p-4 shadow-sm border">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">事件信息</h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-600">标题</label>
            <div className="text-gray-800 font-medium">{event.title}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">描述</label>
            <div className="text-gray-800">{event.description}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">说话者</label>
              <div className="text-gray-800">{event.speaker}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">权重</label>
              <div className="text-gray-800">{event.weight}</div>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">对话</label>
            <div className="text-gray-800 bg-gray-50 p-3 rounded border italic">
              &ldquo;{event.dialogue}&rdquo;
            </div>
          </div>
        </div>
      </div>

      {/* 选择分支 */}
      <div className="bg-white rounded-lg p-4 shadow-sm border">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">选择分支</h3>
        <div className="space-y-4">
          {event.choices.map((choice, index) => (
            <div key={choice.id} className="border rounded-lg p-3">
              <div className="flex items-start justify-between mb-2">
                <span className="font-medium text-gray-800">选项 {index + 1}</span>
                <span className="text-xs text-gray-500">ID: {choice.id}</span>
              </div>
              <div className="text-gray-700 mb-3">{choice.text}</div>
              
              {/* 效果 */}
              <div className="mb-2">
                <span className="text-sm font-medium text-gray-600">效果:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {choice.effects && Object.entries(choice.effects).map(([key, value]) => (
                    value !== 0 && (
                      <span key={key} className={`px-2 py-1 rounded text-xs ${
                        value > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {getAttributeLabel(key)}: {value > 0 ? '+' : ''}{value}
                      </span>
                    )
                  ))}
                </div>
              </div>
              
              {choice.consequences && (
                <div>
                  <span className="text-sm font-medium text-gray-600">后果:</span>
                  <div className="text-sm text-gray-700 mt-1">{choice.consequences}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderYamlView = () => {
    try {
      const yamlContent = dump(selectedFile.data, {
        indent: 2,
        quotingType: '"',
        lineWidth: -1
      });
      
      return (
        <div className="h-full">
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-auto h-full font-mono">
            {yamlContent}
          </pre>
        </div>
      );
    } catch (error) {
      return (
        <div className="text-red-600 p-4">
          Error generating YAML: {String(error)}
        </div>
      );
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center space-x-3">
          <span className="text-xl">
            {selectedFile.type === 'character' ? '👤' : '📋'}
          </span>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">{selectedFile.name}</h2>
            <p className="text-sm text-gray-600">
              {selectedFile.type === 'character' ? '角色卡片' : '事件卡片'}
            </p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('preview')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'preview' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            预览
          </button>
          <button
            onClick={() => setViewMode('yaml')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'yaml' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            YAML
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {viewMode === 'preview' ? (
          selectedFile.type === 'character' 
            ? renderCharacterPreview(selectedFile.data as CharacterCard)
            : renderEventPreview(selectedFile.data as EventCard)
        ) : (
          renderYamlView()
        )}
      </div>
    </div>
  );
}

// 辅助函数
function getAttributeLabel(key: string): string {
  const labels: Record<string, string> = {
    power: '权势',
    military: '军队',
    wealth: '财富',
    popularity: '民心',
    health: '健康',
    age: '年龄'
  };
  return labels[key] || key;
}

