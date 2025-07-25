import { NextRequest, NextResponse } from 'next/server';
import { GeminiClient } from '@/lib/gemini';
import { EditorDataManager } from '@/lib/dataManager';
import { sessionManager } from '@/lib/sessionManager';

const geminiClient = new GeminiClient(process.env.GEMINI_API_KEY || '');
const dataManager = new EditorDataManager();

export async function POST(request: NextRequest) {
  try {
    const { message, history, sessionId, useSession = false } = await request.json();
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // 根据是否使用会话模式，获取对话历史
    let conversationHistory: Array<{role: string, content: string, timestamp: Date}> = [];
    let currentSessionId = sessionId;

    if (useSession) {
      // 会话模式：使用后端缓存
      if (!currentSessionId || !sessionManager.hasSession(currentSessionId)) {
        // 创建新会话
        currentSessionId = sessionManager.createSession();
      }
      
      // 获取会话历史
      conversationHistory = sessionManager.getSessionHistory(currentSessionId)
        .map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        }));
      
      // 添加用户消息到会话
      sessionManager.addMessage(currentSessionId, {
        role: 'user',
        content: message,
        timestamp: new Date()
      });
    } else {
      // 前端传递模式：使用传递的历史记录
      conversationHistory = history || [];
    }
    
    // 获取当前游戏数据上下文
    const characters = await dataManager.getAllCharacters();
    let eventCount = 0;
    
    for (const character of characters) {
      const events = await dataManager.getCharacterEvents(character.id);
      eventCount += events.length;
    }
    
    const context = {
      characters: characters.map(c => ({ name: c.name, id: c.id })),
      eventCount,
      factions: ['皇族', '文官集团', '武将集团', '宦官集团', '后宫集团'] // TODO: 从数据中提取
    };
    
    await geminiClient.initialize();
    const response = await geminiClient.chatWithContext(message, context, conversationHistory);
    
    // 如果使用会话模式，保存AI回复
    if (useSession && currentSessionId) {
      const responseContent = response.type === 'text' 
        ? (response.content || '无回复内容')
        : `执行了 ${response.results?.length || 0} 个操作`;
        
      sessionManager.addMessage(currentSessionId, {
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        type: response.type,
        results: response.results
      });
    }
    
    // 返回响应，包含会话ID
    return NextResponse.json({
      ...response,
      sessionId: useSession ? currentSessionId : undefined,
      sessionStats: useSession ? sessionManager.getStats() : undefined
    });
  } catch (error: unknown) {
    console.error('Gemini API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
