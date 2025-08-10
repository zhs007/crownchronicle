### 需求

1. 现在的流程上，如果创建事件卡时，会先让用户确认细节，就是把整个事件卡描述给用户，我不希望有这个步骤，我希望是确定要创建某个事件卡时，gemini 就直接先按自己的思路创建，然后用户可以手动查看内容，然后再来修改。

2. schedule_tasks 时 不需要传入这么详细的参数，我觉得可以就是 “为 霍光 生成 拥立汉宣帝 的事件卡 ” ，这样也能解决问题 1 

### 实现方案

目标
- Gemini 主导对话，用户确认后一次性调用 schedule_tasks（最小参数），逐任务由 Gemini 调 create_event 直生直存，不再展示预览确认。
- set_workflow('ready_add_event', characterId) 即时返回该角色已有事件列表；移除 get_character_info，最小化接口。

端到端流程（与期望的 11 步一致，最小交互）
1) 用户：生成某角色的事件卡
2) Gemini：识别意图→ set_workflow('ready_add_event', characterId)
3) Server：set_workflow 返回 data.existingEvents（标题+首句对话，含 eventCount），提醒避免重复
4) Gemini：给出 3-5 个候选事件（基于历史与 existingEvents 去重），与用户讨论收敛
5) 用户：明确 1 张或多张具体事件
6) Gemini：一次调用 schedule_tasks，传任务数组，args 仅包含最小信息（characterId|characterName, brief 或 title）
7) Server：schedule_tasks 仅入队并返回 { total, nextTask }，不自动执行
8) Gemini：收到 nextTask → 调 create_event，提交完整事件卡（由 Gemini 写全字段）
9) Server：校验（validateEventCardRules + 标题唯一），失败→结构化错误返回；成功→保存并返回 { saved:true, eventId, nextTask? }
10) Gemini：若有 nextTask 继续第8步；否则总结并回复用户（不展示 YAML）

接口与 Schema 变更（仅 editor 侧）
- 移除 get_character_info：
  - buildFunctionSchema 删除该函数；executeFunctionCall 移除此分支。
- set_workflow 强化返回：
  - 参数保持 required: ['workflow','characterId']。
  - 返回 data 扩展：{ workflow, characterId, characterName, existingEvents: Array<{ id:string, title:string, dialogue?:string }>, eventCount:number }
- schedule_tasks 精简参数：
  - tasks[].args 允许最小输入：{ characterId?:string, characterName?:string, brief?:string, title?:string, tags?:string[] }
  - 返回：{ total:number, nextTask?:Task }；不触发执行。
- create_event 调用与返回：
  - 请求：由 Gemini 产出完整事件卡字段（title, dialogue, weight, options[2] 等），并带 characterId。
  - 成功：{ saved:true, action:'create_event', data:{ id:eventId, ... }, nextTask?:Task }
  - 失败：{ saved:false, errors: string[] | Array<{ field:string, msg:string }> }（结构化，便于 LLM 精确修正）

服务端行为调整（editor/src/lib/gemini.ts）
- chat()
  - 移除：schedule_tasks 成功后自动 runPendingTasksChain；
  - 移除：create_event 成功后“若队列非空则继续自动执行”；
  - 保留：多轮消息与 function call 链；把“继续创建下一个”交给 Gemini 依据 nextTask 主动发起。
- executeFunctionCall()
  - set_workflow：读取角色与事件，填充 data.existingEvents 与 eventCount（为避免过长可只返回前 N 条+总数）。
  - schedule_tasks：仅调用内部队列入队，返回 nextTask，不执行。
  - create_event：
    - 标题去重、合法属性/偏移校验、≥2 属性规则校验；
    - 保存成功后从队列 pop 下一个并附带 nextTask；
    - 失败返回结构化错误与建议（如“标题重复，建议加后缀：·定策/·再议/纪年”）。
- 队列管理
  - 保留内存队列与指针（peekNextTask/popNextTask 已有）；由 create_event 成功时附带 nextTask。

Prompt 更新要点（super prompt）
- 流程职责：
  - 进入 ready_add_event 后，优先使用 set_workflow 返回的 existingEvents 去重；禁止再调用 get_character_info。
  - 用户选定后，一次性 schedule_tasks（最小参数）；接到 nextTask 后逐个 create_event；收到错误先纠正后重试；完成后总结。
