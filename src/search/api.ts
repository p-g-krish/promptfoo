import { Router } from 'express';
import type { Request, Response } from 'express';
import { SearchService } from './index';
import { getEnvBool } from '../envars';
import logger from '../logger';

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 100; // 100 requests per minute

const router = Router();
const searchService = new SearchService();

// Middleware to check if search is enabled and request is local
function checkSearchAccess(req: Request, res: Response, next: Function) {
  // Check feature flag
  if (!getEnvBool('PROMPTFOO_ENABLE_UNIVERSAL_SEARCH')) {
    res.status(404).json({ error: 'Search not enabled' });
    return;
  }

  // In production, ensure request is from localhost
  if (process.env.NODE_ENV === 'production') {
    const ip = req.ip || req.connection.remoteAddress;
    if (ip && !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip)) {
      logger.warn(`Search API accessed from non-local IP: ${ip}`);
      res.status(403).json({ error: 'Search API is only available locally' });
      return;
    }
  }

  // Rate limiting
  const clientId = req.ip || 'unknown';
  const now = Date.now();
  const clientData = rateLimitMap.get(clientId);

  if (!clientData || now > clientData.resetTime) {
    // Reset rate limit window
    rateLimitMap.set(clientId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
  } else {
    clientData.count++;
    if (clientData.count > RATE_LIMIT_MAX) {
      res.status(429).json({ 
        error: 'Too many requests', 
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000) 
      });
      return;
    }
  }

  // Clean up old entries periodically
  if (Math.random() < 0.01) { // 1% chance
    const cutoff = now - RATE_LIMIT_WINDOW;
    for (const [key, value] of rateLimitMap.entries()) {
      if (value.resetTime < cutoff) {
        rateLimitMap.delete(key);
      }
    }
  }

  next();
}

router.get('/search', checkSearchAccess, async (req: Request, res: Response): Promise<void> => {

  const { q, limit = 20 } = req.query;

  // Validate query parameter
  if (!q || typeof q !== 'string') {
    res.status(400).json({ error: 'Query parameter "q" is required' });
    return;
  }

  // Validate query length
  if (q.length < 2 || q.length > 200) {
    res.status(400).json({ error: 'Query must be between 2 and 200 characters' });
    return;
  }

  // Validate limit parameter
  const parsedLimit = Number(limit);
  if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    res.status(400).json({ error: 'Limit must be between 1 and 100' });
    return;
  }

  try {
    const results = await searchService.search(q, Number(limit));
    res.json({ results });
  } catch (error) {
    logger.error(`Search error: ${error}`);
    res.status(500).json({ error: 'Search failed' });
  }
});

router.post(
  '/search/index/:entityType/:entityId',
  checkSearchAccess,
  async (req: Request, res: Response): Promise<void> => {

    const { entityType, entityId } = req.params;

    // Validate entity type
    if (entityType !== 'eval' && entityType !== 'prompt' && entityType !== 'dataset') {
      res.status(400).json({ error: 'Invalid entity type' });
      return;
    }

    // Validate entity ID format (alphanumeric with dashes)
    if (!entityId || !/^[a-zA-Z0-9-_]+$/.test(entityId) || entityId.length > 100) {
      res.status(400).json({ error: 'Invalid entity ID format' });
      return;
    }

    try {
      if (entityType === 'eval') {
        await searchService.indexEval(entityId);
      }
      // TODO: Add indexing for prompts and datasets when implemented

      res.json({ success: true });
    } catch (error) {
      logger.error(`Index error for ${entityType} ${entityId}: ${error}`);
      res.status(500).json({ error: 'Indexing failed' });
    }
  },
);

export { router as searchRouter };
