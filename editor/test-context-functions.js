#!/usr/bin/env node

/**
 * 测试新的上下文管理 Function Call 功能
 * 验证 AI 能否正确获取角色信息并添加事件
 */

const { GeminiClient } = require('./src/lib/gemini.ts');
const path = require('path');

async function testContextAwareFunctionCalls() {
  console.log('🧪 测试上下文感知的 Function Call 功能...\n');
  
  try {
    const geminiClient = new GeminiClient(process.env.GEMINI_API_KEY);
    await geminiClient.initialize();
    
    const mockContext = {
      characters: [
        { name: '杨贵妃', id: 'yangguifei' },
        { name: '武则天', id: 'wuzetian' }
      ],
      eventCount: 5,
      factions: ['皇族', '后宫集团', '文官集团']
    };
    
    // 测试1: 列出所有角色
    console.log('📋 测试1: 列出所有角色');
    const listResponse = await geminiClient.chatWithContext('列出当前所有角色', mockContext);
    console.log('响应:', listResponse);
    console.log('');
    
    // 测试2: 获取特定角色信息
    console.log('👤 测试2: 获取杨贵妃的详细信息');
    const infoResponse = await geminiClient.chatWithContext('获取杨贵妃的详细信息', mockContext);
    console.log('响应:', infoResponse);
    console.log('');
    
    // 测试3: 为角色添加事件（应该先获取角色信息再创建）
    console.log('📝 测试3: 为杨贵妃添加一个关于宫廷音乐的事件');
    const eventResponse = await geminiClient.chatWithContext(
      '为杨贵妃添加一个关于在宫中表演音乐舞蹈的事件，要有皇帝观赏和其他妃嫔的反应',
      mockContext
    );
    console.log('响应:', eventResponse);
    console.log('');
    
    console.log('🎉 上下文感知功能测试完成！');
    console.log('现在 AI 应该能够：');
    console.log('1. 在添加事件前先获取角色信息');
    console.log('2. 确保 characterId 正确匹配');
    console.log('3. 基于角色背景创建合适的事件内容');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
testContextAwareFunctionCalls();