- 严格输出：除 function call 外不要返回 YAML/JSON/上下文；自然语言回复不复述卡片详情。
- Few-shot：自然语句 → set_workflow → schedule_tasks(tasks=[{type:'create_event', args:{characterName:'霍光', brief:'拥立汉宣帝'}}]) → create_event。

简述参数策略
- brief 优先（如“拥立汉宣帝”）；title 可选（用户已明确标题时使用）；最终 create_event 由 Gemini 自行产出完整内容。
- 角色歧义：仅在必要时让 Gemini 简短澄清一次，否则默认唯一匹配。

校验与幂等
- 使用 crownchronicle-core 的类型与编辑器本地校验：
  - 合法属性：power,military,wealth,popularity,health,age；偏移：-10,-5,-3,3,5,10；
  - options 恰好 2 条；多数选项 effects 覆盖≥2 个不同属性；同一 option 内避免同属性同时改 player 与 self；
  - 同角色标题唯一；必要时返回建议改名策略而非直接落盘。
- 保存路径通过 GameConfigManager.getConfigPath('editor')，使用 EditorDataManager 落盘。

UI 行为（保持轻量）
- 聊天区仅提示汇总与下一步引导；不展示 YAML。
- 文件树自动定位新事件；DataPreview 默认预览，可切换 YAML 手改。

开发清单
- 代码：
  - editor/src/lib/gemini.ts：更新 buildFunctionSchema（删 get_character_info；扩展 schedule_tasks；set_workflow 返回 data.existingEvents），调整 chat 与 executeFunctionCall 的自动执行逻辑与 nextTask 传递，结构化错误返回；
  - editor/src/lib/validators/eventCardRules.ts：如需补充错误码/统计项，便于 LLM 精确修正；
  - editor/src/app/api/gemini/route.ts：无改动（构造 GeminiClient 即可）。
- Prompt：
  - super prompt 增加流程规范与 few-shot，强调“最小参数 + 逐任务创建 + 不复述 YAML”。
- 测试：
  - 单张与批量 schedule_tasks 流程；标题重复与属性非法的纠错重试；
  - set_workflow 返回 existingEvents 截断策略；
  - 会话级队列串行与完成提示。

验收标准
- 输入“为 霍光 生成 拥立汉宣帝 的事件卡”，模型不经预览确认，经过 schedule_tasks → create_event 链路创建成功并落盘；
- 批量简述一次排队，逐任务创建直至完成，用户只收到一次总结；
- 全程无 get_character_info 调用；set_workflow 即返回 existingEvents 并被用于去重提示。

#### 函数返回的结构化数据契约（补充）
- 通用 Envelope
  - 成功：{ type:'success', action:string, data:object, message?:string, queueState?:{ total:number, cursor:number, pending:number } }
  - 失败：{ type:'error', function:string, code:string, errors:Array<{ field?:string, code?:string, msg:string, value?:unknown }>, retryable:boolean, suggestion?:string, queueState?:{ total:number, cursor:number, pending:number } }

- set_workflow 成功
  - data: { workflow:string, characterId:string, characterName:string, existingEvents: Array<{ id:string, title:string, dialogue?:string }>, eventCount:number }

- schedule_tasks 成功（不执行）
  - data: { total:number, nextTask?:{ type:'create_event'|'create_character', args:Record<string,unknown> }, queueState:{ total:number, cursor:number, pending:number } }

- create_event 成功
  - data: { saved:true, characterId:string, event:{ id:string, title:string }, warnings?:string[] }
  - 另附：nextTask?:{ ... }（若队列未空）

- create_event 失败（示例错误码）
  - code: 'VALIDATION_FAILED' | 'DUPLICATE_TITLE' | 'SCHEMA_MISMATCH' | 'ILLEGAL_OFFSET' | 'ILLEGAL_ATTRIBUTE' | 'OPTION_RULE_VIOLATION'
  - errors: 结构化字段定位，如 { field:'options[0].effects[1].offset', code:'ILLEGAL_OFFSET', msg:'offset 必须是 {-10,-5,-3,3,5,10}', value:7 }
  - retryable: true（除非是不可修复的 I/O 错误）
  - suggestion: 简短修复建议（如“将 offset 调整为 5 或 3；或改为影响另一属性”）

- clear_task_queue 成功
  - data: { cleared:true, prevTotal:number, queueState:{ total:0, cursor:0, pending:0 } }

- 约定
  - 所有成功返回都可选带 queueState，便于 Gemini 判断是否继续；
  - 错误尽量提供 code + errors 数组，减少自然语言歧义；
  - 不在 message 混入关键数据，message 仅作人类可读摘要。