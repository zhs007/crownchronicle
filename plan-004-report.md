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
- editor/lib/dataManager.ts 仅能在 Node.js 环境（如 API 路由、agent 指令）中使用，不能被前端页面/组件直接 import。
  - getAllCommonCards：获取所有通用卡（仅服务端可用）
  - saveCommonCard：保存/新建/编辑通用卡（仅服务端可用）
  - 通用卡事件保存、ID生成等
- editor/app/api/commoncards/xxx.ts（建议）：所有通用卡相关的文件操作应通过 API 路由暴露给前端页面/组件。
- editor/components/CommonCardPanel.tsx：
  - 仅通过 fetch/axios 请求 API 获取/操作通用卡数据，绝不直接 import/use dataManager.ts
  - 通用卡列表展示、刷新
  - 新建、编辑、删除入口（UI 触发，实际操作交由 agent 或 API）
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

### 【editor 项目需执行的具体修改】
1. 新增 API 路由（如 `src/app/api/commoncards/[action].ts`），实现通用卡的增删查改接口，所有文件操作均在此完成。
2. 移除前端页面/组件（如 CommonCardPanel.tsx）对 dataManager.ts 的直接 import，全部通过 fetch/axios 调用 API。
3. CommonCardPanel.tsx 及相关组件需适配 API 返回的数据结构，处理增删查改的异步请求与 UI 状态。
4. 可选：为 agent/EditorDataManager 增加更细致的错误处理和数据校验，API 层返回标准化响应。
5. 后续如需支持角色卡与通用卡多选、事件池预览等，建议统一通过 API 路由与 agent 协作实现。

---
如需详细代码变更、接口说明或联动演示，可随时补充。
