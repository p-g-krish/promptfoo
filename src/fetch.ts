import fs from 'fs';
import path from 'path';
import type { ConnectionOptions } from 'tls';

import { getProxyForUrl } from 'proxy-from-env';
import { Agent, ProxyAgent, setGlobalDispatcher } from 'undici';
import cliState from './cliState';
import { VERSION } from './constants';
import { getEnvBool, getEnvInt, getEnvString } from './envars';
import logger from './logger';
import { REQUEST_TIMEOUT_MS } from './providers/shared';
import invariant from './util/invariant';
import { sleep } from './util/time';

/**
 * Options for configuring TLS in proxy connections
 */
interface ProxyTlsOptions {
  uri: string;
  proxyTls: ConnectionOptions;
  requestTls: ConnectionOptions;
  headersTimeout?: number;
}

/**
 * Extended options for fetch requests with promptfoo-specific headers
 */
interface PromptfooRequestInit extends RequestInit {
  // Make headers type compatible with standard HeadersInit
  headers?: HeadersInit;
}

/**
 * Error with additional system information
 */
interface SystemError extends Error {
  code?: string;
  cause?: unknown;
}

export function sanitizeUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.username || parsedUrl.password) {
      parsedUrl.username = '***';
      parsedUrl.password = '***';
    }
    return parsedUrl.toString();
  } catch {
    return url;
  }
}

export async function fetchWithProxy(
  url: RequestInfo,
  options: PromptfooRequestInit = {},
): Promise<Response> {
  let finalUrl = url;
  let finalUrlString: string | undefined;

  if (typeof url === 'string') {
    finalUrlString = url;
  } else if (url instanceof URL) {
    finalUrlString = url.toString();
  } else if (url instanceof Request) {
    finalUrlString = url.url;
  }

  const finalOptions: PromptfooRequestInit = {
    ...options,
    headers: {
      ...(options.headers as Record<string, string>),
      'x-promptfoo-version': VERSION,
    },
  };

  if (typeof url === 'string') {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.username || parsedUrl.password) {
        if (
          finalOptions.headers &&
          'Authorization' in (finalOptions.headers as Record<string, string>)
        ) {
          logger.warn(
            'Both URL credentials and Authorization header present - URL credentials will be ignored',
          );
        } else {
          // Move credentials to Authorization header
          const username = parsedUrl.username || '';
          const password = parsedUrl.password || '';
          const credentials = Buffer.from(`${username}:${password}`).toString('base64');
          finalOptions.headers = {
            ...(finalOptions.headers as Record<string, string>),
            Authorization: `Basic ${credentials}`,
          };
        }
        parsedUrl.username = '';
        parsedUrl.password = '';
        finalUrl = parsedUrl.toString();
        finalUrlString = finalUrl.toString();
      }
    } catch (e) {
      logger.debug(`URL parsing failed in fetchWithProxy: ${e}`);
    }
  }

  const tlsOptions: ConnectionOptions = {
    rejectUnauthorized: !getEnvBool('PROMPTFOO_INSECURE_SSL', true),
  };

  // Support custom CA certificates
  const caCertPath = getEnvString('PROMPTFOO_CA_CERT_PATH');
  if (caCertPath) {
    try {
      const resolvedPath = path.resolve(cliState.basePath || '', caCertPath);
      const ca = fs.readFileSync(resolvedPath, 'utf8');
      tlsOptions.ca = ca;
      logger.debug(`Using custom CA certificate from ${resolvedPath}`);
    } catch (e) {
      logger.warn(`Failed to read CA certificate from ${caCertPath}: ${e}`);
    }
  }
  const proxyUrl = finalUrlString ? getProxyForUrl(finalUrlString) : '';

  if (proxyUrl) {
    logger.debug(`Using proxy: ${sanitizeUrl(proxyUrl)}`);
    const agent = new ProxyAgent({
      uri: proxyUrl,
      proxyTls: tlsOptions,
      requestTls: tlsOptions,
      headersTimeout: REQUEST_TIMEOUT_MS,
    } as ProxyTlsOptions);
    setGlobalDispatcher(agent);
  } else {
    const agent = new Agent({
      headersTimeout: REQUEST_TIMEOUT_MS,
    });
    setGlobalDispatcher(agent);
  }

  return fetch(finalUrl, finalOptions);
}

