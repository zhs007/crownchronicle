### 需求

我希望 editor 项目调整如下：

- 有一个 agent 的实例，它来维护 gemini api client，和 当前的 gameconfig 内存实例。
- 新增一个 function call——startTask，由 agent 理解用户需求，并拆分为合适的数据，传给 agent，让 agent 知道当前是什么任务，譬如 
{action: 'READY_NEW_CHARACTER'}，这时返回 一段新的 prompt 给 agent，哪些角色是已经存在的，不应该添加他们。
{action: 'NEW_CHARACTER', character: '诸葛亮'}，返回一段新的 prompt 给 agent，是否成功，如果 角色创建成功，那么 接下来需要传哪些值，或用什么 function call 初始化角色。
{action: 'READY_NEW_EVENT', character: '诸葛亮'}，返回一段新的 prompt 给 agent，告诉它哪些事件是不应该被添加的。
{action: 'NEW_EVENT', character: '诸葛亮', event: '事件 title'}，这个类似创建角色。

这样，通过一个 startTask ，不断的修正 agent 的操作，在保证满足复杂约束条件下，尽可能让 agent 决定做什么。


### 实现方案

#### 1. Agent 核心类设计

- 新建 `EditorAgent` 类，内部维护：
  - `geminiClient: GeminiClient`（AI接口）
  - `gameConfig: GameConfigManager`（内存数据实例）
  - `currentTask: AgentTask`（当前任务状态）
  - `history: AgentHistory[]`（多轮对话与操作记录）

#### 2. 任务驱动接口定义

- 统一入口：`startTask(task: AgentTask): AgentResponse`
  - `AgentTask` 包含 action 类型、参数、上下文等
  - 支持 READY_NEW_CHARACTER、NEW_CHARACTER、READY_NEW_EVENT、NEW_EVENT 等 action
  - 每个 action 都有对应的处理方法和 prompt 模板

#### 3. 任务流与状态管理

- `EditorAgent` 维护任务状态机，自动推进任务流程：
  - 记录已存在角色/事件，自动过滤重复项
  - 根据 action 自动生成下一步 prompt 或 function call
  - 支持多步任务（如角色创建后自动进入事件创建）
  - 支持任务回溯和修正（如用户更改角色名、事件标题等）

#### 4. 数据约束与校验

- 所有数据操作（角色/事件创建）都通过 core 包 validator 校验
- agent 层自动规避重复、冲突、非法数据
- prompt 中动态插入“哪些不可用/已存在”，引导 AI 合规生成

#### 5. 多轮对话与上下文

- agent 维护完整对话历史和操作记录，支持上下文记忆
- 每步回复都包含当前状态、可选项、下一步建议
- 支持用户中断/修改/补充需求，agent 自动调整任务流

#### 6. 扩展建议

- 支持更多 action 类型（如批量创建、内容校验、自动补全等）
- 可插拔 prompt 模板，便于不同任务/风格切换
- agent 层可扩展为“内容管控中心”，统一管理所有 AI 生成与数据变更

#### 7. 示例任务流

1. 用户发起 `startTask({action: 'READY_NEW_CHARACTER'})`
   - agent 回复：已有角色列表，哪些不可用，请指定新角色
2. 用户发起 `startTask({action: 'NEW_CHARACTER', character: '诸葛亮'})`
   - agent 校验是否重复，创建角色，返回结果和下一步建议（如补充属性/事件）
3. 用户发起 `startTask({action: 'READY_NEW_EVENT', character: '诸葛亮'})`
   - agent 回复：已有事件列表，哪些不可用，请指定新事件
4. 用户发起 `startTask({action: 'NEW_EVENT', character: '诸葛亮', event: '草船借箭'})`
   - agent 校验是否重复，创建事件，返回结果

#### 8. 错误处理与用户反馈
- agent 对每一步操作都应返回详细的结果说明（成功/失败/原因/建议修正）
- 支持自动重试、智能提示（如数据冲突时建议新名称或事件）
- 统一错误码和用户友好提示，便于前端展示和调试

#### 9. 并发与事务管理
- 支持批量任务（如一次性创建多个角色/事件），保证原子性和一致性
- 任务执行过程中锁定相关数据，防止并发冲突

#### 10. 可测试性与可扩展性
- 每个 action 和处理流程都应有单元测试和集成测试用例
- agent 支持插件式扩展（如自定义校验、外部数据源、AI模型切换）

#### 11. 配置与权限管理
- 支持不同用户/角色的操作权限（如只读、编辑、审核）
- agent 可根据配置动态调整约束规则和可用功能

#### 12. 日志与审计
- agent 记录所有关键操作日志，支持回溯和审计
- 可导出任务流和操作历史，便于内容管理和合规检查

#### 13. 性能与资源优化
- 内存 gameconfig 支持定期同步/持久化，防止数据丢失
- agent 支持异步处理和任务队列，提升响应速度

---
以上方案可逐步实现，先搭建核心 agent 类和任务接口，再细化多轮流程和 prompt 模板。
