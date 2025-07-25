import WebSocket, { type ClientOptions } from 'ws';
import logger from '../logger';
import invariant from '../util/invariant';
import { safeJsonStringify } from '../util/json';
import { getNunjucksEngine } from '../util/templates';

import type {
  ApiProvider,
  CallApiContextParams,
  ProviderOptions,
  ProviderResponse,
} from '../types';

const nunjucks = getNunjucksEngine();

interface WebSocketProviderConfig {
  messageTemplate: string;
  url?: string;
  timeoutMs?: number;
  transformResponse?: string | Function;
  headers?: Record<string, string>;
  /**
   * @deprecated
   */
  responseParser?: string | Function;
}

export function createTransformResponse(parser: any): (data: any) => ProviderResponse {
  if (typeof parser === 'function') {
    return parser;
  }
  if (typeof parser === 'string') {
    return new Function('data', `return ${parser}`) as (data: any) => ProviderResponse;
  }
  return (data) => ({ output: data });
}

export class WebSocketProvider implements ApiProvider {
  url: string;
  config: WebSocketProviderConfig;
  transformResponse: (data: any) => ProviderResponse;

  constructor(url: string, options: ProviderOptions) {
    this.config = options.config as WebSocketProviderConfig;
    this.url = this.config.url || url;
    this.transformResponse = createTransformResponse(
      this.config.transformResponse || this.config.responseParser,
    );
    invariant(
      this.config.messageTemplate,
      `Expected WebSocket provider ${this.url} to have a config containing {messageTemplate}, but got ${safeJsonStringify(
        this.config,
      )}`,
    );
  }

  id(): string {
    return this.url;
  }

  toString(): string {
    return `[WebSocket Provider ${this.url}]`;
  }

  async callApi(prompt: string, context?: CallApiContextParams): Promise<ProviderResponse> {
    const vars = {
      ...(context?.vars || {}),
      prompt,
    };
    const message = nunjucks.renderString(this.config.messageTemplate, vars);

    logger.debug(`Sending WebSocket message to ${this.url}: ${message}`);

    return new Promise<ProviderResponse>((resolve) => {
      const wsOptions: ClientOptions = {};
      if (this.config.headers) {
        wsOptions.headers = this.config.headers;
      }
      const ws = new WebSocket(this.url, wsOptions);
      const timeout = setTimeout(() => {
        ws.close();
        resolve({ error: 'WebSocket request timed out' });
      }, this.config.timeoutMs || 10000);

      ws.onmessage = (event) => {
        clearTimeout(timeout);
        logger.debug(`Received WebSocket response: ${event.data}`);
        try {
          let data = event.data;
          if (typeof data === 'string') {
            try {
              data = JSON.parse(data);
            } catch {
              // If parsing fails, assume it's a text response
            }
          }
          resolve({ output: this.transformResponse(data) });
        } catch (err) {
          resolve({ error: `Failed to process response: ${JSON.stringify(err)}` });
        }
        ws.close();
      };

      ws.onerror = (err) => {
        clearTimeout(timeout);
        resolve({ error: `WebSocket error: ${JSON.stringify(err)}` });
      };

      ws.onopen = () => {
        ws.send(message);
      };
    });
  }
}
