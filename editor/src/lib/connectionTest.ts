import { request } from 'undici';
import { getProxyConfig } from './proxyConfig';
import { ConnectionTestResult } from '@/types/editor';

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
    const response = await request('https://generativelanguage.googleapis.com/v1/models', {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': process.env.GEMINI_API_KEY || ''
      }
    });
    
    if (response.statusCode === 200) {
      testResults.geminiApi = true;
    } else {
      testResults.details.geminiError = `HTTP ${response.statusCode}`;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown Gemini API error';
    testResults.details.geminiError = errorMessage;
  }
  
  return testResults;
}
