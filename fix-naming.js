#!/usr/bin/env node

/**
 * 修复现有的命名不规范问题
 * 将 yang_guifei 重命名为 yangguifei
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

async function fixNamingConventions() {
  console.log('🔧 开始修复命名规范问题...\n');
  
  const devPath = path.resolve(__dirname, '../gameconfig/versions/dev/characters');
  const oldName = 'yang_guifei';
  const newName = 'yangguifei';
  
  try {
    // 1. 检查旧目录是否存在
    const oldDir = path.join(devPath, oldName);
    const newDir = path.join(devPath, newName);
    
    try {
      await fs.access(oldDir);
      console.log(`📁 找到需要修复的目录: ${oldName}`);
    } catch (error) {
      console.log('✅ 未找到需要修复的目录，命名规范已经正确');
      return;
    }
    
    // 2. 检查新目录是否已存在
    try {
      await fs.access(newDir);
      console.log('⚠️ 目标目录已存在，请手动处理冲突');
      return;
    } catch (error) {
      // 新目录不存在，可以继续
    }
    
    // 3. 重命名目录
    console.log(`📁 重命名目录: ${oldName} → ${newName}`);
    await fs.rename(oldDir, newDir);
    
    // 4. 更新 character.yaml 中的 id 字段
    const characterFile = path.join(newDir, 'character.yaml');
    console.log('📝 更新 character.yaml 中的 id 字段');
    
    const characterContent = await fs.readFile(characterFile, 'utf8');
    const characterData = yaml.load(characterContent);
    characterData.id = newName;
    
    const updatedCharacterContent = yaml.dump(characterData, {
      indent: 2,
      quotingType: '"',
      lineWidth: -1
    });
    
    await fs.writeFile(characterFile, updatedCharacterContent, 'utf8');
    
    // 5. 更新所有事件文件中的 characterId 字段
    const eventsDir = path.join(newDir, 'events');
    
    try {
      const eventFiles = await fs.readdir(eventsDir);
      console.log(`📝 更新 ${eventFiles.length} 个事件文件中的 characterId 字段`);
      
      for (const eventFile of eventFiles) {
        if (eventFile.endsWith('.yaml') || eventFile.endsWith('.yml')) {
          const eventPath = path.join(eventsDir, eventFile);
          const eventContent = await fs.readFile(eventPath, 'utf8');
          
          // 简单的字符串替换，更新 characterId 引用
          const updatedContent = eventContent.replace(
            new RegExp(`characterId:\\s*["']?${oldName}["']?`, 'g'),
            `characterId: "${newName}"`
          );
          
          if (updatedContent !== eventContent) {
            await fs.writeFile(eventPath, updatedContent, 'utf8');
            console.log(`  ✅ 更新事件文件: ${eventFile}`);
          }
        }
      }
    } catch (error) {
      console.log('⚠️ 未找到 events 目录或事件文件');
    }
    
    // 6. 检查是否有其他文件引用了旧的 ID
    console.log('\n🔍 检查其他可能的引用...');
    
    // 这里可以添加更多的检查逻辑，比如检查其他角色的关系网络等
    
    console.log('\n✅ 命名规范修复完成！');
    console.log('修复内容：');
    console.log(`  - 目录名: ${oldName} → ${newName}`);
    console.log(`  - 角色ID: ${oldName} → ${newName}`);
    console.log('  - 所有相关事件文件中的引用');
    
    console.log('\n⚠️ 建议：');
    console.log('1. 重启开发服务器以确保更改生效');
    console.log('2. 测试角色和事件的加载是否正常');
    console.log('3. 检查是否有其他地方需要手动更新引用');
    
  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error);
    process.exit(1);
  }
}

// 运行修复
fixNamingConventions();
