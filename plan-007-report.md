# plan-007-report.md

## 任务报告：角色生成系统（标签组合与姓名生成）

### 1. 需求回顾
- 角色不再直接随机历史卡，而是通过 tag（如“丞相”）组合多张角色卡生成新角色。
- 角色卡需支持 `tags: string[]` 字段，便于灵活筛选。
- 姓氏取自事件最多的角色卡，名和字通过词库或算法生成。
- 属性合成规则：power/military/wealth/popularity 取最大值，health/age 取平均值。
- 角色姓名需校验合法性，避免与历史人物重名（黑名单校验）。
- 角色生成接口与详细机制见 `core/README.md`。

### 2. 主要实现内容
- `core/src/engine/CharacterGenerator.ts`：实现 `generateCharacterByTags(tags, options)`，支持标签筛选与属性合成。
- `core/src/engine/CharacterGenUtils.ts`：实现姓名生成、黑名单校验、词库加载等工具函数。
- `core/src/types/character.ts`：角色卡类型定义，明确 `tags` 为必填，`name` 采用“姓 名”格式。
- `gameconfig/versions/*/characters/`：角色卡数据补充 `tags` 字段，采用 YAML 格式。
- `gameconfig/forbidden_names.json`：维护历史人物姓名黑名单。
- `gameconfig/names/`：常用名/字词库。
- 自动化测试：`core/__tests__/CharacterGenerator.test.ts` 等，覆盖生成逻辑、类型安全、黑名单校验。
- 文档同步：更新 `README.md`、`core/README.md`、`plan-007.md`，补充数据结构与接口说明。

### 3. 关键技术要点
- 角色生成流程严格分层，数据路径通过 `GameConfigManager` 统一解析。
- 姓名生成与校验逻辑独立，便于后续扩展。
- 属性合成规则健壮，类型安全，支持异常数据处理。
- 黑名单校验支持“姓 名”格式，避免历史重名。
- 所有数据变更均可追溯，支持多版本切换。

### 4. 主要变更点
- 角色卡结构调整：新增 `tags` 字段，`name` 字段格式规范。
- 生成逻辑升级：支持多卡组合、属性合成、姓名生成与校验。
- 测试与校验：完善自动化测试，确保类型与数据一致性。
- 文档同步：所有相关文档已同步更新，便于团队协作。

### 5. 后续建议
- 持续完善词库与黑名单，提升姓名生成多样性。
- editor 工具可增加标签批量编辑与数据校验功能。
- 支持多语言/本地化时，预留姓名生成与展示扩展点。
- 定期通过自动化测试与 ConfigValidator 校验数据一致性。

---

本次任务已完成，角色生成系统现支持标签组合、属性合成、姓名生成与校验，数据结构与文档同步更新，满足 plan-007 设计目标。
