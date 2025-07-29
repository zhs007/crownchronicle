### 需求

继续简化游戏基础数据结构

export interface CharacterState {
  characterId: string;
  alive: boolean;
  identityProgress: {                                 // 移除
    revealed: boolean;                                // 移除
    cluesFound: string[];                             // 移除
    traitsRevealed: string[];                         // 移除
    discoveryProgress: number;                        // 移除
  };
  // 移除 currentTitle 和 titleHistory，称谓相关信息请用 description 或 attributes 字段
}

// 角色配置结构
export interface CharacterConfig {
  id: string;

  name: string;
  displayName: string;                                // 移除
  role: string;                                       // 移除
  description: string;
  category: string;                                   // 移除
  rarity: 'common' | 'rare' | 'epic' | 'legendary';   // 移除
  initialAttributes: CharacterAttributes;
  conditions?: {                                      // 移除
    minReignYears?: number;                           // 移除
    maxAge?: number;                                  // 移除
    excludeCharacters?: string[];                     // 移除
    requiredFactions?: string[];                      // 移除
    conflictingFactions?: string[];                   // 移除
  };
  backgroundClues: {                                  // 移除
    appearance: string;                               // 移除
    mannerisms: string;                               // 移除
    preferences: string;                              // 移除
    relationships: string;                            // 移除
    secrets: string;                                  // 移除
  };
  commonCardIds?: string[];
}

### 实现方案

1. **类型定义调整（core/src/types/character.ts）**
   - 删除 `CharacterState` 和 `CharacterConfig` 中所有标记为“移除”的字段，包括嵌套结构。
   - 检查 `CharacterAttributes` 是否有依赖被删字段，必要时同步调整。
   - 检查是否有其他类型（如 event、card、faction）引用了被删字段，统一清理。

2. **核心逻辑重构（core/src/engine/、core/src/data/）**
   - 移除角色生成、状态管理、校验等逻辑中对被删字段的处理。
   - 检查 `ConfigValidator`，确保不会校验已移除字段。
   - 检查 `GameEngine`、`CharacterGenerator`、`GameSimulator` 等是否有依赖，重构相关方法和流程。

3. **数据文件同步（gameconfig/versions/dev/ 和 stable/characters/*.json）**
   - 批量移除所有角色数据中的被删字段，确保与新类型一致。
   - 检查 `config.json`、`ConfigManager.ts` 是否有依赖，必要时调整数据路由和解析逻辑。

4. **适配器与 UI 层调整（editor/ 和 prototype/）**
   - 检查角色相关的 UI 组件、表单、展示逻辑，移除被删字段的引用和处理。
   - 检查数据适配器（如 `GameAdapter`），同步调整数据映射和转换逻辑。

5. **测试用例更新（core/__tests__/）**
   - 移除或重构依赖被删字段的测试用例，确保所有测试覆盖新结构。
   - 使用 `ConfigValidator` 对新数据进行完整性校验，确保无遗漏。

6. **文档与开发指引同步**
   - 更新 `README.md`、`characters_README.md` 等文档，反映最新的数据结构和字段说明。
   - 补充迁移说明，指导如何从旧结构迁移到新结构。

7. **工作流建议**
   - 按照项目规范，优先在 `core` 完成类型和逻辑调整，重建 `core` 后再启动 `editor` 和 `prototype` 进行联调。
   - 所有依赖角色数据的功能都需回归测试，确保无遗漏和兼容性问题。
