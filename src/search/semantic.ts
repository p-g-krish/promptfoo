import { LocalIndex } from 'vectra';
import * as path from 'path';
import { getConfigDirectoryPath } from '../util/config/manage';
import type { SearchResult } from './types';
import logger from '../logger';

// Singleton instance to prevent memory leaks
let semanticSearchInstance: SemanticSearch | null = null;

export class SemanticSearch {
  private indexInstance?: LocalIndex;
  private openAIKey: string;
  private indexPath: string;
  private static MAX_CONTENT_LENGTH = 8000; // Limit content size

  constructor(openAIKey: string) {
    this.openAIKey = openAIKey;
    this.indexPath = path.join(getConfigDirectoryPath(true), 'embeddings');
  }

  static getInstance(openAIKey: string): SemanticSearch {
    if (!semanticSearchInstance || semanticSearchInstance.openAIKey !== openAIKey) {
      // Clean up previous instance
      if (semanticSearchInstance) {
        semanticSearchInstance.cleanup();
      }
      semanticSearchInstance = new SemanticSearch(openAIKey);
    }
    return semanticSearchInstance;
  }

  async cleanup(): Promise<void> {
    // Clean up resources
    this.indexInstance = undefined;
  }

  private async getIndex(): Promise<LocalIndex> {
    if (!this.indexInstance) {
      this.indexInstance = new LocalIndex(this.indexPath);

      try {
        // Try to load existing index
        if (!(await this.indexInstance.isIndexCreated())) {
          await this.indexInstance.createIndex({ version: 1 }); // text-embedding-3-small
        }
      } catch (_error) {
        logger.debug('Creating new semantic search index');
        await this.indexInstance.createIndex({ version: 1 });
      }
    }
    return this.indexInstance;
  }

  async search(query: string, limit: number = 20): Promise<SearchResult[]> {
    try {
      const index = await this.getIndex();

      // Generate query embedding
      const embedding = await this.generateEmbedding(query);

      // Search
      const results = await index.queryItems(embedding, '', limit);

      return results.map((r) => {
        const metadata = r.item.metadata as {
          entityId: string;
          entityType: 'eval' | 'prompt' | 'dataset';
          title: string;
          snippet: string;
          createdAt?: number;
          author?: string;
          passRate?: number;
        };
        return {
          entityId: metadata.entityId,
          entityType: metadata.entityType,
          title: metadata.title,
          snippet: metadata.snippet || '',
          score: r.score,
          metadata: {
            createdAt: metadata.createdAt,
            author: metadata.author,
            passRate: metadata.passRate,
          },
        };
      });
    } catch (error) {
      logger.error(`Semantic search failed: ${error}`);
      return [];
    }
  }

  async index(
    entityId: string,
    entityType: 'eval' | 'prompt' | 'dataset',
    content: string,
    title?: string,
    metadata?: { createdAt?: number; author?: string; passRate?: number },
  ): Promise<void> {
    try {
      const index = await this.getIndex();
      const id = `${entityType}-${entityId}`;

      // Limit content length to prevent excessive memory usage
      const truncatedContent = content.substring(0, SemanticSearch.MAX_CONTENT_LENGTH);
      
      // Generate embedding for content
      const embedding = await this.generateEmbedding(truncatedContent);

      // Create snippet (first 200 chars)
      const snippet = content.substring(0, 200) + (content.length > 200 ? '...' : '');

      // Index the item
      await index.insertItem({
        id,
        vector: embedding,
        metadata: {
          entityId,
          entityType,
          title: title || `${entityType} ${entityId}`,
          snippet,
          ...(metadata?.createdAt && { createdAt: metadata.createdAt }),
          ...(metadata?.author && { author: metadata.author }),
          ...(metadata?.passRate && { passRate: metadata.passRate }),
        },
      });
    } catch (error) {
      logger.error(`Failed to index item for semantic search: ${error}`);
    }
  }

  async removeIndex(entityId: string, entityType: 'eval' | 'prompt' | 'dataset'): Promise<void> {
    try {
      const index = await this.getIndex();
      const id = `${entityType}-${entityId}`;
      await index.deleteItem(id);
    } catch (error) {
      logger.error(`Failed to remove item from semantic search: ${error}`);
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.substring(0, 8191), // Max tokens for embedding model
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }
}
