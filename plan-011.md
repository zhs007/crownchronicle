### 需求

下面是 core/src/types/ 目录下的 ts 类型定义，有重复和需要移除的

card.ts
CommonCard
CardPools

character.ts
CharacterAttributes
CharacterCard
CharacterEffect      // 移除
InterCharacterEffect // 移除
CharacterState
CharacterConfig
FactionEffect        // 移除

config.ts
DataProvider

event.ts
OptionTarget (类型别名)
EventOption
EventConditions   // 待优化
EventCard
DynamicWeight     // 待优化
EventConfig

faction.ts
CourtPolitics     // 先移除，后续有需要再加
Faction           // 先移除，后续有需要再加
FactionSystem     // 先移除，后续有需要再加
FactionEffect     // 先移除，后续有需要再加

game.ts
CardPools         // 重复了，需要移除
CommonCard        // 重复了，需要移除
EventConditions   // 重复了，需要移除
Faction           // 重复了，需要移除
FactionSystem     // 重复了，需要移除
CourtPolitics     // 重复了，需要移除

gamecore.ts
GameEvent
GameState
GameConfig
PlayerStrategy

### 实现方案
1. 类型结构梳理与精简

按照需求列表，保留主类型定义文件（如 card.ts、character.ts、event.ts、config.ts、gamecore.ts）。
移除重复类型（如 CardPools、CommonCard、EventConditions、Faction、FactionSystem、CourtPolitics、FactionEffect 在 game.ts、faction.ts 中的重复定义）。
移除已废弃类型（如 CharacterEffect、InterCharacterEffect、FactionEffect）。
对 EventConditions、DynamicWeight 等标记为“待优化”的类型，结合实际业务场景进行字段精简或结构调整。

2. 代码同步与重构

在 core/src/types/ 目录下，逐一检查每个类型文件，按方案删除或调整类型定义。
检查所有依赖这些类型的核心逻辑、适配器、测试用例，统一从主类型文件导入，避免跨文件重复定义。
对于移除的类型，逐步替换为新的数据结构或字段，确保业务逻辑不受影响。

3. 数据结构与配置同步

检查 `gameconfig/` 目录下所有 YAML 配置文件（如角色、事件、卡牌等），确保字段与最新类型定义一致。
使用脚本或工具批量处理 YAML 文件，移除废弃字段，补全必需字段，保持数据结构规范。
如有字段变更，同步更新 YAML 示例和文档说明。
如有需要可补充 JSON Schema，当前以 TypeScript 类型和自定义校验脚本为主，确保 YAML 数据结构与 TypeScript 类型一致。
使用 core 的 `ConfigValidator` 对所有 YAML 配置进行批量校验，及时修复异常。
建议在数据变更后，统一通过自动化校验流程进行一致性检查。

4. 文档与注释维护

在每个类型文件顶部补充用途说明和字段注释，便于后续维护和协作。
更新 core/README.md、AGENT_GUIDE.md 等关键文档，说明类型结构调整原因和迁移指引。
记录本次类型精简和迁移过程于 plan-011.md，实现方案和变更点清晰可查。

5. 测试与验证

运行 core 的所有单元测试，确保类型调整后功能正常。
使用 ConfigValidator 对 gameconfig 数据进行批量校验，及时修复异常。
如有必要，补充针对新类型结构的测试用例。

6. 后续扩展与回滚机制

对于 CourtPolitics、Faction、FactionSystem、FactionEffect 等暂时移除的类型，先行移除，且保证其它逻辑不会使用到这些类型。
方案实施后，持续收集实际开发和玩法反馈，动态优化类型结构。