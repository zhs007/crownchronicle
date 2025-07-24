# Crown Chronicle

Crown Chronicle 是一个基于历史背景的文字冒险游戏项目，采用模块化架构设计。项目分为核心逻辑包和前端原型两个部分。

## 项目结构

```
crownchronicle/
├── core/                     # 核心游戏逻辑包
│   ├── src/
│   │   ├── engine/           # 游戏引擎
│   │   ├── data/             # 数据处理
│   │   ├── strategies/       # 玩家策略
│   │   ├── types/            # 类型定义
│   │   └── utils/            # 工具函数
│   ├── dist/                 # 构建输出
│   ├── package.json
│   └── README.md
├── prototype/                # Next.js 原型项目
│   ├── src/
│   │   ├── app/              # Next.js 应用
│   │   ├── components/       # React 组件
│   │   ├── lib/              # 适配层
│   │   ├── data/             # 游戏数据
│   │   ├── types/            # 类型定义
│   │   └── utils/            # 工具函数
│   ├── saves/                # 游戏存档文件
│   ├── package.json
│   ├── next.config.js
│   └── README.md
├── .gitignore
├── .vscode/                  # VS Code 配置
├── init-editor.md            # 项目初始化文档
├── init-proj.md              # 项目计划文档
├── plan-001.md               # 重构计划文档
└── README.md                 # 项目主文档
```

## 架构设计

### Core 包 (crownchronicle-core)

核心包是一个纯 TypeScript 库，包含了所有游戏逻辑：

- **游戏引擎** - 处理游戏状态、回合逻辑、事件触发
- **卡池管理** - 三卡池系统（待定、主动、弃用）
- **角色系统** - 复杂的角色关系网络和派系系统
- **策略模式** - 支持多种AI玩家策略
- **数据验证** - 完整的游戏数据验证系统
- **游戏模拟** - 支持批量模拟和性能分析

### Prototype 项目 (crownchronicle-prototype)

原型项目是基于 Next.js 的 Web 应用，提供用户界面：

- **React 组件** - 游戏 UI 组件
- **API 路由** - Next.js API 路由处理游戏逻辑
- **适配层** - 连接 core 包和 UI 的桥梁
- **存档系统** - 游戏存档和加载功能

## 开发流程

### 1. 初始化项目

```bash
# 克隆项目
git clone <repository-url>
cd crownchronicle

# 安装所有依赖（使用 npm workspaces）
npm install

# 或者分别安装
cd core && npm install
cd ../prototype && npm install
```

### 2. 快速开始

```bash
# 构建 core 包并启动 prototype 开发服务器
npm run build
npm run dev:prototype

# 或者分步骤执行
npm run build --workspace=core
npm run dev --workspace=prototype
```

### 3. 开发 Core 包

```bash
# 开发模式（监听文件变化）
npm run dev:core

# 运行测试
npm run test

# 构建
npm run build --workspace=core
```

### 4. 开发 Prototype

```bash
# 启动开发服务器
npm run dev:prototype

# 构建生产版本
npm run build --workspace=prototype
```

## 数据格式

### 角色配置 (character.yaml)

```yaml
id: "character_id"
name: "角色真实姓名"
displayName: "游戏中显示名称"
role: "角色身份"
description: "角色描述"
category: "角色类别"

initialAttributes:
  power: 50
  loyalty: 70
  ambition: 30
  # ... 其他属性

initialRelationshipWithEmperor:
  affection: 20
  trust: 50
  # ... 其他关系

factionInfo:
  primaryFaction: "改革派"
  # ... 派系信息

# ... 其他配置
```

### 事件配置 (event.yaml)

```yaml
id: "event_id"
title: "事件标题"
description: "事件描述"
speaker: "说话者"
dialogue: "对话内容"

choices:
  - id: "choice_1"
    text: "选项文本"
    effects:
      authority: 5
      treasury: -10
    # ... 选项配置

# ... 其他配置
```

## 核心特性

### 三卡池系统

- **待定卡池** - 有激活条件的事件
- **主卡池** - 可以触发的事件
- **弃卡池** - 已经使用过的事件

### 角色关系系统

- 复杂的角色间关系网络
- 派系系统和政治平衡
- 动态的关系变化

### 策略模式

支持多种玩家策略：
- 随机策略
- 保守策略
- 激进策略
- 平衡策略

### 游戏模拟

- 批量模拟测试
- 性能分析
- 配置验证

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
GET /api/saves
POST /api/saves
GET /api/saves/{saveId}
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

## 扩展计划

1. **编辑器项目** - 可视化编辑游戏数据
2. **移动端应用** - React Native 版本
3. **多人游戏** - 支持多人协作
4. **AI 增强** - 更智能的 NPC 行为

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 许可证

MIT License

## 技术栈

- **Core**: TypeScript, Rollup, Jest
- **Prototype**: Next.js, React, TypeScript, Tailwind CSS
- **数据**: YAML 配置文件
- **构建**: npm, Node.js

## 联系方式

如有问题或建议，请创建 Issue 或联系项目维护者。
