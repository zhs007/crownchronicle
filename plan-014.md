### 需求

我希望 editor 项目调整如下（可以考虑彻底重构一个 editor2 项目，技术栈和 editor 一致）：

- 有一个 agent 的实例，它来维护 gemini api client，和 当前的 gameconfig 内存实例。
- 新增一个 function call——startTask，由 agent 理解用户需求，并拆分为合适的数据，传给 agent，让 agent 知道当前是什么任务，譬如 
{action: 'READY_NEW_CHARACTER'}，这时返回 一段新的 prompt 给 agent，哪些角色是已经存在的，不应该添加他们。
{action: 'NEW_CHARACTER', character: '诸葛亮'}，返回一段新的 prompt 给 agent，是否成功，如果 角色创建成功，那么 接下来需要传哪些值，或用什么 function call 初始化角色。
{action: 'READY_NEW_EVENT', character: '诸葛亮'}，返回一段新的 prompt 给 agent，告诉它哪些事件是不应该被添加的。
{action: 'NEW_EVENT', character: '诸葛亮', event: '事件 title'}，这个类似创建角色。

这样，通过一个 startTask ，不断的修正 agent 的操作，在保证满足复杂约束条件下，尽可能让 agent 决定做什么。

我希望 agent 能自己 和 function call 多轮沟通

譬如 agent 了解到用户需求后，确定了可以创建的角色，然后就自己创建角色，再填充角色信息，这期间不需要用户干预，可能会在一个对话里用到多个工具。

流程图里面，为了避免不断的要求用户输入，agent 应该先收集需求，譬如新建角色，可能会需要先了解是一个怎样类型的角色，譬如 奸臣、武将、丞相、嫔妃、外戚、甚至性别，或者用户描述一下这个人比较有名的事（可能他不记得名字），然后 开始 READY_NEW_CHARACTER 任务，得到现在有的角色，然后综合需求，筛选出一组合适且可以添加的角色，告诉给用户

如果是明确了角色，那么应该尽可能一次的把角色新建好，如果确定需要了解足够需求，那么最好能问清楚全部需求，再新建角色

所以，流程上，应该是根据当前状态，判断出当前需要哪些需求才行，然后和用户对话获得这些需求，再执行任务，所以感觉现在的 function call 和 流程图都不太合适。

### 实现方案

#### Agent Function Call 类型与任务协议设计

**统一入口：** 所有任务通过标准化 function call 进行，参数结构清晰，便于多轮自动化。

**协议设计要点：**
- 所有 function call 均带有 action 字段，明确任务类型。
- 参数结构统一，便于 agent 自动解析和多轮协作。
- 返回值包含 success、message、nextAction、options、data 等，支持多步任务流和智能提示。
- 支持上下文传递和任务回溯，便于复杂流程管理。

#### Agent 主动多轮 function call 协作（核心设计）

- agent 能根据用户初始需求，自动规划并执行多步 function call，无需每一步都等待用户输入。
- 例如：用户表达“我要一个新角色”，agent 自动判断可用角色，主动调用创建角色、补充属性、生成初始事件等 function call，直到任务完整或遇到需要用户决策的关键点才中断。
- agent 支持在一次任务流中串联多个工具/接口，自动收集和处理中间结果，实现“智能批量操作”。
- 这样可以极大提升内容生产效率，让 AI 真正成为“自动化内容管控助手”，而不是被动等待指令的工具。

#### agent 智能收集需求与任务流（推荐流程图与伪代码）

**推荐流程图（文字版）：**
1. agent 与用户多轮对话，主动理解和收集全部需求（如角色类型、性别、典型事件、描述等）
2. agent 智能判断当前状态，推断还缺哪些关键信息，主动提问补全（如用户只描述了事件，agent 自动追问角色类型/性别等）
3. agent 汇总所有需求后，自动查询已有数据，过滤不可用项，生成可添加角色/事件建议
4. agent 向用户确认最终方案，尽可能一次性收集完整信息，避免反复输入
5. agent 执行任务（如新建角色），自动补全属性、生成初始事件等，确保数据完整
6. agent 校验所有数据（唯一性、合法性），如有冲突自动建议修正
7. agent 记录每步操作与状态，支持回溯和修正
8. 任务完成后，返回结果与建议下一步

**典型多轮任务流示例：**
（新建角色场景）
1. agent 聊天收集需求（类型、性别、典型事件、描述等）
2. agent 智能补全缺失信息
3. agent 查询已有角色，筛选可添加项
4. agent 向用户确认角色方案
5. agent 一次性新建角色并补全全部属性
6. agent 自动生成初始事件
7. 校验数据，返回结果

