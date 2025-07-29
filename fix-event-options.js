// 自动修正 gameconfig 事件卡 YAML 结构，确保 options 字段合规
// 用法：node fix-event-options.js

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const TARGET_DIRS = [
  'gameconfig/versions/dev',
  'gameconfig/versions/stable'
];

const ATTRS = ['power', 'military', 'wealth', 'popularity', 'health', 'age'];
const VALID_TARGETS = ['player', 'self'];

function isValidOption(opt) {
  return (
    typeof opt.description === 'string' &&
    VALID_TARGETS.includes(opt.target) &&
    ATTRS.includes(opt.attribute) &&
    typeof opt.offset === 'number'
  );
}

function fixOptions(options) {
  if (!Array.isArray(options)) return [];
  // 只保留前两个合法选项
  const valid = options.filter(isValidOption).slice(0, 2);
  // 补齐不足的选项
  while (valid.length < 2) {
    valid.push({
      description: '（待补充）',
      target: 'player',
      attribute: 'power',
      offset: 0
    });
  }
  return valid;
}

function processFile(filePath) {
  let changed = false;
  let report = [];
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const doc = yaml.load(raw);
    if (!doc || typeof doc !== 'object') return null;
    // 处理 options 字段
    if (Array.isArray(doc.options)) {
      const fixed = fixOptions(doc.options);
      if (JSON.stringify(fixed) !== JSON.stringify(doc.options)) {
        doc.options = fixed;
        changed = true;
        report.push('options字段已修正');
      }
    } else {
      doc.options = fixOptions([]);
      changed = true;
      report.push('options字段缺失，已补齐');
    }
    // 移除旧 choices 字段
    if (doc.choices) {
      delete doc.choices;
      changed = true;
      report.push('移除旧choices字段');
    }
    // 保存修正
    if (changed) {
      fs.writeFileSync(filePath, yaml.dump(doc, { lineWidth: 120 }), 'utf8');
      console.log(`[修正] ${filePath}: ${report.join('，')}`);
    }
    return changed;
  } catch (e) {
    console.error(`[错误] ${filePath}:`, e.message);
    return null;
  }
}

function walkDir(dir) {
  fs.readdirSync(dir).forEach(name => {
    const fullPath = path.join(dir, name);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (name.endsWith('.yaml') || name.endsWith('.yml')) {
      processFile(fullPath);
    }
  });
}

function main() {
  TARGET_DIRS.forEach(dir => {
    const absDir = path.resolve(__dirname, dir);
    if (fs.existsSync(absDir)) {
      walkDir(absDir);
    } else {
      console.warn(`[跳过] 目录不存在: ${absDir}`);
    }
  });
  console.log('批量修正完成。');
}

main();
