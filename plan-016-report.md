# 计划-016 实施报告（2025-08-10）

## 背景
- 目标：对“事件卡”创建引入更严格的规则与更稳健的批量创建流程；避免同轮重复调用与重复保存；保持上下文不被自动清空。
- 关键约束：遵守 Crown Chronicle 架构边界；通过编辑器侧提示+本地校验实现规则；保持与 core 包的纯净边界。

## 今日变更摘要
1) 提示与工作流
- 增强 super prompt（buildSuperPrompt）：
  - 明确“优先使用 schedule_tasks 进行单次/批量创建，后端自动顺序执行并汇总”。
  - 强调 ready_add_event workflow 用于事件推荐；上下文变更只能通过 function-call 完成；不返回 JSON。
  - 呈现当前角色和其已收录事件，用于避免重复建议。

2) 任务队列与自动执行
- 新增内存任务队列：Task、CreationPolicy、OnErrorPolicy；新增 schedule_tasks 与 clear_task_queue 工具。
- 在聊天循环中：
  - 收到 schedule_tasks 成功后，后端自动 runPendingTasksChain 串行执行本轮所有任务，返回单条汇总结果。
  - 若直接调用 create_* 成功且队列非空，自动继续执行剩余任务并输出汇总。
- 队列执行结果现在包含 errorDetails，失败时在回复中列出失败原因，便于快速修正输入。

3) 本地规则校验与去重
- 新增/强化 editor/src/lib/validators/eventCardRules.ts：
  - 使用更安全的类型（EffectUnknown、Target 联合、unknown）替代 any。
  - 校验项：
    - 合法 target（player/self）、合法属性名（power/military/wealth/popularity/health/age）、合法数值档位（-10/-5/-3/3/5/10）。
    - 冲突检测：同一选项内，不得对同一属性同时修改 player 与 self。
    - 统计并校验“≥80% 选项需修改 ≥2 个不同属性”。
- 事件保存前基于标题做重复检测（归一化大小写和空白），阻止同名事件二次入库。

4) Schema 与类型/ESLint 修复
- 为 schedule_tasks 的 args.options 定义 items 架构；为 initialAttributes 定义 properties。
- 修复 create_event schema required 的缺失右括号与对象闭合问题。
- 去除 any/未使用变量/未使用类型：
  - chat() 返回签名与 executeFunctionCall() 使用 GeminiFunctionCall；移除未用变量；替换 any。
- 运行 next lint：无警告或错误。

## 行为变化
- 创建流程：优先 schedule_tasks → 后端自动执行 → 单条汇报成功/失败统计与原因。
- 对话上下文：不再自动清空历史；同轮在 create_event 成功后不会反复触发；若队列仍有任务会继续执行到栈空或触发 onError=abort。
- 失败反馈：现在会在 UI 文本中展示具体失败原因（例如：同一 option 内对同一属性同时修改 player 与 self）。

## 已知问题与说明
- 今日发现的失败案例：
  - 输入事件 effects 在同一选项内同时修改了 player 与 self 的同一属性（如 power/popularity），被本地校验判定为冲突，因此保存失败。
  - 建议修正：在每个选项内，同一属性仅能作用于一个 target；保持 2 属性以上的多属性效果即可。
- 队列为内存实现，重启编辑器会丢失排队任务（符合预期）。

## 后续改进建议
- 新增 schedule_tasks 的执行结果详细汇总（逐条成功/失败简要），并可选保存为日志。
- 引入 requestId/idempotency-key，跨会话防重复提交。
- 编写端到端测试：单次/批量创建、skip/abort 行为、重复标题阻止、规则校验失败路径。

## 变更文件
- editor/src/lib/gemini.ts：
  - 新增任务队列、schedule_tasks/clear_task_queue 工具处理、自动串行执行、失败原因聚合输出。
  - 修复 create_event schema 与类型警告；保留上下文与同轮停止策略。
  - 补充 buildSuperPrompt。
- editor/src/lib/validators/eventCardRules.ts：
  - 替换 any；实现严格校验与统计。

## 验证
- npm run lint --workspace=editor：通过，无警告/错误。
- 手工调用 schedule_tasks：当事件选项存在冲突时，任务执行结果返回失败并附带原因；无数据写入，符合预期。
