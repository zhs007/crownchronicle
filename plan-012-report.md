# plan-012-report.md

## 任务名称
事件卡类型结构升级与自动迁移脚本实现

## 需求概述
- 升级事件卡类型结构，适配新版字段（reply/effects/dialogue/eventId 等）。
- 自动迁移所有旧版事件卡数据，确保符合最新 schema。
- 校验所有事件卡数据完整性与规范性，自动修复所有常见结构错误。
- 前端适配所有新字段，保证编辑与展示体验。

## 关键变更点
### 1. 类型结构调整
- EventCard 类型：
  - 移除 importance、characterId 字段。
  - weight 改为必填，默认 1。
  - id 字段自动由 title 拼音生成（editor 项目 tiny-pinyin）。
  - 新增 eventId 字段，规则为角色 characterId + 事件 id。
  - 新增 dialogue 字段，角色说的一句话。
- EventOption 类型：
  - description 字段重命名为 reply。
  - target/attribute/offset 合并为 effects 数组，支持多个属性修改。

### 2. 自动生成与迁移逻辑
- 事件卡加载流程自动生成 eventId，确保唯一性。
- id 拼音转换仅在 editor 项目实现，使用 tiny-pinyin。
- 迁移脚本（fix-config.js）支持批量升级所有事件卡结构：
  - 自动补全 eventId、dialogue、weight、options 等字段。
  - 旧字段 description/target/attribute/offset 自动升级为 reply/effects。
  - 所有修复操作直接写回原配置文件，输出修复日志。

### 3. 校验与修复
- 使用 ConfigValidator 增强校验规则：
  - eventId 全局唯一。
  - title 在同一角色下唯一。
  - dialogue 字段必填。
  - options 必须为两个选项，reply/effects 字段完整。
  - effects 数组每项 target/attribute/offset 必须有效。
- fix-config.js 增强：
  - 自动修复 INVALID_OPTION_REPLY、INVALID_OPTION_EFFECTS 等常见错误。
  - 支持批量补全/重建 options 字段为新版结构。

### 4. 前端适配
- editor 事件卡编辑区：
  - id 字段自动生成，无需手填。
  - dialogue 字段由 AI 生成初稿，内容可编辑。
  - options 支持多个 effects 配置，AI 可生成初稿。
  - 校验逻辑前端实时提示，错误信息友好展示。
- prototype 游戏前端：
  - 事件卡优先展示 dialogue 字段。
  - 选项区展示 reply 及属性变化说明。
  - 所有新字段在 UI 层有明确展示和交互。

## 兼容与迁移总结
- 推荐统一使用 fix-config.js 自动迁移脚本，批量修复所有事件卡结构。
- 所有迁移与修复操作均自动写回原配置文件，输出详细日志。
- 如需扩展迁移逻辑，可在脚本基础上补充字段映射、结构转换等。

## 任务完成情况
- 已完成类型结构升级、自动生成逻辑、校验器和前端适配。
- fix-config.js 已支持批量修复所有常见结构错误。
- 校验通过率显著提升，绝大多数事件卡已自动升级为新版结构。
- 后续如有特殊/极端数据结构，可继续增强迁移脚本。

## 变更影响
- 事件卡数据结构更规范，前后端一致性提升。
- 编辑与游戏体验更友好，数据维护更高效。
- 迁移脚本可持续扩展，支持未来字段升级。

---
任务报告生成日期：2025-07-30
