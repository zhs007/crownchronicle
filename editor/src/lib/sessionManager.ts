/**
 * 会话管理器 - 支持前端传递和后端缓存两种模式
 */

export interface SessionMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: string;
  results?: any[];
}

export interface ChatSession {
  id: string;
  messages: SessionMessage[];
  createdAt: Date;
  updatedAt: Date;
  userId?: string; // 未来支持用户系统时使用
}

export class SessionManager {
  private sessions = new Map<string, ChatSession>();
  private readonly MAX_SESSIONS = 100; // 最大会话数量
  private readonly MAX_MESSAGES_PER_SESSION = 50; // 每个会话最大消息数
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24小时过期

  /**
   * 创建新会话
   */
  createSession(userId?: string): string {
    const sessionId = this.generateSessionId();
    const session: ChatSession = {
      id: sessionId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      userId
    };
    
    this.sessions.set(sessionId, session);
    this.cleanupOldSessions();
    
    return sessionId;
  }

  /**
   * 添加消息到会话
   */
  addMessage(sessionId: string, message: SessionMessage): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    // 限制消息数量，移除最旧的消息
    if (session.messages.length >= this.MAX_MESSAGES_PER_SESSION) {
      session.messages = session.messages.slice(-this.MAX_MESSAGES_PER_SESSION + 1);
    }

    session.messages.push(message);
    session.updatedAt = new Date();
    
    return true;
  }

  /**
   * 获取会话历史
   */
  getSessionHistory(sessionId: string): SessionMessage[] {
    const session = this.sessions.get(sessionId);
    return session?.messages || [];
  }

  /**
   * 检查会话是否存在
   */
  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * 删除会话
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * 清理过期会话
   */
  private cleanupOldSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.updatedAt.getTime() > this.SESSION_TIMEOUT) {
        expiredSessions.push(sessionId);
      }
    }

    expiredSessions.forEach(sessionId => {
      this.sessions.delete(sessionId);
    });

    // 如果会话数量过多，删除最旧的会话
    if (this.sessions.size > this.MAX_SESSIONS) {
      const sortedSessions = Array.from(this.sessions.entries())
        .sort(([, a], [, b]) => a.updatedAt.getTime() - b.updatedAt.getTime());
      
      const sessionsToRemove = sortedSessions.slice(0, this.sessions.size - this.MAX_SESSIONS);
      sessionsToRemove.forEach(([sessionId]) => {
        this.sessions.delete(sessionId);
      });
    }
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取会话统计信息
   */
  getStats(): { totalSessions: number; totalMessages: number } {
    let totalMessages = 0;
    for (const session of this.sessions.values()) {
      totalMessages += session.messages.length;
    }
    
    return {
      totalSessions: this.sessions.size,
      totalMessages
    };
  }
}

// 单例实例
export const sessionManager = new SessionManager();
