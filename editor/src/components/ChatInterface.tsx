import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { CharacterCard } from '@/types/game';

// Utility function for consistent time formatting
const formatTime = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

// Client-only timestamp component to avoid hydration issues
const ClientTimestamp: React.FC<{ timestamp: Date }> = ({ timestamp }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return <span>--:--:--</span>;
  return <span>{formatTime(timestamp)}</span>;
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'text' | 'error';
}

interface ChatInterfaceProps {
  onCharacterCreated?: (character: CharacterCard) => void;
}

export default function ChatInterface({ onCharacterCreated }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '您好！我是《皇冠编年史》的史料编辑。请告诉我您的工作目标，例如：“我们来创建一个新角色”，或者“为霍光添加一个事件”。',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // 初始连接检查可以保留，用于UI显示
    checkConnection();
  }, []);

  const checkConnection = async () => {
    // 这个接口可以保留，或者改造成一个简单的 health check
    try {
      // 假设有一个 /api/health 接口
      const response = await fetch('/api/health'); 
      setConnectionStatus(response.ok ? 'connected' : 'error');
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
        body: JSON.stringify({ 
          message: inputValue,
          sessionId: sessionId, // 始终传递 sessionId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }

      // 更新会话ID
      if (data.sessionId) {
        setSessionId(data.sessionId);
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.reply, // 使用新的响应字段
        timestamp: new Date(),
        type: 'text',
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // 可以在这里检查 data.reply 中是否包含特定关键词来触发 onCharacterCreated 等回调
      // 这是一个简化的实现，更稳健的方案是让后端在完成操作后返回一个明确的事件信号
      if (data.reply && (data.reply.includes('创建成功') || data.reply.includes('已保存'))) {
        onCharacterCreated?.({} as CharacterCard); // 触发刷新
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

  const clearSession = () => {
    setSessionId(null);
    setMessages([
      {
        role: 'assistant',
        content: '您好！我是《皇冠编年史》的史料编辑。新的会话已经开始，请告诉我您的工作目标。',
        timestamp: new Date()
      }
    ]);
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
        <div className="flex items-center space-x-4">
          {/* 会话信息 */}
          {sessionId && (
            <>
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded" title={`会话ID: ${sessionId}`}>
                会话已连接
              </span>
              <button
                onClick={clearSession}
                className="text-xs text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2 py-1 rounded"
                title="清除会话并重置"
              >
                重置对话
              </button>
            </>
          )}
          
          {/* 连接状态 */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 
              connectionStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
            }`}></div>
            <span className="text-sm text-gray-600">
              {connectionStatus === 'connected' ? '服务正常' : 
               connectionStatus === 'error' ? '服务异常' : '检查中...'}
            </span>
          </div>
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
                      return !match ? (
                        <code className={className} {...props}>{children}</code>
                      ) : (
                        <SyntaxHighlighter
                          style={tomorrow}
                          language={match[1]}
                          PreTag="div"
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      );
                    }
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
              <div className="text-xs opacity-70 mt-2">
                <ClientTimestamp timestamp={message.timestamp} />
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
            placeholder="例如：我们来创建一个新角色，或者为霍光添加一个事件..."
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