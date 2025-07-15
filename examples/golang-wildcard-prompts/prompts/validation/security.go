package main

import (
	"fmt"
	"strings"
)

func ValidateSecurity(context PromptContext) string {
	// Extract code to review
	code := "// Code to review"
	if c, ok := context.Vars["code"].(string); ok {
		code = c
	}
	
	// Extract focus areas
	focusAreas := []string{"all security aspects"}
	if areas, ok := context.Vars["focus_areas"].([]interface{}); ok {
		focusAreas = make([]string, len(areas))
		for i, area := range areas {
			if s, ok := area.(string); ok {
				focusAreas[i] = s
			}
		}
	}
	
	return fmt.Sprintf(`Perform a security review of the following code:

%s

Focus areas: %s

Check for:
- SQL injection vulnerabilities
- XSS vulnerabilities  
- Authentication/authorization issues
- Data exposure risks
- Input validation problems
- Cryptographic weaknesses

Provide specific recommendations for each issue found.`, code, strings.Join(focusAreas, ", "))
} 