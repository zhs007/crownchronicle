# Game Configuration Management

This directory contains the centralized game configuration data management system for Crown Chronicle.

## Directory Structure

```
gameconfig/
├── versions/           # Versioned game configurations
│   ├── dev/           # Development version (used by editor)
│   ├── stable/        # Stable version (used by prototype)
│   └── release/       # Release version (for production)
├── config.json        # Configuration management file
└── README.md          # This documentation
```

## Version Management

### Versions

- **dev**: Development version used by the editor for testing and development
- **stable**: Stable version used by the prototype for demonstration
- **release**: Release version for production environment (inactive by default)

### Projects

- **editor**: Uses dev version by default, can access dev and stable versions
- **prototype**: Uses stable version by default, can access stable and release versions

## Configuration Format

The `config.json` file defines:
- Available versions and their metadata
- Project-specific version mappings
- Version activation status

## Usage

Projects should use the GameConfigManager utility to:
- Get the appropriate configuration path for their environment
- Validate configuration availability
- Switch between allowed versions (if supported)

## Data Migration

This system was created to centralize game configuration data that was previously scattered across:
- `prototype/src/data`
- `editor/src/data`

All game data is now managed in a versioned, centralized location.

# 通用卡（CommonCard）机制说明

## 数据结构

- `CommonCard` 类型：
  - `id`: string，唯一标识
  - `name`: string，通用卡名称
  - `description`: string，可选，描述
  - `eventIds`: string[]，该通用卡包含的事件ID列表

- 角色卡（CharacterCard/CharacterConfig）新增字段：
  - `commonCardIds`: string[]，该角色拥有的通用卡ID列表

## 配置目录

- `gameconfig/versions/[dev|stable]/commoncards/`：存放通用卡配置（json/yaml）
- 角色卡可通过 `commonCardIds` 字段引用通用卡

## 运行时逻辑

- 角色的最终事件池 = 角色自身事件 + 其所有通用卡事件（去重）
- 合并逻辑见 `GameEngine.mergeCharacterAndCommonCardEvents`

## 校验

- `ConfigValidator` 支持通用卡唯一性校验、角色卡引用有效性校验

## 示例

- 见 `commoncards/chancellor.json`、`characters/zhugeliang/character.yaml` 等