**伪代码示例：**
```typescript
function agentCreateCharacterFlow(userInput) {
  let requirements = agent.collectRequirements(userInput);
  while (!agent.isRequirementsComplete(requirements)) {
    let missing = agent.getMissingRequirements(requirements);
    requirements = {...requirements, ...agent.askUserFor(missing)};
  }
  let candidates = agent.filterAvailableCharacters(requirements);
  agent.confirmWithUser(candidates);
  let character = agent.createCharacter(requirements);
  agent.fillCharacterAttributes(character, requirements);
  agent.createInitialEvents(character);
  agent.validateCharacter(character);
  agent.returnResult(character);
}
```

**agent 状态机设计（推荐）**
```typescript
enum AgentState {
  Idle,                // 等待用户输入或新会话
  CollectingNeeds,     // 收集/补全需求（多轮对话）
  ConfirmingPlan,      // 方案确认（角色/事件建议）
  ExecutingTask,       // 执行任务（如新建角色/事件）
  Validating,          // 校验数据完整性与合法性
  Completed,           // 任务完成，返回结果
  Error                // 异常/冲突处理
}
```

**完整任务流伪代码（多轮自动化）**
```typescript
function agentMainFlow(userInput) {
  agent.state = AgentState.CollectingNeeds;
  let requirements = agent.collectRequirements(userInput);

  // 多轮补全需求
  while (!agent.isRequirementsComplete(requirements)) {
    let missing = agent.getMissingRequirements(requirements);
    requirements = {...requirements, ...agent.askUserFor(missing)};
  }

  agent.state = AgentState.ConfirmingPlan;
  let candidates = agent.filterAvailableCandidates(requirements);
  agent.confirmWithUser(candidates);

  agent.state = AgentState.ExecutingTask;
  let result = agent.executeTask(requirements);

  agent.state = AgentState.Validating;
  let validation = agent.validateResult(result);

  if (validation.success) {
    agent.state = AgentState.Completed;
    agent.returnResult(result);
  } else {
    agent.state = AgentState.Error;
    agent.suggestCorrection(validation);
  }
}
```

#### editor2 项目 UI 设计建议

- UI 极简，三大区块：
  - 文件列表（左侧）：展示 gameconfig 目录结构，支持快速定位和切换
  - 卡片预览（右侧/弹窗）：选中角色或事件时，预览详细内容和属性

> ⚡️ 本方案建议新建 `editor2` 项目，技术栈与现有 editor 保持一致，但采用全新 agent 驱动架构。editor2 可并行开发，逐步迁移内容和功能，最大化创新和稳定性。

1. 梳理 editor 项目中所有与 gameconfig、角色、事件相关的核心类型和接口，整理成一份“数据结构参考”文档，便于 editor2 复用和优化。
2. 明确 agent 需要支持的所有 function call 类型和参数格式，设计统一的任务协议（如 startTask、updateTask、queryTask 等）。

#### editor2 文件结构与技术选型建议

