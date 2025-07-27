import React, { useEffect, useState } from 'react';


/**
 * 通用卡管理面板（仅基础展示与入口，编辑逻辑交由 AI agent 处理）
 */
const CommonCardPanel: React.FC = () => {
  const [commonCards, setCommonCards] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Record<string, unknown> | null>(null);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    setLoading(true);
    const res = await fetch('/api/commoncards');
    const json = await res.json();
    // 适配 /api/commoncards 只返回数组的情况
    if (Array.isArray(json)) {
      setCommonCards(json);
    } else if (json.success && Array.isArray(json.data)) {
      setCommonCards(json.data);
    }
    setLoading(false);
  };

  // 新建通用卡
  const handleCreate = () => {
    setSelectedCard(null);
    setShowEdit(true);
  };

  // 编辑通用卡
  const handleEdit = (card: Record<string, unknown>) => {
    setSelectedCard(card);
    setShowEdit(true);
  };

  // 删除通用卡（实际操作应由AI agent或后端实现，这里仅UI入口）
  const handleDelete = (card: Record<string, unknown>) => {
    if (window.confirm(`确定要删除通用卡「${card.name}」吗？`)) {
      // 触发AI agent或后端删除逻辑
      alert('删除操作已触发（实际由AI agent处理）');
    }
  };

  // 保存通用卡（实际操作应由AI agent或后端实现，这里仅UI入口）
  const handleSave = async (card: Record<string, unknown>) => {
    await fetch('/api/commoncards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    });
    setShowEdit(false);
    await fetchCards();
  };

  // 取消编辑
  const handleCancel = () => {
    setShowEdit(false);
    setSelectedCard(null);
  };

  return (
    <div>
      <h2>通用卡管理</h2>
      {loading ? <div>加载中...</div> : (
        <ul>
          {commonCards.map(card => (
            <li key={card.id as string}>
              {card.name as string}
              <button style={{marginLeft:8}} onClick={() => handleEdit(card)}>编辑</button>
              <button style={{marginLeft:4}} onClick={() => handleDelete(card)}>删除</button>
            </li>
          ))}
        </ul>
      )}
      <button onClick={handleCreate}>新建通用卡（由AI agent处理）</button>
      {showEdit && (
        <div style={{border:'1px solid #ccc',marginTop:8,padding:8}}>
          <h4>{selectedCard ? '编辑通用卡' : '新建通用卡'}</h4>
          {/* 这里只做简单输入，实际编辑逻辑交由AI agent处理 */}
          <input defaultValue={selectedCard?.name as string || ''} placeholder="通用卡名称" style={{marginRight:8}} />
          <button onClick={() => handleSave({})}>保存（由AI agent处理）</button>
          <button onClick={handleCancel} style={{marginLeft:4}}>取消</button>
        </div>
      )}
    </div>
  );
};

export default CommonCardPanel;
