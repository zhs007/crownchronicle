# 角色卡 YAML 结构说明

角色卡文件采用 YAML 格式，字段与 core/types/character.ts 的 CharacterCard 类型一致。

## 字段示例
```yaml
id: char001
name: "诸葛 亮"
tags:
  - 丞相
  - 忠臣
description: "三国著名丞相，智慧与忠诚的象征。"
attributes:
  power: 90
  military: 80
  wealth: 60
  popularity: 95
  health: 70
  age: 54
eventIds:
  - event_zhugeliang_1
  - event_zhugeliang_2
commonCardIds: []

---

## 事件卡 Option 结构与配置规则

每张事件卡必须且只能有 2 个选项（options），每个选项结构如下：

```yaml
options:
  - description: "选项描述文本"
    target: "player" | "self"
    attribute: "power"
    offset: 8
  - description: "选项描述文本"
    target: "player" | "self"
    attribute: "power"
    offset: -8
```

### 配置规则

- options 字段为长度为 2 的数组，且每个选项必须包含 description、target、attribute、offset 字段。
- target 仅允许 "player" 或 "self"。
- attribute 仅允许 CharacterAttributes 枚举中的属性名（如 power、military、wealth、popularity、health、age）。
- offset 必须为数字，可为正负。

### 事件卡 YAML 示例

```yaml
id: event_xxx
title: 某事件标题
weight: 10
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

---

- `tags` 字段为必填，类型为字符串数组。
- `name` 字段格式为“姓 名”，中间一个空格。
- `attributes` 字段为必填，包含所有角色属性。
- `eventIds` 字段为必填，列出所有关联事件。
- 实际项目中，`eventIds` 字段建议由工具或脚本自动递归收集角色相关事件，无需手动维护。角色 YAML 可留空 eventIds 字段，由核心逻辑（如 GameEngine/DataProvider）在加载或生成时自动填充。
- `commonCardIds` 字段为必填，列出所有通用卡 ID。

## 兼容性与迁移
如有历史 JSON 数据，需批量转换为 YAML 并移除所有已废弃字段，仅保留上述字段。
