'use client';

import React, { useState, useEffect } from 'react';
import { CharacterCard, EventCard } from '@/types/game';
import { dump } from 'js-yaml';


interface DataPreviewProps {
  selectedFile?: {
    type: 'character' | 'event' | 'commoncard';
    data: CharacterCard | EventCard | Record<string, unknown>;
    id: string;
    name: string;
  };
}

export default function DataPreview({ selectedFile }: DataPreviewProps) {
  useEffect(() => {
    // 调试用，打印 selectedFile 详细内容
    console.log('[DataPreview] useEffect selectedFile', selectedFile);
    if (selectedFile) {
      console.log('[DataPreview] selectedFile.type:', selectedFile.type);
      console.log('[DataPreview] selectedFile.data:', selectedFile.data);
    }
  }, [selectedFile]);
  const [viewMode, setViewMode] = useState<'preview' | 'yaml'>('preview');

  if (!selectedFile) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">📋</div>
          <div className="text-lg font-medium">选择文件预览</div>
          <div className="text-sm mt-2">从左侧文件列表中选择角色、事件或通用卡</div>
        </div>
      </div>
    );
  }
  // 通用卡预览
  const renderCommonCardPreview = (card: Record<string, unknown>) => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-4 shadow-sm border">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">通用卡信息</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-600">ID</label>
            <div className="text-gray-800">{card.id as string}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">名称</label>
            <div className="text-gray-800">{card.name as string}</div>
          </div>
        </div>
        <div className="mt-4">
          <label className="text-sm font-medium text-gray-600">描述</label>
          <div className="text-gray-800 mt-1">{card.description as string}</div>
        </div>
      </div>
    </div>
  );

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
            <label className="text-sm font-medium text-gray-600">标签</label>
            <div className="text-gray-800">{Array.isArray(character.tags) ? character.tags.join(', ') : ''}</div>
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
            <label className="text-sm font-medium text-gray-600">事件ID</label>
            <div className="text-gray-800">{event.eventId ?? '-'}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">权重</label>
            <div className="text-gray-800">{event.weight ?? '-'}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">对话</label>
            <div className="text-gray-800">{event.dialogue ?? '-'}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">激活条件</label>
            <div className="text-gray-800 text-xs">{event.activationConditions ? JSON.stringify(event.activationConditions) : '-'}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">移除条件</label>
            <div className="text-gray-800 text-xs">{event.removalConditions ? JSON.stringify(event.removalConditions) : '-'}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">触发条件</label>
            <div className="text-gray-800 text-xs">{event.triggerConditions ? JSON.stringify(event.triggerConditions) : '-'}</div>
          </div>
        </div>
      </div>

      {/* 选择分支 */}
      <div className="bg-white rounded-lg p-4 shadow-sm border">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">选择分支</h3>
        <div className="space-y-4">
          {Array.isArray(event.options) && event.options.length > 0 ? (
            event.options.map((option, index) => (
              <div key={option.optionId} className="border rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <span className="font-medium text-gray-800">选项 {index + 1}</span>
                  <span className="text-xs text-gray-500">ID: {option.optionId}</span>
                </div>
                <div className="text-gray-700 mb-3">{option.reply}</div>
                {/* 效果数组展示 */}
                {Array.isArray(option.effects) && option.effects.length > 0 ? (
                  <div className="space-y-2">
                    {option.effects.map((eff, effIdx) => (
                      <div key={effIdx} className="pl-2 border-l-2 border-blue-200">
                        <div className="mb-1">
                          <span className="text-sm font-medium text-gray-600">目标:</span>
                          <span className="ml-2 text-xs text-gray-700">{eff.target === 'player' ? '玩家（皇帝）' : '当前角色'}</span>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-600">属性变动:</span>
                          <span className="ml-2 text-xs text-gray-700">{getAttributeLabel(eff.attribute)}: {eff.offset > 0 ? '+' : ''}{eff.offset}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-400">无属性变动</div>
                )}
              </div>
            ))
          ) : (
            <div className="text-gray-400">无分支</div>
          )}
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

  // 支持通用卡下事件节点的预览
let mainType = selectedFile.type;
const mainData = selectedFile.data;
  // 日志：当前选中类型和数据
  console.log('[DataPreview] selectedFile:', selectedFile);
  // 优先判断 type 字段
  if (selectedFile.type === 'event') {
    console.log('[DataPreview] treat as event (by type)', mainData);
    mainType = 'event';
  } else if (
    selectedFile.type === 'commoncard' &&
    mainData && typeof mainData === 'object' &&
    ('title' in mainData) &&
    ('choices' in mainData)
  ) {
    console.log('[DataPreview] treat as event (by structure)', mainData);
    mainType = 'event';
  } else if (selectedFile.type === 'commoncard') {
    console.log('[DataPreview] treat as commoncard:', mainData);
    mainType = 'commoncard';
  }
  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center space-x-3">
          <span className="text-xl">
            {mainType === 'character' ? '👤' : mainType === 'event' ? '📋' : '🃏'}
          </span>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">{selectedFile.name}</h2>
            <p className="text-sm text-gray-600">
              {mainType === 'character'
                ? '角色卡片'
                : mainType === 'event'
                ? '事件卡片'
                : '通用卡'}
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
          mainType === 'character'
            ? (renderCharacterPreview(mainData as CharacterCard))
            : mainType === 'event'
            ? (renderEventPreview(mainData as EventCard))
            : mainType === 'commoncard'
            ? (renderCommonCardPreview(mainData as Record<string, unknown>))
            : null
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

