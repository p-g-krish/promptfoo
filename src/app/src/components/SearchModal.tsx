import React, { useState, useEffect, useCallback, Component, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  TextField,
  List,
  ListItem,
  ListItemText,
  Box,
  Typography,
  CircularProgress,
  Paper,
  InputAdornment,
  Chip,
  alpha,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useDebounce } from 'use-debounce';
import { callApi } from '@app/utils/api';

interface SearchResult {
  entityId: string;
  entityType: 'eval' | 'prompt' | 'dataset';
  title: string;
  snippet: string;
  score: number;
  metadata?: Record<string, any>;
}

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class SearchErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Search component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="error" variant="h6">
            Search is temporarily unavailable
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Please try again later
          </Typography>
        </Box>
      );
    }

    return this.props.children;
  }
}

// Safe component to render highlighted search results
function HighlightedText({ text, ...typographyProps }: { text: string } & React.ComponentProps<typeof Typography>) {
  // Parse the text to find <mark> tags safely
  const parts = React.useMemo(() => {
    const regex = /<mark>(.*?)<\/mark>/g;
    const result: Array<{ text: string; highlighted: boolean }> = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        result.push({ text: text.slice(lastIndex, match.index), highlighted: false });
      }
      // Add the highlighted text
      result.push({ text: match[1], highlighted: true });
      lastIndex = match.index + match[0].length;
    }

    // Add any remaining text
    if (lastIndex < text.length) {
      result.push({ text: text.slice(lastIndex), highlighted: false });
    }

    return result;
  }, [text]);

  return (
    <Typography {...typographyProps}>
      {parts.map((part, index) => 
        part.highlighted ? (
          <Box
            key={index}
            component="span"
            sx={{
              backgroundColor: 'warning.light',
              color: 'warning.contrastText',
              padding: '0 2px',
              borderRadius: 1,
            }}
          >
            {part.text}
          </Box>
        ) : (
          <span key={index}>{part.text}</span>
        )
      )}
    </Typography>
  );
}

function SearchModalContent({ open, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debouncedQuery] = useDebounce(query, 200);
  const navigate = useNavigate();

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      setError(null);
      return;
    }

    const search = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await callApi(`/search?q=${encodeURIComponent(debouncedQuery)}`);
        setResults(response.results);
      } catch (error: any) {
        console.error('Search failed:', error);
        if (error.message?.includes('404')) {
          setError('Search is not enabled. Set PROMPTFOO_ENABLE_UNIVERSAL_SEARCH=true');
        } else {
          setError('Search failed. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    search();
  }, [debouncedQuery]);

  const handleResultClick = (result: SearchResult) => {
    onClose();
    if (result.entityType === 'eval') {
      navigate(`/eval/${result.entityId}`);
    }
    // TODO: Add navigation for prompts and datasets when available
  };

  const handleClose = () => {
    setQuery('');
    setResults([]);
    setError(null);
    onClose();
  };

  const getEntityTypeColor = (type: string) => {
    switch (type) {
      case 'eval':
        return 'primary';
      case 'prompt':
        return 'secondary';
      case 'dataset':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: 'background.paper',
          backgroundImage: 'none',
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <TextField
            fullWidth
            placeholder="Search evaluations, prompts, results..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            variant="outlined"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: loading && (
                <InputAdornment position="end">
                  <CircularProgress size={20} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Box sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {error && (
            <Box sx={{ p: 2 }}>
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            </Box>
          )}

          {!error && results.length === 0 && debouncedQuery && !loading && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No results found for "{debouncedQuery}"
              </Typography>
            </Box>
          )}

          {!error && results.length > 0 && (
            <List disablePadding>
              {results.map((result, index) => (
                <ListItem
                  key={`${result.entityType}-${result.entityId}`}
                  button
                  onClick={() => handleResultClick(result)}
                  divider={index < results.length - 1}
                  sx={{
                    '&:hover': {
                      backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
                    },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" component="span">
                          {result.title}
                        </Typography>
                        <Chip
                          label={result.entityType}
                          size="small"
                          color={getEntityTypeColor(result.entityType)}
                        />
                      </Box>
                    }
                    secondary={
                      <HighlightedText
                        text={result.snippet}
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      />
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>

        {!error && !loading && !debouncedQuery && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Type to search across all evaluations, prompts, and results
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Press ESC to close
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function SearchModal(props: SearchModalProps) {
  return (
    <SearchErrorBoundary>
      <SearchModalContent {...props} />
    </SearchErrorBoundary>
  );
}
