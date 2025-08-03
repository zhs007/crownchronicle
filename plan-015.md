### 需求

我希望 editor 项目调整如下：

- 有一个 agent 的实例，它来维护 gemini api client，和 当前的 gameconfig 内存实例。
- 新增一个 function call——startTask，由 gemini 理解用户需求，并拆分为合适的数据，传给 agent，让 gemini 知道当前是什么任务，譬如 
{action: 'READY_NEW_CHARACTER'}，这时返回 一段新的 prompt 给 gemini，哪些角色是已经存在的，不应该添加他们。
{action: 'NEW_CHARACTER', character: '诸葛亮'}，返回一段新的 prompt 给 gemini，是否成功，如果 角色创建成功，那么 接下来需要传哪些值，或用什么 function call 初始化角色。
{action: 'READY_NEW_EVENT', character: '诸葛亮'}，返回一段新的 prompt 给 gemini，告诉它哪些事件是不应该被添加的。
{action: 'NEW_EVENT', character: '诸葛亮', event: '事件 title'}，这个类似创建角色。

这样，通过一个 startTask ，不断的修正 gemini 的操作，在保证满足复杂约束条件下，尽可能让 gemini 决定做什么。

我希望 gemini 能自己 和 function call 多轮沟通

譬如 gemini 了解到用户需求后，确定了可以创建的角色，然后就自己创建角色，再填充角色信息，这期间不需要用户干预，可能会在一个对话里用到多个工具。

流程里面，为了避免不断的要求用户输入，gemini 应该先收集需求，譬如新建角色，可能会需要先了解是一个怎样类型的角色，譬如 奸臣、武将、丞相、嫔妃、外戚、甚至性别，或用户描述一下这个人比较有名的事（可能他不记得名字），当然，这里不一定会需要了解得非常详细，只是一个筛选条件，越详细建议会越准确。
然后 开始 READY_NEW_CHARACTER 任务，得到现在有的角色，然后综合需求，筛选出一组合适且可以添加的角色，告诉给用户

用户确定给出了具体的角色后，因为创建角色这个操作本身不会有约束检查，所以应该一次的把角色新建好。我觉得还是应该譬如 startTask {action: 'NEW_CHARACTER', character: '诸葛亮'}，然后然后 newCharacter 把角色建好。

接下来，gemini 应该主动进入 新建这个角色事件卡的状态，startTask {action: 'READY_NEW_EVENT', character: '诸葛亮'}，准备新建事件卡时，其实是可能已经存在一些该角色的事件卡，所以这时startTask应该返回一组新的 prompt 约束信息，让 gemini 给出正确的事件卡建议。
事件卡可能会比较复杂，所以需要先描述给用户，用户可以提出修改意见，最后确认后，再 newEvent 。

所以，流程上，应该是根据当前状态，判断出当前需要哪些需求才行，然后和用户对话获得这些需求，再执行任务。

---

### 最终方案：AI 驱动的对话式工作流 (2025-08-02 确认)

经过深入讨论，我们确定了一套全新的、以 AI 为绝对核心的架构，旨在实现真正自然、灵活、由 AI 主导的对话式内容创作。此方案将取代上述初步设想。

#### 核心理念：AI 是“编辑”，后台是“秘书”

此架构彻底颠覆了由后台系统驱动流程的传统模式。

*   **AI (The Editor):** AI 是整个工作流的唯一驱动者。它负责理解用户意图、判断对话进展、决定下一步行动（是继续提问、澄清问题，还是调用工具），并生成引导性的自然语言回复。
*   **后台 (The Secretary):** 后台系统退居为辅助角色。其职责被简化为：
    1.  **执行工具**: 响应 AI 的指令，调用如 `save_event` 等函数。
    2.  **维护上下文**: 为每一次对话忠实地传递和保存一个关键的 `WorkflowContext` 对象。

#### 关键实现：`WorkflowContext` 与“超级提示” (Super Prompt)

我们将不再为每个任务阶段编写独立的 Prompt。取而代之的是一个统一的、功能强大的“超级提示”，它会指导 AI 如何利用一个名为 `WorkflowContext` 的 JSON 对象来管理和推进对话。

1.  **`WorkflowContext` 对象**:
    这是一个在前端和后端之间传递的、轻量级的 JSON 对象，用于追踪对话状态。其结构如下：

    ```typescript
    // editor/src/types/workflow.ts
    export interface WorkflowContext {
      // 当前工作流的名称, 如 'add_event'
      workflow: string | null; 
      
      // 当前进展阶段, 由 AI 自行更新, 如 'selecting_topic', 'designing_effects'
      stage: string | null;
      
      // 数据暂存区，AI 在此逐步构建最终要保存的 JSON 对象
      data: Record<string, any>; 
      
      // AI 上一次向用户提出的问题，用于它自己判断用户的回复是否有效
      lastQuestion: string | null; 
    }
    ```

2.  **“超级提示” (Super Prompt)**:
    这是 `gemini.ts` 的核心。它会指示 AI 遵循以下工作逻辑：
    *   **分析 `WorkflowContext`**: 查看上下文，了解“我们聊到哪一步了”。
    *   **结合用户输入**: 理解用户的最新回复。
    *   **自主决策**:
        *   如果任务刚开始，则识别意图，初始化 `WorkflowContext`。
        *   如果任务进行中，则根据用户的回答更新 `context.data`，推进 `context.stage`，并构思下一个问题。
        *   如果任务所需信息已全部集齐，则决定调用相应的工具（如 `save_character`）。
    *   **生成结构化回复**: AI 的每次回复都必须包含两部分：
        a.  **`reply_to_user`**: 给用户看的自然语言对话。
        b.  **`updated_context`**: 更新后的 `WorkflowContext` JSON 对象。

#### 架构优势

*   **高度灵活性**: AI 可以根据对话的实际走向，动态调整流程，而不是被预设的僵硬步骤束缚。
*   **强大的扩展性**: 添加新的工作流（如“平衡角色属性”、“生成派系关系”）只需在“超级提示”中教会 AI 如何使用新的 `workflow` 名称和 `stage` 即可，后台代码改动极小。
*   **真正自然的用户体验**: 用户始终感觉在与一个聪明的、能理解上下文的专家交谈，所有复杂的流程和状态管理都在后台由 AI 无缝处理。

此方案将作为 `plan-015` 的最终实施蓝图。