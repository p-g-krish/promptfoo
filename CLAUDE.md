# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Promptfoo is an LLM evaluation and red-teaming toolkit built as a monorepo using npm workspaces:

- **Core Library**: TypeScript CLI tool and library
- **Web App**: React-based UI in `src/app`
- **Documentation**: Docusaurus site in `site`

## Development Environment

### Quick Start

```bash
npm install          # Install all dependencies
npm run dev         # Start both server and app in development
npm run dev:app     # Start only the frontend app
npm run dev:server  # Start only the backend server
```

### Build Commands
```bash
npm run build       # Build the entire project
npm run build:app   # Build only the frontend app
npm run build:clean # Clean the dist directory
npm run build:watch # Watch mode for TypeScript compilation
npm run tsc         # Run TypeScript compiler check
```

### Code Quality Commands
```bash
# Linting
npm run lint        # Lint src directory (max 0 warnings)
npm run lint:src    # Lint src directory specifically
npm run lint:tests  # Lint test directory
npm run lint:site   # Lint documentation site
npm run l           # Lint only changed files vs origin/main

# Formatting
npm run format      # Format all files with Prettier
npm run format:check # Check formatting without changes
npm run f           # Format only changed files vs origin/main
```

### Testing Commands
```bash
npm test                        # Run all unit tests
npm run test:watch             # Run tests in watch mode
npm run test:integration       # Run integration tests
npm run test:redteam:integration # Run red team integration tests
npx jest path/to/test-file     # Run a specific test file
```

### Database Commands
```bash
npm run db:generate  # Generate database migrations with Drizzle
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Drizzle studio for database management
```

### Other Utility Commands
```bash
npm run jsonSchema:generate  # Generate JSON schema for configuration
npm run citation:generate    # Generate citation file
npm run local               # Run CLI locally with ts-node
```

## TypeScript Conventions

### Strict Type Checking
- Project uses TypeScript strict mode (`"strict": true`)
- Use type-only imports: `import type { Type } from 'module'`
- Prefer `const` over `let`, never use `var`
- Use object shorthand syntax

### Type Definition Patterns
```typescript
// Define types alongside Zod schemas
export const MySchema = z.object({...});
export type MyType = z.infer<typeof MySchema>;

// Use type guards
function isMyType(value: unknown): value is MyType {
  return MySchema.safeParse(value).success;
}
```

### Path Aliases
- `@app/*` → `src/app/src/*` (React app)
- `@promptfoo/*` → `src/*` (internal imports)

## API Development

### Frontend API Calls
Always use the `callApi` function from `@app/utils/api` instead of direct `fetch()` calls:

```typescript
import { callApi } from '@app/utils/api';

// ✅ Correct
const response = await callApi('/traces/evaluation/123');

// ❌ Incorrect - will fail in development
const response = await fetch('/api/traces/evaluation/123');
```

### Backend API Patterns
- Use Express Router for modular routes
- Validate with Zod schemas and `ApiSchemas`
- Follow RESTful conventions
- Return consistent error responses

```typescript
// Request validation
const { data } = ApiSchemas.Resource.Action.Request.parse(req.body);

// Error response
res.status(400).json({ error: 'Validation error message' });
```

### External API Calls
Use the layered fetch utilities:

```typescript
import { fetchWithProxy } from '@promptfoo/util/fetch';    // Basic with proxy support
import { fetchWithTimeout } from '@promptfoo/util/fetch';  // With timeout
import { fetchWithRetries } from '@promptfoo/util/fetch';  // With retry logic
import { fetchWithCache } from '@promptfoo/util/cache';    // With caching
```

## Database Conventions

### Using Drizzle ORM
- Database uses SQLite with better-sqlite3
- Schema definitions in `src/database/tables.ts`
- Migrations in `drizzle/` directory

### Query Patterns
```typescript
import { getDb } from '@promptfoo/database';

// Get database instance
const db = getDb();

// Use transactions for multiple operations
db.transaction(() => {
  db.delete(table1).where(...).run();
  db.delete(table2).where(...).run();
});
```

### Best Practices
- Use parameterized queries (automatic with Drizzle)
- Prefer specific column selection over `select(*)`
- Use `.limit()` for pagination
- Order by `createdAt DESC` for recent-first

## Testing Patterns

### Test Structure
```typescript
describe('Component/Module Name', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should handle specific case', async () => {
    // Arrange
    const input = createTestData();
    
    // Act
    const result = await functionUnderTest(input);
    
    // Assert
    expect(result).toEqual(expected);
  });
});
```

### Testing Best Practices
- Tests mirror source structure in `test/` directory
- Use factories for test data creation
- Mock external dependencies with `jest.mock()`
- Always test both success and error cases
- Integration tests use `.integration.test.ts` suffix

## Provider Development

When implementing a new provider:
1. Extend the base provider class
2. Implement required methods (`id()`, `callApi()`)
3. Follow existing provider patterns for configuration
4. Support environment variables for API keys
5. Add proper error handling and retry logic

## Security Best Practices

### API Key Management
- Store API keys in environment variables: `{PROVIDER}_API_KEY`
- Never log or expose API keys in errors
- Support custom environment variable names

### Input Validation
- Always validate user input with Zod schemas
- Sanitize URLs before logging
- Use parameterized queries for database operations

### Security Testing
Leverage built-in red team plugins:
- SQL injection: `promptfoo:redteam:sql-injection`
- Shell injection: `promptfoo:redteam:shell-injection`
- SSRF: `promptfoo:redteam:ssrf`
- RBAC: `promptfoo:redteam:rbac`

## Project Structure

```text
promptfoo/
├── src/              # Core library source
│   ├── app/         # React web UI (workspace)
│   ├── providers/   # LLM provider implementations
│   ├── assertions/  # Test assertion implementations
│   ├── redteam/     # Red teaming functionality
│   ├── server/      # Express backend
│   ├── database/    # Database layer
│   └── types/       # TypeScript type definitions
├── test/            # Unit and integration tests
├── examples/        # Example configurations
├── site/            # Documentation (workspace)
└── drizzle/         # Database migrations
```

## Error Handling

### Consistent Error Patterns
```typescript
try {
  // Operation
} catch (error) {
  if (error instanceof z.ZodError) {
    // Handle validation error
    const message = fromZodError(error).message;
  } else if (error instanceof Error) {
    // Handle known error
    logger.error(`Operation failed: ${error.message}`);
  } else {
    // Handle unknown error
    logger.error('Unknown error occurred');
  }
}
```

## Code Style Guidelines

- Use TypeScript with strict type checking
- Follow established import order with @trivago/prettier-plugin-sort-imports
- Use consistent curly braces for all control statements
- Prefer const over let; avoid var
- Use object shorthand syntax whenever possible
- Use async/await for asynchronous code
- Follow Jest best practices with describe/it blocks
- Use consistent error handling with proper type checks
- DO NOT add comments unless explicitly requested

## CLI Usage

- `promptfoo` or `pf` - Main CLI commands
- Always check README or search codebase for available commands
- Run lint and typecheck after making changes

## Important Reminders

- NEVER update git config
- NEVER run commands with `-i` flag (interactive mode not supported)
- ALWAYS prefer editing existing files over creating new ones
- NEVER proactively create documentation files unless requested
- Search the site/ for files related to your feature and update documentation as appropriate. Prefer small updates over large ones.
- When blocked by pre-commit hooks, retry once then report the issue
- Use the TodoWrite tool for complex multi-step tasks
