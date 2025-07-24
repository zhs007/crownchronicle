const path = require('path');
const fs = require('fs');

// 测试配置管理器
function testConfigManager() {
  try {
    const configPath = path.join(__dirname, 'gameconfig/config.json');
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);
    
    console.log('配置文件加载成功:');
    console.log('- 版本:', Object.keys(config.versions));
    console.log('- 项目:', Object.keys(config.projects));
    
    // 测试路径解析
    const gameconfigDir = path.dirname(configPath);
    const stableVersion = config.versions.stable;
    const stablePath = path.resolve(gameconfigDir, stableVersion.path);
    
    console.log('Stable 版本路径:', stablePath);
    console.log('路径是否存在:', fs.existsSync(stablePath));
    
    // 检查角色目录
    const charactersPath = path.join(stablePath, 'characters');
    if (fs.existsSync(charactersPath)) {
      const characters = fs.readdirSync(charactersPath);
      console.log('可用角色:', characters);
    }
    
    return true;
  } catch (error) {
    console.error('配置管理器测试失败:', error);
    return false;
  }
}

console.log('=== 游戏配置管理器测试 ===');
testConfigManager();
