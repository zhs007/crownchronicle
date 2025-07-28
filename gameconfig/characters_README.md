# 角色卡 YAML 结构说明

角色卡文件采用 YAML 格式，字段与 core/types/character.ts 的 CharacterCard 类型一致。

## 字段示例
```yaml
id: char001
name: "诸葛 亮"
tags:
  - 丞相
  - 忠臣
power: 90
military: 80
wealth: 60
popularity: 95
health: 70
age: 54
events:
  - 草船借箭
  - 三气周瑜
```

- `tags` 字段为必填，类型为字符串数组。
- `name` 字段格式为“姓 名”，中间一个空格。
- 其他属性可根据实际需要补充。

## 兼容性与迁移
如有历史 JSON 数据，需批量转换为 YAML 并补充 `tags` 字段。
