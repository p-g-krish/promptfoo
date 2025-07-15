# Go Wildcard Prompts Example

This example demonstrates how to use wildcard patterns with Go prompt files.

## Requirements

- Go 1.16 or higher installed on your system
- Go must be in your PATH

## Important Notes

- **Function names optional**: If not specified, defaults to `GetPrompt` function
- **Consistent with other languages**: Go now behaves like Python and JavaScript
- **Compilation overhead**: Go files are compiled on-demand, which adds some latency

## Directory Structure

```
prompts/
├── api/
│   ├── rest.go       # REST API generation prompts
│   └── graphql.go    # GraphQL schema generation
└── validation/
    └── security.go   # Security validation prompts
```

## How It Works

1. Go files are compiled into temporary executables
2. The compiled program receives context via stdin as JSON
3. The function is called with a `PromptContext` struct
4. The result is returned as a string

## PromptContext Structure

Your Go functions should accept this struct:

```go
type PromptContext struct {
    Vars     map[string]interface{} `json:"vars"`
    Provider struct {
        ID    string `json:"id"`
        Label string `json:"label"`
    } `json:"provider"`
    Config map[string]interface{} `json:"config"`
}
```

## Example Go Prompt File

```go
package main

import "fmt"

// Default function called when no function name is specified
func GetPrompt(context PromptContext) string {
    topic := "general topic"
    if t, ok := context.Vars["topic"].(string); ok {
        topic = t
    }
    
    return fmt.Sprintf("Explain %s in simple terms", topic)
}

// Specific function that can be called by name
func GenerateAPI(context PromptContext) string {
    resource := "users"
    if r, ok := context.Vars["resource"].(string); ok {
        resource = r
    }
    
    return fmt.Sprintf("Design a REST API for managing %s...", resource)
}
```

## Configuration Examples

```yaml
# Using default GetPrompt function
prompts:
  - file://prompts/api/rest.go

# Using specific named functions
prompts:
  - file://prompts/api/rest.go:GenerateAPI
  - file://prompts/api/graphql.go:GenerateSchema

# Wildcard patterns
prompts:
  - file://prompts/**/*.go           # Uses GetPrompt from all files
  - file://prompts/**/*.go:Generate*  # Pattern not supported - use exact names
```

## Running the Example

```bash
# Run with echo provider
promptfoo eval

# Run with real providers
promptfoo eval -p openai:gpt-4o-mini
```

## Performance Considerations

- First run will be slower due to compilation
- Consider caching compiled binaries for production use
- Each file is compiled independently 