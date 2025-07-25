import { NextRequest, NextResponse } from 'next/server';
import { sessionManager } from '@/lib/sessionManager';

export async function POST(request: NextRequest) {
  try {
    const { action, sessionId } = await request.json();
    
    switch (action) {
      case 'create':
        const newSessionId = sessionManager.createSession();
        return NextResponse.json({ sessionId: newSessionId });
        
      case 'delete':
        if (!sessionId) {
          return NextResponse.json(
            { error: 'Session ID is required for delete action' },
            { status: 400 }
          );
        }
        const deleted = sessionManager.deleteSession(sessionId);
        return NextResponse.json({ success: deleted });
        
      case 'get':
        if (!sessionId) {
          return NextResponse.json(
            { error: 'Session ID is required for get action' },
            { status: 400 }
          );
        }
        const history = sessionManager.getSessionHistory(sessionId);
        return NextResponse.json({ history });
        
      case 'stats':
        const stats = sessionManager.getStats();
        return NextResponse.json(stats);
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    console.error('Session API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
