'use client';

import React, { useState } from 'react';
import ChatInterface from '@/components/ChatInterface';
import FileExplorer from '@/components/FileExplorer';
import DataPreview from '@/components/DataPreview';
import { CharacterCard, EventCard } from '@/types/game';

interface FileNode {
  type: 'character' | 'event' | 'folder';
  id: string;
  name: string;
  children?: FileNode[];
  data?: CharacterCard | EventCard;
}

interface SelectedFile {
  type: 'character' | 'event';
  data: CharacterCard | EventCard;
  id: string;
  name: string;
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleFileSelect = (file: FileNode) => {
    if ((file.type === 'character' || file.type === 'event') && file.data) {
      setSelectedFile({
        type: file.type,
        data: file.data,
        id: file.id,
        name: file.name
      });
    }
  };

  const handleCharacterCreated = (character: unknown) => {
    console.log('Character created:', character);
    // 触发文件列表刷新
    setRefreshTrigger(prev => prev + 1);
  };

  const handleEventCreated = (event: unknown) => {
    console.log('Event created:', event);
    // 触发文件列表刷新
    setRefreshTrigger(prev => prev + 1);
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">👑</div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">皇冠编年史 - 内容编辑器</h1>
              <p className="text-sm text-gray-600">基于 AI 的游戏内容创作工具</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - File Explorer */}
        <div className="w-64 flex-shrink-0">
          <FileExplorer 
            key={refreshTrigger}
            onFileSelect={handleFileSelect}
            onRefresh={handleRefresh}
          />
        </div>

        {/* Center - Chat Interface */}
        <div className="flex-1 flex flex-col">
          <ChatInterface
            onCharacterCreated={handleCharacterCreated}
            onEventCreated={handleEventCreated}
          />
        </div>

        {/* Right Sidebar - Data Preview */}
        <div className="w-96 flex-shrink-0 border-l">
          <DataPreview selectedFile={selectedFile || undefined} />
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t px-6 py-2">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            基于 <strong>crownchronicle-core</strong> 包开发，确保与游戏引擎完全兼容
          </div>
          <div className="flex items-center space-x-4">
            <span>支持 Gemini AI</span>
            <span>•</span>
            <span>实时验证</span>
            <span>•</span>
            <span>YAML 导出</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
