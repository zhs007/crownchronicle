import { NextResponse } from 'next/server';
import { GeminiClient, workflowSessionManager } from '@/lib/gemini';
import { WorkflowContext } from '@/types/workflow';
import { GeminiFunctionResult } from '@/types/gemini';

// 初始化 Gemini 客户端
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('Missing GEMINI_API_KEY environment variable');
}
const geminiClient = new GeminiClient(apiKey);
geminiClient.initialize();


export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, sessionId: incomingSessionId } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    let sessionId = incomingSessionId;
    let context: WorkflowContext;

    // 如果没有会话ID，创建一个新会话
    if (!sessionId) {
      const newSession = workflowSessionManager.createSession();
      sessionId = newSession.sessionId;
      context = newSession.context;
    } else {
      const existingContext = workflowSessionManager.getSession(sessionId);
      if (!existingContext) {
        // 如果会话ID无效，也创建一个新会话
        const newSession = workflowSessionManager.createSession();
        sessionId = newSession.sessionId;
        context = newSession.context;
      } else {
        context = existingContext;
      }
    }

    // 调用 GeminiClient 的核心 chat 方法
    const { responseForUser, newContext, functionCall } = await geminiClient.chat(message, context);

    // 如果 AI 决定调用函数
    if (functionCall) {
      // 1. 执行函数
      const functionResult: GeminiFunctionResult = await geminiClient.executeFunctionCall(functionCall);

      // 2. 将函数执行结果作为新的输入，再次调用 AI，让 AI 决定下一步说什么
      //    我们构造一个系统消息来告知 AI 函数调用的结果
      const functionResultMessage = `工具调用结果: ${JSON.stringify(functionResult)}`;
      
      // 使用上一个步骤更新的上下文 `newContext`
      const finalResult = await geminiClient.chat(functionResultMessage, newContext);
      
      // 更新 responseForUser 和 newContext
      const finalResponseForUser = finalResult.responseForUser;
      const finalNewContext = finalResult.newContext;

      // 更新会话管理器中的上下文
      workflowSessionManager.updateSession(sessionId, finalNewContext);

      // 返回给前端
      return NextResponse.json({
        reply: finalResponseForUser,
        sessionId: sessionId,
      });
    }

    // 更新会话管理器中的上下文
    workflowSessionManager.updateSession(sessionId, newContext);

    // 返回给前端
    return NextResponse.json({
      reply: responseForUser,
      sessionId: sessionId,
    });
  } catch (error: unknown) {
    console.error('API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}