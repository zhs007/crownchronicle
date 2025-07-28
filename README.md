# Crown Chronicle

Crown Chronicle 是一个基于历史背景的文字冒险游戏项目，采用模块化架构设计。项目分为核心逻辑包和前端原型两个部分。

## 角色生成与数据结构（核心特性）

- 支持通过标签（tags）组合生成新角色，提升多样性与可玩性
- 角色卡需包含 `tags: string[]` 字段（如“丞相”、“忠臣”、“奸臣”等）
- 属性合成规则：power/military/wealth/popularity 取最大值，health/age 取平均值
- 姓名生成自动避开历史人物黑名单，详见 `gameconfig/forbidden_names.json`
- 角色生成接口与详细机制见 `core/README.md`

## 项目结构

```
crownchronicle/
├── core/                     # 核心游戏逻辑包（TypeScript，纯逻辑与类型）
│   ├── src/
│   │   ├── engine/           # 游戏引擎与角色生成器
│   │   ├── data/             # 数据处理
│   │   ├── strategies/       # 玩家策略
│   │   ├── types/            # 类型定义
│   │   └── utils/            # 工具函数
│   ├── __tests__/            # 单元测试
│   ├── dist/                 # 构建输出
│   ├── package.json
│   └── README.md
├── editor/                   # Next.js 编辑器项目（AI内容生成/数据管理）
│   ├── src/
│   │   ├── app/              # Next.js 应用
│   │   ├── components/       # 编辑器 UI 组件
│   │   ├── lib/              # 配置管理、AI集成等
│   │   ├── types/            # 类型定义
│   │   └── utils/            # 工具函数
│   ├── public/               # 静态资源
│   ├── package.json
│   └── README.md
├── prototype/                # Next.js 游戏原型项目
│   ├── src/
│   │   ├── app/              # Next.js 应用
│   │   ├── components/       # React 组件
│   │   ├── lib/              # 适配层
│   │   ├── types/            # 类型定义
│   │   └── utils/            # 工具函数
│   ├── saves/                # 游戏存档文件
│   ├── package.json
│   ├── next.config.js
│   └── README.md
├── gameconfig/               # 版本化游戏数据与配置
│   ├── versions/
│   │   ├── dev/              # 开发用数据
│   │   ├── stable/           # 稳定版数据
│   │   └── release/          # 发布版数据
│   ├── names/                # 名字/字词库
│   ├── forbidden_names.json  # 姓名黑名单
│   ├── config.json           # 配置路由
│   └── README.md
├── .github/                  # GitHub workflows/协作配置
├── .vscode/                  # VS Code 配置
├── 各类文档与工具脚本
│   ├── init-editor.md
│   ├── init-proj.md
│   ├── plan-001.md
│   ├── plan-007.md
│   ├── plan-007-report.md
│   ├── NAMING_CONVENTIONS.md
│   ├── AGENT_GUIDE.md
│   └── ...
├── package.json              # 顶层 workspace 配置
└── README.md                 # 项目主文档
```

## 架构设计

### 架构分层与协作

本项目采用多包 workspace 架构，分为三大核心子项目与一套版本化数据：

#### 1. core（crownchronicle-core）
- 纯 TypeScript 游戏引擎与类型库
- 角色生成、属性合成、事件系统、三卡池、数据校验等全部核心逻辑
- 不依赖任何配置管理/前端/文件系统，仅暴露类型安全 API
- 提供 ConfigValidator、CharacterGenerator、GameEngine、CardPoolManager 等核心类

#### 2. editor（crownchronicle-editor）
- Next.js + React 实现的 AI 内容编辑与数据管理工具
- 支持角色/事件/词库等 YAML 数据的可视化编辑、AI生成与批量校验
- 通过 GameConfigManager 统一管理数据路径，所有数据写入 gameconfig 目录
- 集成 Gemini API 等 AI 服务，辅助内容创作与数据生成

#### 3. prototype（crownchronicle-prototype）
- Next.js + React 实现的游戏前端原型
- 通过 adapter 层调用 core 引擎，渲染游戏流程、角色、事件等
- 只读 gameconfig/versions/stable/ 数据，保证体验稳定
- 不直接依赖 editor 或 core UI 代码，所有交互通过 adapter 层完成

#### 4. gameconfig（版本化数据与配置）
- 统一存放所有角色、事件、词库、黑名单等 YAML/JSON 数据
- 支持 dev/stable/release 多版本切换，便于内容创作与测试
- 由 editor 工具维护，所有数据变更可追溯

#### 数据流与协作关系
- editor 负责内容生产与数据校验，产出写入 gameconfig
- prototype 只读稳定版数据，体验最终效果
- core 只负责逻辑与类型，所有数据通过 DataProvider/ConfigManager 注入

#### 关键设计原则
- 各子项目严格分层，禁止跨层直接依赖
- 所有数据路径通过 GameConfigManager 统一解析，禁止硬编码
- 角色生成、属性合成、名字校验等机制详见 core/README.md

## 开发流程

### 1. 初始化项目

```bash
# 克隆项目
git clone <repository-url>
cd crownchronicle

# 安装所有依赖（使用 npm workspaces）
npm install
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

### 角色配置 (character.yaml) 示例

```yaml
id: "char001"
name: "诸葛 亮"
tags:
  - 丞相
  - 忠臣
power: 90
military: 80
wealth: 60
popularity: 95
health: 70
age: 54
events:
  - 草船借箭
  - 三气周瑜
description: "三国时期蜀汉丞相，睿智忠诚。"  # 角色简介，必填
faction: "蜀汉"            # 所属派系，必填
avatar: "kongming.png"     # 头像图片文件名，必填
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
