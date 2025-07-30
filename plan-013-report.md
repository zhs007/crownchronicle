# plan-013 实施报告

## 任务主题
事件激活条件结构重构与全链路适配

## 主要目标
- 统一事件激活/移除/触发条件为新版 EventConditions 结构
- 移除所有旧 min/max 字段，采用 attributeConditions 数组
- 优化判定逻辑、类型定义、校验与测试

## 实施步骤

1. **类型定义重构**
   - 新增 `EventConditionItem` 类型，包含 target、attribute、min、max 字段
   - `EventConditions` 仅保留 `attributeConditions?: EventConditionItem[]`
   - 移除所有旧字段（如 minPower、maxHealth 等）

2. **判定逻辑重构**
   - 修改 core 包判定函数，遍历 attributeConditions，按 target 获取角色对象，判定属性是否满足 min/max
   - 适配 CardPoolManager、GameStateManager、GameEngine 等相关逻辑

3. **校验与内容编辑适配**
   - ConfigValidator 增加对新结构的校验，确保 target、attribute、min/max 合法
   - 编辑器内容生成、保存、验证均已适配新结构
   - 补充文档与内容编辑说明，明确新结构用法与注意事项

4. **单元测试补充**
   - 编写 EventConditions 相关测试，覆盖多条件组合、边界值、target 区分等典型场景
   - 重构 CardPoolManager/GameStateManager 测试用例，全部采用新结构

5. **文档同步**
   - plan-013.md、core/README.md 已补充 EventConditions 新结构示例与编辑说明
   - 数据格式示例已同步到 README

## 关键变更点
- 事件条件判定统一走 attributeConditions，支持任意组合与区间判定
- 旧字段全部移除，避免内容编辑混乱
- 校验与测试覆盖所有典型用例，保证配置合法性与逻辑正确性

## 遗留问题与建议
- 若后续需支持更复杂条件（如事件历史、角色状态等），建议扩展 EventConditions 类型并同步文档
- 编辑器与内容生产工具需持续跟进主类型定义，避免结构漂移
- 建议定期批量校验所有配置，确保内容一致性

## 结论
plan-013 任务已全部完成，事件条件结构已实现统一、简洁、可扩展，相关文档与测试已同步。
