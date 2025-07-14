import { getDb } from '../database';
import { searchMetadataTable } from '../database/tables';
import logger from '../logger';
import { KeywordSearch } from './keyword';
import { SemanticSearch } from './semantic';
import { getOpenAIKey } from './utils';
import type { SearchResult } from './types';
import type Eval from '../models/eval';
import { eq } from 'drizzle-orm';

export class SearchService {
  private keyword: KeywordSearch;
  private semantic?: SemanticSearch;
  private db = getDb();

  constructor() {
    this.keyword = new KeywordSearch();

    // Auto-enable semantic search if OpenAI key exists
    const openAIKey = getOpenAIKey();
    if (openAIKey) {
      this.semantic = SemanticSearch.getInstance(openAIKey);
      logger.debug('Semantic search enabled');
    } else {
      logger.debug('Semantic search disabled - no OpenAI key found');
    }
  }

  async search(query: string, limit = 20): Promise<SearchResult[]> {
    // Always do keyword search
    const keywordResults = await this.keyword.search(query, limit);

    // If semantic search is available, enhance results
    if (this.semantic) {
      try {
        const semanticResults = await this.semantic.search(query, limit);
        return this.mergeResults(keywordResults, semanticResults);
      } catch (error) {
        logger.error(`Semantic search failed, falling back to keyword search: ${error}`);
        return keywordResults;
      }
    }

    return keywordResults;
  }

  async indexEval(evalId: string): Promise<void> {
    try {
      // Import dynamically to avoid circular dependency
      const { default: Eval } = await import('../models/eval');
      const eval_ = await Eval.findById(evalId);
      if (!eval_) {
        logger.warn(`Eval ${evalId} not found for indexing`);
        return;
      }

      // Extract content for indexing
      const content = await this.extractEvalContent(eval_);

      // Index for keyword search
      await this.keyword.index({
        entity_id: evalId,
        entity_type: 'eval',
        title: eval_.description || `Evaluation ${evalId}`,
        content: content,
        metadata: {
          createdAt: eval_.createdAt,
          author: eval_.author,
          // Calculate pass rate if results are loaded
          ...(eval_._resultsLoaded &&
            eval_.results.length > 0 && {
              passRate: eval_.results.filter((r) => r.success).length / eval_.results.length,
            }),
        },
      });

      // Index for semantic search if available
      if (this.semantic) {
        await this.semantic.index(
          evalId,
          'eval',
          content,
          eval_.description || `Evaluation ${evalId}`,
          {
            createdAt: eval_.createdAt,
            author: eval_.author,
          },
        );
      }
    } catch (error) {
      logger.error(`Failed to index eval ${evalId}: ${error}`);
    }
  }

  async removeEvalIndex(evalId: string): Promise<void> {
    await this.keyword.removeIndex(evalId, 'eval');
    if (this.semantic) {
      await this.semantic.removeIndex(evalId, 'eval');
    }
  }

  private async extractEvalContent(eval_: Eval): Promise<string> {
    // Load results if not already loaded
    if (!eval_._resultsLoaded) {
      await eval_.loadResults();
    }

    // Combine relevant text for searching
    const contentParts = [
      eval_.description,
      eval_.config.description,
      // Provider information
      JSON.stringify(eval_.config.providers || []),
      // Prompt labels
      eval_.prompts
        .map((p) => p.label)
        .join(' '),
      // Sample of test results (limit to avoid huge content)
      eval_.results
        .slice(0, 10)
        .map((r) => {
          const parts = [];
          if (r.response?.output) {
            parts.push(
              typeof r.response.output === 'string'
                ? r.response.output
                : JSON.stringify(r.response.output),
            );
          }
          if (r.gradingResult?.reason) {
            parts.push(r.gradingResult.reason);
          }
          return parts.join(' ');
        })
        .join(' '),
      // Test variables
      eval_.vars.join(' '),
    ];

    return contentParts.filter(Boolean).join(' ');
  }

  private mergeResults(
    keywordResults: SearchResult[],
    semanticResults: SearchResult[],
  ): SearchResult[] {
    // Create a map to track unique results by entityId
    const resultMap = new Map<string, SearchResult>();

    // Add semantic results first (higher priority)
    semanticResults.forEach((result) => {
      resultMap.set(result.entityId, {
        ...result,
        score: result.score * 1.5, // Boost semantic scores
      });
    });

    // Add keyword results
    keywordResults.forEach((result) => {
      if (resultMap.has(result.entityId)) {
        // Combine scores if present in both
        const existing = resultMap.get(result.entityId)!;
        resultMap.set(result.entityId, {
          ...existing,
          score: existing.score + result.score,
        });
      } else {
        resultMap.set(result.entityId, result);
      }
    });

    // Convert back to array and sort by score
    return Array.from(resultMap.values()).sort((a, b) => b.score - a.score);
  }

  async getLastIndexed(): Promise<Date | null> {
    const result = await this.db
      .select({ value: searchMetadataTable.value })
      .from(searchMetadataTable)
      .where(eq(searchMetadataTable.key, 'last_indexed'))
      .limit(1);

    if (result.length > 0 && result[0].value) {
      return new Date(result[0].value);
    }
    return null;
  }

  async setLastIndexed(date: Date): Promise<void> {
    await this.db
      .insert(searchMetadataTable)
      .values({
        key: 'last_indexed',
        value: date.toISOString(),
      })
      .onConflictDoUpdate({
        target: searchMetadataTable.key,
        set: {
          value: date.toISOString(),
        },
      });
  }
}
