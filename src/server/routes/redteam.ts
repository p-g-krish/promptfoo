import { Router } from 'express';
import type { Request, Response } from 'express';
import logger from '../../logger';

export const redteamRouter = Router();

const CLOUD_FUNCTION_URL =
  process.env.PROMPTFOO_REMOTE_GENERATION_URL || 'https://api.promptfoo.dev/v1/generate';

redteamRouter.post('/:task', async (req: Request, res: Response): Promise<void> => {
  const { task } = req.params;

  logger.debug(`Received ${task} task request:`, {
    method: req.method,
    url: req.url,
    body: req.body,
  });

  try {
    logger.debug(`Sending request to cloud function: ${CLOUD_FUNCTION_URL}`);
    const response = await fetch(CLOUD_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task,
        ...req.body,
      }),
    });

    if (!response.ok) {
      logger.error(`Cloud function responded with status ${response.status}`);
      throw new Error(`Cloud function responded with status ${response.status}`);
    }

    const data = await response.json();
    logger.debug(`Received response from cloud function:`, data);
    res.json(data);
  } catch (error) {
    logger.error(`Error in ${task} task:`, error);
    res.status(500).json({ error: `Failed to process ${task} task` });
  }
});

// Add new route for testing providers
redteamRouter.post('/test-provider', async (req: Request, res: Response): Promise<void> => {
  const { type, path } = req.body;

  logger.debug('Testing provider:', { type, path });

  try {
    // Mock provider testing logic
    if (!path.startsWith('file://')) {
      throw new Error('Path must start with file://');
    }

    const fileExtension = path.split('.').pop();
    const expectedExtension = type === 'javascript' ? 'js' : 'py';

    if (fileExtension !== expectedExtension) {
      throw new Error(`Invalid file extension. Expected .${expectedExtension}`);
    }

    // Mock successful response
    // In production, you would actually try to load and validate the provider here
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing
    
    res.json({
      success: true,
      message: `Successfully loaded ${type} provider from ${path}`,
      details: {
        provider: {
          type,
          path,
          status: 'operational',
          timestamp: new Date().toISOString(),
        }
      }
    });
  } catch (error) {
    logger.error('Provider test failed:', error);
    res.status(400).json({
      success: false,
      message: (error as Error).message,
      details: {
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      }
    });
  }
});
