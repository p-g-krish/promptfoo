---
description: Automatically optimize prompt variables with AI. Test edge cases, find assertion-passing inputs, and discover prompt injection vulnerabilities using promptfoo.
sidebar_label: Variable Optimizer
keywords:
  [
    prompt optimization,
    variable optimization,
    AI testing,
    prompt engineering,
    assertion testing,
    security testing,
    prompt injection,
    automated testing,
    LLM testing,
    prompt variables,
  ]
---

# Variable Optimizer

The Variable Optimizer Provider automatically improves prompt variables using AI-powered optimization techniques. This is particularly useful for finding inputs that pass specific assertions, testing edge cases, and discovering prompt injection vulnerabilities.

It works by systematically generating and testing improved variable values until your test assertions pass, implementing state-of-the-art techniques from automated prompt engineering research.

It is inspired by [Automatic Prompt Engineering (APE)](https://arxiv.org/abs/2211.01910), [OPRO](https://arxiv.org/abs/2309.03409), and [multi-strategy prompt optimization](https://arxiv.org/abs/2502.11560).

## Configuration

To use the Variable Optimizer Provider, set the provider `id` to `promptfoo:variable-optimizer` and provide configuration options:

```yaml
tests:
  - provider:
      id: 'promptfoo:variable-optimizer'
      config:
        targetVariable: text
        maxTurns: 5
        improverModel: openai:gpt-4o-mini
    vars:
      text: Hello world
    assert:
      - type: icontains
        value: bonjour
```

You may also find it easiest to set the provider on `defaultTest`, which applies optimization to every test using the specified configuration:

```yaml
defaultTest:
  provider:
    id: 'promptfoo:variable-optimizer'
    config:
      targetVariable: text
      maxTurns: 5

tests:
  - vars:
      text: Hello world
    assert:
      - type: contains
        value: French greeting
```

## How it works

The Variable Optimizer Provider facilitates an iterative optimization process:

1. **Test current variable** against your assertions to identify failures
2. **Analyze failure modes** to understand what changes are needed
3. **Generate improved candidates** using sophisticated optimization strategies
4. **Evaluate candidates** and select the best performing option
5. **Repeat** until assertions pass or maximum turns reached

The optimizer applies techniques like instruction override, role confusion, and context manipulation to systematically find variable values that make your tests pass.

## Configuration Options

| Option            | Type   | Description                                                                                   |
| ----------------- | ------ | --------------------------------------------------------------------------------------------- |
| `targetVariable`  | string | Name of the variable to optimize. Supports Nunjucks templating with access to test variables. |
| `maxTurns`        | number | Maximum number of optimization iterations. Defaults to 10.                                    |
| `improverModel`   | string | LLM model for generating improvements. Uses original provider if not specified.               |
| `numCandidates`   | number | Number of candidate variations per iteration. Defaults to 3.                                  |
| `stallIterations` | number | Stop if no improvement for this many iterations. Defaults to 5.                               |

## Example

Here's a simple example testing translation optimization:

```yaml title="promptfooconfig.yaml"
prompts:
  - 'Translate the following to French: {{text}}'

providers:
  - openai:gpt-4o-mini

defaultTest:
  provider:
    id: 'promptfoo:variable-optimizer'
    config:
      targetVariable: text
      maxTurns: 5

tests:
  - vars:
      text: Hello world
    assert:
      - type: icontains
        value: bonjour
```

### Advanced Security Testing

For security testing scenarios, you can test prompt injection vulnerabilities:

```yaml
prompts:
  - 'Content moderation system: {{injection}}{{content}}'

providers:
  - openai:gpt-4o-mini

tests:
  - provider:
      id: 'promptfoo:variable-optimizer'
      config:
        targetVariable: injection
        maxTurns: 8
        improverModel: openai:gpt-4o
    vars:
      content: 'Harmful content that should be flagged'
      injection: ''
    assert:
      - type: javascript
        value: output.includes('safe')
```

The output will show the optimization history with each iteration:

```
Iteration 1: "Hello world" → "Bonjour le monde" (Failed: missing 'bonjour')
Iteration 2: "Bonjour friend" → "Bonjour ami" (Passed: contains 'bonjour')

Final optimized value: "Bonjour friend"
```

### Evaluation and Assertions

You can combine multiple assertion types for comprehensive testing:

```yaml
tests:
  - provider:
      id: 'promptfoo:variable-optimizer'
      config:
        targetVariable: input
    vars:
      input: Write a story
    assert:
      - type: contains
        value: 'Once upon a time'
      - type: javascript
        value: output.length > 100
      - type: llm-rubric
        value: Story should be creative and engaging
```

This enables automatic optimization across multiple criteria simultaneously.

For complete working examples with translation and security testing, see the [Variable Optimizer example](https://github.com/promptfoo/promptfoo/tree/main/examples/variable-optimizer).

## Using as a Library

When using promptfoo as a Node library, provide the equivalent configuration:

```js
{
  providers: [
    {
      id: 'promptfoo:variable-optimizer',
      config: {
        targetVariable: 'text',
        maxTurns: 5,
        improverModel: 'openai:gpt-4o-mini',
      },
    },
  ];
}
```

## Stop Conditions

The optimization will automatically stop when:

- All assertions pass (successful optimization)
- The `maxTurns` limit is reached
- No improvement for `stallIterations` consecutive attempts
- An error occurs during optimization

The optimizer tracks the best result throughout the process and returns it even if optimization doesn't complete successfully.

## Limitations

The Variable Optimizer assumes:

- Target variable exists in the test's `vars` object
- The provider supports the prompt template format being used
- Assertions provide clear failure information for the optimizer to analyze

For best results, use specific assertion types that give clear feedback about what's expected rather than vague criteria.

## Debugging

Set the environment variable `LOG_LEVEL=debug` to see detailed logs of the optimization process, including each candidate generated and tested.

```bash
LOG_LEVEL=debug promptfoo eval
```

This will show the full optimization history, including why certain candidates failed and what strategies were attempted.
