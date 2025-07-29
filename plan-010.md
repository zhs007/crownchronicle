### 需求

事件卡必须 且 只能有 2 个选项。
选项需要能配置修改一组角色属性，只能修改 玩家 或 自己角色的属性，CharacterAttributes里的值，我觉得规则如下

target: player.power
offset: 8

target: self.power
offset: -8

这样。

### 实现方案

#### Option 结构字段说明

每个 Option 应包含如下字段：

- description: string （玩家可见文本，不支持多语言）
- target: "player" | "self"
- attribute: CharacterAttributes 中的属性名
- offset: number

#### 事件卡 YAML 配置示例

```yaml
id: event_xxx
title: 某事件标题
options:
  - description: 增强自己的力量
    target: self
    attribute: power
    offset: 8
  - description: 帮助玩家提升力量
    target: player
    attribute: power
    offset: 8
```

1. **数据结构调整**
   - 修改事件卡（EventCard）数据结构，确保每张事件卡只能有2个选项（如 options: [Option, Option]）。
   - 定义 Option 结构，包含属性修改规则（如 target, offset 字段）和描述字段（如 description），description 用于配置给玩家看的文本。target 仅允许 "player" 或 "self"，属性名限定为 CharacterAttributes 枚举中的值。

2. **配置与校验**
   - 更新 gameconfig 事件卡 YAML 配置格式，强制每个事件卡 options 数组长度为2，且每个 option 的 description、target、属性名、offset 合法。
   - 在 core 的 ConfigValidator 中增加校验逻辑，确保事件卡配置符合上述规则（选项数量、description 存在、target 合法、属性名合法、offset 为数字）。

3. **核心逻辑实现**
   - 在 core 的 GameEngine 或相关处理逻辑中，实现事件卡选项的属性修改功能：根据 target 判断修改玩家还是当前角色的属性，并应用 offset。
   - 保证事件卡处理流程只允许2个选项，且只能修改指定对象的属性。

4. **适配层与 UI**
   - prototype 和 editor 项目需适配新结构，确保事件卡编辑、展示、选择逻辑与新规则一致。
   - 编辑器（editor）需支持选项属性的可视化编辑与校验，前端表单限制选项数量和 target/属性名选择，并支持 description 文本编辑。

5. **数据迁移与兼容**
   - 检查现有事件卡数据，批量修正不符合新规则的数据（如选项数量不为2、target/属性名不合法等）。
   - 提供脚本或工具辅助数据迁移。

6. **测试与验证**
   - 在 core 的单元测试中补充事件卡选项相关的测试用例，覆盖配置校验、属性修改逻辑等。
   - 在 editor/prototype 端进行集成测试，确保前后端一致性。

7. **文档更新**
   - 同步更新 core、gameconfig、editor、prototype 各自的开发文档，说明事件卡 Option 结构、配置规则和示例。
   - 在 gameconfig/characters_README.md 或相关文档中补充 YAML 配置示例，便于内容编辑和后续维护。

8. **结项报告**
   - 任务全部完成后，需撰写本任务的总结报告，文件名为 plan-010-report.md，归档于项目根目录，内容包括需求、实现方案、关键决策、配置示例和注意事项等。

