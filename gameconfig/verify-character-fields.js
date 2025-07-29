// 检查 gameconfig/versions 下所有角色数据文件是否包含已废弃字段
const fs = require('fs');
const path = require('path');

const deprecatedFields = [
  'power', 'military', 'wealth', 'popularity', 'health', 'age',
  'displayName', 'currentTitle', 'role', 'identityRevealed',
  'revealedTraits', 'hiddenTraits', 'discoveredClues', 'totalClues'
];

const versionsDir = path.join(__dirname, 'versions');

function findCharacterFiles(dir) {
  let files = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(findCharacterFiles(fullPath));
    } else if (entry.name.endsWith('.json') || entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) {
      if (fullPath.includes('character')) files.push(fullPath);
    }
  });
  return files;
}

function checkFile(filePath) {
  let content;
  if (filePath.endsWith('.json')) {
    content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } else if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
    try {
      const yaml = require('js-yaml');
      content = yaml.load(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      return { file: filePath, error: 'YAML parse error' };
    }
  } else {
    return null;
  }
  // 支持单个对象或数组
  const items = Array.isArray(content) ? content : [content];
  const found = [];
  for (const item of items) {
    for (const field of deprecatedFields) {
      if (Object.prototype.hasOwnProperty.call(item, field)) {
        found.push(field);
      }
    }
  }
  return found.length > 0 ? { file: filePath, fields: found } : null;
}

function main() {
  const files = findCharacterFiles(versionsDir);
  const results = [];
  for (const file of files) {
    const res = checkFile(file);
    if (res) results.push(res);
  }
  if (results.length === 0) {
    console.log('✅ 所有角色数据文件已无废弃字段');
  } else {
    console.log('⚠️ 检测到包含废弃字段的文件:');
    results.forEach(r => {
      if (r.error) {
        console.log(`  ${r.file}: ${r.error}`);
      } else {
        console.log(`  ${r.file}: ${r.fields.join(', ')}`);
      }
    });
  }
}

main();
