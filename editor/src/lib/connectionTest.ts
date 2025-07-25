import { request } from 'undici';
import { getProxyConfig, setupGlobalProxy } from './proxyConfig';
import { ConnectionTestResult } from '@/types/editor';

// 确保全局代理已设置
setupGlobalProxy();

export async function testGeminiConnection(): Promise<ConnectionTestResult> {
  const testResults: ConnectionTestResult = {
    proxy: false,
    geminiApi: false,
    details: {}
  };
  
  // 测试代理连接
  try {
    const proxyConfig = getProxyConfig();
    if (proxyConfig.enabled) {
      testResults.proxy = true;
      testResults.details.proxyUrl = proxyConfig.url;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown proxy error';
    testResults.details.proxyError = errorMessage;
  }
  
  // 测试 Gemini API 连接
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      testResults.details.geminiError = 'GEMINI_API_KEY not found in environment variables';
      return testResults;
    }

    console.log('Testing Gemini API connection with proxy...');
    const response = await request('https://generativelanguage.googleapis.com/v1/models', {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey
      }
    });
    
    console.log('Gemini API response status:', response.statusCode);
    
    if (response.statusCode === 200) {
      testResults.geminiApi = true;
      console.log('✅ Gemini API connection successful');
    } else {
      testResults.details.geminiError = `HTTP ${response.statusCode}`;
      console.log('❌ Gemini API connection failed with status:', response.statusCode);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown Gemini API error';
    testResults.details.geminiError = errorMessage;
    console.log('❌ Gemini API connection error:', errorMessage);
  }
  
  return testResults;
}
