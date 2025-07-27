# Crown Chronicle 配置命名与目录规范（agent.md）

## 1. 角色 ID 命名规则
- 角色目录名、id 字段均使用角色汉语拼音（小写、无空格、无特殊符号）。
  - 示例：
    - 诸葛亮 → `zhugeliang`
    - 和珅 → `heshen`
    - 武则天 → `wuzetian`
- 角色目录结构：
  - `characters/zhugeliang/character.yaml`
  - `characters/zhugeliang/events/zhugeliang_event_001.yaml`

## 2. 事件 ID 命名规则
- 事件 id 由角色拼音 + `_event_` + 三位数字组成。
  - 示例：`zhugeliang_event_001`
- 通用卡事件 id 由通用卡拼音 + `_event_` + 三位数字组成。
  - 示例：`chancellor_event_001`

## 3. 选项 ID 命名规则
- 选项 id 由事件 id + `_choice_` + 两位数字组成。
  - 示例：`zhugeliang_event_001_choice_01`
- 保持唯一性，避免重复。

## 4. 目录结构规范
- 角色：
  - `characters/<拼音>/character.yaml`
  - `characters/<拼音>/events/<事件id>.yaml`
- 通用卡：
  - `commoncards/<拼音>/commoncard.yaml`
  - `commoncards/<拼音>/events/<事件id>.yaml`

## 5. 其它建议
- 文件名、id、引用均保持拼音风格一致。
- 禁止使用中文、空格、特殊符号。
- 所有引用均以 id 字段为准，避免硬编码路径。

---
如有新增类型或特殊需求，请在本文件补充说明。
