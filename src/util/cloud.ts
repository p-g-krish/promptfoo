import type { RedteamRunOptions, UnifiedConfig } from 'src/types';
import { cloudConfig } from '../globalConfig/cloud';
import logger from '../logger';

function makeRequest(path: string, method: string, body?: any) {
  const apiHost = cloudConfig.getApiHost();
  const apiKey = cloudConfig.getApiKey();
  const url = `${apiHost}${path}`;

  return fetch(url, {
    method,
    body: JSON.stringify(body),
    headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
  });
}

export async function getConfigFromCloud(id: string) {
  if (!cloudConfig.isEnabled()) {
    throw new Error('Cloud config is not enabled. Please run `promptfoo auth login` to login.');
  }

  const response = await makeRequest(`/redteam/configs/${id}`, 'GET');
  const body = await response.json();
  if (response.ok) {
    logger.info(`Config fetched from cloud: ${id}`);
    logger.debug(`Config from cloud: ${JSON.stringify(body, null, 2)}`);
  } else {
    throw new Error(`Failed to fetch config from cloud: ${response.statusText}`);
  }
  return body;
}

export async function createJobInCloud({
  config,
  configId,
  opts,
}: {
  config: UnifiedConfig;
  configId: string;
  opts: RedteamRunOptions;
}) {
  if (!cloudConfig.isEnabled()) {
    throw new Error('Cloud config is not enabled. Please run `promptfoo auth login` to login.');
  }
  try {
    const response = await makeRequest(`/jobs/register`, 'POST', { config, configId, ...opts });
    const body = await response.json();
    if (response.ok) {
      logger.info(`Job created in cloud: ${body.id}`);
      logger.debug(`Job created in cloud: ${JSON.stringify(body, null, 2)}`);
    } else {
      throw new Error(`Failed to create job in cloud: ${response.statusText}`);
    }
    return body;
  } catch (error) {
    logger.error(`Error creating job in cloud: ${error}`);
    throw error;
  }
}

export async function sendLogForJobToCloud(jobId: string, logMessage: string, date: Date) {
  if (!cloudConfig.isEnabled()) {
    throw new Error('Cloud config is not enabled. Please run `promptfoo auth login` to login.');
  }
  try {
    const response = await makeRequest(`/jobs/${jobId}/logs`, 'POST', {
      message: logMessage,
    });
    const body = await response.json();
    if (response.ok) {
      logger.info(`Job created in cloud: ${body.id}`);
      logger.debug(`Job created in cloud: ${JSON.stringify(body, null, 2)}`);
    } else {
      throw new Error(`Failed to create job in cloud: ${response.statusText}`);
    }
    return body;
  } catch (error) {
    logger.error(`Error creating job in cloud: ${error}`);
    throw error;
  }
}

export async function failJobInCloud(jobId: string) {
  if (!cloudConfig.isEnabled()) {
    throw new Error('Cloud config is not enabled. Please run `promptfoo auth login` to login.');
  }
  try {
    const response = await makeRequest(`/jobs/${jobId}/failed`, 'POST');
    const body = await response.json();
    if (response.ok) {
      logger.info(`Job created in cloud: ${body.id}`);
      logger.debug(`Job created in cloud: ${JSON.stringify(body, null, 2)}`);
    } else {
      throw new Error(`Failed to create job in cloud: ${response.statusText}`);
    }
    return body;
  } catch (error) {
    logger.error(`Error creating job in cloud: ${error}`);
    throw error;
  }
}

export async function completeJobInCloud(jobId: string, remoteEvalId?: string) {
  if (!cloudConfig.isEnabled()) {
    throw new Error('Cloud config is not enabled. Please run `promptfoo auth login` to login.');
  }
  try {
    const response = await makeRequest(`/jobs/${jobId}/completed`, 'POST', {
      evalId: remoteEvalId,
    });
    const body = await response.json();
    if (response.ok) {
      logger.info(`Job created in cloud: ${body.id}`);
      logger.debug(`Job created in cloud: ${JSON.stringify(body, null, 2)}`);
    } else {
      throw new Error(`Failed to create job in cloud: ${response.statusText}`);
    }
    return body;
  } catch (error) {
    logger.error(`Error creating job in cloud: ${error}`);
    throw error;
  }
}
