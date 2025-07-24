import { GameState } from 'crownchronicle-core';
import { SaveSummary } from './saves';

// API 响应格式
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// 游戏行动请求
export interface GameActionRequest {
  saveId: string;
  action: 'choose_option' | 'save_game' | 'next_turn';
  payload: {
    choiceId?: string;
    [key: string]: any;
  };
}

// 游戏行动响应
export interface GameActionResponse {
  gameState: GameState;
  eventUpdated: boolean;
  gameOver?: boolean;
  gameOverReason?: string;
}

// 创建新游戏请求
export interface CreateGameRequest {
  saveName: string;
  difficulty?: 'easy' | 'normal' | 'hard';
}

// 创建新游戏响应
export interface CreateGameResponse {
  saveId: string;
  gameState: GameState;
}

// 获取存档列表响应
export interface GetSavesResponse {
  saves: SaveSummary[];
}

// 获取存档响应
export interface GetSaveResponse {
  gameState: GameState;
}

// 删除存档请求
export interface DeleteSaveRequest {
  saveId: string;
}

// 角色配置响应
export interface GetCharactersResponse {
  characters: any[]; // 将在后续定义具体类型
}
