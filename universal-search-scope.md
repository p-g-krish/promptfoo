# Universal Search Implementation Specification

## Overview

Add a simple, fast search feature to PromptFoo that allows developers to search across all evaluations, prompts, and results. The search should work out of the box with zero configuration and feel native to the PromptFoo experience.

## Requirements

1. **Zero Configuration** - Works immediately after update
2. **Local Only** - All processing happens on the developer's machine
3. **Fast** - Results appear as the user types (<100ms)
4. **Smart** - Uses semantic search when OpenAI key is available, falls back to keyword search
5. **Minimal** - No settings, no options, just works

## Implementation Details

### File Structure

```
src/
  search/
    index.ts           # Main search service
    keyword.ts         # SQLite FTS5 implementation
    semantic.ts        # Vectra + embeddings implementation
    api.ts            # Express routes

src/app/src/
  components/
    SearchModal.tsx    # Cmd+K search UI
```

### Database Schema

Add to existing SQLite database:

```sql
-- Full-text search index
CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
  entity_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,  -- 'eval', 'prompt', 'dataset'
  title TEXT,
  content TEXT,
  metadata TEXT                -- JSON string
);

-- Track indexing progress
CREATE TABLE IF NOT EXISTS search_metadata (
  key TEXT PRIMARY KEY,
  value TEXT
);
```

### Core Components

#### 1. Search Service (`src/search/index.ts`)

```typescript
import { getDb } from '../database';
import { KeywordSearch } from './keyword';
import { SemanticSearch } from './semantic';
import { getOpenAIKey } from '../providers/openai';

export class SearchService {
  private keyword: KeywordSearch;
  private semantic?: SemanticSearch;

  constructor() {
    this.keyword = new KeywordSearch();

    // Auto-enable semantic search if OpenAI key exists
    const openAIKey = getOpenAIKey();
    if (openAIKey) {
      this.semantic = new SemanticSearch(openAIKey);
    }
  }

  async search(query: string, limit = 20): Promise<SearchResult[]> {
    // Always do keyword search
    const keywordResults = await this.keyword.search(query, limit);

    // If semantic search is available, enhance results
    if (this.semantic) {
      const semanticResults = await this.semantic.search(query, limit);
      return this.mergeResults(keywordResults, semanticResults);
    }

    return keywordResults;
  }

  async indexEval(evalId: string): Promise<void> {
    const eval = await Eval.findById(evalId);
    if (!eval) return;

    // Index for keyword search
    await this.keyword.index({
      entity_id: evalId,
      entity_type: 'eval',
      title: eval.description || `Eval ${evalId}`,
      content: this.extractEvalContent(eval),
      metadata: JSON.stringify({
        createdAt: eval.createdAt,
        author: eval.author,
        passRate: eval.getPassRate(),
      }),
    });

    // Index for semantic search if available
    if (this.semantic) {
      await this.semantic.index(evalId, this.extractEvalContent(eval));
    }
  }

  private extractEvalContent(eval: Eval): string {
    // Combine relevant text for searching
    return [
      eval.description,
      eval.config.description,
      eval.prompts.map((p) => p.label).join(' '),
      JSON.stringify(eval.config.providers),
      eval.results
        .slice(0, 10)
        .map((r) => r.response.output)
        .join(' '),
    ]
      .filter(Boolean)
      .join(' ');
  }
}
```

#### 2. API Routes (`src/search/api.ts`)

```typescript
import { Router } from 'express';
import { SearchService } from './index';
import { getFeatureFlag } from '../featureFlags';

const router = Router();
const searchService = new SearchService();

router.get('/api/search', async (req, res) => {
  // Check feature flag
  if (!getFeatureFlag('universalSearch')) {
    return res.status(404).json({ error: 'Search not enabled' });
  }

  const { q, limit = 20 } = req.query;

  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Query required' });
  }

  try {
    const results = await searchService.search(q, Number(limit));
    res.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
```

#### 3. Search Modal (`src/app/src/components/SearchModal.tsx`)

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog } from '@mui/material';
import { callApi } from '@app/utils/api';
import { useDebounce } from 'use-debounce';

