import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchService } from '../index';
import { KeywordSearch } from '../keyword';
import { SemanticSearch } from '../semantic';
import * as utils from '../utils';
import type Eval from '../../models/eval';

// Mock dependencies
vi.mock('../keyword');
vi.mock('../semantic');
vi.mock('../utils');
vi.mock('../../database', () => ({
  getDb: vi.fn(() => ({
    all: vi.fn(),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoUpdate: vi.fn(),
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => []),
        })),
      })),
    })),
  })),
}));

describe('SearchService', () => {
  let searchService: SearchService;
  let mockKeywordSearch: any;
  let mockSemanticSearch: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockKeywordSearch = {
      search: vi.fn(),
      index: vi.fn(),
      removeIndex: vi.fn(),
    };
    mockSemanticSearch = {
      search: vi.fn(),
      index: vi.fn(),
      removeIndex: vi.fn(),
    };
    (KeywordSearch as any).mockImplementation(() => mockKeywordSearch);
    (SemanticSearch as any).mockImplementation(() => mockSemanticSearch);
  });

  describe('constructor', () => {
    it('should initialize with keyword search only when no OpenAI key', () => {
      (utils.getOpenAIKey as any).mockReturnValue(undefined);
      searchService = new SearchService();
      expect(KeywordSearch).toHaveBeenCalled();
      expect(SemanticSearch).not.toHaveBeenCalled();
    });

    it('should initialize with both searches when OpenAI key exists', () => {
      (utils.getOpenAIKey as any).mockReturnValue('test-key');
      searchService = new SearchService();
      expect(KeywordSearch).toHaveBeenCalled();
      expect(SemanticSearch).toHaveBeenCalledWith('test-key');
    });
  });

  describe('search', () => {
    beforeEach(() => {
      (utils.getOpenAIKey as any).mockReturnValue(undefined);
      searchService = new SearchService();
    });

    it('should return keyword results when no semantic search', async () => {
      const mockResults = [
        { entityId: '1', entityType: 'eval', title: 'Test 1', snippet: 'test', score: 1 },
      ];
      mockKeywordSearch.search.mockResolvedValue(mockResults);

      const results = await searchService.search('test query');

      expect(mockKeywordSearch.search).toHaveBeenCalledWith('test query', 20);
      expect(results).toEqual(mockResults);
    });

    it('should merge results when semantic search is available', async () => {
      (utils.getOpenAIKey as any).mockReturnValue('test-key');
      searchService = new SearchService();

      const keywordResults = [
        { entityId: '1', entityType: 'eval', title: 'Test 1', snippet: 'keyword', score: 1 },
        { entityId: '2', entityType: 'eval', title: 'Test 2', snippet: 'keyword', score: 0.8 },
      ];
      const semanticResults = [
        { entityId: '1', entityType: 'eval', title: 'Test 1', snippet: 'semantic', score: 0.9 },
        { entityId: '3', entityType: 'eval', title: 'Test 3', snippet: 'semantic', score: 0.7 },
      ];

      mockKeywordSearch.search.mockResolvedValue(keywordResults);
      mockSemanticSearch.search.mockResolvedValue(semanticResults);

      const results = await searchService.search('test query');

      expect(mockKeywordSearch.search).toHaveBeenCalledWith('test query', 20);
      expect(mockSemanticSearch.search).toHaveBeenCalledWith('test query', 20);

      // Should merge and boost semantic scores
      expect(results).toHaveLength(3);
      expect(results[0].entityId).toBe('1'); // Combined score highest
      expect(results[0].score).toBeGreaterThan(1); // Combined score
    });

    it('should fall back to keyword results if semantic search fails', async () => {
      (utils.getOpenAIKey as any).mockReturnValue('test-key');
      searchService = new SearchService();

      const keywordResults = [
        { entityId: '1', entityType: 'eval', title: 'Test 1', snippet: 'keyword', score: 1 },
      ];

      mockKeywordSearch.search.mockResolvedValue(keywordResults);
      mockSemanticSearch.search.mockRejectedValue(new Error('API error'));

      const results = await searchService.search('test query');

      expect(results).toEqual(keywordResults);
    });
  });

  describe('indexEval', () => {
    beforeEach(() => {
      (utils.getOpenAIKey as any).mockReturnValue(undefined);
      searchService = new SearchService();
    });

    it('should index eval for keyword search', async () => {
      const mockEval = {
        id: 'eval-123',
        description: 'Test eval',
        config: { description: 'Config desc' },
        prompts: [{ label: 'Prompt 1' }],
        results: [],
        vars: ['var1', 'var2'],
        _resultsLoaded: true,
        loadResults: vi.fn(),
      };

      vi.doMock('../../models/eval', () => ({
        default: {
          findById: vi.fn().mockResolvedValue(mockEval),
        },
      }));

      await searchService.indexEval('eval-123');

      expect(mockKeywordSearch.index).toHaveBeenCalledWith({
        entity_id: 'eval-123',
        entity_type: 'eval',
        title: 'Test eval',
        content: expect.stringContaining('Test eval'),
        metadata: expect.any(Object),
      });
    });

    it('should skip indexing if eval not found', async () => {
      vi.doMock('../../models/eval', () => ({
        default: {
          findById: vi.fn().mockResolvedValue(undefined),
        },
      }));

      await searchService.indexEval('non-existent');

      expect(mockKeywordSearch.index).not.toHaveBeenCalled();
    });
  });
});
