### 需求

现在事件卡相关的类型如下：

export interface EventOption {
  optionId: string;
  description: string;
  target: OptionTarget;
  attribute: keyof CharacterAttributes;
  offset: number;
}

export interface EventCard {
  id: string;
  reply: string; // 玩家对角色的回应（原 description，可重命名）
  title: string;
  options: [EventOption, EventOption];
  activationConditions?: EventConditions;
  removalConditions?: EventConditions;
  triggerConditions?: EventConditions;
  weight?: number;
  importance?: 'normal' | 'major' | 'critical';
}

EventCard 里调整如下：

- importance 可以移除
- characterId 可以移除
- weight 需要是必填，默认为 1
- id 字段应该就是 title 的拼音形式，不需要特别指定，自动生成即可，所以 title 应该在这个角色下的所有事件里不能重复。
- 新增 eventId，这个才是这张事件卡的全局唯一标识，eventId 在加载时自动生成，规则如下 由当前 角色的characterId 加上 当前事件的 id 组合而成。考虑到通用卡的事件也会加入到这个角色里，为了避免不冲突，通用卡的事件卡在加载到角色卡的事件卡池里时，eventId 的规则应该是 角色的characterId 加上 通用卡的id 加上 当前通用卡事件的 id 组合而成。
- 新增一个对话字段，一定是当前角色卡说的一句话，这个字段用在游戏里，展示给玩家看，否则玩家不知道发生了什么，为什么要选择 2 个选项。


EventOption 里调整如下：

- description 应该是玩家对这个角色说的话，也就是回应 EventCard 里的对话字段，如果需要，可以把这个字段名改一个更合适的
- target、attribute、offset 是一个修改属性效果的配置整体，一个选项里可以支持配置多个修改属性的配置。


### 实现方案

1. **类型结构调整**

   在 core 包的事件相关类型定义中，更新 EventCard 和 EventOption：
    ```typescript
    // 新版 EventOption 类型定义
    export interface EventOption {
      optionId: string;
      reply: string; // 玩家对角色的回应（原 description，可重命名）
      effects: Array<{
        target: OptionTarget;
        attribute: keyof CharacterAttributes;
        offset: number;
      }>;
    }

    // 新版 EventCard 类型定义
    export interface EventCard {
      eventId: string; // 全局唯一标识，自动生成
      id: string;      // 由 title 拼音自动生成
      title: string;
      dialogue: string; // 当前角色卡说的一句话
      options: [EventOption, EventOption];
      activationConditions?: EventConditions;
      removalConditions?: EventConditions;
      triggerConditions?: EventConditions;
      weight: number; // 必填，默认 1
    }
    ```
   - **EventCard：**
     - 移除 `importance` 和 `characterId` 字段。
     - `weight` 改为必填，默认值为 1。
     - `id` 字段自动由 `title` 的拼音生成，确保同一角色下事件标题唯一。
     - 新增 `eventId` 字段，加载时自动生成，规则为：角色 `characterId` + 事件 `id`。通用卡事件则为：角色 `characterId` + 通用卡 `id` + 通用卡事件 `id`。
     - 新增 `dialogue` 字段，表示当前角色卡说的一句话，用于游戏内展示。

   - **EventOption：**
     - `description` 字段语义调整为玩家对角色的回应（如需可重命名为 `reply`）。
     - `target`、`attribute`、`offset` 合并为一个数组字段（如 `effects`），支持多个属性修改配置。

2. **自动生成逻辑**

   在事件卡加载流程中实现 `eventId` 的自动生成逻辑，确保唯一性和兼容通用卡。

   > **特别注意：**  
   > `id` 字段自动由 `title` 转拼音的逻辑只能在 editor 项目中实现，且必须使用 `tiny-pinyin` 库，不能使用 `pinyin` 库。  
   > 如需拼音转换，请在 editor 里统一用 `tiny-pinyin` 实现，不允许在 core 或其他包中引入配置管理或 `pinyin` 库。

3. **数据结构与校验**

   - 更新 gameconfig 中事件卡数据结构，适配新字段和规则。
   - 使用 `ConfigValidator` 增加对新结构的校验，确保数据完整性和唯一性。
   - 校验规则细化：
     - `eventId` 必须全局唯一，不能重复。
     - 同一角色下，`title` 不能重复。
     - `dialogue` 字段必须有内容，不能为空。
     - `options` 必须为两个选项，且每个选项的 `reply` 和 `effects` 字段必须完整。
     - `effects` 数组每项都需校验 `target`、`attribute`、`offset` 是否有效。
     - 校验失败时需给出详细错误信息，便于内容编辑和数据修复。

4. **前端适配**

   - editor 和 prototype 项目需适配新字段：
     - 编辑器端：
       - 新建或编辑事件卡时，`id` 字段由 `title` 自动生成拼音（使用 tiny-pinyin），无需手动填写。
       - `dialogue` 字段依然由 agent（AI）生成，内容可编辑但建议由 AI 生成初稿，并有输入提示确保内容完整。
       - 选项编辑区需支持多个 `effects` 配置，且每项都可选择目标、属性和偏移量。`effects` 字段同样建议由 agent（AI）生成，内容可编辑但建议由 AI 生成初稿。
       - 校验逻辑前端实时提示，错误信息友好展示，便于内容编辑。
     - 游戏前端：
       - 事件卡展示时，优先显示 `dialogue` 字段内容。
       - 选项区展示玩家可选回应（`reply`），以及对应的属性变化说明。
       - 保证所有新字段在 UI 层有明确展示和交互。

5. **兼容与迁移**

   - 推荐直接修改 `gameconfig/fix-config.js` 文件，实现自动迁移脚本：
     - 支持批量检查和修复角色、事件配置文件的缺失字段和结构不规范问题。
     - 自动将旧版字段升级为新版结构（如 description/target/attribute/offset 升级为 reply/effects）。
     - 对事件卡自动补全 eventId、dialogue、weight、options 等字段，确保符合最新 schema。
     - 所有自动修复和迁移操作均会直接写回原配置文件，并输出修复日志。
     - 如需扩展迁移逻辑，可在该脚本基础上补充字段映射、结构转换等代码。