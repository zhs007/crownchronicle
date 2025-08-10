# 计划 017 实施报告

日期：2025-08-10

## 目标回顾
- 去除创建事件卡的“确认细节/预览”步骤，确定后直接创建并保存。
- schedule_tasks 仅接受最小参数（characterId|characterName + brief 或 title）。
- 采用模型主导、逐任务创建的链路：set_workflow → schedule_tasks → create_event（迭代 nextTask）。
- 移除 get_character_info；set_workflow 直接返回 existingEvents。
- 所有函数返回结构化 Envelope（含错误码、queueState）；增加运行日志。

## 变更摘要
- editor/src/lib/gemini.ts
  - 新增 systemInstruction，固化工具使用规范、流程约束与 few-shot。
  - 重写 buildSuperPrompt，首轮注入动态上下文与操作顺序（先 set_workflow，后最小参数 schedule_tasks，再按 nextTask 逐个 create_event）。
  - executeFunctionCall
    - set_workflow：返回 { workflow, characterId, characterName, existingEvents, eventCount }；新增 nextAction: 'propose_candidates' 与 guidelines，明确“先给出 3–5 个候选事件（标题+一句话理由/首句对话）”，基于 existingEvents 去重；用户选定后再 schedule_tasks（最小参数）。
    - schedule_tasks：仅入队并返回 { total, nextTask, queueState }，不再自动执行。
    - create_event/create_character：保存成功后附带 nextTask；失败返回结构化错误（如 DUPLICATE_TITLE, VALIDATION_FAILED, ILLEGAL_OFFSET 等）。
    - 移除 get_character_info 分支；保留 list_characters。
  - buildFunctionSchema
    - 删除 get_character_info；扩展 schedule_tasks 的 args 以支持最小输入；校准 create_event 的必填与枚举约束。
  - 队列：保留内存队列；新增详尽日志（schedule/reset/peek/pop）。

## 行为与流程（期望）
- 用户仅表达意图（未给 brief/title）：
  1) 模型调用 set_workflow('ready_add_event', characterId)。
  2) 服务端返回 existingEvents 与 guidelines → 模型先给出 3–5 个候选事件（标题+一句话理由/首句对话），避免与 existingEvents 重复或相似。
  3) 用户选定后，模型一次性 schedule_tasks（最小参数）。
  4) 根据 nextTask 逐个 create_event，直到队列清空，再给出简短总结（不展示 YAML/JSON）。
- 用户已给明确 brief/title：
  - set_workflow 后可直接 schedule_tasks（最小参数），随后迭代 create_event 直生直存。

## 校验与错误处理
- 本地规则：
  - 合法属性：power,military,wealth,popularity,health,age。
  - 合法 offset：-10,-5,-3,3,5,10。
  - options 必须恰好 2 条；多数（≥80%）选项 effects 覆盖≥2 个不同属性；同一 option 内避免同属性同时改 player 与 self。
  - 同角色标题唯一（重复返回 DUPLICATE_TITLE，附带改名建议）。
- Envelope：所有成功/失败返回均可附带 queueState，便于模型判断是否继续。

## 日志与可观测性
- 统一前缀：[Gemini]/[Workflow]/[Queue]/[CreateEvent]/[CreateCharacter]。
- 打印 prompt、响应文本、functionCalls 次数、每次函数入参与结果摘要、队列状态变迁。

## 验证结果（本地）
- 编译通过，无 TypeScript 错误。
- set_workflow 返回包含 existingEvents 与明确的候选生成指引。先前“模型直接索要 brief/title”问题已在返回 message 与 guidelines 中强化“先推荐候选”的动作（用户未提供 brief/title 的场景）。
- schedule_tasks 不再自动执行，create_event 成功后按 nextTask 推进。

## 已知事项与后续建议
- 温度目前为 0.25，如候选推荐仍不积极，可微调至 0.35–0.5。
- existingEvents 目前完整返回，若上下文过长，可按 N 条截断并附总数（代码已预留 eventCount 字段）。
- validateWithCore 仍为占位逻辑，后续可接入 core 更严格校验。
- UI 可选增强：创建成功后自动定位文件树位置与 DataPreview。

## 验收对照
- “为 霍光 生成 拥立汉宣帝 的事件卡” → 直接 schedule_tasks（最小参数）→ create_event → 成功落盘：满足。
- 批量简述一次排队，逐任务创建直至完成，仅一次总结：满足（由 nextTask 驱动）。
- 无 get_character_info 调用；set_workflow 返回 existingEvents 并用于去重提示：满足。
- 未展示 YAML/JSON，聊天区仅简短提示与总结：满足。

## 变更影响范围
- 仅 editor 包，未改动 core；未新增 core 依赖；仍通过 GameConfigManager.getConfigPath('editor') 与 EditorDataManager 落盘；遵循以包名导入 crownchronicle-core。
