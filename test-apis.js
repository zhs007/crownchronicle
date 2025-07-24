const http = require('http');

function testAPI(url, description, method = 'GET', postData = null) {
  return new Promise((resolve, reject) => {
    console.log(`测试: ${description}`);
    console.log(`URL: ${url}`);
    console.log(`方法: ${method}`);
    
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (postData && method === 'POST') {
      const data = JSON.stringify(postData);
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log(`✅ 成功: ${description}`);
          console.log(`响应状态: ${res.statusCode}`);
          if (result.data && result.data.activeCharacters) {
            console.log(`角色数量: ${result.data.activeCharacters.length}`);
            console.log(`角色列表: ${result.data.activeCharacters.map(c => c.name).join(', ')}`);
          }
          console.log('---\n');
          resolve(result);
        } catch (error) {
          console.log(`❌ 解析错误: ${error.message}`);
          console.log(`原始响应: ${data}`);
          console.log('---\n');
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`❌ 请求错误: ${error.message}`);
      console.log('---\n');
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      console.log(`❌ 请求超时: ${description}`);
      console.log('---\n');
      req.destroy();
      reject(new Error('Timeout'));
    });
    
    if (postData && method === 'POST') {
      req.write(JSON.stringify(postData));
    }
    
    req.end();
  });
}

async function runTests() {
  console.log('=== API 测试开始 ===\n');
  
  try {
    // 测试 prototype 的游戏初始化 API
    await testAPI('http://localhost:3000/api/game/initialize', 'Prototype 游戏初始化', 'POST', { difficulty: 'normal' });
    
    // 测试 editor 的测试连接 API
    await testAPI('http://localhost:3001/api/test-connection', 'Editor 测试连接');
    
    // 测试 editor 的角色数据 API
    await testAPI('http://localhost:3001/api/data/characters', 'Editor 角色数据');
    
    console.log('=== 所有测试完成 ===');
  } catch (error) {
    console.log('测试过程中出现错误，但会继续执行其他测试');
  }
}

// 等待服务器启动
setTimeout(() => {
  runTests().catch(console.error);
}, 3000);
