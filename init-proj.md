### 需求

这是一个关于中国古代皇帝的一个卡牌游戏原型项目，用 next.js 开发，开发语言是 ts 。

游戏玩法是 玩家扮演一个中国古代的皇帝，然后系统随机一些角色出来，譬如皇帝的母亲是武则天，皇帝的宰相是霍光，朝堂上的权臣是鳌拜，宰相是秦桧，太监总管是魏忠贤 等等，然后看皇帝如何生存得更久。

我的制作思路是 卡牌化，也就是分为角色牌和事件牌，系统先随机哪些角色牌可以出场，然后这些角色牌对应的事件牌就会添加到卡池里，随机卡池开始翻牌，每一张卡牌都代表一个事件，玩家可以有若干个选项，根据不同的选项决定一组核心数值，然后这一组核心数值会反过头来影响卡池里某些卡牌的效果。

我觉得原型不需要考虑图形化，可以用简单的 DOM 选项来推进游戏。

需要 2 个页面，一个是主页面，里面可以展示一些玩家最长记录等，然后可以开始新游戏。
另外一个是游戏进程页面，可以是类似聊天对话那样，不同角色出场触发事件或说话，然后告诉玩家可选项，玩家选择即可。

### 实现

#### 技术栈
- **前端框架**: Next.js 14 (App Router)
- **开发语言**: TypeScript
- **样式**: Tailwind CSS
- **数据存储**: 文件系统存储 (后端负责游戏逻辑和存档管理)
- **状态管理**: React Context + useReducer (仅前端UI状态)
- **UI组件**: 自定义组件 (简洁的文本界面)
- **API**: Next.js API Routes (游戏逻辑处理)
- **存档系统**: JSON 文件存储在服务端

#### 核心数据结构

##### 1. 皇帝属性
```typescript
interface EmperorStats {
  health: number;      // 健康值 (0-100)
  authority: number;   // 威望值 (0-100)
  treasury: number;    // 国库 (0-100)
  military: number;    // 军事力量 (0-100)
  popularity: number;  // 民心 (0-100)
  age: number;         // 年龄
  reignYears: number;  // 在位年数
}
```

##### 2. 角色卡牌
```typescript
interface CharacterCard {
  id: string;
  name: string;           // 真实姓名 (隐藏，用于内部逻辑)
  displayName: string;    // 游戏中显示的称谓
  currentTitle: string;   // 当前称谓 (可能随关系变化)
  role: string;           // 角色身份 (母后, 宰相, 权臣, 太监等)
  description: string;    // 角色外观和行为描述 (不透露真实身份)
  identityRevealed: boolean; // 是否已揭示真实身份
  
  // 角色基础属性
  attributes: {
    power: number;          // 权力值 (0-100) - 影响政治事件
    loyalty: number;        // 忠诚度 (0-100) - 对皇帝的忠诚
    ambition: number;       // 野心值 (0-100) - 篡权倾向
    competence: number;     // 能力值 (0-100) - 处理事务能力
    reputation: number;     // 声望值 (0-100) - 在朝野的声誉
    health: number;         // 健康状况 (0-100) - 影响寿命
    age: number;           // 年龄 - 影响各种属性变化
  };
  
  // 与皇帝的关系
  relationshipWithEmperor: {
    affection: number;      // 感情值 (-100 到 +100)
    trust: number;         // 信任度 (-100 到 +100)  
    fear: number;          // 恐惧值 (0-100)
    respect: number;       // 尊敬度 (0-100)
    dependency: number;    // 依赖度 (0-100) - 皇帝对该角色的依赖
    threat: number;        // 威胁度 (0-100) - 对皇帝的威胁程度
  };
  
  // 与其他角色的关系网络
  relationshipNetwork: Array<{
    targetCharacterId: string;
    relationType: 'ally' | 'enemy' | 'neutral' | 'superior' | 'subordinate' | 'family';
    relationshipStrength: number; // -100 到 +100
    secretLevel: number;          // 关系保密程度 (0-100)
    historicalBasis: string;      // 历史关系基础描述
  }>;
  
  // 派系归属
  factionInfo: {
    primaryFaction?: string;      // 主要派系 (如: "改革派", "保守派", "军事集团")
    secondaryFactions: string[];  // 次要派系
    factionLoyalty: number;       // 对派系的忠诚度 (0-100)
    leadershipRole: 'leader' | 'core' | 'member' | 'sympathizer';
  };
  
  influence: {            // 角色对皇帝属性的影响系数
    health: number;
    authority: number;
    treasury: number;
    military: number;
    popularity: number;
  };
  
  // 特性系统
  revealedTraits: string[];   // 已揭示的特性
  hiddenTraits: string[];     // 尚未揭示的特性
  
  // 线索系统
  discoveredClues: string[];  // 玩家已发现的线索
  totalClues: number;         // 总线索数量
  
  // 角色状态标记
  statusFlags: {
    alive: boolean;
    inCourt: boolean;          // 是否在朝
    inExile: boolean;          // 是否被流放
    imprisoned: boolean;       // 是否被囚禁
    promoted: boolean;         // 是否刚被提升
    demoted: boolean;          // 是否刚被降职
    suspicious: boolean;       // 是否被怀疑
    plotting: boolean;         // 是否在密谋
  };
  
  eventIds: string[];         // 关联的事件卡牌ID列表
}
```

##### 3. 事件卡牌
```typescript
interface EventCard {
  id: string;
  characterId: string;  // 关联的角色ID
  title: string;        // 事件标题
  description: string;  // 事件描述
  speaker: string;      // 说话的角色
  dialogue: string;     // 角色对话内容
  choices: EventChoice[]; // 玩家选项
  conditions?: {        // 触发条件 (可选)
    minHealth?: number;
    minAuthority?: number;
    // ... 其他条件
  };
  weight: number;       // 在卡池中的权重
}

interface EventChoice {
  id: string;
  text: string;         // 选项文本
  effects: {            // 选择后的属性变化
    health?: number;
    authority?: number;
    treasury?: number;
    military?: number;
    popularity?: number;
  };
  consequences?: string; // 选择后的结果描述
}
```

