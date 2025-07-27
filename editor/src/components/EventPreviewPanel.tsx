import React from 'react';

/**
 * 角色卡事件预览面板（展示角色卡最终拥有的全部事件卡，区分专属与通用，数据由 agent 计算）
 */
const EventPreviewPanel: React.FC = () => {
  // 这里只做事件卡预览入口，实际事件池由 agent 计算并返回
  // 可根据 props 或 context 获取当前选中角色卡及其事件池
  // 示例结构：
  // const previewEvents = usePreviewEvents();

  return (
    <div>
      <h2>事件卡预览</h2>
      {/* 事件卡列表展示，区分专属与通用 */}
      {/* <ul>
        {previewEvents.map(evt => (
          <li key={evt.id}>{evt.name}（{evt.sourceType}）</li>
        ))}
      </ul> */}
      <button>刷新事件池（由AI agent处理）</button>
    </div>
  );
};

export default EventPreviewPanel;
