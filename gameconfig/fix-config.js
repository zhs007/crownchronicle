// 自动批量校验并输出 gameconfig 配置异常
// 用法：node fix-config.js



import path from 'path';
import { ConfigValidator, FileSystemDataProvider } from 'crownchronicle-core';
import fs from 'fs';
import yaml from 'js-yaml';

async function main() {
  console.log("正在校验 gameconfig 配置文件...");
  const dataProvider = new FileSystemDataProvider(path.resolve('./gameconfig/versions/dev'));
  const validator = new ConfigValidator(dataProvider);
  const result = await validator.validateAll();
for (const issue of result.issues) {
  console.log(`[${issue.type}] ${issue.code}: ${issue.message} (${issue.context})`);
  if (issue.suggestion) console.log(`建议: ${issue.suggestion}`);

  console.log(`详细信息: ${JSON.stringify(issue, null, 2)}`);

  // 输出角色缺失字段
  if (issue.code === 'INVALID_CHARACTER_STRUCTURE' && issue.context) {
    const charId = issue.context.replace('角色 ', '');
    const charFile = path.resolve('./gameconfig/versions/dev/characters', charId, 'character.yaml');
    try {
      const content = fs.readFileSync(charFile, 'utf8');
      const config = yaml.load(content);
      const requiredFields = ['id', 'name', 'description', 'initialAttributes'];
      const missingFields = requiredFields.filter(field => !(field in config));
      if (missingFields.length > 0) {
        console.log(`[missing] 角色 ${charId} 缺少字段: ${missingFields.join(', ')}`);
      }
      // 检查 initialAttributes 结构和属性
      if ('initialAttributes' in config) {
        const attr = config.initialAttributes;
        const requiredAttrs = ['power', 'military', 'wealth', 'popularity', 'health', 'age'];
        if (typeof attr !== 'object' || attr === null) {
          console.log(`[missing] 角色 ${charId} initialAttributes 不是对象`);
        } else {
          const missingAttrs = requiredAttrs.filter(a => !(a in attr));
          if (missingAttrs.length > 0) {
            console.log(`[missing] 角色 ${charId} initialAttributes 缺少属性: ${missingAttrs.join(', ')}`);
            // 自动补全缺失属性为 50
            missingAttrs.forEach(a => { attr[a] = 50; });
            config.initialAttributes = attr;
            fs.writeFileSync(charFile, yaml.dump(config), 'utf8');
            console.log(`[auto-fix] 角色 ${charId} initialAttributes 已补全: ${missingAttrs.join(', ')} 为 50`);
          } else {
            console.log(`[valid] 角色 ${charId} initialAttributes 属性齐全`);
          }
        }
      }
    } catch (e) {
      console.log(`[missing] 角色 ${charId} 检查失败:`, e.message);
    }
  }

  // 输出事件缺失字段
  if (issue.code === 'INVALID_EVENT_STRUCTURE' && issue.context) {
    const match = issue.context.match(/事件 (.+) \(角色 (.+)\)/);
    if (match) {
      const eventId = match[1];
      const charId = match[2];
      const eventFile = path.resolve('./gameconfig/versions/dev/characters', charId, 'events', `${eventId}.yaml`);
      try {
        const content = fs.readFileSync(eventFile, 'utf8');
        const config = yaml.load(content);
        const requiredFields = ['id', 'title', 'options', 'weight'];
        const missingFields = requiredFields.filter(field => !(field in config));
        let fixed = false;
        if (missingFields.length > 0) {
          console.log(`[missing] 事件 ${eventId} (角色 ${charId}) 缺少字段: ${missingFields.join(', ')}`);
          // 自动补全事件缺失字段
          missingFields.forEach(f => {
            if (f === 'title') {
              config.title = '未命名事件';
            } else if (f === 'id') {
              config.id = eventId;
            } else if (f === 'options') {
              config.options = [
                { description: '', target: '', attribute: '', offset: 0 },
                { description: '', target: '', attribute: '', offset: 0 }
              ];
            } else if (f === 'weight') {
              config.weight = 1;
            }
          });
          fixed = true;
          console.log(`[auto-fix] 事件 ${eventId} (角色 ${charId}) 已补全字段: ${missingFields.join(', ')}`);
        }
        // 检查 options 字段类型和长度
        if (!Array.isArray(config.options)) {
          console.log(`[missing] 事件 ${eventId} (角色 ${charId}) options 不是数组`);
        } else if (config.options.length !== 2) {
          console.log(`[missing] 事件 ${eventId} (角色 ${charId}) options 数组长度为 ${config.options.length}，应为2`);
        } else {
          // 检查每个选项的必需字段并自动修复
          const optionRequiredFields = ['description', 'target', 'attribute', 'offset'];
          config.options.forEach((opt, idx) => {
            const missingOptFields = optionRequiredFields.filter(f => !(f in opt));
            if (missingOptFields.length > 0) {
              console.log(`[missing] 事件 ${eventId} (角色 ${charId}) options[${idx}] 缺少字段: ${missingOptFields.join(', ')}`);
              // 自动补全缺失字段
              missingOptFields.forEach(f => {
                opt[f] = (f === 'offset') ? 0 : '';
              });
              fixed = true;
              console.log(`[auto-fix] 事件 ${eventId} (角色 ${charId}) options[${idx}] 已补全: ${missingOptFields.join(', ')} (description/target/attribute: '', offset: 0)`);
            } else {
              console.log(`[valid] 事件 ${eventId} (角色 ${charId}) options[${idx}] 字段齐全`);
            }
          });
        }
        if (fixed) {
          fs.writeFileSync(eventFile, yaml.dump(config), 'utf8');
          console.log(`[auto-fix] 事件 ${eventId} (角色 ${charId}) 已保存修复后的 event 配置文件`);
        }
      } catch (e) {
        console.log(`[missing] 事件 ${eventId} (角色 ${charId}) 检查失败:`, e.message);
      }
    }
  }
}
  if (result.valid) {
    console.log('所有配置已通过校验！');
  } else {
    console.log('请根据上述提示修复配置文件。');
  }
}
main();
