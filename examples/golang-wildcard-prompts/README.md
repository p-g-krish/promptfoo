# Go Wildcard Prompts Example

This example demonstrates how to use wildcard patterns with Go prompt files.

## Requirements

- Go 1.16 or higher installed on your system
- Go must be in your PATH

## Important Notes

- **Function names required**: Go files MUST specify function names (e.g., `file://prompt.go:MyFunction`)
- **No legacy mode**: Unlike Python, Go doesn't support running files without function names
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

func GenerateAPI(context PromptContext) string {
    resource := "users"
    if r, ok := context.Vars["resource"].(string); ok {
        resource = r
    }
    
    return fmt.Sprintf("Design a REST API for managing %s...", resource)
}
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