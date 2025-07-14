-- Create FTS5 virtual table for full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS search_fts USING fts5(
  entity_id UNINDEXED,
  entity_type UNINDEXED,
  title,
  content,
  content=search_index,
  content_rowid=rowid
);

-- Create triggers to keep FTS in sync with search_index
CREATE TRIGGER IF NOT EXISTS search_index_ai AFTER INSERT ON search_index BEGIN
  INSERT INTO search_fts(rowid, entity_id, entity_type, title, content)
  VALUES (new.rowid, new.entity_id, new.entity_type, new.title, new.content);
END;

CREATE TRIGGER IF NOT EXISTS search_index_ad AFTER DELETE ON search_index BEGIN
  DELETE FROM search_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER IF NOT EXISTS search_index_au AFTER UPDATE ON search_index BEGIN
  DELETE FROM search_fts WHERE rowid = old.rowid;
  INSERT INTO search_fts(rowid, entity_id, entity_type, title, content)
  VALUES (new.rowid, new.entity_id, new.entity_type, new.title, new.content);
END;