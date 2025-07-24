const fs = require('fs');
const path = require('path');

// 简单的配置管理测试
const configPath = path.join(__dirname, '../gameconfig/config.json');

try {
  console.log('Testing config path:', configPath);
  const configExists = fs.existsSync(configPath);
  console.log('Config file exists:', configExists);
  
  if (configExists) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('Config loaded successfully');
    console.log('Available versions:', Object.keys(config.versions));
    
    // Test prototype config path
    const stablePath = path.resolve(path.dirname(configPath), config.versions.stable.path);
    console.log('Prototype data path:', stablePath);
    console.log('Path exists:', fs.existsSync(stablePath));
    
    // Test editor config path  
    const devPath = path.resolve(path.dirname(configPath), config.versions.dev.path);
    console.log('Editor data path:', devPath);
    console.log('Path exists:', fs.existsSync(devPath));
  }
} catch (error) {
  console.error('Test failed:', error.message);
}
