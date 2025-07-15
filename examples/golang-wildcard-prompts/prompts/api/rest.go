package main

import "fmt"

func GenerateAPI(context PromptContext) string {
	// Extract variables with defaults
	resource := "users"
	if r, ok := context.Vars["resource"].(string); ok {
		resource = r
	}
	
	operations := "CRUD"
	if o, ok := context.Vars["operations"].(string); ok {
		operations = o
	}
	
	return fmt.Sprintf(`Design a REST API for managing %s.

Required operations: %s

Include:
- Endpoint definitions with HTTP methods
- Request/response schemas
- Status codes
- Authentication requirements
- Error handling patterns

Follow RESTful conventions and best practices.`, resource, operations)
} 