##### 4. 游戏状态
```typescript
interface GameState {
  emperor: EmperorStats;
  activeCharacters: CharacterCard[];  // 当前出场的角色
  cardPools: {                        // 三卡池系统
    pending: EventCard[];             // 待定卡池 - 等待激活条件
    active: EventCard[];              // 主卡池 - 可以被抽取
    discarded: EventCard[];           // 弃卡池 - 已使用或被移除
  };
  gameHistory: GameEvent[];           // 游戏历史记录
  currentEvent: EventCard | null;     // 当前事件
  characterStates: CharacterState[];  // 角色状态追踪
  
  // 派系系统 (新增)
  factionSystem: {
    activeFactions: Array<{
      id: string;
      name: string;
      influence: number;              // 派系影响力 (0-100)
      leaderCharacterId?: string;     // 派系领袖角色ID
      memberCharacterIds: string[];  // 派系成员角色ID列表
      agenda: string;                 // 派系议程描述
      conflictingFactions: string[];  // 敌对派系
      alliedFactions: string[];       // 盟友派系
    }>;
    factionBalance: number;           // 整体派系平衡度 (-100 到 +100)
  };
  
  // 朝堂政治状态 (新增)
  courtPolitics: {
    tension: number;                  // 朝堂紧张度 (0-100)
    stability: number;                // 政治稳定度 (0-100)
    corruption: number;               // 腐败程度 (0-100)
    efficiency: number;               // 行政效率 (0-100)
    recentEvents: Array<{            // 近期重大政治事件
      eventId: string;
      impact: 'minor' | 'moderate' | 'major';
      faction: string;
      turn: number;
    }>;
  };
  
  gameOver: boolean;
  gameOverReason?: string;
  startTime: number;
  endTime?: number;
  currentTurn: number;                // 当前回合数
}

interface CharacterState {
  characterId: string;
  alive: boolean;
  relationship: 'friendly' | 'neutral' | 'hostile';  // 与皇帝的关系
  influence: number;                  // 影响力值 (0-100)
  lastEventTurn?: number;             // 最后触发事件的回合
  
  // 身份发现系统
  identityProgress: {
    revealed: boolean;                // 是否已完全揭示身份
    cluesFound: string[];            // 已发现的线索
    traitsRevealed: string[];        // 已揭示的特性
    discoveryProgress: number;        // 发现进度 (0-100)
  };
  
  // 称谓系统
  currentTitle: string;              // 当前使用的称谓
  titleHistory: Array<{             // 称谓变化历史
    title: string;
    changedAt: number;               // 变化的回合数
    reason: string;                  // 变化原因
  }>;
}
```

interface GameEvent {
  eventId: string;
  turn: number;
  choiceId: string;
  effects: EmperorStats;
  consequences: string;
  timestamp: number;
}
```

#### 页面结构

##### 1. 主页面 (`/`)
- **组件**: `HomePage`
- **功能**:
  - 显示游戏标题和背景介绍
  - **存档管理**: 展示所有可用存档列表
  - **存档选择**: 选择存档继续游戏
  - **新游戏**: 创建新存档开始游戏
  - **存档删除**: 删除指定存档
  - 展示历史最高记录 (所有存档中的最佳成绩)
  - 游戏规则说明

##### 2. 游戏页面 (`/game/[saveId]`)
- **组件**: `GamePage`
- **动态路由**: 通过 saveId 参数加载对应存档
- **布局**:
  - 左侧: 皇帝属性面板 (显示各项数值和年龄)
  - 右侧: 当前出场角色列表
  - 中央: 对话区域 (类似聊天界面)
  - 底部: 选项按钮区域
  - 顶部: 存档信息 (存档名称、保存时间、回合数)

#### 核心组件设计

##### 1. EmperorStats Component
```typescript
// 显示皇帝当前属性的组件
interface EmperorStatsProps {
  stats: EmperorStats;
}
```

##### 2. CharacterPanel Component
```typescript
// 显示当前出场角色的面板
interface CharacterPanelProps {
  characters: CharacterCard[];
}
```

##### 3. EventDisplay Component
```typescript
// 显示当前事件和对话的组件
interface EventDisplayProps {
  event: EventCard;
  onChoice: (choiceId: string) => void;
}
```

##### 4. GameHistory Component
```typescript
// 显示游戏历史记录的组件
interface GameHistoryProps {
  history: GameEvent[];
}
```

#### 游戏逻辑流程

##### 1. 三卡池机制
```typescript
interface CardPools {
  pending: EventCard[];    // 待定卡池 - 等待激活条件检查
  active: EventCard[];     // 主卡池 - 可以被抽取的卡牌
  discarded: EventCard[];  // 弃卡池 - 已使用或被移除的卡牌
}
```

- **待定卡池**: 存放所有出场角色的事件卡，需要监控权检查激活条件
- **主卡池**: 已激活可抽取的事件卡，抽取前检查触发条件
- **弃卡池**: 已使用、条件不满足或被移除的事件卡

##### 2. 游戏初始化
1. 设置初始皇帝属性 (所有值为50, 年龄随机18-25)
2. 随机选择3-5个角色卡牌出场
3. 将所有出场角色的事件卡放入 **待定卡池**
4. 执行第一次卡池监控，检查激活条件
5. 从主卡池触发第一个事件

##### 3. 卡池监控机制 (每回合执行)
```typescript
// 待定卡池监控 - 检查激活条件
function updatePendingPool(gameState: GameState) {
  const cardsToActivate: EventCard[] = [];
  const cardsToRemove: EventCard[] = [];
  
  gameState.cardPools.pending.forEach(card => {
    if (checkActivationConditions(card, gameState)) {
      cardsToActivate.push(card);
    } else if (checkRemovalConditions(card, gameState)) {
      cardsToRemove.push(card);
    }
  });
  
  // 移动到主卡池
  cardsToActivate.forEach(card => {
    moveCard(card, 'pending', 'active');
  });
  
  // 移动到弃卡池
  cardsToRemove.forEach(card => {
    moveCard(card, 'pending', 'discarded');
  });
}
```

##### 4. 主要事件循环
1. **卡池监控阶段**:
   - 检查待定卡池中的事件激活条件
   - 符合条件的事件移入主卡池
   - 不符合移除条件的事件移入弃卡池

2. **事件抽取阶段**:
   - 从主卡池中根据权重随机选择一张事件卡
   - 检查该事件的触发条件
   - 如果条件不满足，直接移入弃卡池，重新抽取
   - 如果条件满足，执行事件

3. **事件执行阶段**:
   - 显示事件对话和选项
   - 玩家做出选择
   - 应用选择效果到皇帝属性
   - 将已使用事件移入弃卡池

4. **回合结束阶段**:
   - 检查游戏结束条件
   - 年龄+1, 在位年数+1
   - 返回卡池监控阶段

##### 5. 事件激活条件系统
在事件配置中增加激活条件，控制事件何时进入主卡池：

```yaml
# 事件激活条件 (决定何时从待定卡池进入主卡池)
activationConditions:
  minReignYears: 3         # 最少在位年数
  maxReignYears: 10        # 最多在位年数  
  minAge: 25              # 最小年龄
  maxAge: 50              # 最大年龄
  requiredEvents:         # 必须发生过的事件
    - "character_introduction"
  excludedEvents:         # 不能发生过的事件
    - "character_death"
  attributeRequirements:  # 属性要求
    minAuthority: 40
    maxHealth: 80
  characterStates:        # 角色状态要求
    - characterId: "wuzetian"
      alive: true
      relationship: "friendly"  # 与皇帝的关系

