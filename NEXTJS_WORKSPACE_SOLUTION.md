# Next.js 在 Workspace 中的包引用问题及解决方案

## 问题背景

在使用 npm workspace 管理多个项目时，遇到了 Next.js 无法正确解析本地包依赖的问题。具体表现为：

### 错误现象

1. **开发模式错误**：
   ```
   Module not found: Can't resolve 'crownchronicle-core'
   ```

2. **生产构建错误**：
   ```
   Attempted import error: 'FileSystemDataProvider' is not exported from 'crownchronicle-core'
   ```

3. **模块格式冲突**：
   ```
   Specified module format (CommonJs) is not matching the module format of the source code (EcmaScript Modules)
   ```

## 问题分析

### 根本原因

1. **Next.js 模块解析机制复杂**：
   - Next.js（特别是 Turbopack）对本地文件依赖的处理与标准 Node.js 不同
   - 开发模式和生产构建的模块解析路径可能不一致

2. **符号链接处理问题**：
   - 使用 `"crownchronicle-core": "file:../core"` 虽然创建了符号链接
   - 但 Next.js 可能无法正确跟踪符号链接中的模块导出

3. **模块格式不一致**：
   - 混合使用 CommonJS 和 ES 模块格式导致冲突
   - package.json 中的 `type` 字段与实际构建输出不匹配

### 尝试过的失败方案

1. **Next.js 配置调整**：
   ```typescript
   // ❌ 无效
   const nextConfig = {
     transpilePackages: ['crownchronicle-core'],
     experimental: { esmExternals: 'loose' }
   };
   ```

2. **Webpack 别名配置**：
   ```typescript
   // ❌ 无效
   webpack: (config) => {
     config.resolve.alias = {
       'crownchronicle-core': path.resolve(__dirname, '../core/dist/index.js')
     };
   }
   ```

3. **直接相对路径导入**：
   ```typescript
   // ❌ 开发模式失败
   import { ... } from '../../../core/dist/index.js';
   ```

## 最终解决方案

### 1. 使用 npm workspace 架构

**根目录 package.json**：
```json
{
  "name": "crownchronicle",
  "private": true,
  "workspaces": [
    "core",
    "editor", 
    "prototype"
  ],
  "scripts": {
    "build": "npm run build --workspace=core && npm run build --workspace=editor && npm run build --workspace=prototype",
    "dev:core": "npm run dev --workspace=core",
    "dev:editor": "npm run dev --workspace=editor",
    "dev:prototype": "npm run dev --workspace=prototype"
  }
}
```

### 2. 移除子项目中的本地依赖

**editor/package.json**：
```json
{
  "dependencies": {
    // ❌ 移除这行
    // "crownchronicle-core": "file:../core",
    
    // ✅ 保留其他依赖
    "next": "15.4.3",
    "react": "19.1.0"
  }
}
```

### 3. 统一模块格式

**core/package.json**：
```json
{
  "name": "crownchronicle-core",
  "type": "module",  // ✅ 使用 ES 模块
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.esm.js",
      "require": "./dist/index.js"
    }
  }
}
```

**core/rollup.config.js**：
```javascript
import typescript from '@rollup/plugin-typescript'; // ✅ ES 模块语法

export default {
  input: 'src/index.ts',
  output: [
    { file: 'dist/index.js', format: 'cjs', sourcemap: true },
    { file: 'dist/index.esm.js', format: 'esm', sourcemap: true }
  ],
  // ...
};
```

### 4. 简化 Next.js 配置

**editor/next.config.ts**：
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ 在 workspace 中不需要特殊配置
};

export default nextConfig;
```

## 操作步骤

### 1. 清理现有依赖
```bash
cd /path/to/project-root
rm -rf node_modules package-lock.json
rm -rf */node_modules */package-lock.json
```

### 2. 重新安装依赖
```bash
# 从根目录安装，workspace 会自动处理内部依赖
npm install
```

### 3. 构建和运行
```bash
# 构建 core 项目
npm run build --workspace=core

# 启动 editor 开发服务器
npm run dev --workspace=editor
```

## 解决方案的优势

1. **统一依赖管理**：所有依赖安装在根目录的 `node_modules`
2. **自动内部链接**：workspace 自动处理内部包的依赖关系
3. **模块解析简化**：Next.js 可以像处理普通 npm 包一样处理内部包
4. **格式一致性**：统一使用 ES 模块格式避免冲突
5. **开发体验改善**：无需复杂的配置，开发和生产环境表现一致

## 关键要点

1. **workspace 的核心价值**：
   - 内部包对 Next.js 来说就像普通的 npm 包
   - 不再是"本地文件依赖"，而是"workspace 内的包依赖"

2. **模块格式的重要性**：
   - package.json 中的 `type` 字段必须与构建输出格式匹配
   - 构建工具配置（如 rollup.config.js）也要使用对应格式

3. **Next.js 的行为**：
   - 在 workspace 环境中，Next.js 能够正确处理内部包
   - 无需特殊的 webpack 配置或模块解析设置

## 故障排除

如果仍然遇到问题，检查以下几点：

1. **确认 workspace 配置**：
   ```bash
   npm ls --depth=0  # 查看是否正确链接
   ```

2. **验证构建输出**：
   ```bash
   ls -la core/dist/  # 确认文件存在
   ```

3. **检查模块导出**：
   ```javascript
   // 在 editor 项目中测试
   console.log(require('crownchronicle-core'));
   ```

4. **清理缓存**：
   ```bash
   rm -rf .next/  # 清理 Next.js 缓存
   ```

---

*最后更新：2025年7月24日*
