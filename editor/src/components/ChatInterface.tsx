'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { CharacterCard, EventCard } from '@/types/game';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'text' | 'function_calls' | 'error';
  results?: unknown[];
}

interface ApiResult {
  type: 'success' | 'error';
  action?: 'create_character' | 'create_event';
  data?: CharacterCard | EventCard;
  message?: string;
  function?: string;
  error?: string;
}

interface ApiResponse {
  type?: 'text' | 'function_calls' | 'error';
  content?: string;
  results?: ApiResult[];
  error?: string;
}

interface ChatInterfaceProps {
  onCharacterCreated?: (character: CharacterCard) => void;
  onEventCreated?: (event: EventCard) => void;
}

export default function ChatInterface({ onCharacterCreated, onEventCreated }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '您好！我是《皇冠编年史》游戏的内容编辑助手。我可以帮助您创建和修改角色卡片、事件卡片。\n\n您可以：\n- 创建新的角色：例如"创建一个文臣角色张仪"\n- 设计事件：例如"为霍光添加一个军事训练事件"\n- 修改现有内容：例如"调整武则天的权力值"\n- 验证数据完整性\n\n请告诉我您想要做什么？',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const response = await fetch('/api/test-connection');
      const result = await response.json();
      setConnectionStatus(result.geminiApi ? 'connected' : 'error');
    } catch {
      setConnectionStatus('error');
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: inputValue })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: formatGeminiResponse(data),
        timestamp: new Date(),
        type: data.type,
        results: data.results
      };

      setMessages(prev => [...prev, assistantMessage]);

      // 处理函数调用结果
      if (data.type === 'function_calls' && data.results && data.results.length > 0) {
        data.results.forEach((result: ApiResult) => {
          if (result.type === 'success') {
            if (result.action === 'create_character' && onCharacterCreated && result.data) {
              onCharacterCreated(result.data as CharacterCard);
            } else if (result.action === 'create_event' && onEventCreated && result.data) {
              onEventCreated(result.data as EventCard);
            }
          }
        });
      }

    } catch (error: unknown) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `错误：${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date(),
        type: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatGeminiResponse = (data: ApiResponse): string => {
    switch (data.type) {
      case 'text':
        return data.content || '';
      
      case 'function_calls':
        if (!data.results || data.results.length === 0) {
          return '执行了函数调用，但没有返回结果。';
        }
        
        return data.results.map((result: ApiResult) => {
          if (result.type === 'success') {
            return `✅ ${result.message || '成功'}`;
          } else {
            return `❌ 执行 ${result.function || '函数'} 时出错：${result.error || '未知错误'}`;
          }
        }).join('\n\n');
      
      case 'error':
        return `❌ 错误：${data.error || '未知错误'}`;
      
      default:
        return '收到了未知类型的响应。';
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-800">AI 编辑助手</h2>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' : 
            connectionStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
          }`}></div>
          <span className="text-sm text-gray-600">
            {connectionStatus === 'connected' ? '已连接' : 
             connectionStatus === 'error' ? '连接失败' : '检查中...'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] rounded-lg p-3 ${
              message.role === 'user' 
                ? 'bg-blue-500 text-white' 
                : message.type === 'error'
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-gray-100 text-gray-800'
            }`}>
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown
                  components={{
                    code({ className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      const inline = !match;
                      return !inline ? (
                        <SyntaxHighlighter
                          style={tomorrow}
                          language={match[1]}
                          PreTag="div"
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    }
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
              <div className="text-xs opacity-70 mt-2">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-600">AI 正在思考...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex space-x-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入您的需求，例如：创建一个新的文臣角色..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !inputValue.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            发送
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          提示：按 Enter 发送，Shift+Enter 换行
        </div>
      </div>
    </div>
  );
}
