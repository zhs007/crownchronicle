### 需求

以下结构是以前的冗余设计，暂时用不上了，需要移除掉

- RelationshipWithEmperor
- CharacterRelationship
- FactionInfo
- CharacterInfluence
- CharacterStatusFlags

### 实现方案

1. **全局检索冗余类型定义**
   - 在 `core/src/types/game.ts` 及相关类型定义文件中，查找并确认以下类型的定义和导出：
     - `RelationshipWithEmperor`
     - `CharacterRelationship`
     - `FactionInfo`
     - `CharacterInfluence`
     - `CharacterStatusFlags`
   - 使用全局搜索确保没有遗漏。

2. **移除类型定义**
   - 在类型定义文件（如 `core/src/types/game.ts`）中，彻底删除上述类型的定义、导出及相关注释。
   - 检查是否有 re-export 或 index 文件需要同步移除。

3. **清理类型引用**
   - 在 `core/`、`editor/`、`prototype/`、`gameconfig/` 各包中，查找所有对上述类型的引用（包括类型注解、接口继承、对象属性等）。
   - 对于仅作为类型使用的地方，直接移除相关类型注解或属性。
   - 若有依赖这些类型的逻辑代码（如方法、字段、校验等），根据实际情况重构或删除相关实现，确保不会影响现有功能。

4. **同步移除相关数据结构**
   - 检查 `gameconfig/versions/` 下的 YAML/JSON 配置文件，确认是否有与上述类型相关的数据字段（如角色关系、派系信息等）。
   - 若有，移除对应字段，并更新数据 schema（如有类型校验器/validator）。

5. **更新配置校验与适配层**
   - 检查 `core/src/engine/ConfigValidator.ts` 及各项目的适配层（如 `GameAdapter`），移除对上述类型和字段的校验逻辑。
   - 确保 `ConfigValidator` 不再依赖这些已删除的结构。

6. **单元测试与验证**
   - 检查 `core/__tests__/` 及各项目的测试用例，移除或重构涉及上述类型的测试。
   - 运行 `npm run build --workspace=core`，确保核心包能顺利编译。
   - 依次重启并验证 `editor` 和 `prototype`，确保无类型或运行时错误。

7. **文档与注释同步更新**
   - 检查 `README.md`、`AGENT_GUIDE.md`、`NAMING_CONVENTIONS.md`、`init-editor.md` 等文档，移除对上述类型及其相关字段（如 `initialRelationshipWithEmperor`、`factionInfo`、`relationshipWithEmperor` 等）的描述和示例。
   - 检查所有数据示例、组件注释、UI 展示逻辑（如 `editor/src/components/DataPreview.tsx`），同步移除相关字段和渲染。
   - 检查 `gameconfig/versions/` 下的所有角色配置文件，移除相关字段及注释。
   - 对于历史方案文档（如 `plan-003.md`）中涉及的相关结构，建议标注“已废弃”或直接删除。
   - 若有相关开发说明或注释，保持同步。

8. **提交与变更说明**
   - 按照工作区规范，分阶段提交代码（如“移除类型定义”、“清理引用”、“更新配置与校验”等）。
   - 在 PR 或 commit message 中详细说明本次变更的范围和影响，便于后续追溯。