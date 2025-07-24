import * as fs from 'fs';
import * as path from 'path';

interface VersionConfig {
  name: string;
  description: string;
  path: string;
  active: boolean;
}

interface ProjectConfig {
  defaultVersion: string;
  allowedVersions: string[];
}

interface GameConfig {
  versions: Record<string, VersionConfig>;
  projects: Record<string, ProjectConfig>;
}

export class GameConfigManager {
  private static configPath = path.join(process.cwd(), '../gameconfig/config.json');
  private static config: GameConfig | null = null;

  /**
   * 加载配置文件
   */
  private static loadConfig(): GameConfig {
    if (!this.config) {
      try {
        const configContent = fs.readFileSync(this.configPath, 'utf8');
        this.config = JSON.parse(configContent);
      } catch (error) {
        throw new Error(`Failed to load game config: ${error}`);
      }
    }
    return this.config!;
  }

  /**
   * 获取指定项目的配置路径
   * @param project 项目名称 ('editor' | 'prototype')
   * @param version 版本名称（可选，默认使用项目的默认版本）
   * @returns 配置数据的绝对路径
   */
  static getConfigPath(project: 'editor' | 'prototype', version?: string): string {
    const config = this.loadConfig();
    const projectConfig = config.projects[project];
    
    if (!projectConfig) {
      throw new Error(`Unknown project: ${project}`);
    }

    const targetVersion = version || projectConfig.defaultVersion;
    
    // 检查版本是否允许
    if (!projectConfig.allowedVersions.includes(targetVersion)) {
      throw new Error(`Version ${targetVersion} is not allowed for project ${project}`);
    }

    const versionConfig = config.versions[targetVersion];
    if (!versionConfig) {
      throw new Error(`Unknown version: ${targetVersion}`);
    }

    if (!versionConfig.active) {
      throw new Error(`Version ${targetVersion} is not active`);
    }

    // 计算绝对路径
    const gameconfigDir = path.dirname(this.configPath);
    return path.resolve(gameconfigDir, versionConfig.path);
  }

  /**
   * 获取指定项目允许的版本列表
   * @param project 项目名称
   * @returns 允许的版本数组
   */
  static getAvailableVersions(project: 'editor' | 'prototype'): string[] {
    const config = this.loadConfig();
    const projectConfig = config.projects[project];
    
    if (!projectConfig) {
      throw new Error(`Unknown project: ${project}`);
    }

    return projectConfig.allowedVersions.filter(version => {
      const versionConfig = config.versions[version];
      return versionConfig && versionConfig.active;
    });
  }

  /**
   * 验证配置文件的有效性
   * @returns 验证结果
   */
  static validateConfig(): boolean {
    try {
      const config = this.loadConfig();
      
      // 检查所有项目引用的版本是否存在
      for (const [projectName, projectConfig] of Object.entries(config.projects)) {
        for (const version of projectConfig.allowedVersions) {
          if (!config.versions[version]) {
            console.error(`Project ${projectName} references unknown version: ${version}`);
            return false;
          }
        }
        
        if (!config.versions[projectConfig.defaultVersion]) {
          console.error(`Project ${projectName} has unknown default version: ${projectConfig.defaultVersion}`);
          return false;
        }
      }

      // 检查所有版本路径是否存在
      const gameconfigDir = path.dirname(this.configPath);
      for (const [versionName, versionConfig] of Object.entries(config.versions)) {
        if (versionConfig.active) {
          const versionPath = path.resolve(gameconfigDir, versionConfig.path);
          if (!fs.existsSync(versionPath)) {
            console.error(`Version ${versionName} path does not exist: ${versionPath}`);
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      console.error(`Config validation failed: ${error}`);
      return false;
    }
  }
}
