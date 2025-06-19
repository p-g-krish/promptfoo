---
sidebar_label: Environment Variables
---

# Environment Variables Configuration

Common issues and solutions when configuring red team behavior through environment variables.

## Available Environment Variables

The following environment variables control red team behavior and can be used to troubleshoot common issues:

| Variable                                      | Default | Description                                                                                   |
| --------------------------------------------- | ------- | --------------------------------------------------------------------------------------------- |
| `PROMPTFOO_DISABLE_REDTEAM_REMOTE_GENERATION` | `false` | Disable remote adversarial generation and target discovery. Disabling may lower test quality. |
| `PROMPTFOO_DISABLE_REDTEAM_MODERATION`        | `true`  | Skip built-in harmful content moderation checks.                                              |
| `PROMPTFOO_NUM_JAILBREAK_ITERATIONS`          | `4`     | Number of iterations attempted by iterative jailbreak strategies.                             |
| `PROMPTFOO_JAILBREAK_TEMPERATURE`             | `0.7`   | Sampling temperature used when generating jailbreak attempts.                                 |
| `PROMPTFOO_MAX_HARMFUL_TESTS_PER_REQUEST`     | `5`     | Maximum harmful tests generated per request.                                                  |
| `PROMPTFOO_REMOTE_GENERATION_URL`             |         | URL for a custom remote generation endpoint.                                                  |
| `PROMPTFOO_UNALIGNED_INFERENCE_ENDPOINT`      |         | Endpoint for unaligned or harmful inference.                                                  |

## Common Issues and Solutions

### Remote Generation Not Working

**Problem**: Red team generation fails or produces low-quality results.

**Solution**: Check if remote generation is disabled:

```bash
# Check current setting
echo $PROMPTFOO_DISABLE_REDTEAM_REMOTE_GENERATION

# Enable remote generation (recommended)
unset PROMPTFOO_DISABLE_REDTEAM_REMOTE_GENERATION
# OR explicitly set to false
export PROMPTFOO_DISABLE_REDTEAM_REMOTE_GENERATION=false
```

If you're behind a corporate firewall, see [Remote Generation Errors](/docs/red-team/troubleshooting/remote-generation) for network configuration help.

### Target Discovery Not Working

**Problem**: The `promptfoo redteam discover` command fails or target discovery is disabled.

**Solution**: Target discovery requires remote generation to be enabled:

```bash
# Enable target discovery (this is the default)
unset PROMPTFOO_DISABLE_REDTEAM_REMOTE_GENERATION
# OR explicitly set to false
export PROMPTFOO_DISABLE_REDTEAM_REMOTE_GENERATION=false
```

**Note**: When `PROMPTFOO_DISABLE_REDTEAM_REMOTE_GENERATION` is set to `true`, it disables both:

- Remote adversarial test generation
- Target discovery functionality (`promptfoo redteam discover`)

### Jailbreak Strategies Taking Too Long

**Problem**: Iterative jailbreak strategies are slow or timing out.

**Solution**: Reduce the number of iterations:

```bash
# Reduce iterations for faster execution
export PROMPTFOO_NUM_JAILBREAK_ITERATIONS=2

# Or increase for more thorough testing (default is 4)
export PROMPTFOO_NUM_JAILBREAK_ITERATIONS=8
```

### Inconsistent Jailbreak Results

**Problem**: Jailbreak attempts are too predictable or not diverse enough.

**Solution**: Adjust the temperature setting:

```bash
# Lower temperature for more consistent results
export PROMPTFOO_JAILBREAK_TEMPERATURE=0.3

# Higher temperature for more creative attempts (default is 0.7)
export PROMPTFOO_JAILBREAK_TEMPERATURE=0.9
```

### Rate Limiting Issues

**Problem**: Getting rate limited when generating many test cases.

**Solution**: Reduce the number of harmful tests per request:

```bash
# Reduce batch size to avoid rate limits
export PROMPTFOO_MAX_HARMFUL_TESTS_PER_REQUEST=2

# Default is 5, increase only if your API can handle it
export PROMPTFOO_MAX_HARMFUL_TESTS_PER_REQUEST=10
```

### Using Custom Generation Endpoints

**Problem**: Need to use a custom or self-hosted generation service.

**Solution**: Configure custom endpoints:

```bash
# Use custom remote generation endpoint
export PROMPTFOO_REMOTE_GENERATION_URL=https://your-custom-endpoint.com/api

# Use custom unaligned inference endpoint
export PROMPTFOO_UNALIGNED_INFERENCE_ENDPOINT=https://your-endpoint.com/inference
```

### Moderation Interfering with Tests

**Problem**: Built-in moderation is blocking legitimate test cases.

**Solution**: The moderation is disabled by default, but if you've enabled it and it's interfering:

```bash
# Disable moderation (this is the default)
export PROMPTFOO_DISABLE_REDTEAM_MODERATION=true

# Enable moderation if needed
export PROMPTFOO_DISABLE_REDTEAM_MODERATION=false
```

## Setting Environment Variables

### Temporary (Current Session)

```bash
export PROMPTFOO_DISABLE_REDTEAM_REMOTE_GENERATION=true
promptfoo redteam run
```

### Permanent (Shell Profile)

Add to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.):

```bash
echo 'export PROMPTFOO_NUM_JAILBREAK_ITERATIONS=2' >> ~/.zshrc
source ~/.zshrc
```

### Configuration File

You can also set these in your `promptfooconfig.yaml`:

```yaml
env:
  PROMPTFOO_DISABLE_REDTEAM_REMOTE_GENERATION: 'true'
  PROMPTFOO_NUM_JAILBREAK_ITERATIONS: '2'
  PROMPTFOO_JAILBREAK_TEMPERATURE: '0.5'
```

## Configuration Precedence

Settings are applied in this order (highest to lowest priority):

1. **Command-line flags** - Override all other settings
2. **Environment variables** - System-level settings
3. **Configuration file** (`promptfooconfig.yaml`) - Base configuration

## Quick Reference

For quick scanning, here are all red team environment variables:

```bash
# Core red team functionality
PROMPTFOO_DISABLE_REDTEAM_REMOTE_GENERATION=false  # Enables remote generation & target discovery
PROMPTFOO_DISABLE_REDTEAM_MODERATION=true          # Disables content moderation (default)

# Jailbreak strategy tuning
PROMPTFOO_NUM_JAILBREAK_ITERATIONS=4               # Number of jailbreak iterations
PROMPTFOO_JAILBREAK_TEMPERATURE=0.7                # Sampling temperature for jailbreaks

# Rate limiting and batching
PROMPTFOO_MAX_HARMFUL_TESTS_PER_REQUEST=5          # Max harmful tests per API request

# Custom endpoints
PROMPTFOO_REMOTE_GENERATION_URL=                   # Custom remote generation URL
PROMPTFOO_UNALIGNED_INFERENCE_ENDPOINT=            # Custom inference endpoint
```

## Getting Help

If you continue experiencing issues with environment variable configuration:

1. Check that variables are set correctly: `env | grep PROMPTFOO`
2. Verify the configuration is being applied by checking logs
3. Review related troubleshooting guides for specific issues
4. [Contact us](/contact/) for enterprise support
