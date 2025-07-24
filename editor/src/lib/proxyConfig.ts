import { ProxyAgent } from 'undici';
import { ProxyConfig } from '@/types/editor';

export function getProxyConfig(): ProxyConfig {
  const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
  const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  
  const proxyUrl = httpsProxy || httpProxy;
  
  if (!proxyUrl) {
    return { enabled: false };
  }
  
  try {
    const url = new URL(proxyUrl);
    const config: ProxyConfig = {
      enabled: true,
      url: proxyUrl,
      timeout: parseInt(process.env.GEMINI_REQUEST_TIMEOUT || '30000')
    };
    
    // 如果 URL 中包含认证信息
    if (url.username && url.password) {
      config.auth = {
        username: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password)
      };
    }
    
    return config;
  } catch {
    console.error('Invalid proxy URL:', proxyUrl);
    return { enabled: false };
  }
}

export function createProxyAgent(): ProxyAgent | null {
  const config = getProxyConfig();
  
  if (!config.enabled || !config.url) {
    return null;
  }
  
  return new ProxyAgent({
    uri: config.url,
    requestTls: {
      timeout: config.timeout
    }
  });
}

// 在应用启动时调用
export function setupGlobalProxy(): void {
  const agent = createProxyAgent();
  if (agent) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { setGlobalDispatcher } = require('undici');
    setGlobalDispatcher(agent);
    console.log('✅ Global proxy dispatcher configured');
  } else {
    console.log('ℹ️  No proxy configuration found, using direct connection');
  }
}
