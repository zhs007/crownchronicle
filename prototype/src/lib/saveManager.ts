import { SaveFile, SaveSummary, SaveMetadata } from '@/types/saves';
import { GameState } from 'crownchronicle-core';
import { promises as fs } from 'fs';
import { join } from 'path';

export class SaveManager {
  private static savesDirectory = join(process.cwd(), 'saves');

  /**
   * 确保存档目录存在
   */
  private static async ensureSavesDirectory(): Promise<void> {
    try {
      await fs.access(this.savesDirectory);
    } catch {
      await fs.mkdir(this.savesDirectory, { recursive: true });
    }
  }

  /**
   * 生成新的存档ID
   */
  private static generateSaveId(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `save_${timestamp}_${random}`;
  }

  /**
   * 获取存档文件路径
   */
  private static getSaveFilePath(saveId: string): string {
    return join(this.savesDirectory, `${saveId}.json`);
  }

  /**
   * 创建新存档
   */
  static async createSave(
    saveName: string, 
    gameState: GameState, 
    difficulty: 'easy' | 'normal' | 'hard' = 'normal'
  ): Promise<string> {
    await this.ensureSavesDirectory();
    
    const saveId = this.generateSaveId();
    const now = new Date().toISOString();
    
    const metadata: SaveMetadata = {
      totalPlayTime: 0,
      maxPower: gameState.emperor.power,
      maxPopularity: gameState.emperor.popularity,
      achievements: [],
      difficulty,
      version: '1.0.0'
    };
    
    const saveFile: SaveFile = {
      saveId,
      saveName,
      createdAt: now,
      lastSavedAt: now,
      gameState,
      metadata
    };
    
    const filePath = this.getSaveFilePath(saveId);
    await fs.writeFile(filePath, JSON.stringify(saveFile, null, 2), 'utf8');
    
    return saveId;
  }

  /**
   * 加载存档
   */
  static async loadSave(saveId: string): Promise<SaveFile | null> {
    try {
      const filePath = this.getSaveFilePath(saveId);
      const fileContent = await fs.readFile(filePath, 'utf8');
      return JSON.parse(fileContent) as SaveFile;
    } catch (error) {
      console.error(`Failed to load save ${saveId}:`, error);
      return null;
    }
  }

  /**
   * 保存游戏状态
   */
  static async updateSave(saveId: string, gameState: GameState, playTime: number = 0): Promise<boolean> {
    try {
      const saveFile = await this.loadSave(saveId);
      if (!saveFile) return false;
      
      // 更新元数据
      saveFile.gameState = gameState;
      saveFile.lastSavedAt = new Date().toISOString();
      saveFile.metadata.totalPlayTime += playTime;
      saveFile.metadata.maxPower = Math.max(saveFile.metadata.maxPower, gameState.emperor.power);
      saveFile.metadata.maxPopularity = Math.max(saveFile.metadata.maxPopularity, gameState.emperor.popularity);
      
      const filePath = this.getSaveFilePath(saveId);
      await fs.writeFile(filePath, JSON.stringify(saveFile, null, 2), 'utf8');
      
      return true;
    } catch (error) {
      console.error(`Failed to update save ${saveId}:`, error);
      return false;
    }
  }

  /**
   * 删除存档
   */
  static async deleteSave(saveId: string): Promise<boolean> {
    try {
      const filePath = this.getSaveFilePath(saveId);
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error(`Failed to delete save ${saveId}:`, error);
      return false;
    }
  }

  /**
   * 获取所有存档摘要
   */
  static async getAllSaves(): Promise<SaveSummary[]> {
    try {
      await this.ensureSavesDirectory();
      
      const files = await fs.readdir(this.savesDirectory);
      const saveFiles = files.filter(file => file.endsWith('.json'));
      
      const saves: SaveSummary[] = [];
      
      for (const file of saveFiles) {
        try {
          const filePath = join(this.savesDirectory, file);
          const fileContent = await fs.readFile(filePath, 'utf8');
          const saveFile = JSON.parse(fileContent) as SaveFile;
          
          const summary: SaveSummary = {
            saveId: saveFile.saveId,
            saveName: saveFile.saveName,
            createdAt: saveFile.createdAt,
            lastSavedAt: saveFile.lastSavedAt,
            currentTurn: saveFile.gameState.currentTurn,
            emperorAge: saveFile.gameState.emperor.age,
            gameOver: saveFile.gameState.gameOver,
            metadata: saveFile.metadata
          };
          
          saves.push(summary);
        } catch (error) {
          console.error(`Failed to parse save file ${file}:`, error);
        }
      }
      
      // 按最后保存时间排序
      return saves.sort((a, b) => new Date(b.lastSavedAt).getTime() - new Date(a.lastSavedAt).getTime());
    } catch (error) {
      console.error('Failed to get all saves:', error);
      return [];
    }
  }

  /**
   * 检查存档是否存在
   */
  static async saveExists(saveId: string): Promise<boolean> {
    try {
      const filePath = this.getSaveFilePath(saveId);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取存档统计信息
   */
  static async getSaveStats(): Promise<{
    totalSaves: number;
    totalPlayTime: number;
    bestAuthority: number;
    bestPopularity: number;
    longestReign: number;
  }> {
    const saves = await this.getAllSaves();
    
    if (saves.length === 0) {
      return {
        totalSaves: 0,
        totalPlayTime: 0,
        bestAuthority: 0,
        bestPopularity: 0,
        longestReign: 0
      };
    }
    
    return {
      totalSaves: saves.length,
      totalPlayTime: saves.reduce((sum, save) => sum + save.metadata.totalPlayTime, 0),
      bestAuthority: Math.max(...saves.map(save => save.metadata.maxPower)),
      bestPopularity: Math.max(...saves.map(save => save.metadata.maxPopularity)),
      longestReign: Math.max(...saves.map(save => save.emperorAge))
    };
  }

  /**
   * 备份存档
   */
  static async backupSave(saveId: string): Promise<string | null> {
    try {
      const saveFile = await this.loadSave(saveId);
      if (!saveFile) return null;
      
      const backupId = `${saveId}_backup_${Date.now()}`;
      const backupPath = this.getSaveFilePath(backupId);
      
      await fs.writeFile(backupPath, JSON.stringify(saveFile, null, 2), 'utf8');
      
      return backupId;
    } catch (error) {
      console.error(`Failed to backup save ${saveId}:`, error);
      return null;
    }
  }

  /**
   * 清理旧备份文件
   */
  static async cleanupBackups(maxBackups: number = 10): Promise<void> {
    try {
      const files = await fs.readdir(this.savesDirectory);
      const backupFiles = files.filter(file => file.includes('_backup_') && file.endsWith('.json'));
      
      if (backupFiles.length <= maxBackups) return;
      
      // 按时间戳排序，删除最旧的
      const sortedBackups = backupFiles.sort((a, b) => {
        const timestampA = a.match(/_backup_(\d+)\.json$/)?.[1] || '0';
        const timestampB = b.match(/_backup_(\d+)\.json$/)?.[1] || '0';
        return parseInt(timestampA) - parseInt(timestampB);
      });
      
      const toDelete = sortedBackups.slice(0, sortedBackups.length - maxBackups);
      
      for (const file of toDelete) {
        await fs.unlink(join(this.savesDirectory, file));
      }
    } catch (error) {
      console.error('Failed to cleanup backups:', error);
    }
  }
}
