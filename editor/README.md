# 皇冠编年史 - 内容编辑器

基于 AI 的游戏内容创作工具，专门为《皇冠编年史》游戏设计。通过与 Gemini AI 的深度集成，智能生成符合游戏引擎要求的角色卡片和事件卡片。

## 🌟 核心特性

- **🤖 AI 驱动**: 基于 Gemini AI 的智能内容生成
- **🔗 引擎兼容**: 直接兼容 crownchronicle-core 游戏引擎
- **✅ 实时验证**: 使用 Core 包的验证器确保数据完整性
- **📝 可视化编辑**: 友好的图形界面，支持预览和 YAML 编辑
- **🌐 代理支持**: 支持各种网络代理配置
- **📦 导出功能**: 一键导出为游戏可用格式

## 🚀 快速开始

### 1. 环境配置

```bash
# 复制环境变量模板
cp .env.local.example .env.local

# 编辑环境变量，添加您的 Gemini API Key
# GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. 安装依赖

```bash
npm install
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 开始使用编辑器。

## 🔧 配置说明

### Gemini API Key

1. 访问 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 创建新的 API Key
3. 将 API Key 添加到 `.env.local` 文件中

### 代理配置

如果需要通过代理访问 Gemini API，可以在 `.env.local` 中配置：

```bash
# HTTP 代理
HTTP_PROXY=http://proxy.server.com:8080
HTTPS_PROXY=https://proxy.server.com:8443

# SOCKS5 代理
HTTP_PROXY=socks5://127.0.0.1:1080
HTTPS_PROXY=socks5://127.0.0.1:1080

# 带认证的代理
HTTP_PROXY=http://username:password@proxy.server.com:8080
```

## 📱 界面说明

### 主界面布局

- **左侧边栏**: 项目文件浏览器，显示角色和事件的树状结构
- **中央区域**: Gemini AI 聊天界面，用于与 AI 对话创建内容
- **右侧面板**: 数据预览和编辑器，支持可视化预览和 YAML 代码编辑

### 支持的 AI 命令

#### 角色创建
```
创建一个新的文臣角色，名叫张仪，擅长外交，有legendary稀有度
设计一个权臣角色，历史原型是鳌拜，初始权力值要高，对皇帝有威胁
生成一个宦官角色，参考魏忠贤，要有复杂的派系关系
```

#### 事件创建
```
为霍光添加一个关于军事训练的事件，要有三个选择分支
创建武则天的权力斗争事件，需要复杂的激活条件和角色关系影响
设计一个朝堂争议事件，涉及多个角色的关系变化
```

#### 修改优化
```
修改武则天的权力值，让她更强势一些，从85提升到95
调整霍光的忠诚度事件，让选择后果更加戏剧化
优化张仪的外交事件，增加更多的政治线索揭示
```

## 🔍 数据验证

编辑器集成了完整的数据验证系统：

- **格式验证**: 确保数据结构符合游戏引擎要求
- **数值范围检查**: 验证属性值在合理范围内
- **逻辑一致性**: 检查角色关系和事件逻辑的合理性
- **历史准确性**: 基于历史背景验证角色设定

## 📤 导出功能

### 支持的导出格式

- **YAML 文件**: 与原游戏项目完全兼容的格式
- **JSON 数据**: 便于程序处理的结构化数据
- **完整项目**: 打包整个数据目录为 ZIP 文件

### 导出使用

1. 在编辑器中完成内容创建
2. 使用 AI 命令 "导出当前项目为游戏可用格式"
3. 下载生成的文件包
4. 直接复制到原游戏项目的 `src/data` 目录

## 🛠️ 技术架构

### 核心依赖

- **Next.js 15**: React 应用框架
- **TypeScript**: 类型安全的 JavaScript
- **Tailwind CSS**: 现代化的 CSS 框架
- **Gemini AI**: Google 的生成式 AI 服务
- **js-yaml**: YAML 文件处理
- **undici**: HTTP 客户端，支持代理

### 文件结构

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   │   ├── gemini/        # Gemini AI 接口
│   │   ├── data/          # 数据管理 API
│   │   └── test-connection/ # 连接测试
│   ├── globals.css        # 全局样式
│   ├── layout.tsx         # 根布局
│   └── page.tsx           # 主页面
├── components/            # React 组件
│   ├── ChatInterface.tsx  # AI 聊天界面
│   ├── FileExplorer.tsx   # 文件浏览器
│   └── DataPreview.tsx    # 数据预览
├── lib/                   # 工具库
│   ├── gemini.ts          # Gemini 客户端
│   ├── dataManager.ts     # 数据管理器
│   ├── proxyConfig.ts     # 代理配置
│   └── connectionTest.ts  # 连接测试
├── types/                 # TypeScript 类型定义
│   ├── editor.ts          # 编辑器类型
│   ├── gemini.ts          # Gemini API 类型
│   └── game.ts            # 游戏数据类型
└── data/                  # 游戏数据存储
    └── characters/        # 角色数据目录
```

## 🔮 未来计划

### 核心包集成
- [ ] 集成 `crownchronicle-core` 包
- [ ] 使用 Core 包的验证器
- [ ] 使用 Core 包的数据提供器
- [ ] 使用 Core 包的游戏引擎进行测试

### 高级功能
- [ ] 多人协作编辑
- [ ] 版本控制和分支管理
- [ ] 游戏平衡性分析
- [ ] 自动化测试和质量检查
- [ ] 插件系统支持

### AI 增强
- [ ] 历史专家模式
- [ ] 剧情编剧模式
- [ ] 游戏平衡师模式
- [ ] 角色关系图可视化

## 🤝 贡献指南

1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- [Google Gemini AI](https://ai.google.dev/) - 提供强大的 AI 能力
- [Next.js](https://nextjs.org/) - 优秀的 React 框架
- [Tailwind CSS](https://tailwindcss.com/) - 现代化的 CSS 框架

## 📞 支持

如果您在使用过程中遇到问题，请：

1. 查看 [常见问题解答](docs/FAQ.md)
2. 搜索 [Issues](https://github.com/zhs007/crownchronicle/issues)
3. 创建新的 Issue 描述问题

---

**皇冠编年史内容编辑器** - 让游戏内容创作变得简单而高效 ✨
