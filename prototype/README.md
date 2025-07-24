# Crown Chronicle Prototype

Crown Chronicle 原型项目，基于 Next.js 构建的 Web 应用，使用 `crownchronicle-core` 核心包提供游戏逻辑。

## 功能特性

- 🎮 **完整的游戏界面** - 基于 React 的现代化游戏 UI
- 💾 **存档系统** - 支持游戏存档和加载
- 🎯 **实时游戏** - 流畅的游戏体验
- 📱 **响应式设计** - 适配不同屏幕尺寸
- 🎨 **Tailwind CSS** - 现代化的样式设计

## 项目结构

```
prototype/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── api/              # API 路由
│   │   │   ├── game/         # 游戏相关 API
│   │   │   └── saves/        # 存档相关 API
│   │   ├── game/             # 游戏页面
│   │   ├── globals.css       # 全局样式
│   │   ├── layout.tsx        # 根布局
│   │   └── page.tsx          # 主页
│   ├── components/           # React 组件
│   │   ├── EmperorStats.tsx  # 皇帝属性面板
│   │   ├── CharacterPanel.tsx # 角色面板
│   │   ├── EventDisplay.tsx  # 事件显示组件
│   │   ├── GameHistory.tsx   # 游戏历史
│   │   └── SaveManager.tsx   # 存档管理
│   ├── lib/                  # 工具库
│   │   ├── gameAdapter.ts    # 游戏适配器
│   │   └── saveManager.ts    # 存档管理器
│   ├── types/                # TypeScript 类型
│   │   ├── api.ts            # API 类型
│   │   └── saves.ts          # 存档类型
│   ├── utils/                # 工具函数
│   │   └── apiClient.ts      # API 客户端
│   └── data/                 # 游戏数据
│       └── characters/       # 角色配置
├── saves/                    # 存档文件
├── package.json
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
└── tsconfig.json
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 3. 构建生产版本

```bash
npm run build
npm start
```

## 主要组件

### GameAdapter

游戏适配器负责连接 `crownchronicle-core` 包和 UI：

```typescript
import { GameAdapter } from '@/lib/gameAdapter';

const adapter = new GameAdapter();

// 初始化游戏
const gameState = await adapter.initializeGame('normal', async (gameState, event) => {
  // UI选择逻辑
  return choiceId;
});

// 获取下一个事件
const event = adapter.getNextEvent();

// 处理玩家选择
const updatedState = adapter.processPlayerChoice(choiceId);
```

### 主要 UI 组件

#### EmperorStats
显示皇帝的各项属性（健康、威望、国库、军事、民心等）。

#### CharacterPanel
显示当前出场的角色信息，包括关系状态和属性。

#### EventDisplay
显示当前事件的描述、对话和可选择的行动选项。

#### GameHistory
显示游戏历史记录，包括之前的选择和结果。

#### SaveManager
管理游戏存档，包括创建、加载、删除存档。

## API 接口

### 游戏初始化

```http
POST /api/game/initialize
Content-Type: application/json

{
  "difficulty": "normal"
}
```

### 存档管理

```http
# 获取所有存档
GET /api/saves

# 创建新存档
POST /api/saves
{
  "saveName": "我的游戏",
  "difficulty": "normal"
}

# 加载存档
GET /api/saves/{saveId}

# 删除存档
DELETE /api/saves/{saveId}
```

### 游戏行动

```http
POST /api/saves/{saveId}/action
Content-Type: application/json

{
  "choiceId": "choice_1"
}
```

## 开发指南

### 添加新组件

1. 在 `src/components/` 下创建组件文件
2. 使用 TypeScript 和函数式组件
3. 从 `crownchronicle-core` 导入需要的类型
4. 使用 Tailwind CSS 进行样式设计

```typescript
'use client';

import { GameState } from 'crownchronicle-core';

interface MyComponentProps {
  gameState: GameState;
}

export default function MyComponent({ gameState }: MyComponentProps) {
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      {/* 组件内容 */}
    </div>
  );
}
```

### 添加新 API 路由

1. 在 `src/app/api/` 下创建路由文件
2. 使用 Next.js App Router 的约定
3. 导入并使用 `crownchronicle-core` 的功能

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { GameEngine } from 'crownchronicle-core';

export async function POST(request: NextRequest) {
  try {
    // API 逻辑
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
```

## 配置

### Next.js 配置

`next.config.js` 配置了对 `crownchronicle-core` 包的支持：

```javascript
const nextConfig = {
  experimental: {
    esmExternals: true,
  },
  transpilePackages: ['crownchronicle-core'],
}
```

### Tailwind CSS

项目使用 Tailwind CSS 进行样式设计，配置文件为 `tailwind.config.js`。

## 数据管理

游戏数据存储在 `src/data/characters/` 目录下，每个角色有独立的文件夹包含：

- `character.yaml` - 角色基础信息
- `events/` - 角色相关的事件文件

## 存档系统

存档文件保存在 `saves/` 目录下，格式为 JSON：

```json
{
  "saveId": "save_1234567890_123",
  "saveName": "我的游戏",
  "gameState": { /* 游戏状态 */ },
  "metadata": { /* 元数据 */ },
  "createdAt": "2023-12-01T12:00:00.000Z",
  "updatedAt": "2023-12-01T12:30:00.000Z"
}
```

## 部署

### Vercel 部署

1. 连接 GitHub 仓库到 Vercel
2. 设置构建命令：`npm run build`
3. 设置输出目录：`.next`

### 自部署

```bash
# 构建项目
npm run build

# 启动生产服务器
npm start
```

## 故障排除

### 常见问题

**Q: 找不到 crownchronicle-core 模块**
A: 确保已经构建了 core 包：
```bash
cd ../core && npm run build
```

**Q: 游戏数据加载失败**
A: 检查 `src/data/characters/` 目录下是否有有效的角色配置文件。

**Q: 构建失败**
A: 确保所有的类型导入都从 `crownchronicle-core` 而不是本地的 types 文件。

## 许可证

MIT License
