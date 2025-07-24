# Agent 必读文档 - Crown Chronicle 项目架构

## 项目结构
```
crownchronicle/                 # 根目录 - npm workspace
├── package.json               # workspace 配置
├── core/                      # 核心包 - TypeScript
├── editor/                    # Next.js 编辑器 (端口 3001)
├── prototype/                 # Next.js 原型 (端口 3000)
└── gameconfig/                # 游戏配置数据
    ├── config.json           # 版本管理配置
    ├── ConfigManager.ts      # 配置管理工具
    └── versions/
        ├── dev/              # 开发版本 (editor使用)
        ├── stable/           # 稳定版本 (prototype使用)
        └── release/          # 发布版本
```

## 关键约束

### 🚫 禁止操作
- **禁止修改 core 包的 DataProvider 构造函数**
- **禁止在 core 包中添加配置管理依赖**
- **禁止使用 `npm install ../core` 方式安装依赖**

### ✅ 正确做法
- **构建**：`npm run build --workspace=core`
- **开发**：`npm run dev:prototype` 或 `npm run dev:editor`
- **依赖**：core 包通过 workspace 自动链接，无需手动安装
- **配置管理**：在各项目中使用 `gameconfig/` 下的配置文件

## 数据路径
- **Editor**: 使用 `gameconfig/versions/dev/`
- **Prototype**: 使用 `gameconfig/versions/stable/`
- **配置读取**: 读取 `gameconfig/config.json` 解析路径

## 常用命令
```bash
# 根目录执行
npm run build --workspace=core    # 构建核心包
npm run dev:prototype             # 启动原型 (3000)
npm run dev:editor               # 启动编辑器 (3001)
```

## 配置管理示例
```javascript
const path = require('path');
const fs = require('fs');

function getGameConfigPath(project) {
  const configPath = path.join(process.cwd(), '../gameconfig/config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const version = config.projects[project].defaultVersion;
  return path.resolve(process.cwd(), '../gameconfig', config.versions[version].path);
}
```

⚠️ **重要**: 始终遵循 workspace 架构，保持核心包的纯净性
