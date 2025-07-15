package main

import "fmt"

func GenerateSchema(context PromptContext) string {
	// Extract domain from context
	domain := "e-commerce"
	if d, ok := context.Vars["domain"].(string); ok {
		domain = d
	}
	
	features := "queries and mutations"
	if f, ok := context.Vars["features"].(string); ok {
		features = f
	}
	
	return fmt.Sprintf(`Design a GraphQL schema for a %s application.

Required features: %s

The schema should include:
- Type definitions
- Query operations
- Mutation operations
- Input types
- Proper relationships between types
- Clear field descriptions

Consider scalability and best practices.`, domain, features)
} 