export function SearchModal({ open, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [debouncedQuery] = useDebounce(query, 200);
  const navigate = useNavigate();

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      return;
    }

    const search = async () => {
      setLoading(true);
      try {
        const response = await callApi(`/search?q=${encodeURIComponent(debouncedQuery)}`);
        setResults(response.results);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    };

    search();
  }, [debouncedQuery]);

  const handleResultClick = (result: SearchResult) => {
    onClose();
    navigate(`/eval/${result.entity_id}`);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <div className="search-modal">
        <input
          type="text"
          placeholder="Search evaluations, prompts, results..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />

        {loading && <div>Searching...</div>}

        <div className="search-results">
          {results.map((result) => (
            <div
              key={result.entity_id}
              className="search-result"
              onClick={() => handleResultClick(result)}
            >
              <div className="title">{result.title}</div>
              <div className="snippet">{result.snippet}</div>
            </div>
          ))}
        </div>
      </div>
    </Dialog>
  );
}
```

### Indexing Strategy

#### Initial Backfill

When search is first enabled, automatically index existing content:

```typescript
// In src/search/backfill.ts
export async function backfillSearchIndex() {
  const db = getDb();
  const searchService = new SearchService();

  // Check if already indexed
  const lastIndexed = await db.get('SELECT value FROM search_metadata WHERE key = ?', [
    'last_indexed',
  ]);

  if (lastIndexed) {
    return; // Already indexed
  }

  // Index all evaluations
  const evals = await db.all('SELECT id FROM evals ORDER BY created_at DESC LIMIT 1000');

  for (const eval of evals) {
    await searchService.indexEval(eval.id);
  }

  // Mark as indexed
  await db.run('INSERT OR REPLACE INTO search_metadata (key, value) VALUES (?, ?)', [
    'last_indexed',
    new Date().toISOString(),
  ]);
}
```

#### Real-time Indexing

Hook into existing eval creation/update events:

```typescript
// In src/models/eval.ts, add to save() method
async save(): Promise<void> {
  // ... existing save logic ...

  // Index for search
  if (getFeatureFlag('universalSearch')) {
    const searchService = new SearchService();
    await searchService.indexEval(this.id);
  }
}
```

### Vectra Setup

For semantic search, initialize Vectra on first use:

```typescript
// In src/search/semantic.ts
import { LocalIndex } from 'vectra';
import path from 'path';
import { getDataDir } from '../util/config';

export class SemanticSearch {
  private index?: LocalIndex;
  private openAIKey: string;

  constructor(openAIKey: string) {
    this.openAIKey = openAIKey;
  }

  private async getIndex(): Promise<LocalIndex> {
    if (!this.index) {
      this.index = new LocalIndex({
        path: path.join(getDataDir(), 'embeddings'),
        dimensions: 1536, // text-embedding-3-small
      });
      await this.index.createIndex();
    }
    return this.index;
  }

  async search(query: string, limit: number): Promise<SearchResult[]> {
    const index = await this.getIndex();

    // Generate query embedding
    const embedding = await this.generateEmbedding(query);

    // Search
    const results = await index.queryItems(embedding, limit);

    return results.map((r) => ({
      entity_id: r.id,
      entity_type: r.metadata.type,
      title: r.metadata.title,
      snippet: r.metadata.snippet,
      score: r.score,
    }));
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Use existing OpenAI provider code
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    });

    const data = await response.json();
    return data.data[0].embedding;
  }
}
```

### Feature Flag

Add to `src/globalConfig/globalConfig.ts`:

```typescript
export function getFeatureFlags(): Record<string, boolean> {
  const config = getGlobalConfig();
  return {
    universalSearch: config.features?.universalSearch ?? false,
    // ... other flags
  };
}
```

### UI Integration

Add keyboard shortcut to `src/app/src/App.tsx`:

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setSearchOpen(true);
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

## Testing

```typescript
// src/search/__tests__/search.test.ts
describe('SearchService', () => {
  it('returns keyword results when no OpenAI key', async () => {
    const service = new SearchService();
    const results = await service.search('temperature');
    expect(results).toHaveLength(5);
    expect(results[0].entity_type).toBe('eval');
  });

  it('indexes new evaluations automatically', async () => {
    const eval = await Eval.create({
      /* ... */
    });

    const service = new SearchService();
    const results = await service.search(eval.id);
    expect(results[0].entity_id).toBe(eval.id);
  });
});
```

## Rollout Plan

1. **Enable for internal team** - Set feature flag in `.env`
2. **Monitor performance** - Ensure <100ms search times
3. **Enable by default** - In next release

## Success Criteria

- Search results appear in <100ms
- Zero configuration required
- Works offline (keyword search)
- Automatically uses semantic search when available
- No increase in memory usage >100MB

## Future Enhancements (Not in V1)

- Search filters (by date, author, etc.)
- Search history
- Saved searches
- Export search results
