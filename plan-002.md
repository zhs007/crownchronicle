### 需求

具体的配置文件数据在 prototype/src/data 下，我觉得这个配置数据需要移到 workspace 下面，可以给个 gameconfig 的目录存放，这样会更容易管理。
同样的，editor 里也有一个类似的目录，但我觉得编辑器和 prototype 不应该简单的使用一个游戏配置目录，因为 prototype 用的应该是发布版本，而 editor 用的可能是开发版本。

所以需要有一个游戏配置数据的管理方案，甚至需要在 prototype 里配置当前使用的游戏配置路径。

### 实现方案

#### 1. 目录结构设计

在 workspace 根目录下创建 gameconfig 目录，统一管理游戏配置数据：

```
gameconfig/
├── versions/           # 版本化的游戏配置
│   ├── dev/           # 开发版本（editor 使用）
│   │   └── characters/
│   │       ├── huoguang/
│   │       ├── limu/
│   │       └── wuzetian/
│   ├── stable/        # 稳定版本（prototype 使用）
│   │   └── characters/
│   │       ├── huoguang/
│   │       ├── limu/
│   │       └── wuzetian/
│   └── release/       # 发布版本（未来生产环境使用）
│       └── characters/
├── config.json        # 配置管理文件
└── README.md          # 配置说明文档
```

#### 2. 配置管理方案

**config.json** 文件结构：
```json
{
  "versions": {
    "dev": {
      "name": "开发版本",
      "description": "用于编辑器开发和测试",
      "path": "./versions/dev",
      "active": true
    },
    "stable": {
      "name": "稳定版本", 
      "description": "用于原型演示",
      "path": "./versions/stable",
      "active": true
    },
    "release": {
      "name": "发布版本",
      "description": "生产环境使用",
      "path": "./versions/release", 
      "active": false
    }
  },
  "projects": {
    "editor": {
      "defaultVersion": "dev",
      "allowedVersions": ["dev", "stable"]
    },
    "prototype": {
      "defaultVersion": "stable",
      "allowedVersions": ["stable", "release"]
    }
  }
}
```

#### 3. 数据迁移计划

1. **创建新的目录结构**
   - 在根目录创建 `gameconfig` 目录
   - 建立版本化的子目录结构

2. **迁移现有数据**
   - 将 `prototype/src/data` 的内容迁移到 `gameconfig/versions/stable`
   - 将 `editor/src/data` 的内容（如有）迁移到 `gameconfig/versions/dev`
   - 初始时 dev 版本可以从 stable 版本复制

3. **更新项目配置**
   - 修改 prototype 项目中的数据路径配置
   - 修改 editor 项目中的数据路径配置
   - 更新 core 包中的 DataProvider 以支持可配置的数据路径

#### 4. 代码改动点

**prototype 项目改动：**
- 修改 `lib/gameAdapter.ts` 中的数据路径从 `'./src/data'` 改为动态配置
- 修改所有 API 路由中的 DataProvider 初始化
- 添加配置读取逻辑，默认使用 stable 版本

**editor 项目改动：**
- 修改 `lib/dataManager.ts` 中的数据路径配置
- 修改 `lib/gemini.ts` 中的数据路径配置
- 添加版本切换功能（可选）

**core 包改动：**
- 增强 `DataProvider` 构造函数，支持更灵活的路径配置
- 添加配置验证和路径解析功能

#### 5. 配置读取工具

创建配置管理工具类：
```typescript
// gameconfig/ConfigManager.ts
export class GameConfigManager {
  static getConfigPath(project: 'editor' | 'prototype', version?: string): string
  static getAvailableVersions(project: 'editor' | 'prototype'): string[]
  static validateConfig(): boolean
}
```

#### 6. 实施步骤

1. **第一阶段：目录创建和数据迁移**
   - 创建 gameconfig 目录结构
   - 迁移现有数据到对应版本目录
   - 创建配置文件

2. **第二阶段：代码重构**
   - 更新 core 包的 DataProvider
   - 修改 prototype 项目的数据路径配置
   - 修改 editor 项目的数据路径配置

3. **第三阶段：测试和验证**
   - 确保 prototype 正常工作
   - 确保 editor 正常工作
   - 测试版本切换功能

4. **第四阶段：清理**
   - 删除原有的 `prototype/src/data` 目录
   - 删除原有的 `editor/src/data` 目录（如果为空）
   - 更新相关文档

#### 7. 优势

- **集中管理**：所有游戏配置数据统一存储和管理
- **版本控制**：支持多版本并存，便于开发和发布管理
- **项目隔离**：不同项目使用不同版本，避免相互影响
- **扩展性**：未来可以轻松添加新的版本或项目
- **一致性**：统一的配置格式和管理方式

#### 8. 遗漏补充

**8.1 构建系统调整**
- 需要更新根目录的 `package.json` 构建脚本，确保在构建时正确处理新的配置路径
- 考虑添加配置数据的验证步骤到构建流程中

**8.2 开发环境配置**
- 添加环境变量支持，允许在不同环境下使用不同的配置版本
- 考虑添加 `.env` 文件支持，用于本地开发时快速切换配置版本

**8.3 类型安全**
- 更新 TypeScript 类型定义，确保新的配置路径结构有正确的类型支持
- 考虑为配置管理工具类添加完整的类型定义

**8.4 错误处理和日志**
- 添加详细的错误处理机制，当配置路径不存在或配置无效时给出明确提示
- 添加配置加载的日志记录，便于调试和监控

**8.5 迁移脚本**
- 考虑创建自动化迁移脚本，帮助快速完成数据迁移
- 包括数据校验、备份和恢复功能

**8.6 文档更新**
- 更新所有相关的 README.md 文件
- 添加配置管理的使用指南和最佳实践
- 更新项目架构图，反映新的配置管理结构

**8.7 测试覆盖**
- 添加针对配置管理功能的单元测试
- 确保不同版本配置的加载和切换功能正常工作
- 添加配置验证的测试用例

**8.8 CI/CD 调整**
- 如果有持续集成流程，需要相应调整构建和部署脚本
- 确保配置数据在不同环境部署时的正确性

**8.9 性能考虑**
- 评估配置加载的性能影响，特别是在生产环境
- 考虑添加配置缓存机制以提升性能