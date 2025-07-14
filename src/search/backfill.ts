import { desc } from 'drizzle-orm';
import { getDb } from '../database';
import { evalsTable } from '../database/tables';
import logger from '../logger';
import { SearchService } from './index';

export async function backfillSearchIndex(limit: number = 1000): Promise<void> {
  const db = getDb();
  const searchService = new SearchService();

  // Check if already indexed
  const lastIndexed = await searchService.getLastIndexed();

  if (lastIndexed) {
    logger.info(`Search index already exists (last indexed: ${lastIndexed.toISOString()})`);
    return;
  }

  logger.info(`Starting search index backfill for up to ${limit} evaluations...`);

  // Get most recent evaluations
  const evals = await db
    .select({
      id: evalsTable.id,
      createdAt: evalsTable.createdAt,
    })
    .from(evalsTable)
    .orderBy(desc(evalsTable.createdAt))
    .limit(limit);

  logger.info(`Found ${evals.length} evaluations to index`);

  let indexed = 0;
  let failed = 0;

  for (const [index, evalItem] of evals.entries()) {
    try {
      await searchService.indexEval(evalItem.id);
      indexed++;

      if ((index + 1) % 100 === 0) {
        logger.info(`Progress: ${index + 1}/${evals.length} evaluations indexed`);
      }
    } catch (error) {
      logger.error(`Failed to index eval ${evalItem.id}: ${error}`);
      failed++;
    }
  }

  // Mark as indexed
  await searchService.setLastIndexed(new Date());

  logger.info(`Search index backfill completed: ${indexed} indexed, ${failed} failed`);
}

// Allow running directly
if (require.main === module) {
  backfillSearchIndex()
    .then(() => {
      logger.info('Backfill completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error(`Backfill failed: ${error}`);
      process.exit(1);
    });
}