# 事件移除条件 (决定何时从待定卡池移除到弃卡池)
removalConditions:
  maxReignYears: 15       # 超过年限后移除
  characterDead: true     # 相关角色死亡后移除
  conflictEvents:         # 与某些事件冲突
    - "peace_treaty"
```

##### 6. 动态卡池管理
```typescript
// 卡池操作接口
interface CardPoolManager {
  // 添加新事件到待定卡池 (角色出场时)
  addToPending(events: EventCard[]): void;
  
  // 强制激活事件 (特殊情况)
  forceActivate(eventId: string): void;
  
  // 强制移除事件 (角色死亡等)
  forceRemove(eventId: string): void;
  
  // 检查卡池状态
  getPoolStatus(): {
    pendingCount: number;
    activeCount: number;
    discardedCount: number;
  };
}
```

##### 7. 游戏结束条件
- 任意核心属性 ≤ 0
- 年龄 ≥ 80
- 特殊事件导致的死亡
- **主卡池为空且待定卡池无可激活事件** (新增)

#### 数据配置

采用 YAML 格式的单文件配置，提高可读性和维护性。使用二级目录结构体现角色卡与事件卡的强绑定关系。

##### 1. 角色卡配置结构
```
data/
├── characters/
│   ├── wuzetian/           # 武则天角色目录
│   │   ├── character.yaml  # 角色基本信息
│   │   └── events/         # 该角色的事件卡
│   │       ├── power-struggle.yaml
│   │       ├── court-decision.yaml
│   │       └── family-affair.yaml
│   ├── huoguang/           # 霍光角色目录
│   │   ├── character.yaml
│   │   └── events/
│   │       ├── military-advice.yaml
│   │       ├── policy-reform.yaml
│   │       └── loyalty-test.yaml
│   ├── aobai/              # 鳌拜角色目录
│   │   ├── character.yaml
│   │   └── events/
│   │       ├── rebellion-threat.yaml
│   │       ├── power-grab.yaml
│   │       └── military-coup.yaml
│   └── ...                 # 其他角色目录
```

##### 2. 角色配置文件格式 (`character.yaml`)
```yaml
id: "wuzetian"
name: "武则天"           # 真实姓名 (玩家不可见)
displayName: "母后"      # 游戏中显示的称谓
role: "母后"
description: "一位威严的女性长者，眼神锐利，举止间透露着不凡的气度"
category: "皇族"
rarity: "legendary"      # 稀有度: common, rare, epic, legendary

# 角色基础属性 (实例化时的初始值)
initialAttributes:
  power: 85              # 权力值 (0-100)
  loyalty: 60            # 忠诚度 (0-100) 
  ambition: 95           # 野心值 (0-100)
  competence: 90         # 能力值 (0-100)
  reputation: 75         # 声望值 (0-100)
  health: 70             # 健康状况 (0-100)
  age: 45               # 年龄

# 与皇帝的初始关系
initialRelationshipWithEmperor:
  affection: 40          # 感情值 (-100 到 +100)
  trust: 30             # 信任度 (-100 到 +100)
  fear: 20              # 恐惧值 (0-100)
  respect: 60           # 尊敬度 (0-100)
  dependency: 70        # 皇帝对该角色的依赖 (0-100)
  threat: 40            # 对皇帝的威胁程度 (0-100)

# 派系信息
factionInfo:
  primaryFaction: "女性政治集团"
  secondaryFactions: 
    - "皇室派系"
    - "宫廷保守派"
  factionLoyalty: 80
  leadershipRole: "leader"  # leader, core, member, sympathizer

# 角色关系网络 (与其他角色的预设关系)
relationshipNetwork:
  - targetCharacter: "huoguang"  # 目标角色ID
    relationType: "enemy"        # ally, enemy, neutral, superior, subordinate, family
    relationshipStrength: -60    # -100 到 +100
    secretLevel: 30             # 关系保密程度 (0-100)
    historicalBasis: "政治理念冲突，权力争夺"
    
  - targetCharacter: "weizhongxian"
    relationType: "ally"
    relationshipStrength: 40
    secretLevel: 70
    historicalBasis: "同为非传统权力集团，相互支持"

# 身份揭示条件 (玩家何时能知道真实身份)
identityReveal:
  conditions:
    - type: "event_triggered"
      eventId: "wuzetian_power_reveal"
    - type: "relationship_level" 
      threshold: 80        # 关系达到80时揭示
    - type: "reign_years"
      minYears: 10         # 在位10年后揭示
    - type: "attribute_threshold"  # 新增：属性阈值触发
      attribute: "power"
      threshold: 90
  revealText: "你终于意识到，这位一直在你身边的母后，正是历史上赫赫有名的武则天..."

# 称谓变化 (根据关系和属性发展)
titleProgression:
  - conditions:
      affection: [0, 30]
      respect: [0, 40]
    title: "母后"
  - conditions:
      affection: [31, 70]
      respect: [41, 80] 
    title: "慈母"
  - conditions:
      affection: [71, 100]
      respect: [81, 100]
    title: "太后"
  - special_conditions:
      hostile_relationship: "太后娘娘"     # 关系恶化时的尊称
      high_threat: "武后"                 # 威胁度过高时

# 角色对皇帝属性的影响系数
influence:
  health: 0.8            # 对健康的影响 (0-2.0, 1.0为中性)
  authority: 1.3         # 对威望的影响
  treasury: 1.1          # 对国库的影响  
  military: 0.9          # 对军事的影响
  popularity: 0.7        # 对民心的影响

# 角色特性 (影响事件类型，玩家可通过事件逐渐发现)
traits:
  - "权谋"               # 影响政治类事件
  - "强势"               # 影响决策类事件  
  - "智慧"               # 影响策略类事件
  hidden_traits:         # 隐藏特性，通过特定事件揭示
  - "雄心"               # 通过特定事件才能发现
  - "冷酷"               # 需要触发相关剧情

