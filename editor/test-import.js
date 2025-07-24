// 测试导入 crownchronicle-core 模块
try {
  const core = require('crownchronicle-core');
  console.log('Available exports:', Object.keys(core));
  console.log('FileSystemDataProvider:', typeof core.FileSystemDataProvider);
  console.log('ConfigValidator:', typeof core.ConfigValidator);
  console.log('GAME_CONSTANTS:', typeof core.GAME_CONSTANTS);
} catch (error) {
  console.error('Import error:', error);
}
