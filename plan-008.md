### 需求

角色类型里，现在有 2 套属性配置，是为了兼容以前数据的，我觉得需要移除掉。

// 兼容 YAML 卡片的扁平属性与 tags 字段
export interface CharacterCard {
  id: string;
  name: string;
  tags: string[];
  power: number;        // 移除
  military: number;     // 移除
  wealth: number;       // 移除
  popularity: number;   // 移除
  health: number;       // 移除
  age: number;          // 移除
  events: string[];
  // 兼容核心类型
  displayName: string;  // 移除
  currentTitle: string; // 移除
  role: string;         // 移除
  description: string;
  identityRevealed: boolean;        // 移除
  attributes: CharacterAttributes;
  revealedTraits: string[];         // 移除
  hiddenTraits: string[];           // 移除
  discoveredClues: string[];        // 移除
  totalClues: number;               // 移除
  eventIds: string[];
  commonCardIds: string[];
}

然后移除全部相关逻辑

### 实现方案

1. 类型定义调整
   - 在 `core/src/types/character.ts` 中，移除 `CharacterCard` 接口的以下字段：
     - power, military, wealth, popularity, health, age
     - displayName, currentTitle, role, identityRevealed
     - revealedTraits, hiddenTraits, discoveredClues, totalClues

   **⚠️ 注意：移除前必须确保上述能力属性已全部迁移并正确映射到 `attributes: CharacterAttributes`，且所有业务逻辑均已切换为通过 `attributes` 访问。绝不能误删仍在用的字段！**

   **⚠️ 补充注意事项：**
   - 移除前需确认所有历史数据、导入流程、编辑器和前端都已适配 `attributes`，避免因老数据未迁移导致丢失信息。
   - 除能力属性外，像 `displayName`、`currentTitle`、`role`、`identityRevealed`、`revealedTraits`、`hiddenTraits`、`discoveredClues`、`totalClues` 等字段，也要全局排查是否仍有业务或 UI 依赖，不能只看类型定义。
   - 如有自动化数据迁移脚本或兼容层，需同步更新，避免新老数据混用出错。
   - 文档和注释中如有对这些字段的说明，也要同步清理，避免误导后续开发者。
   - 若有外部依赖（如第三方工具、AI 生成器等）引用旧字段，也需同步通知或适配。
   - 建议移除前先做一次全局字段引用统计和数据结构现状盘点，确保所有入口和出口都已切换到新结构。

   - 检查 `CharacterAttributes` 是否已覆盖上述能力属性，如有冗余一并清理。

2. 相关逻辑移除
   - 全局搜索上述字段名，删除或重构所有依赖这些字段的逻辑，包括但不限于：
     - 角色初始化、序列化、反序列化
     - 角色属性展示、编辑、导入导出
     - 事件、卡牌、AI 生成、数据校验等流程
   - 检查 `ConfigValidator`、`GameEngine`、`CharacterGenerator` 等核心模块，确保不再引用被移除字段。

3. 数据结构与配置同步
   - 检查 `gameconfig/` 下的角色数据（如 YAML/JSON），移除冗余字段，确保与新类型一致。
   - 更新 `ConfigValidator` 的校验规则，避免校验已移除字段。

4. 测试与验证
   - 更新或移除相关单元测试，确保测试覆盖新结构。
   - 运行 `core` 的全部测试，确保无类型和运行时错误。
   - 用编辑器和原型项目实际加载、编辑角色，验证无兼容性问题。

5. 文档与说明同步
   - 更新 `README.md`、类型说明文档，反映最新的 `CharacterCard` 结构。
   - 如有必要，补充迁移说明，指导如何从旧数据迁移到新结构。