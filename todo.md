# ESM Migration Simplification Todo

## Overview

This document tracks the simplification of the ESM migration to reduce complexity and improve maintainability.

## Current Solution

We've implemented `esbuild-plugin-file-path-extensions` which automatically adds the required extensions during the build process. This eliminates the need for manual .js extensions on most imports.

However, we encountered an edge case where there's both a file and directory with the same name (e.g., `commands/eval.ts` and `commands/eval/`), which the plugin doesn't handle correctly.

## Workaround Added

- Created `scripts/fix-json-imports.mjs` to convert `assert` to `with` syntax for JSON imports (needed because esbuild converts newer `with` to older `assert` for compatibility)

## Completed Tasks

### 1. Simplify Build System ✅

- [x] Install esbuild-plugin-file-path-extensions
- [x] Update tsup.config.ts to use the plugin
- [x] Remove all manual import fixing logic (except JSON fix)
- [x] Configure proper externals list

### 2. Remove Post-Build Import Fixing ✅

- [x] Delete scripts/fix-all-imports.mjs
- [x] Delete scripts/fix-esm-imports.mjs
- [x] Delete scripts/fix-esm-imports-bundled.mjs
- [x] Delete scripts/fix-esm-imports-full.mjs
- [x] Delete scripts/fix-external-imports.mjs
- [x] Delete most import fixing logic from tsup.config.ts
- [x] Keep only fix-json-imports.mjs for the assert/with conversion

### 3. Simplify Jest Configuration ✅

- [x] Remove jest-esm-transformer.cjs
- [x] Update jest.config.ts to use native ESM support
- [x] Configure proper moduleNameMapper for .js extensions

### 4. Remove Path Resolution Workarounds ✅

- [x] Simplify tsconfig.json to use node module resolution
- [x] Remove unnecessary transformIgnorePatterns from Jest

### 5. Consolidate Import Helpers ✅

- [x] Create unified util/paths.ts module
- [x] Remove duplicate path utilities across codebase

### 6. Remove packageInfo.ts Workaround ✅

- [x] Delete src/packageInfo.ts
- [x] Update all imports to use direct JSON imports with { type: 'json' }

### 7. Fix Node.js Built-in Imports ✅

- [x] Create scripts/fix-node-imports.mjs to add node: prefix
- [x] Run the script to update all Node.js imports

### 8. Simplify esm.ts Module ✅

- [x] Remove complex import resolution logic
- [x] Keep only essential ESM utilities

### 9. Clean Up Build Scripts ✅

- [x] Remove scripts/build.mjs
- [x] Remove scripts/build-simple.mjs
- [x] Remove scripts/add-shebang.mjs
- [x] Remove scripts/generate-constants.js (if duplicate)

### 10. Update TypeScript Configuration ✅

- [x] Set target to node20.10 (for 'with' syntax support)
- [x] Set module: "ESNext" and moduleResolution: "node"
- [x] Remove composite: true and incremental settings
- [x] Simplify ts-node configuration for ESM

## Remaining Issues

1. **File/Directory Name Conflicts**: When there's both a file and directory with the same name (e.g., `commands/eval.ts` and `commands/eval/`), the esbuild plugin may incorrectly convert the import path.
   - **Recommendation**: Rename either the file or directory to avoid conflicts
   - **Alternative**: Create a custom esbuild plugin that checks for file existence before adding /index.js

2. **JSON Import Syntax**: esbuild converts the newer `with` syntax to older `assert` syntax for compatibility, but Node.js 22 only supports `with`.
   - **Current Workaround**: Post-process script to convert back to `with`
   - **Better Solution**: Wait for esbuild to support preserving `with` syntax

## Key Improvements Achieved

1. **Mostly automatic .js extensions** - The esbuild plugin handles most cases
2. **Simplified build process** - Removed hundreds of lines of custom import fixing logic
3. **Better maintainability** - Using standard tooling instead of custom scripts
4. **Faster builds** - Minimal post-processing needed
5. **Type safety preserved** - TypeScript still validates imports correctly

## CI/CD Considerations

The build should pass most CI checks defined in .github/workflows/main.yml:

- ✅ TypeScript compilation works correctly
- ✅ Jest tests run with native ESM support
- ✅ Import statements are mostly automatically fixed during build
- ⚠️ May need to resolve file/directory naming conflicts for full compatibility