- **技术栈：**
  - Next.js（版本号与 editor 保持一致，便于依赖和升级管理）
  - TypeScript 全面类型约束
  - 状态管理用 Zustand
  - UI 组件库建议流行且美观方案:
    - [Chakra UI](https://chakra-ui.com/)（极简风格，易用性高）

- **文件结构建议：**
  ```
  editor2/
    package.json
    next.config.js
    tsconfig.json
    public/
    src/
      app/           # Next.js 路由与页面
      components/    # 通用 UI 组件（如 ChatArea, FileList, CardPreview）
      agent/         # agent 核心逻辑与协议实现
      lib/           # 工具函数、数据处理、API 封装
      types/         # 类型定义（复用 editor & core 类型）
      store/         # 状态管理（如 Zustand/Redux）
      styles/        # 全局与局部样式
  ```
  - 结构与 editor 保持一致，便于迁移和维护
  - 组件命名与分区建议：ChatArea（主聊天区）、FileList（文件列表）、CardPreview（卡片预览）
  - agent 相关逻辑单独分层，便于扩展和测试

- **界面设计原则：**
  - UI 极简但不牺牲体验，主区块突出 agent 聊天与任务流
  - 组件库选型优先美观、易用、主流，保证长期维护和社区支持
  - 支持暗色模式和响应式布局
  - 预留扩展点，便于后续功能增强

#### editor 可迁移/重构模块评估
工具函数（lib/）

数据格式转换（如 YAML/JSON 互转、深拷贝、对象合并等）
路径解析与文件操作（如 gameconfig 路径拼接、文件读写、批量处理）
通用辅助函数（如数组去重、唯一性校验、字符串处理）
校验逻辑（ConfigValidator 相关）

角色、事件、整体配置的合法性校验（如唯一性、字段完整性、数据约束）
禁用名校验（forbidden_names.json 相关逻辑）
数据变更前后的冲突检测与修正建议
可直接复用 core 包的 ConfigValidator，editor2 只需做适配和扩展
数据管理模块

GameConfigManager：数据加载、保存、路径管理，支持多版本（dev/stable/release）
角色/事件的 CRUD 操作接口（如 create/update/delete/getAll/getById）
内存数据实例管理（如缓存、批量操作、事务处理）
版本切换与动态路径解析（禁止硬编码，统一通过 manager 获取）
可迁移的设计模式

Adapter 层：editor2 可复用 editor 的适配器模式，桥接 core 与 UI
统一接口定义：如 function call 协议、数据操作接口，便于 agent 自动化调用
需重构/优化部分

旧 editor 可能存在硬编码路径、UI耦合、命名不规范等问题，迁移时需统一规范
状态管理建议全部迁移到 Zustand，去除遗留 Redux/Context 逻辑
工具函数需按 editor2 目录结构拆分，提升可维护性和复用性

### 数据结构参考（editor & gameconfig 相关）

#### 1. GameConfigManager

- 负责管理 gameconfig 数据的加载、保存、路径解析。
- 主要方法：
  - `getConfigPath(project: string): string` —— 根据项目类型返回对应数据路径（如 editor 用 dev，prototype 用 stable）。
  - `loadConfig(): GameConfig` —— 加载当前配置数据。
  - `saveConfig(config: GameConfig): void` —— 保存配置数据。


#### 2. 角色（Character）

- 角色数据通常存储于 `gameconfig/versions/{version}/characters/` 下的 YAML 文件。
- 典型结构：
  ```typescript
  interface Character {
    id: string;                // 唯一标识
    name: string;              // 角色名
    attributes: CharacterAttributes; // 属性集合
    events: string[];          // 关联事件ID列表
    description?: string;      // 角色简介
    // ...其他自定义字段
  }
  ```
- 属性类型示例：
  ```typescript
  interface CharacterAttributes {
    strength: number;
    intelligence: number;
    charm: number;
    // ...可扩展字段
  }
  ```


#### 3. 事件（Event）

- 事件数据通常存储于 `gameconfig/versions/{version}/events/` 下的 YAML 文件。
- 典型结构：
  ```typescript
  interface GameEvent {
    id: string;                // 唯一标识
    title: string;             // 事件标题
    description: string;       // 事件描述
    conditions: EventCondition[]; // 触发条件
    effects: EventEffect[];    // 事件效果
    relatedCharacters?: string[]; // 关联角色ID
    // ...其他自定义字段
  }
  ```
- 条件与效果类型示例：
  ```typescript
  interface EventCondition {
    type: string;              // 条件类型
    params: Record<string, any>;
  }

  interface EventEffect {
    type: string;              // 效果类型
    params: Record<string, any>;
  }
  ```

#### 4. 校验与工具接口

- `ConfigValidator.validateCharacter(character: Character): ValidationResult`
- `ConfigValidator.validateEvent(event: GameEvent): ValidationResult`
- `ConfigValidator.validateConfig(config: GameConfig): ValidationResult`
- 这些接口用于保证数据完整性、唯一性、合法性，editor2 可直接复用。

#### 5. 主要操作接口（editor 侧）

- 角色相关：
  - `createCharacter(data: Character): void`
  - `updateCharacter(id: string, data: Partial<Character>): void`
  - `deleteCharacter(id: string): void`
- 事件相关：
  - `createEvent(data: GameEvent): void`
  - `updateEvent(id: string, data: Partial<GameEvent>): void`
  - `deleteEvent(id: string): void`
- 数据获取：
  - `getAllCharacters(): Character[]`
  - `getAllEvents(): GameEvent[]`
  - `getCharacterById(id: string): Character | undefined`
  - `getEventById(id: string): GameEvent | undefined`

#### 6. 约束与命名规范

- 角色名、事件名需唯一，禁止使用 `forbidden_names.json` 中的保留字。
- 所有数据变更需通过 validator 校验，防止冲突和非法数据。

#### 7. 版本与路径管理

- 数据路径通过 `GameConfigManager.getConfigPath(project)` 动态获取，禁止硬编码。
- 支持多版本（dev、stable、release），便于内容隔离和测试。

#### 2. Agent 核心类设计

- 新建 `EditorAgent` 类，内部维护：
  - `geminiClient: GeminiClient`（AI接口）
  - `gameConfig: GameConfigManager`（内存数据实例）
  - `currentTask: AgentTask`（当前任务状态）
  - `history: AgentHistory[]`（多轮对话与操作记录）

#### 3. 任务驱动接口定义

- 统一入口：`startTask(task: AgentTask): AgentResponse`
  - `AgentTask` 包含 action 类型、参数、上下文等
  - 支持 READY_NEW_CHARACTER、NEW_CHARACTER、READY_NEW_EVENT、NEW_EVENT 等 action
  - 每个 action 都有对应的处理方法和 prompt 模板

#### 4. 任务流与状态管理

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
