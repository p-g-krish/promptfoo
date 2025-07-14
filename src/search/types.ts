export interface SearchResult {
  entityId: string;
  entityType: 'eval' | 'prompt' | 'dataset';
  title: string;
  snippet: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface SearchOptions {
  query: string;
  limit?: number;
  offset?: number;
  filters?: {
    entityType?: ('eval' | 'prompt' | 'dataset')[];
    dateRange?: {
      start?: Date;
      end?: Date;
    };
  };
}
