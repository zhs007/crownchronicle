### 需求

export interface EventConditions {
  attributeConditions?: EventConditionItem[];
}

type EventConditionItem = {
  target: 'self' | 'player';
  attribute: keyof CharacterAttributes;
  min?: number;
  max?: number;
};

事件激活条件需要重构，现有的字段都需要移除，是一组条件配置的集合，类似 EventOption，每个条件 需要有 target（也是 self 或 player）、attribute 也是 CharacterAttributes 的 key、min 和 max 是 2 个可选值，如果都有值，表示 attribute 需要 >= min 且 <= max，如果只有一个有值，就是 >= min 或 <= max


### 实现方案

1. 定义新的事件激活条件类型 `EventConditionItem`，包含：
   - `target`: `'self' | 'player'`，表示条件作用对象
   - `attribute`: `keyof CharacterAttributes`，指定角色属性
   - `min?`: number，可选，属性下限
   - `max?`: number，可选，属性上限

2. `EventConditions` 仅保留 `attributeConditions?: EventConditionItem[]`，移除原有的 min/max 字段。

3. 修改事件判定逻辑，遍历 `attributeConditions`，根据 `target` 获取对应角色对象，判断其 `attribute` 是否满足 `min/max` 限制。

4. 在 core 包中实现判定函数 `checkEventConditions(eventConditions, context)`，支持新结构。

5. 更新相关类型定义和文档，确保 `EventConditions` 结构清晰，便于内容编辑和验证。

6. 在 `ConfigValidator` 增加对新条件结构的校验，保证配置合法性。

7. 编写单元测试覆盖典型场景，包括多条件组合、边界值、target 区分等。
