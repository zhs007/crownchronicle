import { GameState } from 'crownchronicle-core';

// 存档元数据
export interface SaveMetadata {
  totalPlayTime: number;    // 总游戏时间(秒)
  maxAuthority: number;     // 历史最高威望
  maxPopularity: number;    // 历史最高民心
  achievements: string[];   // 成就列表
  difficulty: 'easy' | 'normal' | 'hard';
  version: string;          // 游戏版本
}

// 存档文件
export interface SaveFile {
  saveId: string;
  saveName: string;
  createdAt: string;
  lastSavedAt: string;
  gameState: GameState;
  metadata: SaveMetadata;
}

// 存档摘要
export interface SaveSummary {
  saveId: string;
  saveName: string;
  createdAt: string;
  lastSavedAt: string;
  currentTurn: number;
  emperorAge: number;
  reignYears: number;
  gameOver: boolean;
  thumbnail?: string;       // 存档缩略图(可选)
  metadata: SaveMetadata;
}
