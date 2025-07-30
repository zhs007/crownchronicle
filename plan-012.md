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
  characterId?: string;
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
