# Crown Chronicle Core 单元测试指南

本指南介绍 core 包的单元测试环境、运行方法及编写规范。

## 1. 测试环境
- 测试框架：Jest（TypeScript 支持 ts-jest）
- 测试目录：`core/__tests__/`
- 配置文件：`jest.config.cjs`

## 2. 运行测试

在项目根目录下执行：

```bash
npm run test --workspace=core
```
或指定配置文件：
```bash
npm run test --workspace=core -- --config jest.config.cjs
```

## 3. 测试文件规范
- 所有测试文件放在 `core/__tests__/` 目录下，文件名以 `.test.ts` 结尾。
- 每个核心类型、模块、功能建议单独建测试文件。
- 测试用例应覆盖：
  - 类型定义和属性完整性
  - 主要逻辑分支和边界情况
  - 错误处理和异常分支

## 4. 编写示例

```typescript
import { CharacterAttributes } from '../src/types/game';

describe('CharacterAttributes', () => {
  it('should have all six core properties', () => {
    const attrs: CharacterAttributes = {
      power: 10,
      military: 20,
      wealth: 30,
      popularity: 40,
      health: 50,
      age: 60
    };
    expect(attrs.power).toBe(10);
    // ... 其他断言 ...
  });
});
```

## 5. 规范建议
- 每个 `describe` 块聚焦一个类型或功能。
- 用 `it`/`test` 语句描述具体行为。
- 类型约束建议用 `@ts-expect-error` 测试类型错误。
- 逻辑测试应覆盖正常、异常、边界输入。
- 测试应可重复运行且互不影响。

## 6. 进阶
- 可为 GameEngine、CardPoolManager 等核心模块补充功能性和集成测试。
- 建议结合覆盖率报告（`coverage/` 目录）持续提升测试覆盖率。

---
如有疑问请参考 Jest 官方文档或联系项目维护者。
