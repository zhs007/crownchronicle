# plan-006 重构迁移记录

## 2025-07-27

### 目录结构初始化
- 已新建 core/src/engine/game/
- 已新建 core/src/engine/card/
- 已新建 core/src/engine/validation/
- 已新建 core/src/engine/game/GameStateManager.ts
- 已新建 core/src/engine/game/GameActionHandler.ts
- 已新建 core/src/engine/card/CardPoolManager.ts
- 已新建 core/src/engine/card/CardEffectHandler.ts
- 已新建 core/src/engine/validation/ConfigValidator.ts
- 已新建 core/src/engine/validation/SchemaValidator.ts
- 已新建 core/src/types/card.ts
- 已新建 core/src/types/config.ts


### Checklist
- [x] 目录结构准备
- [x] GameEngine.ts 迁移主流程与状态管理相关代码（已迁移至 game/GameStateManager.ts）
- [x] CardPoolManager.ts 拆分迁移（已迁移至 card/CardPoolManager.ts）
- [x] ConfigValidator.ts 迁移（已迁移至 validation/ConfigValidator.ts）
- [x] 类型定义拆分（已按领域拆分至 types/）
- [x] 单元测试补充（已覆盖主要迁移模块）
- [x] 文档同步（README、UNIT_TEST_GUIDE 已更新）
- [x] 归档旧文件，清理无用代码（已删除 engine 目录下适配器文件）


### 问题与解决方案
- 类型导出遗漏导致 rollup 构建报错 → 已补充 re-export
- Jest 配置文件冲突 → 保留 .cjs，删除多余 .js
- 迁移后部分类型引用需统一调整为 types/ 目录
- 旧适配器文件已全部清理，避免重复导出

---

后续每次迁移请补充 checklist、遇到的问题及解决方案。
