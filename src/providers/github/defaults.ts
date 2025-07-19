import { OpenAiChatCompletionProvider } from '../openai/chat';

// GitHub Models default providers
// Using OpenAI-compatible API with GitHub's endpoint
const githubConfig = {
  apiBaseUrl: 'https://models.github.ai',
  apiKeyEnvar: 'GITHUB_TOKEN',
};

export const DefaultGitHubGradingProvider = new OpenAiChatCompletionProvider('openai/gpt-4o', {
  config: githubConfig,
});

export const DefaultGitHubGradingJsonProvider = new OpenAiChatCompletionProvider('openai/gpt-4o', {
  config: {
    ...githubConfig,
    response_format: { type: 'json_object' },
  },
});

export const DefaultGitHubSuggestionsProvider = new OpenAiChatCompletionProvider('openai/gpt-4o', {
  config: githubConfig,
});

// Fast model for quick evaluations
export const DefaultGitHubFastProvider = new OpenAiChatCompletionProvider('openai/gpt-4o-mini', {
  config: githubConfig,
});

// Reasoning model for complex evaluations
export const DefaultGitHubReasoningProvider = new OpenAiChatCompletionProvider('openai/o3-mini', {
  config: githubConfig,
});