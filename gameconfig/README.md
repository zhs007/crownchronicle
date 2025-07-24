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
