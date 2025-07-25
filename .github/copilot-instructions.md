# Crown Chronicle - AI Coding Assistant Instructions

## Project Architecture Overview

Crown Chronicle is a modular text-adventure game using **npm workspaces** with strict architectural boundaries:

- **`core/`** - Pure TypeScript game engine library (no config management dependencies)
- **`editor/`** - Next.js AI-powered content creation tool (port 3001) 
- **`prototype/`** - Next.js game frontend (port 3000)
- **`gameconfig/`** - Centralized version-controlled game data

## Critical Constraints & Patterns

### 🚫 Never Do These
- Modify `core/src/data/DataProvider.ts` constructor signature
- Add configuration management dependencies to core package
- Use `npm install ../core` - workspace linking is automatic
- Run individual project commands directly - use workspace commands

### ✅ Essential Workflows

**Build & Development:**
```bash
# From root directory only
npm run build --workspace=core        # Always build core first
npm run dev:prototype                  # Start game frontend (3000)
npm run dev:editor                    # Start AI editor (3001)
```

**Configuration Management:**
- Editor uses `gameconfig/versions/dev/` data
- Prototype uses `gameconfig/versions/stable/` data  
- Projects resolve paths via `GameConfigManager.getConfigPath()`
- Never hardcode data paths - always use config system

## Key Technical Patterns

### Data Provider Pattern
```typescript
// Core exports abstract interface, projects provide implementation
const dataProvider = new FileSystemDataProvider(
  GameConfigManager.getConfigPath('prototype')
);
```

### Adapter Layer Strategy
Projects use adapter classes (`GameAdapter`, `UIPlayerStrategy`) to bridge core engine with UI frameworks, never directly importing UI code into core.

### Version-Controlled Game Data
```typescript
// gameconfig/config.json controls data routing
{
  "projects": {
    "editor": { "defaultVersion": "dev" },
    "prototype": { "defaultVersion": "stable" }
  }
}
```

## Service Integration Points

- **AI Content Creation**: Editor integrates Gemini API for YAML generation
- **Game State Management**: Core provides `GameEngine.createNewGame()` and stateless processing
- **Data Validation**: Core's `ConfigValidator` ensures content integrity across projects
- **Cross-Package Communication**: Workspace linking + adapter pattern (no direct imports)

## Development Context

When working on features:
1. **Core changes**: Rebuild core, then restart dependent projects
2. **Data structure changes**: Update both core types and gameconfig schemas
3. **UI features**: Use existing adapter patterns, never import core UI dependencies
4. **New content**: Use editor's AI generation, validate with core's validators

The project prioritizes clean architectural boundaries over convenience - always respect the core package's purity and workspace-based dependency management.
