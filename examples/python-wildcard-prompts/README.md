# Python Wildcard Prompts Example

This example demonstrates how to use wildcard patterns to automatically load multiple Python prompt files from a directory structure.

## Features

- **Automatic Discovery**: Uses glob patterns like `file://data/prompts/**/*.py:get_prompt` to find all Python files
- **Organized Structure**: Prompts are organized by category (marketing, technical, creative)
- **Dynamic Prompts**: Each prompt function receives context and can adapt based on variables
- **No Manual Updates**: Add new prompt files without modifying the configuration

## Directory Structure

```
data/prompts/
├── marketing/
│   ├── email.py      # Email marketing prompts
│   └── social.py     # Social media prompts
├── technical/
│   ├── code_review.py    # Code review prompts
│   └── api_design.py     # API design prompts
└── creative/
    └── story.py      # Creative writing prompts
```

## How It Works

1. The configuration uses a wildcard pattern: `file://data/prompts/**/*.py:get_prompt`
2. This pattern matches all `.py` files in the `data/prompts` directory and subdirectories
3. Each file must contain a `get_prompt(context)` function that returns a prompt string
4. The context includes variables, provider information, and other metadata

## Prompt Function Example

```python
def get_prompt(context):
    # Extract variables with defaults
    language = context.get('vars', {}).get('language', 'Python')
    focus_areas = context.get('vars', {}).get('focus_areas', 'general best practices')
    
    # Return a formatted prompt
    return f"""You are an expert {language} code reviewer. Review the following code:

{{code}}

Focus on: {focus_areas}

Provide constructive feedback on:
1. Code quality and maintainability
2. Performance considerations
3. Security issues
4. Best practices
5. Potential bugs"""
```

## Running the Example

```bash
# Run with echo provider (for testing)
promptfoo eval

# Run with real providers
promptfoo eval -p openai:gpt-4o-mini

# Run specific tests
promptfoo eval --filter-description "Marketing"
```

## Adding New Prompts

1. Create a new Python file in the appropriate category directory
2. Implement a `get_prompt(context)` function
3. The prompt will be automatically included in the next evaluation
4. No configuration changes needed!

## Benefits

- **Scalability**: Add hundreds of prompts without touching the config
- **Organization**: Keep prompts organized by category or purpose
- **Reusability**: Share prompt libraries across projects
- **Version Control**: Track prompt changes separately from configuration 