#!/usr/bin/env node

/**
 * 修复事件文件的命名规范
 * 1. 移除 event_ 前缀
 * 2. 统一使用角色ID而不是yangyuhuan
 * 3. 更新文件内容中的ID
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

async function fixEventNaming() {
  console.log('🔧 开始修复事件文件命名规范...\n');
  
  const charactersPath = path.resolve(__dirname, '../gameconfig/versions/dev/characters');
  
  try {
    const characters = await fs.readdir(charactersPath);
    
    for (const characterDir of characters) {
      const eventsPath = path.join(charactersPath, characterDir, 'events');
      
      try {
        await fs.access(eventsPath);
        const eventFiles = await fs.readdir(eventsPath);
        
        console.log(`📁 检查角色: ${characterDir}`);
        
        for (const eventFile of eventFiles) {
          if (eventFile.endsWith('.yaml') || eventFile.endsWith('.yml')) {
            const oldFilePath = path.join(eventsPath, eventFile);
            
            // 检查是否需要重命名文件
            let newFileName = eventFile;
            let needsRename = false;
            
            // 移除 event_ 前缀
            if (eventFile.startsWith('event_')) {
              newFileName = eventFile.replace(/^event_/, '');
              needsRename = true;
            }
            
            // 修复角色ID不一致问题（yangyuhuan -> yangguifei）
            if (newFileName.includes('yangyuhuan')) {
              newFileName = newFileName.replace(/yangyuhuan/g, 'yangguifei');
              needsRename = true;
            }
            
            // 确保事件ID格式为 角色ID_序号
            const idPattern = /^([a-z]+)_(\d{3})\.yaml$/;
            if (!idPattern.test(newFileName)) {
              // 尝试提取序号
              const numberMatch = newFileName.match(/(\d{3})/);
              if (numberMatch) {
                newFileName = `${characterDir}_${numberMatch[1]}.yaml`;
                needsRename = true;
              }
            }
            
            const newFilePath = path.join(eventsPath, newFileName);
            
            // 读取并更新文件内容
            const fileContent = await fs.readFile(oldFilePath, 'utf8');
            let eventData = yaml.load(fileContent);
            let contentChanged = false;
            
            // 更新事件ID
            const expectedId = newFileName.replace('.yaml', '');
            if (eventData.id !== expectedId) {
              console.log(`  📝 更新事件ID: ${eventData.id} -> ${expectedId}`);
              eventData.id = expectedId;
              contentChanged = true;
            }
            
            // 更新选项ID中的引用
            if (eventData.choices && Array.isArray(eventData.choices)) {
              eventData.choices.forEach((choice, index) => {
                if (choice.id) {
                  const expectedChoiceId = `choice_${expectedId}_${String.fromCharCode(65 + index)}`;
                  if (choice.id !== expectedChoiceId) {
                    console.log(`  📝 更新选项ID: ${choice.id} -> ${expectedChoiceId}`);
                    choice.id = expectedChoiceId;
                    contentChanged = true;
                  }
                }
              });
            }
            
            // 写入更新的内容
            if (contentChanged || needsRename) {
              const updatedContent = yaml.dump(eventData, {
                indent: 2,
                quotingType: '"',
                lineWidth: -1
              });
              
              await fs.writeFile(newFilePath, updatedContent, 'utf8');
              
              // 如果文件名改变了，删除旧文件
              if (needsRename && oldFilePath !== newFilePath) {
                await fs.unlink(oldFilePath);
                console.log(`  🔄 重命名文件: ${eventFile} -> ${newFileName}`);
              } else {
                console.log(`  ✅ 更新文件内容: ${newFileName}`);
              }
            }
          }
        }
      } catch (error) {
        // 没有 events 目录，跳过
      }
    }
    
    console.log('\n✅ 事件文件命名规范修复完成！');
    console.log('\n修复内容：');
    console.log('- 移除事件文件名中的 event_ 前缀');
    console.log('- 统一使用正确的角色ID');
    console.log('- 更新事件ID和选项ID格式');
    console.log('- 确保文件名与内容ID一致');
    
  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error);
    process.exit(1);
  }
}

// 运行修复
fixEventNaming();
