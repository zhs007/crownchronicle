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
### EventConditions 新结构示例

```typescript
// 事件激活条件示例
const conditions: EventConditions = {
  attributeConditions: [
    { target: 'player', attribute: 'power', min: 40, max: 60 },
    { target: 'self', attribute: 'military', min: 80 },
    { target: 'player', attribute: 'health', min: 30 },
    { target: 'self', attribute: 'popularity', max: 100 }
  ]
};
```

#### 内容编辑说明

- 每个 EventConditionItem 表示一个判定条件，target 可选 'self' 或 'player'。
- attribute 必须为 CharacterAttributes 的 key（如 power、military、wealth、popularity、health、age）。
- min/max 可选，若都存在则判定区间，单独存在则判定下限或上限。
- 可组合多个条件，全部满足才激活事件。
- 内容编辑时请严格遵循上述结构，避免使用旧字段（如 minPower、maxHealth 等）。

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
