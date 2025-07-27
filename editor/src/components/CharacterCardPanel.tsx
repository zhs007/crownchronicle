import React from 'react';

/**
 * 角色卡管理面板（含通用卡多选入口，编辑逻辑交由 AI agent 处理）
 */
const CharacterCardPanel: React.FC = () => {
  // 这里只做角色卡列表展示和通用卡多选入口，实际操作交给 agent
  // 可根据 props 或 context 获取角色卡和通用卡列表
  // 示例结构：
  // const characterCards = useCharacterCards();
  // const commonCards = useCommonCards();

  return (
    <div>
      <h2>角色卡管理</h2>
      {/* 角色卡列表展示 */}
      {/* <ul>
        {characterCards.map(card => (
          <li key={card.id}>{card.name}</li>
        ))}
      </ul> */}
      {/* 通用卡多选入口，实际操作交由 agent 处理 */}
      <button>为角色卡关联通用卡（由AI agent处理）</button>
    </div>
  );
};

export default CharacterCardPanel;
