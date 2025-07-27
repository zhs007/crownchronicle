# plan-004 实施工作报告

## 1. 需求与目标
- 支持“通用卡”机制：角色卡可配置多个通用卡，通用卡仅包含事件卡。
- 编辑器（editor）需支持通用卡的创建、编辑、删除、列表展示，并通过 agent 进行所有数据操作和校验。
- 保证命名、目录、数据结构规范，兼容旧数据。

## 2. 主要实现内容

### 数据结构与核心逻辑
- 在 core/types/game.ts 中新增 `CommonCard` 类型，角色卡增加 `commonCardIds` 字段。
- core/data/DataProvider.ts、core/engine/GameEngine.ts 增加通用卡加载、合并、校验逻辑。
- 单元测试覆盖通用卡数据加载、合并、校验。
- gameconfig/versions/dev|stable/commoncards/ 下增加示例通用卡配置。

### 编辑器（editor）功能
- editor/lib/dataManager.ts 实现：
  - getAllCommonCards：获取所有通用卡
  - saveCommonCard：保存/新建/编辑通用卡
  - 通用卡事件保存、ID生成等
- editor/components/CommonCardPanel.tsx：
  - 通用卡列表展示、刷新
  - 新建、编辑、删除入口（UI 触发，实际操作交由 agent）
- 角色卡可多选关联通用卡，事件池预览入口已预留

### 规范与兼容
- 严格遵循 agent.md 目录/命名/数据结构规范
- 保持对旧有角色卡数据的兼容，未配置 commonCardIds 的角色卡逻辑不变

## 3. 关键技术点
- 所有数据操作均通过 EditorDataManager（agent）实现，UI 仅做基础展示与触发
- 通用卡、角色卡、事件卡的命名、ID、目录结构自动生成，防止手工出错
- 校验逻辑与 core 保持一致，保证数据一致性与可用性

## 4. 已完成与后续建议
- 通用卡机制已在 core、gameconfig、editor 各层实现并联调通过
- 编辑器已具备通用卡的增删查改 UI 入口，所有编辑逻辑交由 agent
- 建议后续完善通用卡删除的物理文件操作、角色卡与通用卡的多选交互、事件池预览等细节

---
如需详细代码变更、接口说明或联动演示，可随时补充。
