import { 
  ApiResponse, 
  GameActionRequest, 
  GameActionResponse, 
  CreateGameRequest, 
  CreateGameResponse,
  GetSavesResponse,
  GetSaveResponse 
} from '@/types/api';

export class ApiClient {
  private static async request<T>(
    url: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 获取所有存档列表
   */
  static async getSaves(): Promise<ApiResponse<GetSavesResponse>> {
    return this.request<GetSavesResponse>('/api/saves');
  }

  /**
   * 创建新游戏
   */
  static async createGame(request: CreateGameRequest): Promise<ApiResponse<CreateGameResponse>> {
    return this.request<CreateGameResponse>('/api/saves', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * 加载存档
   */
  static async loadSave(saveId: string): Promise<ApiResponse<GetSaveResponse>> {
    return this.request<GetSaveResponse>(`/api/saves/${saveId}`);
  }

  /**
   * 删除存档
   */
  static async deleteSave(saveId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/saves/${saveId}`, {
      method: 'DELETE',
    });
  }

  /**
   * 执行游戏选择
   */
  static async makeChoice(saveId: string, choiceId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/api/saves/${saveId}/action`, {
      method: 'POST',
      body: JSON.stringify({ choiceId }),
    });
  }

  /**
   * 执行游戏行动
   */
  static async executeAction(request: GameActionRequest): Promise<ApiResponse<GameActionResponse>> {
    return this.request<GameActionResponse>(`/api/saves/${request.saveId}/action`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * 保存游戏
   */
  static async saveGame(saveId: string, playTime: number = 0): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/saves/${saveId}`, {
      method: 'PUT',
      body: JSON.stringify({ playTime }),
    });
  }

  /**
   * 获取角色配置
   */
  static async getCharacters(): Promise<ApiResponse<any>> {
    return this.request<any>('/api/game/characters');
  }

  /**
   * 初始化新游戏
   */
  static async initializeGame(difficulty: string = 'normal'): Promise<ApiResponse<any>> {
    return this.request<any>('/api/game/initialize', {
      method: 'POST',
      body: JSON.stringify({ difficulty }),
    });
  }
}
