import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { CharacterCard, EventCard } from '@/types/game';

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

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <span>--:--:--</span>;
  }

  return <span>{formatTime(timestamp)}</span>;
};

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
      content: '您好！我是《皇冠编年史》内容设计师，精通中国古代历史。�\n\n告诉我您想要什么类型的角色或事件，我会为您推荐具体的历史人物和方案：\n\n- 🏛️ **权臣**：如严嵩、和珅、董卓等\n- ⚔️ **武将**：如白起、韩信、岳飞等  \n- � **后妃**：如窦太后、吕后、慈禧等\n- 📚 **文臣**：如诸葛亮、范仲淹、张居正等\n\n直接说出您的需求即可！',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [useSession, setUseSession] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
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
        body: JSON.stringify({ 
          message: inputValue,
          history: useSession ? undefined : messages, // 会话模式时不传递历史
          sessionId: useSession ? sessionId : undefined,
          useSession: useSession
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }

      // 如果使用会话模式，更新会话ID
      if (useSession && data.sessionId) {
        setSessionId(data.sessionId);
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

  const clearSession = async () => {
    if (useSession && sessionId) {
      try {
        await fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', sessionId })
        });
      } catch (error) {
        console.error('清除会话失败:', error);
      }
    }
    
    // 重置本地状态
    setSessionId(null);
    setMessages([{
      role: 'assistant',
      content: '您好！我是《皇冠编年史》内容设计师，精通中国古代历史。\n\n告诉我您想要什么类型的角色或事件，我会为您推荐具体的历史人物和方案：\n\n- 🏛️ **权臣**：如严嵩、和珅、董卓等\n- ⚔️ **武将**：如白起、韩信、岳飞等  \n- 👑 **后妃**：如窦太后、吕后、慈禧等\n- 📚 **文臣**：如诸葛亮、范仲淹、张居正等\n\n直接说出您的需求即可！',
      timestamp: new Date()
    }]);
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
        <div className="flex items-center space-x-4">
          {/* 会话模式切换 */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">
              <input
                type="checkbox"
                checked={useSession}
                onChange={(e) => {
                  setUseSession(e.target.checked);
                  if (!e.target.checked) {
                    setSessionId(null);
                  }
                }}
                className="mr-1"
              />
              会话缓存
            </label>
            {useSession && sessionId && (
              <>
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  ID: {sessionId.slice(-8)}
                </span>
                <button
                  onClick={clearSession}
                  className="text-xs text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2 py-1 rounded"
                  title="清除会话"
                >
                  清除
                </button>
              </>
            )}
          </div>
          
          {/* 连接状态 */}
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
            placeholder="告诉我您想要什么类型的角色或事件，例如：我想要一个权臣角色、为霍光加个事件..."
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
