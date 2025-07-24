import { NextRequest, NextResponse } from 'next/server';
import { GeminiClient } from '@/lib/gemini';
import { EditorDataManager } from '@/lib/dataManager';

const geminiClient = new GeminiClient(process.env.GEMINI_API_KEY || '');
const dataManager = new EditorDataManager();

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
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
    const response = await geminiClient.chatWithContext(message, context);
    
    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('Gemini API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
