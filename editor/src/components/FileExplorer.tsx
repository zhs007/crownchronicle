'use client';

import React, { useState, useEffect } from 'react';
import { CharacterCard, EventCard } from '@/types/game';

interface FileNode {
  type: 'character' | 'event' | 'folder';
  id: string;
  name: string;
  children?: FileNode[];
  data?: CharacterCard | EventCard;
}

interface FileExplorerProps {
  onFileSelect?: (file: FileNode) => void;
  onRefresh?: () => void;
}

export default function FileExplorer({ onFileSelect, onRefresh }: FileExplorerProps) {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFileTree();
  }, []);

  const loadFileTree = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/characters');
      const characters: CharacterCard[] = await response.json();

      const tree: FileNode[] = [];

      for (const character of characters) {
        const characterNode: FileNode = {
          type: 'character',
          id: character.id,
          name: character.displayName || character.name,
          data: character,
          children: []
        };

        // 加载角色的事件
        try {
          const eventsResponse = await fetch(`/api/characters/${character.id}/events`);
          if (eventsResponse.ok) {
            const events: EventCard[] = await eventsResponse.json();
            characterNode.children = events.map(event => ({
              type: 'event' as const,
              id: `${character.id}/${event.id}`,
              name: event.title,
              data: event
            }));
          }
        } catch (error) {
          console.warn(`Failed to load events for character ${character.id}:`, error);
        }

        tree.push(characterNode);
      }

      setFileTree(tree);
    } catch (error) {
      console.error('Failed to load file tree:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const selectFile = (file: FileNode) => {
    setSelectedFile(file.id);
    onFileSelect?.(file);
  };

  const renderNode = (node: FileNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedFile === node.id;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center py-1 px-2 cursor-pointer hover:bg-gray-100 ${
            isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : ''
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => selectFile(node)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
              className="mr-1 w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-700"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          
          <div className="flex items-center space-x-2 flex-1">
            <span className="text-lg">
              {node.type === 'character' ? '👤' : node.type === 'event' ? '📋' : '📁'}
            </span>
            <span className={`text-sm ${isSelected ? 'font-medium text-blue-700' : 'text-gray-700'}`}>
              {node.name}
            </span>
            {node.type === 'character' && node.data && (
              <span className="text-xs px-1 py-0.5 bg-gray-200 text-gray-600 rounded">
                {(node.data as CharacterCard).role}
              </span>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {node.children!.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const handleRefresh = () => {
    loadFileTree();
    onRefresh?.();
  };

  return (
    <div className="h-full flex flex-col bg-white border-r">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <h3 className="text-sm font-medium text-gray-700">项目文件</h3>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
          title="刷新"
        >
          <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">
            <div className="animate-pulse">加载中...</div>
          </div>
        ) : fileTree.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <div className="text-4xl mb-2">📂</div>
            <div className="text-sm">暂无文件</div>
            <div className="text-xs text-gray-400 mt-1">
              使用 AI 助手创建角色和事件
            </div>
          </div>
        ) : (
          <div className="py-2">
            {fileTree.map(node => renderNode(node))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="p-3 border-t bg-gray-50 text-xs text-gray-600">
        <div>角色: {fileTree.length}</div>
        <div>事件: {fileTree.reduce((sum, char) => sum + (char.children?.length || 0), 0)}</div>
      </div>
    </div>
  );
}
