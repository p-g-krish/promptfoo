# JavaScript Wildcard Prompts Example

This example shows how to use wildcard patterns with JavaScript prompt files.

## Important Notes

- **Recommended**: Use wildcards WITHOUT function names (e.g., `file://prompts/**/*.js`)
- **Not Recommended**: Using function names with wildcards may cause errors
- Each JavaScript file should export a single function

## Directory Structure

```
prompts/
├── customer-service/
│   ├── support.js    # Customer support prompts
│   └── feedback.js   # Feedback analysis prompts
└── analysis/
    └── data.js       # Data analysis prompts
```

## Example Prompt File

```javascript
module.exports = function({ vars }) {
  const issue = vars.issue || 'general inquiry';
  const customerName = vars.customerName || 'valued customer';
  
  return `You are a helpful customer support agent. Assist ${customerName} with their ${issue}.

Be empathetic, professional, and solution-oriented.`;
};
```

## Running the Example

```bash
# Run with echo provider
promptfoo eval

# Run with real providers
promptfoo eval -p openai:gpt-4o-mini
```

## Why No Function Names?

When using wildcards with function names (e.g., `file://prompts/**/*.js:myFunction`), promptfoo will:
1. Find all matching files
2. Try to load `myFunction` from EACH file
3. This often causes errors if not all files have that function

Instead, structure each file to export the main prompt function directly. 