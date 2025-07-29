# plan-011 类型结构精简与迁移总结报告

## 需求概述

本任务旨在对 core/src/types/ 目录下的 TypeScript 类型定义进行全面梳理和精简，移除重复和废弃类型，确保类型结构清晰、唯一，并与业务逻辑和数据配置保持一致。

- 移除重复类型（如 CardPools、CommonCard、EventConditions、Faction、FactionSystem、CourtPolitics、FactionEffect 等在 game.ts、faction.ts 中的重复定义）。
- 移除已废弃类型（如 CharacterEffect、InterCharacterEffect、FactionEffect）。
- 对 EventConditions、DynamicWeight 等标记为“待优化”的类型，结合实际业务场景进行字段精简或结构调整。

## 实现方案

1. 类型结构梳理与精简
   - 保留主类型定义文件（card.ts、character.ts、event.ts、config.ts、gamecore.ts、game.ts）。
   - 移除所有重复和废弃类型，主类型文件仅定义核心结构。
   - 其它类型文件仅做 re-export 或注释说明，不再定义重复类型。
   - 依赖统一从主类型文件导入，避免跨文件重复定义。

2. 代码同步与重构
   - 逐一检查 core/src/types/ 下所有类型文件，按方案删除或调整类型定义。
   - 检查所有依赖这些类型的核心逻辑、适配器、测试用例，统一从主类型文件导入。
   - 对于移除的类型，逐步替换为新的数据结构或字段，确保业务逻辑不受影响。

3. 数据结构与配置同步
   - 检查 gameconfig/ 目录下所有 YAML 配置文件（角色、事件、卡牌等），确保字段与最新类型定义一致。
   - 使用脚本批量处理 YAML 文件，移除废弃字段，补全必需字段，保持数据结构规范。
   - 如有字段变更，同步更新 YAML 示例和文档说明。
   - 使用 core 的 ConfigValidator 对所有 YAML 配置进行批量校验，及时修复异常。

4. 文档与注释维护
   - 在每个类型文件顶部补充用途说明和字段注释，便于后续维护和协作。
   - 更新 core/README.md、AGENT_GUIDE.md 等关键文档，说明类型结构调整原因和迁移指引。
   - 记录本次类型精简和迁移过程于 plan-011.md，实现方案和变更点清晰可查。

5. 测试与验证
   - 运行 core 的所有单元测试，确保类型调整后功能正常。
   - 使用 ConfigValidator 对 gameconfig 数据进行批量校验，及时修复异常。
   - 如有必要，补充针对新类型结构的测试用例。

6. 后续扩展与回滚机制
   - 对于 CourtPolitics、Faction、FactionSystem、FactionEffect 等暂时移除的类型，先行移除，且保证其它逻辑不会使用到这些类型。
   - 方案实施后，持续收集实际开发和玩法反馈，动态优化类型结构。

## 关键决策

- 类型唯一性优先，所有核心类型仅在主类型文件定义，避免重复和分散。
- 废弃类型彻底移除，保证代码和数据结构纯净。
- 所有依赖统一主类型入口，便于维护和扩展。
- 配置、测试、适配器等需同步主类型结构，保持一致性。

## 配置示例

### 角色配置（character.yaml）
```yaml
id: char001
name: "诸葛亮"
description: "蜀汉丞相，睿智忠诚。"
initialAttributes:
  power: 90
  military: 80
  wealth: 60
  popularity: 95
  health: 70
  age: 54
```

### 事件配置（event.yaml）
```yaml
id: event_001
title: "草船借箭"
options:
  - description: "智取箭矢"
    target: self
    attribute: power
    offset: 8
  - description: "协助玩家"
    target: player
    attribute: power
    offset: 8
weight: 10
```

## 文件校验与自动修复工具

为确保所有 YAML 配置与最新类型定义一致，项目实现了自动化校验与修复脚本：

### fix-config.js
- 位置：`gameconfig/fix-config.js`
- 主要功能：
  - 批量校验角色、事件等 YAML 配置文件结构和字段完整性。
  - 自动检测缺失字段并补全默认值（如角色属性缺失自动补 50，事件选项缺失字段自动补空字符串或 0，title 缺失补“未命名事件”）。
  - 输出详细缺失字段提示，并自动保存修复后的配置文件。
  - 支持深度校验 event options 数组及其字段。
- 用法：
  ```bash
  node gameconfig/fix-config.js
  ```
- 注意事项：
  - 校验逻辑与 core/src/types/ 主类型定义保持同步，需及时更新。
  - 建议每次类型结构调整或数据批量变更后运行一次，确保所有配置文件合规。
  - 校验结果会输出详细缺失字段、自动修复提示，便于内容编辑和维护。

### 配合 ConfigValidator 使用
- fix-config.js 调用 core 的 `ConfigValidator`，实现批量校验和修复。
- 可结合单元测试和 CI 流程，自动校验所有配置文件。

## 注意事项

- 类型结构调整后，所有业务逻辑、配置、测试需同步更新。
- 仅主类型文件可定义核心类型，扩展请在主类型文件补充。
- 配置校验、数据修复建议统一通过 core 的 ConfigValidator 和自动化脚本完成。
- 变更记录与迁移方案详见 plan-011.md。

---

本报告归档于项目根目录，供后续查阅和协作参考。
