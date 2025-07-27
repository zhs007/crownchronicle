### 需求

现在项目越来越复杂，会有些很大的源码文件，我觉得是不是可以将功能适当划分一下，这样后期维护起来更容易。


### 实现方案

#### 1. Core 项目模块化详细计划

1. **现状分析**
   - 识别 core/src/ 下体积较大、职责混杂的文件（如 GameEngine.ts、CardPoolManager.ts、ConfigValidator.ts 等）。
   - 统计每个文件的主要功能、依赖关系和变更频率。

2. **功能拆分与目录优化**
   - 按领域/功能将 engine 目录下的文件进一步细分：
     - `game/`：游戏主流程与状态管理（如 GameStateManager.ts、GameActionHandler.ts）
     - `card/`：卡牌相关逻辑（如 CardPoolManager.ts、CardEffectHandler.ts）
     - `validation/`：配置与数据校验（如 ConfigValidator.ts、SchemaValidator.ts）
     - `utils/`：通用工具函数
   - 将类型定义全部集中到 `types/`，并按领域拆分（如 game.ts、card.ts、config.ts）。

3. **重构步骤**
   - 逐步将大文件中的类、函数迁移到新模块，保留原有导出接口，确保对外兼容。
   - 每迁移一个模块，补充/完善单元测试，确保功能无回退。
   - 拆分过程中，及时更新 core/README.md 和 UNIT_TEST_GUIDE.md。

4. **依赖与边界约束**
   - 拆分后各模块之间只通过类型和接口交互，严禁跨层直接依赖。
   - 保持 core 无外部配置管理、UI、文件系统等依赖。

5. **迁移与验收流程**
   - 每次重构后，先本地运行 core 单元测试，再整体构建并在 prototype/editor 项目中集成测试。
   - 迁移完成后，归档旧文件，清理无用代码。

6. **文档与协作**
   - 拆分和重构过程全程记录在 plan-006-report.md，并同步到 core/README.md。
   - 关键设计决策、模块边界、接口说明需补充注释和文档。

> 后续可根据实际拆分进度，补充每个模块的详细迁移 checklist。