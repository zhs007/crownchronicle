# Crown Chronicle 角色类型结构升级迁移说明（plan-008）

## 变更背景
为简化角色数据结构、提升一致性，全面移除 `CharacterCard` 及相关类型中的冗余/兼容字段，仅保留 `attributes` 字段承载所有能力属性。

## 主要变更点
- 移除以下字段：
  - power, military, wealth, popularity, health, age
  - displayName, currentTitle, role, identityRevealed
  - revealedTraits, hiddenTraits, discoveredClues, totalClues
- 所有能力属性统一迁移至 `attributes: CharacterAttributes`。
- 角色称谓、身份、特性等信息请用 `description` 或 `attributes` 承载。
- 相关业务逻辑、UI 展示、数据导入导出全部切换为新结构。

## 迁移步骤
1. **类型定义升级**
   - 更新 `core/src/types/character.ts`，移除所有冗余字段。
   - 同步更新依赖类型（如 `CharacterState`）。
2. **代码逻辑重构**
   - 全局搜索并删除所有旧字段引用。
   - 业务逻辑、UI、测试全部切换为通过 `attributes` 访问。
3. **数据文件清理**
   - 使用 `gameconfig/cleanup-character-fields.js` 批量清理所有角色数据文件。
   - 用 `gameconfig/verify-character-fields.js` 校验结果。
4. **外部依赖适配**
   - 通知/适配第三方工具、AI 生成器等，避免引用旧字段。
5. **文档同步**
   - 更新 README、类型说明，明确新结构和迁移流程。

## 常见问题
- **老数据兼容性**：如有历史数据未迁移，需先清理废弃字段，否则新代码无法识别。
- **自动化脚本**：如需批量处理，可用上述脚本自动完成，无需手动编辑。
- **能力属性访问**：所有能力相关逻辑请统一通过 `attributes` 字段访问。

## 示例结构
```typescript
export interface CharacterCard {
  id: string;
  name: string;
  tags: string[];
  events: string[];
  description: string;
  attributes: CharacterAttributes;
  eventIds: string[];
  commonCardIds: string[];
}
```

## 参考脚本
- `gameconfig/cleanup-character-fields.js`：批量清理废弃字段
- `gameconfig/verify-character-fields.js`：校验数据结构

---
如有疑问或特殊场景，请联系项目维护者或查阅 Crown Chronicle 开发文档。