# 属性变化规则 (随游戏进展的属性变化)
attributeEvolution:
  power:
    increaseEvents:      # 增加权力的事件类型
      - "political_victory"
      - "emperor_dependency"
    decreaseEvents:      # 减少权力的事件类型
      - "political_defeat"
      - "emperor_resistance"
    ageInfluence: -0.5   # 每年龄增长的影响
    
  loyalty:
    increaseEvents:
      - "emperor_favor"
      - "mutual_benefit"
    decreaseEvents:
      - "emperor_distrust"
      - "power_struggle"
    relationshipInfluence: 0.3  # 与皇帝关系的影响系数

# 特殊能力和被动效果
specialAbilities:
  - id: "political_manipulation"
    name: "政治操控"
    description: "能够影响其他角色的关系网络"
    effect: "可以改变其他角色间的关系强度"
    
  - id: "imperial_influence"
    name: "皇室影响"
    description: "对皇帝决策有特殊影响力"
    effect: "某些事件选项权重增加"

# 出现条件 (可选)
conditions:
  minReignYears: 1       # 最少在位年数
  maxAge: 60             # 最大年龄限制
  excludeCharacters:     # 不能同时出现的角色
    - "cixi"             # 慈禧太后
    - "changsun"         # 长孙皇后
  requiredFactions:      # 需要的派系环境
    - "imperial_court"
  conflictingFactions:   # 冲突的派系
    - "military_hardliners"

# 角色背景线索 (玩家可通过观察逐渐发现)
backgroundClues:
  appearance: "身材修长，举止优雅，但眼神中时常闪过一丝不易察觉的野心"
  mannerisms: "说话时喜欢用手指轻敲扶手，思考时会凝视远方"
  preferences: "对政务异常关心，经常主动询问朝政"
  relationships: "与朝中大臣关系复杂，似乎有着自己的人脉网络"
  secrets: "深夜时分经常有神秘访客，似乎在密谋什么"
