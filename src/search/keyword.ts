import { sql } from 'drizzle-orm';
import { getDb } from '../database';
import { searchIndexTable } from '../database/tables';
import type { SearchResult } from './types';

export class KeywordSearch {
  private db = getDb();

  async search(query: string, limit: number = 20): Promise<SearchResult[]> {
    // Validate input
    if (!query || typeof query !== 'string' || query.length > 1000) {
      return [];
    }

    // Properly escape FTS5 special characters and quotes
    const escapedQuery = query
      .replace(/[\\'"]/g, '\\$&') // Escape quotes and backslashes
      .replace(/[()]/g, '') // Remove parentheses
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    if (!escapedQuery) {
      return [];
    }

    // Validate limit
    const safeLimit = Math.min(Math.max(1, limit), 100);

    // Use FTS5 to search with proper parameterization
    const results = await this.db.all<{
      entity_id: string;
      entity_type: string;
      title: string | null;
      metadata: string | null;
      snippet: string;
      score: number;
    }>(sql`
      SELECT 
        si.entity_id,
        si.entity_type,
        si.title,
        si.metadata,
        snippet(search_fts, 3, '<mark>', '</mark>', '...', 64) as snippet,
        bm25(search_fts) as score
      FROM search_fts
      JOIN search_index si ON search_fts.rowid = si.rowid
      WHERE search_fts MATCH ${escapedQuery}
      ORDER BY bm25(search_fts)
      LIMIT ${safeLimit}
    `);

    return results.map((row) => ({
      entityId: row.entity_id,
      entityType: row.entity_type as 'eval' | 'prompt' | 'dataset',
      title: row.title || `${row.entity_type} ${row.entity_id}`,
      snippet: row.snippet,
      score: row.score,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
    }));
  }

  async index(data: {
    entity_id: string;
    entity_type: 'eval' | 'prompt' | 'dataset';
    title?: string;
    content: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const id = `${data.entity_type}-${data.entity_id}`;

    // Insert or update the search index
    await this.db
      .insert(searchIndexTable)
      .values({
        id,
        entityId: data.entity_id,
        entityType: data.entity_type,
        title: data.title,
        content: data.content,
        metadata: data.metadata,
      })
      .onConflictDoUpdate({
        target: searchIndexTable.id,
        set: {
          title: data.title,
          content: data.content,
          metadata: data.metadata,
        },
      });
  }

  async removeIndex(entityId: string, entityType: 'eval' | 'prompt' | 'dataset'): Promise<void> {
    const id = `${entityType}-${entityId}`;
    await this.db.delete(searchIndexTable).where(sql`${searchIndexTable.id} = ${id}`);
  }
}
