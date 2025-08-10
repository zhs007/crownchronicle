### 需求

editor 项目里，editor/src/lib/gemini.ts 里有 gemini 的 prompt，其中对事件卡的要求不够明确，我希望事件卡应该有以下规则：

- 事件卡 是游戏角色（也就是角色卡，譬如 诸葛亮、霍光，这里我们叫他 角色） 和 玩家角色（也就是玩家，玩家扮演皇帝，这里我们叫他 玩家）之间的对话
- 所以事件卡里的 dialogue 是 角色说的一句话，这个要符合角色身份
- 事件卡里的options里的reply是 玩家针对角色说的话的回复，也需要符合玩家的皇帝身份
- option 可以 修改玩家的属性和自己的属性（player 和 self，self 是角色的属性），因为属性的使用是汇总取占比，所以一个 option 最好不要同时修改玩家和角色的同一个属性
- 游戏玩法核心是平衡，也就是不能让任何一个数值过小或过大，所以，大多数的 option 都应该修改至少 2 个 不同的属性，让玩家抉择
- 属性的修改值应该分为 3 档，最小档是 +3 或-3，中间档是 +5 或-5，最高档是 +10 或-10

### 实施方案

总体思路
- 仅在 editor 侧优化 Gemini 提示词与后置校验，优先让模型一次性按规则产出，不改变 core 的接口与依赖。
- 核心类型统一从包名导入：import { ... } from 'crownchronicle-core'；严禁相对路径导入 core。
- 不硬编码数据路径；按现有配置系统解析（通过 GameConfigManager.getConfigPath(...)）。

涉及文件
- 修改：editor/src/lib/gemini.ts（提示词模板与生成策略、上下文注入）
- 新增：editor/src/lib/validators/eventCardRules.ts（编辑器补充校验与纠错回灌）
- 可选：editor/test-gemini-prompt-rules.js（回归测试，校验主要规则）

提示词改造要点（gemini.ts）
- 角色与玩家视角
  - dialogue 必须是“角色”的一句话，贴合其身份、人设与语气。
  - options[i].reply 必须是“玩家/皇帝”的回复话术，保持皇帝口吻。
- 结构与输出
  - 仅输出 YAML，遵循现有事件卡 schema，不夹带解释文字。
  - effects 的数值严格限定在 {-10, -5, -3, +3, +5, +10}。
  - 单个 option 内避免对同一属性同时修改 player 与 self。
  - 多数（≥80%）option 必须同时修改至少 2 个不同属性；允许少数 <20% 的 option 只改 1 个属性，无需备注原因。
- 动态上下文注入
  - 注入当前可用属性键清单（按 player/self 分组，来自配置），以及事件对应角色的人设摘要与相关剧情上下文。
  - 如有样例片段（few-shot），覆盖：角色对白/皇帝回复、双属性修改、档位仅 3/5/10、避免 player/self 同属性同时修改。
- 采样参数
  - 以遵循性优先：temperature≈0.2–0.3（其他采样参数按现状微调）。
- 自检清单（写入提示词尾部）
  - 是否为纯 YAML 输出；是否仅用合法属性名；是否全部数值落在 3/5/10 档位；是否≥80% 的 option 同时修改≥2 个不同属性；是否不存在同一属性在同一 option 内既改 player 又改 self。

编辑器后置校验（eventCardRules.ts）
- 导出 validateEventCardRules(card, legalAttrs): { ok, errors, stats }，在 YAML 解析后执行：
  - 属性名均在合法集合内（来自配置）。
  - 修改值 ∈ {-10, -5, -3, +3, +5, +10}。
  - 统计每个 option 的属性覆盖度与冲突：
    - 计算“≥2 属性修改”的 option 比例，需 ≥80%。
    - 任何 option 若对同一属性同时修改 player 与 self，判定为违规。
- 失败处理：
  - 汇总结构化错误清单与目标修复建议，作为二次提示的补充约束，要求仅输出修正后的完整 YAML。
  - 最多重试 2 次；仍失败则提示人工微调。

与 core 校验的关系
- 先执行 core 的 ConfigValidator（从 'crownchronicle-core' 导入），再执行 editor 的补充规则，保证一致性。
- 不修改 core/src/data/DataProvider.ts 的构造签名；不向 core 引入配置管理依赖。

测试与验收
- 构建 2–3 个 few-shot 示例与对应输出快照，验证：
  - 角色对白与皇帝回复语气正确；
  - 选项效果命中 3/5/10 档位；
  - ≥80% 的 option 同时修改≥2 个不同属性；
  - 无单个 option 对同一属性同时修改 player 与 self；
  - 通过 core ConfigValidator 与 editor 补充校验。

不做的事（遵守架构约束）
- 不修改 core 的构造签名与依赖；不把配置管理依赖引入 core；不使用 npm install ../core；不硬编码数据路径。

迭代与回滚
- 以灰度开关方式在 editor 内开启新提示词与校验链路，可随时回退到旧策略。
- 如果线上生成通过率下降，先回滚提示词改动，再定位具体校验规则对生成影响的敏感点。