const fs = require('fs');
const path = require('path');

console.log('=== Crown Chronicle 配置管理系统验证 ===\n');

// 1. 验证目录结构
console.log('1. 目录结构验证:');
const expectedDirs = [
  'gameconfig',
  'gameconfig/versions',
  'gameconfig/versions/dev',
  'gameconfig/versions/stable', 
  'gameconfig/versions/release',
  'gameconfig/versions/dev/characters',
  'gameconfig/versions/stable/characters'
];

expectedDirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  const exists = fs.existsSync(fullPath);
  console.log(`  ${exists ? '✅' : '❌'} ${dir}`);
});

// 2. 验证配置文件
console.log('\n2. 配置文件验证:');
try {
  const configPath = path.join(__dirname, 'gameconfig/config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  console.log('  ✅ config.json 格式正確');
  console.log(`  📁 版本数量: ${Object.keys(config.versions).length}`);
  console.log(`  🎯 项目数量: ${Object.keys(config.projects).length}`);
  
  // 验证路径存在性
  Object.entries(config.versions).forEach(([name, versionConfig]) => {
    if (versionConfig.active) {
      const versionPath = path.resolve(__dirname, 'gameconfig', versionConfig.path);
      const exists = fs.existsSync(versionPath);
      console.log(`  ${exists ? '✅' : '❌'} 版本 ${name}: ${versionPath}`);
    }
  });
  
} catch (error) {
  console.log(`  ❌ 配置文件错误: ${error.message}`);
}

// 3. 验证数据内容
console.log('\n3. 数据内容验证:');
try {
  const stablePath = path.join(__dirname, 'gameconfig/versions/stable/characters');
  const devPath = path.join(__dirname, 'gameconfig/versions/dev/characters');
  
  if (fs.existsSync(stablePath)) {
    const stableChars = fs.readdirSync(stablePath);
    console.log(`  ✅ Stable 版本角色 (${stableChars.length}): ${stableChars.join(', ')}`);
  }
  
  if (fs.existsSync(devPath)) {
    const devChars = fs.readdirSync(devPath);
    console.log(`  ✅ Dev 版本角色 (${devChars.length}): ${devChars.join(', ')}`);
  }
  
} catch (error) {
  console.log(`  ❌ 数据内容验证错误: ${error.message}`);
}

// 4. 验证旧目录已清理
console.log('\n4. 清理验证:');
const oldDirs = [
  'prototype/src/data',
  'editor/src/data'
];

oldDirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  const exists = fs.existsSync(fullPath);
  console.log(`  ${exists ? '❌ 仍存在' : '✅ 已删除'} ${dir}`);
});

// 5. 工具类验证
console.log('\n5. 工具类验证:');
const toolFiles = [
  'gameconfig/ConfigManager.ts',
  'prototype/src/lib/GameConfigHelper.js',
  'editor/src/lib/EditorConfigHelper.js'
];

toolFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  const exists = fs.existsSync(fullPath);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
});

console.log('\n=== 验证完成 ===');
console.log('\n📋 后续步骤:');
console.log('1. 可以通过修改 gameconfig/config.json 来管理版本');
console.log('2. 要添加新版本，在 gameconfig/versions/ 下创建新目录');
console.log('3. 要切换项目使用的版本，修改配置文件中的 defaultVersion');
console.log('4. 确保在生产环境中激活 release 版本');
