// 用于批量修正 gameconfig/versions/stable/characters 下所有 yaml/yml 文件的属性结构
// 仅保留 power、military、wealth、popularity、health、age，authority->power，treasury->wealth，移除 loyalty/ambition/competence/reputation

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ATTR_MAP = {
  authority: 'power',
  treasury: 'wealth',
};
const REMOVE_ATTRS = ['loyalty', 'ambition', 'competence', 'reputation'];
const KEEP_ATTRS = ['power', 'military', 'wealth', 'popularity', 'health', 'age'];

function fixAttributes(obj) {
  if (!obj || typeof obj !== 'object') return;
  for (const key in obj) {
    if (typeof obj[key] === 'object') fixAttributes(obj[key]);
    // 替换属性名
    if (ATTR_MAP[key]) {
      obj[ATTR_MAP[key]] = obj[key];
      delete obj[key];
    }
    // 移除冗余属性
    if (REMOVE_ATTRS.includes(key)) {
      delete obj[key];
    }
    // 事件 effects/requirements 只保留核心属性
    if ((key === 'effects' || key === 'requirements' || key === 'attributeChanges') && typeof obj[key] === 'object') {
      for (const k in obj[key]) {
        if (!KEEP_ATTRS.includes(k)) delete obj[key][k];
        if (ATTR_MAP[k]) {
          obj[key][ATTR_MAP[k]] = obj[key][k];
          delete obj[key][k];
        }
      }
    }
  }
}

function processFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  let data;
  try {
    data = yaml.load(raw);
  } catch (e) {
    console.error('YAML parse error:', filePath, e);
    return;
  }
  fixAttributes(data);
  const out = yaml.dump(data, { lineWidth: 120 });
  fs.writeFileSync(filePath, out, 'utf8');
  console.log('Fixed:', filePath);
}

function walkDir(dir) {
  fs.readdirSync(dir).forEach(f => {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walkDir(full);
    else if (f.endsWith('.yaml') || f.endsWith('.yml')) processFile(full);
  });
}

walkDir(path.join(__dirname, 'gameconfig/versions/stable/characters'));