export function fetchWithTimeout(
  url: RequestInfo,
  options: PromptfooRequestInit = {},
  timeout: number,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const { signal } = controller;
    const timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error(`Request timed out after ${timeout} ms`));
    }, timeout);

    fetchWithProxy(url, {
      ...options,
      signal,
    })
      .then((response) => {
        clearTimeout(timeoutId);
        resolve(response);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}
/**
 * Check if a response indicates rate limiting
 */
export function isRateLimited(response: Response): boolean {
  // These checks helps make sure we set up tests correctly.
  invariant(response.headers, 'Response headers are missing');
  invariant(response.status, 'Response status is missing');

  // Check for OpenAI specific rate limit headers and status codes
  return (
    response.headers.get('X-RateLimit-Remaining') === '0' ||
    response.status === 429 ||
    // OpenAI specific error codes
    response.headers.get('x-ratelimit-remaining-requests') === '0' ||
    response.headers.get('x-ratelimit-remaining-tokens') === '0'
  );
}

/**
 * Handle rate limiting by waiting the appropriate amount of time
 */
export async function handleRateLimit(response: Response): Promise<void> {
  const rateLimitReset = response.headers.get('X-RateLimit-Reset');
  const retryAfter = response.headers.get('Retry-After');
  // OpenAI specific headers
  const openaiReset =
    response.headers.get('x-ratelimit-reset-requests') ||
    response.headers.get('x-ratelimit-reset-tokens');

  let waitTime = 60_000; // Default wait time of 60 seconds

  if (openaiReset) {
    waitTime = Math.max(Number.parseInt(openaiReset) * 1000, 0);
  } else if (rateLimitReset) {
    const resetTime = new Date(Number.parseInt(rateLimitReset) * 1000);
    const now = new Date();
    waitTime = Math.max(resetTime.getTime() - now.getTime() + 1000, 0);
  } else if (retryAfter) {
    waitTime = Number.parseInt(retryAfter) * 1000;
  }

  logger.debug(`Rate limited, waiting ${waitTime}ms before retry`);
  await sleep(waitTime);
}

/**
 * Fetch with automatic retries and rate limit handling
 */
export async function fetchWithRetries(
  url: RequestInfo,
  options: PromptfooRequestInit = {},
  timeout: number,
  retries: number = 4,
): Promise<Response> {
  const maxRetries = Math.max(0, retries);

  let lastErrorMessage: string | undefined;
  const backoff = getEnvInt('PROMPTFOO_REQUEST_BACKOFF_MS', 5000);

  for (let i = 0; i <= maxRetries; i++) {
    let response;
    try {
      response = await fetchWithTimeout(url, options, timeout);

      if (getEnvBool('PROMPTFOO_RETRY_5XX') && response.status >= 500 && response.status < 600) {
        throw new Error(`Internal Server Error: ${response.status} ${response.statusText}`);
      }

      if (response && isRateLimited(response)) {
        logger.debug(
          `Rate limited on URL ${url}: ${response.status} ${response.statusText}, waiting before retry ${i + 1}/${maxRetries}`,
        );
        await handleRateLimit(response);
        continue;
      }

      return response;
    } catch (error) {
      let errorMessage;
      if (error instanceof Error) {
        // Extract as much detail as possible from the error
        const typedError = error as SystemError;
        errorMessage = `${typedError.name}: ${typedError.message}`;
        if (typedError.cause) {
          errorMessage += ` (Cause: ${typedError.cause})`;
        }
        if (typedError.code) {
          // Node.js system errors often have error codes
          errorMessage += ` (Code: ${typedError.code})`;
        }
      } else {
        errorMessage = String(error);
      }

      logger.debug(`Request to ${url} failed (attempt #${i + 1}), retrying: ${errorMessage}`);
      if (i < maxRetries) {
        const waitTime = Math.pow(2, i) * (backoff + 1000 * Math.random());
        await sleep(waitTime);
      }
      lastErrorMessage = errorMessage;
    }
  }
  throw new Error(`Request failed after ${maxRetries} retries: ${lastErrorMessage}`);
}
