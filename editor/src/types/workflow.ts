export interface WorkflowContext {
  // 当前工作流的名称，如 'create_character', 'add_event'
  workflow: string | null; 
  
  // 当前进展到哪一阶段，由 AI 自行更新，如 'selecting_topic', 'designing_effects'
  stage: string | null;
  
  // 一个数据“暂存区”，AI 在这里逐步构建最终要保存的 JSON 对象
  data: Record<string, unknown>; 
  
  // AI 上一次向用户提出的问题，用于它自己判断用户的回复是否有效
  lastQuestion: string | null; 
}