```

##### 3. 事件配置文件格式 (`events/*.yaml`)
```yaml
id: "wuzetian_power_struggle"
title: "母后干政"
description: "朝堂之上，母后公然质疑你的决策"
speaker: "母后"          # 使用称谓，而非真实姓名
dialogue: "皇上年幼，此等军国大事还需本宫来定夺才是。"

# 身份线索 (通过事件逐渐揭示角色特征)
characterClues:
  revealedTraits:        # 本事件可能揭示的特性
    - "权谋"
    - "强势" 
  personalityHints:      # 性格线索
    - "母后似乎对朝政有着异乎寻常的熟悉"
    - "她的眼神中闪烁着政治家的精明"
  backgroundHints:       # 背景线索
    - "你注意到大臣们对母后都颇为敬畏"

# 事件激活条件 (决定何时从待定卡池进入主卡池)
activationConditions:
  minReignYears: 2         # 最少在位年数
  maxReignYears: 15        # 最多在位年数  
  minAge: 20              # 最小年龄
  maxAge: 50              # 最大年龄
  requiredEvents:         # 必须发生过的事件
    - "character_introduction"
  excludedEvents:         # 不能发生过的事件
    - "character_exile"
  attributeRequirements:  # 属性要求
    minAuthority: 20
    maxAuthority: 70
  
  # 角色关系条件 (新增)
  characterRelationships:
    - characterId: "wuzetian"
      alive: true
      attributes:          # 角色属性要求
        minPower: 60
        maxLoyalty: 80
        minAmbition: 70
      relationshipWithEmperor:  # 与皇帝关系要求
        minThreat: 30
        maxTrust: 50
        minDependency: 40
      statusFlags:         # 状态标记要求
        inCourt: true
        plotting: false
        
  # 角色间关系条件
  interCharacterRelations:
    - character1: "wuzetian"
      character2: "huoguang"  
      minRelationshipStrength: -50  # 关系紧张
      relationType: "enemy"
      
  # 派系条件
  factionRequirements:
    - faction: "女性政治集团"
      minInfluence: 40     # 派系影响力最低要求
      leaderPresent: true  # 派系领袖必须在场

# 事件移除条件 (决定何时从待定卡池移除到弃卡池)
removalConditions:
  maxReignYears: 20       # 超过年限后移除
  characterDead: true     # 相关角色死亡后移除
  conflictEvents:         # 与某些事件冲突
    - "character_death"
    - "character_exile"

# 事件触发条件 (从主卡池抽取时检查)
triggerConditions:
  minAuthority: 30        # 最低威望要求
  maxAge: 35             # 最大年龄限制
  requiredTraits:        # 需要的角色特性
    - "权谋"
  eventHistory:          # 历史事件要求
    exclude:             # 排除已发生的事件
      - "rebellion_event"
    require:             # 必须发生过的事件
      - "character_introduction"
    cooldown: 5          # 距离上次触发的最少回合数

# 卡池权重
weight: 8              # 基础权重
dynamicWeight:         # 动态权重调整
  authority:           # 根据威望值调整
    - range: [0, 30]
      multiplier: 2.0  # 威望低时权重翻倍
    - range: [31, 70]
      multiplier: 1.0
    - range: [71, 100]
      multiplier: 0.3  # 威望高时权重降低

# 玩家选项
choices:
  - id: "submit"
    text: "遵从母后教诲"
    effects:
      authority: -8
      popularity: +3
      health: -2
    consequences: "你选择了退让，朝臣们窃窃私语，母后眼中闪过一丝满意..."
    characterClues:      # 选择后的角色线索
      - "母后处理政务时显得游刃有余，仿佛久经此道"
    nextEvents:          # 可能触发的后续事件
      - "power_control_increase"
      
    # 角色属性和关系变化 (新增)
    characterEffects:
      - characterId: "wuzetian"
        attributeChanges:  # 角色属性变化
          power: +5
          loyalty: -3
          ambition: +2
        relationshipChanges:  # 与皇帝关系变化
          affection: +5
          trust: -2
          dependency: +8
          threat: +3
        statusChanges:     # 状态变化
          plotting: false
          
    # 影响其他角色关系 (新增)
    interCharacterEffects:
      - character1: "wuzetian"
        character2: "huoguang"
        relationshipChange: -5  # 武则天和霍光关系恶化
        reason: "皇帝的退让加剧了政治分歧"
        
    # 派系影响 (新增)  
    factionEffects:
      - faction: "女性政治集团"
        influenceChange: +10
      - faction: "传统官僚集团"
        influenceChange: -5
    
  - id: "resist"
    text: "朕意已决，不容更改"
    effects:
      authority: +5
      popularity: -5
      health: -5
    consequences: "母后脸色铁青，朝堂气氛骤然紧张。你感受到了她眼中的寒意..."
    characterClues:
      - "母后的怒火让你想起了某些史书中的描述..."
      - "她控制情绪的方式显示出深厚的政治修养"
    nextEvents:
      - "revenge_plot"
      
    characterEffects:
      - characterId: "wuzetian"
        attributeChanges:
          power: -3
          loyalty: -8
          ambition: +5
        relationshipChanges:
          affection: -15
          trust: -10
          fear: +8
          threat: +10
        statusChanges:
          plotting: true     # 开始密谋
          suspicious: true   # 变得可疑
          
    interCharacterEffects:
      - character1: "wuzetian"
        character2: "huoguang"
        relationshipChange: +3  # 共同敌人让关系稍微缓和
        reason: "对皇帝的共同不满"
        
    factionEffects:
      - faction: "女性政治集团"
        influenceChange: -8
      - faction: "皇室保守派"
        influenceChange: +5
    
  - id: "compromise"
    text: "容朕再思虑一番"
    conditions:          # 选项触发条件
      minAuthority: 40
      characterRelationship:  # 角色关系条件
        characterId: "wuzetian"
        minTrust: 20
        maxThreat: 60
    effects:
      authority: -2
      treasury: -3
    consequences: "你巧妙地化解了当前的冲突，母后点头表示认可..."
    characterClues:
      - "母后似乎很欣赏你的政治智慧"
    nextEvents:
      - "temporary_peace"
      
    characterEffects:
      - characterId: "wuzetian"
        attributeChanges:
          loyalty: +2
          ambition: 0
        relationshipChanges:
          affection: +5
          trust: +8
          respect: +10
        statusChanges:
          plotting: false
          
    interCharacterEffects:
      - character1: "wuzetian"  
        character2: "huoguang"
        relationshipChange: 0   # 保持现状
        reason: "暂时的政治平衡"
        
    factionEffects:
      - faction: "女性政治集团"
        influenceChange: +3
      - faction: "传统官僚集团" 
        influenceChange: +2

# 特殊身份揭示事件 (可选)
identityRevealEvent:
  condition: "relationship >= 80"
  revealText: "经过长久的相处，你终于意识到，这位一直在你身边的母后，正是历史上那位唯一的女皇帝——武则天！"
  unlockTitle: "武则天"    # 解锁后显示的真实称谓
```

##### 4. 配置文件管理工具
- **配置验证器**: 检查 YAML 格式和数据完整性
- **配置加载器**: 运行时动态加载角色和事件数据
- **配置编辑器**: 可视化编辑工具 (开发阶段使用)

##### 5. 数据类型支持
```typescript
// 支持从 YAML 加载的类型
interface CharacterConfig {
  id: string;
  name: string;
  role: string;
  description: string;
  category: '皇族' | '文臣' | '武将' | '宦官' | '权臣';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  influence: EmperorInfluence;
  traits: string[];
  conditions?: CharacterConditions;
}

interface EventConfig {
  id: string;
  title: string;
  description: string;
  speaker: string;
  dialogue: string;
  activationConditions?: EventConditions;
  removalConditions?: EventConditions;
  triggerConditions?: EventConditions;
  weight: number;
  dynamicWeight?: DynamicWeight;
  choices: EventChoiceConfig[];
}

// 存档相关类型
interface SaveFile {
  saveId: string;
  saveName: string;
  createdAt: string;
  lastSavedAt: string;
  gameState: GameState;
  metadata: SaveMetadata;
}

interface SaveMetadata {
  totalPlayTime: number;    // 总游戏时间(秒)
  maxAuthority: number;     // 历史最高威望
  maxPopularity: number;    // 历史最高民心
  achievements: string[];   // 成就列表
  difficulty: 'easy' | 'normal' | 'hard';
  version: string;          // 游戏版本
}

interface SaveSummary {
  saveId: string;
  saveName: string;
  createdAt: string;
  lastSavedAt: string;
  currentTurn: number;
  emperorAge: number;
  reignYears: number;
  gameOver: boolean;
  thumbnail?: string;       // 存档缩略图(可选)
}

// API 相关类型
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

interface GameActionRequest {
  saveId: string;
  action: 'choose_option' | 'save_game' | 'next_turn';
  payload: {
    choiceId?: string;
    [key: string]: any;
  };
}

interface GameActionResponse {
  gameState: GameState;
  eventUpdated: boolean;
  gameOver?: boolean;
  gameOverReason?: string;
}
```

#### 开发阶段规划

##### 第一阶段: 基础框架和后端核心
- 搭建 Next.js 项目结构
- 创建基本页面和API路由结构
- 实现数据类型定义 (game.ts, api.ts, saves.ts)
- 开发游戏核心引擎 (gameEngine.ts)
- 实现存档管理系统 (saveManager.ts)
- 基础UI组件开发

##### 第二阶段: 游戏逻辑和卡池系统
- 实现三卡池管理器 (cardPoolManager.ts)
- 开发事件系统和条件检查逻辑
- 实现角色状态管理
- 游戏结束条件判定
- API接口实现和测试

##### 第三阶段: 前端界面和交互
- 存档管理界面开发 (SaveManager, SaveCard)
- 游戏界面组件完善
- 前后端API集成
- 实时游戏状态同步
- 错误处理和用户反馈

##### 第四阶段: 内容填充和优化
- 角色和事件配置文件编写
- 游戏平衡性调试
- 配置验证工具开发
- 性能优化和缓存策略
- 游戏测试和bug修复

#### 前后端职责分离

##### 前端职责 (React/Next.js 页面)
- **UI渲染**: 显示游戏状态、事件对话、选项按钮
- **用户交互**: 处理用户点击、表单提交
- **状态展示**: 皇帝属性、角色列表、游戏历史
- **存档管理**: 存档列表展示、创建/删除操作
- **API调用**: 与后端进行数据交换

##### 后端职责 (API Routes)
- **游戏逻辑**: 所有游戏规则和计算逻辑
- **卡池管理**: 三卡池的动态管理和条件检查
- **存档管理**: 文件读写、存档创建/删除
- **配置加载**: YAML文件解析和验证
- **状态管理**: 游戏状态的持久化和更新
- **数据验证**: 确保游戏数据的完整性和正确性

#### 文件结构
```
src/
├── app/
│   ├── page.tsx           # 主页 (存档管理)
│   ├── game/
│   │   └── [saveId]/
│   │       └── page.tsx   # 游戏页面 (动态路由)
│   ├── api/               # 后端API路由
│   │   ├── saves/
│   │   │   ├── route.ts   # GET: 获取存档列表, POST: 创建新存档
│   │   │   └── [saveId]/
│   │   │       ├── route.ts      # GET: 加载存档, PUT: 保存游戏, DELETE: 删除存档
│   │   │       └── action/
│   │   │           └── route.ts  # POST: 执行游戏行动 (选择事件选项)
│   │   ├── game/
│   │   │   ├── initialize/
│   │   │   │   └── route.ts      # POST: 初始化新游戏
│   │   │   └── characters/
│   │   │       └── route.ts      # GET: 获取所有角色配置
│   │   └── config/
│   │       └── validate/
│   │           └── route.ts      # POST: 验证配置文件
│   └── layout.tsx
├── components/
│   ├── SaveManager.tsx    # 存档管理组件
│   ├── SaveCard.tsx       # 存档卡片组件
│   ├── EmperorStats.tsx
│   ├── CharacterPanel.tsx
│   ├── EventDisplay.tsx
│   └── GameHistory.tsx
├── contexts/
│   └── GameContext.tsx    # 前端UI状态管理
├── data/
│   └── characters/        # 角色卡配置目录 (静态数据)
│       ├── wuzetian/      # 武则天
│       │   ├── character.yaml
│       │   └── events/
│       │       ├── power-struggle.yaml
│       │       ├── court-decision.yaml
│       │       └── family-affair.yaml
│       ├── huoguang/      # 霍光
│       │   ├── character.yaml
│       │   └── events/
│       ├── aobai/         # 鳌拜
│       │   ├── character.yaml
│       │   └── events/
│       ├── qinhui/        # 秦桧
│       │   ├── character.yaml
│       │   └── events/
│       ├── weizhongxian/  # 魏忠贤
│       │   ├── character.yaml
│       │   └── events/
│       └── ...            # 其他角色
├── saves/                 # 存档目录 (动态数据)
│   ├── save_001.json      # 存档文件示例
│   ├── save_002.json
│   ├── save_003.json
│   └── ...
├── types/
│   ├── game.ts           # 游戏相关类型定义
│   ├── api.ts            # API接口类型定义
│   └── saves.ts          # 存档相关类型定义
├── lib/
│   ├── gameEngine.ts     # 游戏核心引擎 (后端逻辑)
│   ├── cardPoolManager.ts # 卡池管理器
│   ├── saveManager.ts    # 存档管理器
│   ├── configLoader.ts   # YAML 配置加载器
│   ├── configValidator.ts # 配置验证器
│   └── yaml.ts           # YAML 解析工具
└── utils/
    ├── gameLogic.ts      # 游戏逻辑工具函数
    ├── apiClient.ts      # 前端API调用工具
    └── constants.ts      # 游戏常量

#### 存档系统设计

##### 1. 存档文件格式 (`saves/save_xxx.json`)
```json
{
  "saveId": "save_001",
  "saveName": "明君之路",
  "createdAt": "2025-07-23T10:30:00Z",
  "lastSavedAt": "2025-07-23T11:45:30Z",
  "gameState": {
    "emperor": {
      "health": 75,
      "authority": 82,
      "treasury": 45,
      "military": 68,
      "popularity": 72,
      "age": 28,
      "reignYears": 5
    },
    "activeCharacters": [
      {
        "id": "wuzetian",
        "name": "武则天",
        "role": "母后",
        "description": "..."
      }
    ],
    "cardPools": {
      "pending": [...],
      "active": [...],
      "discarded": [...]
    },
    "gameHistory": [...],
    "currentEvent": {...},
    "characterStates": [...],
    "gameOver": false,
    "currentTurn": 25
  },
  "metadata": {
    "totalPlayTime": 3600,  // 总游戏时间(秒)
    "maxAuthority": 85,     // 历史最高威望
    "achievements": [],     // 成就列表
    "difficulty": "normal"   // 难度等级
  }
}
```

##### 2. API 接口设计

###### 存档管理 API
- `GET /api/saves` - 获取所有存档列表
- `POST /api/saves` - 创建新存档
- `GET /api/saves/[saveId]` - 加载指定存档
- `PUT /api/saves/[saveId]` - 保存游戏进度
- `DELETE /api/saves/[saveId]` - 删除存档

###### 游戏逻辑 API  
- `POST /api/saves/[saveId]/action` - 执行游戏行动
- `POST /api/game/initialize` - 初始化新游戏
- `GET /api/game/characters` - 获取角色配置

###### 配置管理 API
- `POST /api/config/validate` - 验证配置文件
```

#### 配置文件示例角色规划

##### 皇族类 (2-3个)
- **武则天** → 称谓: "母后" / "太后" / "慈母"
  - 线索: 对政务异常熟悉，与大臣关系复杂，眼神锐利
  - 揭示条件: 关系达到80或触发特定事件
- **慈禧太后** → 称谓: "老佛爷" / "太后" / "皇额娘"  
  - 线索: 喜欢奢华，对外交颇有见解，手段老辣
  - 揭示条件: 在位15年后或发生政变事件
- **长孙皇后** → 称谓: "皇后" / "贤妻" / "内助"
  - 线索: 温婉贤淑，善于调解，深得民心
  - 揭示条件: 关系友好且触发家庭事件

##### 文臣类 (4-5个)  
- **霍光** → 称谓: "大将军" / "忠臣" / "老将军"
  - 线索: 军政兼备，忠心耿耿，威望极高
  - 揭示条件: 军事危机时或在位10年后
- **秦桧** → 称谓: "宰相" / "大人" / "丞相"
  - 线索: 善于阿谀，主张议和，与某些将军不和
  - 揭示条件: 发生战争决策或背叛事件
- **王安石** → 称谓: "宰相" / "改革大臣" / "王大人"
  - 线索: 锐意改革，理想主义，不畏权贵
  - 揭示条件: 实施改革政策后
- **严嵩** → 称谓: "内阁首辅" / "严大人" / "老奸臣"
  - 线索: 贪婪狡诈，善于媚上，生活奢靡
  - 揭示条件: 财政危机或腐败事件
- **张居正** → 称谓: "首辅" / "张先生" / "改革家"
  - 线索: 雷厉风行，改革能力强，不畏强权
  - 揭示条件: 改革成功或与权贵冲突

##### 武将类 (3-4个)
- **年羹尧** → 称谓: "大将军" / "年将军" / "西北王"
  - 线索: 功勋卓著，但傲慢自大，似有异心
  - 揭示条件: 军功过高或出现叛变征兆
- **岳飞** → 称谓: "将军" / "忠勇将军" / "岳帅"
  - 线索: 精忠报国，深得士兵爱戴，坚持抗战
  - 揭示条件: 战争胜利或与主和派冲突
- **吴三桂** → 称谓: "总兵" / "平西王" / "吴将军"
  - 线索: 手握重兵，态度摇摆，似在观望时局
  - 揭示条件: 外敌入侵或政治危机时
- **李广** → 称谓: "将军" / "飞将军" / "老将军"
  - 线索: 作战勇猛，但命运多舛，郁郁不得志
  - 揭示条件: 多次战败或年龄增长后

##### 宦官类 (2-3个)
- **魏忠贤** → 称谓: "司礼监" / "魏公公" / "九千岁"
  - 线索: 权势熏天，党羽众多，皇帝依赖颇深
  - 揭示条件: 权力巩固或发生宫廷政变
- **刘瑾** → 称谓: "太监总管" / "刘公公" / "内相"
  - 线索: 贪财好利，弄权专政，朝野侧目
  - 揭示条件: 贪腐事发或权力斗争
- **郑和** → 称谓: "三宝太监" / "郑公公" / "航海大臣"
  - 线索: 博学多才，熟悉海外，忠心可靠
  - 揭示条件: 海外贸易或外交事件

##### 权臣类 (3-4个)
- **鳌拜** → 称谓: "辅政大臣" / "鳌大人" / "先帝托孤"
  - 线索: 专横跋扈，自恃功高，不把皇帝放在眼里
  - 揭示条件: 权力冲突或皇帝成年后
- **董卓** → 称谓: "相国" / "董大人" / "太师"  
  - 线索: 残暴不仁，挟天子令诸侯，天下共愤
  - 揭示条件: 暴政事件或民怨沸腾
- **曹操** → 称谓: "丞相" / "魏王" / "曹大人"
  - 线索: 雄才大略，但野心勃勃，似有取代之心
  - 揭示条件: 军政大权在握或称王事件
- **司马懿** → 称谓: "太傅" / "司马大人" / "托孤重臣"
  - 线索: 深藏不露，隐忍不发，但暗中布局
  - 揭示条件: 长期潜伏后或发动政变

#### 称谓系统玩法特色

##### 1. 渐进式发现
- 初期只知道角色的职位称谓 ("母后"、"宰相"、"将军")
- 通过事件互动逐渐发现角色特征和线索
- 达到特定条件后揭示真实身份

##### 2. 多重称谓
- 同一角色在不同关系阶段有不同称谓
- 关系亲密: "慈母" → 关系恶化: "太后娘娘"  
- 权力变化: "宰相" → "首辅" → "权臣"

##### 3. 历史悬念
- 玩家需要通过行为和选择来"侦探"角色身份
- 增加重玩价值，每次游戏都有新发现
- 考验玩家的历史知识和推理能力

#### 动态文本生成系统

##### 1. 文本模板机制
为了支持复杂的角色互动和动态剧情，需要实现一套灵活的文本模板系统：

```typescript
interface TextTemplate {
  id: string;
  template: string;          // 带变量的模板文本
  variables: VariableConfig[]; // 变量配置
  conditions?: TextCondition[]; // 文本显示条件
  weight?: number;           // 模板权重
}

interface VariableConfig {
  name: string;              // 变量名称，如 ${target_character}
  type: 'character' | 'faction' | 'attribute' | 'relationship' | 'custom';
  selector: VariableSelector; // 变量选择器
  fallback?: string;         // 默认值
}

interface VariableSelector {
  // 角色选择器
  characterSelector?: {
    filter: 'alive' | 'in_court' | 'enemy' | 'ally' | 'rival' | 'faction_member';
    excludeSource?: boolean;  // 排除事件发起者
    excludeTarget?: boolean;  // 排除目标角色
    factionFilter?: string;   // 派系过滤
    relationshipFilter?: {    // 关系过滤
      minStrength?: number;
      maxStrength?: number;
      relationType?: string;
    };
    attributeFilter?: {       // 属性过滤
      minPower?: number;
      maxLoyalty?: number;
      // ... 其他属性
    };
    priority?: 'random' | 'highest_power' | 'lowest_loyalty' | 'most_threat';
  };
  
  // 派系选择器
  factionSelector?: {
    filter: 'opposing' | 'allied' | 'neutral' | 'strongest' | 'weakest';
    excludeCurrent?: boolean;
  };
  
  // 属性选择器
  attributeSelector?: {
    type: 'current' | 'change' | 'comparison';
    attributeName: string;
    characterId?: string;     // 特定角色的属性
  };
  
  // 关系选择器
  relationshipSelector?: {
    type: 'affection' | 'trust' | 'fear' | 'threat';
    source: string;           // 关系源角色
    target: string;           // 关系目标角色
    format: 'value' | 'description' | 'trend';
  };
}

interface TextCondition {
  type: 'character_present' | 'faction_balance' | 'relationship_state' | 'game_state';
  condition: any;            // 具体条件配置
}
```

##### 2. 事件对话模板示例

在事件配置文件中使用模板：

```yaml
# events/pillow-talk.yaml
id: "empress_pillow_talk"
title: "枕边风"
description: "深夜时分，皇后悄悄向你诉说朝中情形"
speaker: "皇后"

# 动态对话模板
dialogueTemplates:
  - id: "gossip_about_rival"
    weight: 3
    template: "皇上，${target_character}最近在朝中颇为活跃，${target_pronoun}与${rival_faction}的人走得很近。妾身担心${target_pronoun}对皇上不利..."
    variables:
      - name: "target_character"
        type: "character"
        selector:
          characterSelector:
            filter: "in_court"
            excludeSource: true
            relationshipFilter:
              maxStrength: 20    # 关系不好的角色
            attributeFilter:
              minPower: 60       # 有威胁的角色
            priority: "highest_power"
      - name: "target_pronoun"
        type: "custom"
        selector:
          customFunction: "getCharacterPronoun"  # 根据角色性别返回代词
      - name: "rival_faction"
        type: "faction"
        selector:
          factionSelector:
            filter: "opposing"
    conditions:
      - type: "character_present"
        condition:
          role: "宦官"        # 有宦官在场时权重增加
    
  - id: "concern_about_faction"
    weight: 2
    template: "皇上可知${powerful_faction}最近动作频频？${faction_leader}手下那些人，个个心怀鬼胎。妾身听宫女说..."
    variables:
      - name: "powerful_faction"
        type: "faction"
        selector:
          factionSelector:
            filter: "strongest"
            excludeCurrent: true
      - name: "faction_leader"
        type: "character"
        selector:
          characterSelector:
            filter: "faction_member"
            attributeFilter:
              minPower: 80
            priority: "highest_power"
    
  - id: "praise_loyal_minister"
    weight: 1
    template: "皇上，${loyal_character}真是难得的忠臣，${loyal_pronoun}对皇上一片赤诚。不像某些人..."
    variables:
      - name: "loyal_character"
        type: "character"
        selector:
          characterSelector:
            filter: "ally"
            attributeFilter:
              minLoyalty: 80
            priority: "random"
      - name: "loyal_pronoun"
        type: "custom"
        selector:
          customFunction: "getCharacterPronoun"

# 选择文本也可以使用模板
choices:
  - id: "agree_suspicion"
    textTemplate: "确实，${target_character}需要提防"
    variables:
      - name: "target_character"
        type: "character"
        inheritFrom: "dialogue"  # 继承对话中的变量
    effects:
      characterEffects:
        - characterId: "${target_character_id}"
          relationshipChanges:
            trust: -5
            threat: +3
        - characterId: "empress"
          relationshipChanges:
            affection: +8
            trust: +5
```

##### 3. 文本生成引擎

```typescript
class TextGenerator {
  // 生成动态文本
  generateText(template: TextTemplate, gameState: GameState): string {
    const variables = this.resolveVariables(template.variables, gameState);
    return this.replaceVariables(template.template, variables);
  }
  
  // 解析变量
  private resolveVariables(configs: VariableConfig[], gameState: GameState): Map<string, string> {
    const variables = new Map<string, string>();
    
    for (const config of configs) {
      let value: string;
      
      switch (config.type) {
        case 'character':
          const character = this.selectCharacter(config.selector.characterSelector, gameState);
          value = character ? character.currentTitle : config.fallback || "某位大臣";
          // 存储角色ID供后续使用
          if (character) {
            variables.set(`${config.name}_id`, character.id);
          }
          break;
          
        case 'faction':
          const faction = this.selectFaction(config.selector.factionSelector, gameState);
          value = faction ? faction.name : config.fallback || "某个势力";
          break;
          
        case 'relationship':
          value = this.getRelationshipDescription(config.selector.relationshipSelector, gameState);
          break;
          
        case 'custom':
          value = this.executeCustomFunction(config.selector, gameState, variables);
          break;
          
        default:
          value = config.fallback || "";
      }
      
      variables.set(config.name, value);
    }
    
    return variables;
  }
  
  // 角色选择器
  private selectCharacter(selector: CharacterSelector, gameState: GameState): CharacterCard | null {
    let candidates = gameState.activeCharacters.filter(char => {
      // 基础过滤
      if (selector.filter === 'alive' && !char.statusFlags.alive) return false;
      if (selector.filter === 'in_court' && !char.statusFlags.inCourt) return false;
      if (selector.filter === 'enemy' && char.relationshipWithEmperor.affection > 0) return false;
      if (selector.filter === 'ally' && char.relationshipWithEmperor.affection <= 0) return false;
      
      // 属性过滤
      if (selector.attributeFilter) {
        const attr = selector.attributeFilter;
        if (attr.minPower && char.attributes.power < attr.minPower) return false;
        if (attr.maxLoyalty && char.attributes.loyalty > attr.maxLoyalty) return false;
      }
      
      // 关系过滤
      if (selector.relationshipFilter) {
        const rel = selector.relationshipFilter;
        const affection = char.relationshipWithEmperor.affection;
        if (rel.minStrength && affection < rel.minStrength) return false;
        if (rel.maxStrength && affection > rel.maxStrength) return false;
      }
      
      return true;
    });
    
    // 优先级选择
    switch (selector.priority) {
      case 'highest_power':
        candidates.sort((a, b) => b.attributes.power - a.attributes.power);
        break;
      case 'lowest_loyalty':
        candidates.sort((a, b) => a.attributes.loyalty - b.attributes.loyalty);
        break;
      case 'most_threat':
        candidates.sort((a, b) => b.relationshipWithEmperor.threat - a.relationshipWithEmperor.threat);
        break;
      case 'random':
      default:
        candidates = this.shuffleArray(candidates);
        break;
    }
    
    return candidates.length > 0 ? candidates[0] : null;
  }
  
  // 自定义函数执行
  private executeCustomFunction(selector: any, gameState: GameState, variables: Map<string, string>): string {
    switch (selector.customFunction) {
      case 'getCharacterPronoun':
        const characterId = variables.get('target_character_id');
        const character = gameState.activeCharacters.find(c => c.id === characterId);
        return this.getCharacterPronoun(character);
        
      case 'getRelationshipTrend':
        // 根据历史数据判断关系变化趋势
        return this.analyzeRelationshipTrend(gameState);
        
      case 'getRandomRumor':
        // 生成随机谣言
        return this.generateRandomRumor(gameState);
        
      default:
        return "";
    }
  }
  
  private getCharacterPronoun(character?: CharacterCard): string {
    if (!character) return "他/她";
    
    // 根据角色特征判断性别代词
    if (character.name.includes('太后') || character.name.includes('皇后') || 
        character.role.includes('妃') || character.id === 'wuzetian') {
      return "她";
    }
    return "他";
  }
}
```

##### 4. 条件文本系统

不同情况下显示不同的文本变体：

```yaml
# 条件文本示例
conditionalTexts:
  - condition:
      type: "faction_balance"
      factionInfluence:
        "军事集团": "> 60"
    template: "皇上，${military_leader}手握重兵，${military_pronoun}的一举一动都影响着朝局..."
    
  - condition:
      type: "relationship_state"
      characterId: "wuzetian"
      relationship: "hostile"
    template: "皇上，母后近来对您颇有微词，${another_character}也在暗中观望..."
    
  - condition:
      type: "game_state"
      currentTurn: "> 20"
      emperorAge: "> 40"
    template: "皇上年事渐高，朝中少壮派们蠢蠢欲动，${young_minister}时常与老臣们意见相左..."
```

##### 5. 文本本地化和变体

支持多种表达方式增加游戏丰富度：

```typescript
interface TextVariants {
  formal: string[];      // 正式场合用词
  intimate: string[];    // 亲密关系用词
  hostile: string[];     // 敌对关系用词
  respectful: string[];  // 尊敬用词
}

const characterReferenceVariants = {
  "wuzetian": {
    formal: ["母后", "太后娘娘", "太后"],
    intimate: ["慈母", "母亲", "额娘"],
    hostile: ["那位太后", "武氏", "她"],
    respectful: ["太后陛下", "皇太后"]
  },
  "huoguang": {
    formal: ["大将军", "霍将军", "将军"],
    intimate: ["老将军", "霍大人"],
    hostile: ["那个霍光", "武夫", "他"],
    respectful: ["大将军阁下", "霍大将军"]
  }
};
```

这个系统的优势：
1. **动态内容**: 每次游戏都有不同的对话内容
2. **关系感知**: 文本会根据角色关系动态调整
3. **情境适应**: 根据游戏状态生成合适的内容
4. **复用性强**: 模板可以在多个事件中复用
5. **易于扩展**: 可以轻松添加新的变量类型和选择器