// 自动清理 gameconfig/versions 下所有角色数据文件中的废弃字段
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

function cleanObject(obj) {
  for (const field of deprecatedFields) {
    if (Object.prototype.hasOwnProperty.call(obj, field)) {
      delete obj[field];
    }
  }
}

function processFile(filePath) {
  let content;
  let isYaml = false;
  if (filePath.endsWith('.json')) {
    content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } else if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
    isYaml = true;
    const yaml = require('js-yaml');
    content = yaml.load(fs.readFileSync(filePath, 'utf8'));
  } else {
    return;
  }
  const items = Array.isArray(content) ? content : [content];
  items.forEach(cleanObject);
  // 写回文件
  if (filePath.endsWith('.json')) {
    fs.writeFileSync(filePath, JSON.stringify(Array.isArray(content) ? items : items[0], null, 2), 'utf8');
  } else if (isYaml) {
    const yaml = require('js-yaml');
    fs.writeFileSync(filePath, yaml.dump(Array.isArray(content) ? items : items[0]), 'utf8');
  }
}

function main() {
  const files = findCharacterFiles(versionsDir);
  let changed = 0;
  for (const file of files) {
    processFile(file);
    changed++;
  }
  console.log(`✅ 已处理 ${changed} 个角色数据文件，所有废弃字段已清理。`);
}

main();
