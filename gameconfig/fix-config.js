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
  // 专门处理 INVALID_OPTION_EFFECTS 错误
  if (issue.code === 'INVALID_OPTION_EFFECTS' && issue.context) {
    const match = issue.context.match(/事件 (.+) \(角色 (.+)\)/);
    if (match) {
      const eventId = match[1];
      const charId = match[2];
      const eventFile = path.resolve('./gameconfig/versions/dev/characters', charId, 'events', `${eventId}.yaml`);
      try {
        const content = fs.readFileSync(eventFile, 'utf8');
        const config = yaml.load(content);
        if (Array.isArray(config.options)) {
          config.options = config.options.map(opt => ({
            ...opt,
            effects: Array.isArray(opt.effects) && opt.effects.length > 0 ? opt.effects : [{ target: 'self', attribute: 'power', offset: 0 }]
          }));
          fs.writeFileSync(eventFile, yaml.dump(config), 'utf8');
          console.log(`[auto-fix] 事件 ${eventId} (角色 ${charId}) options 字段 effects 已批量修复为合法默认值`);
        }
      } catch (e) {
        console.log(`[missing] 事件 ${eventId} (角色 ${charId}) INVALID_OPTION_EFFECTS 修复失败:`, e.message);
      }
    }
  }
  // 专门处理 INVALID_OPTION_REPLY 错误
  if (issue.code === 'INVALID_OPTION_REPLY' && issue.context) {
    const match = issue.context.match(/事件 (.+) \(角色 (.+)\)/);
    if (match) {
      const eventId = match[1];
      const charId = match[2];
      const eventFile = path.resolve('./gameconfig/versions/dev/characters', charId, 'events', `${eventId}.yaml`);
      try {
        const content = fs.readFileSync(eventFile, 'utf8');
        const config = yaml.load(content);
        if (Array.isArray(config.options)) {
          config.options = config.options.map(opt => ({
            ...opt,
            reply: typeof opt.reply === 'string' && opt.reply.trim() ? opt.reply : '我同意'
          }));
          fs.writeFileSync(eventFile, yaml.dump(config), 'utf8');
          console.log(`[auto-fix] 事件 ${eventId} (角色 ${charId}) options 字段 reply 已批量修复为合法默认值`);
        }
      } catch (e) {
        console.log(`[missing] 事件 ${eventId} (角色 ${charId}) INVALID_OPTION_REPLY 修复失败:`, e.message);
      }
    }
  }
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
  { reply: '我同意', effects: [{ target: 'self', attribute: 'power', offset: 0 }] },
  { reply: '我同意', effects: [{ target: 'self', attribute: 'power', offset: 0 }] }
];
            } else if (f === 'weight') {
              config.weight = 1;
            }
          });
          fixed = true;
          console.log(`[auto-fix] 事件 ${eventId} (角色 ${charId}) 已补全字段: ${missingFields.join(', ')}`);
        }
        // 检查 options 字段类型和长度
        if (!Array.isArray(config.options) || config.options.length !== 2) {
          // 无论原有字段如何，始终重建为合法结构
          config.options = [
            { reply: '我同意', effects: [{ target: 'self', attribute: 'power', offset: 0 }] },
            { reply: '我同意', effects: [{ target: 'self', attribute: 'power', offset: 0 }] }
          ];
          fixed = true;
          console.log(`[auto-fix] 事件 ${eventId} (角色 ${charId}) options 字段已重建为新版结构`);
        } else {
          // 对于已存在的 options，强制升级每个选项为新版结构
          config.options = config.options.map((opt, idx) => {
            return {
              reply: typeof opt.reply === 'string' && opt.reply.trim() ? opt.reply : '我同意',
              effects: Array.isArray(opt.effects) && opt.effects.length > 0 ? opt.effects : [{ target: 'self', attribute: 'power', offset: 0 }]
            };
          });
          fixed = true;
          console.log(`[auto-fix] 事件 ${eventId} (角色 ${charId}) options 字段已批量升级为新版结构`);
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
