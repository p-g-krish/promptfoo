import React, { memo, useState, useEffect } from 'react';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { callApi } from '@app/utils/api';

interface LocalProviderSelectorProps {
  type: 'javascript' | 'python';
  value: string;
  onChange: (path: string) => void;
  onUpdateTarget: (targetConfig: { id: string; config: Record<string, any> }) => void;
}

const LocalProviderSelector = memo(({ type, value, onChange, onUpdateTarget }: LocalProviderSelectorProps) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const config = {
      id: `file://${value}`,
      config: {
        type,
        path: value,
      },
    };
    onUpdateTarget(config);
  }, [value, type, onUpdateTarget]);

  const handlePathChange = (newPath: string) => {
    const cleanPath = newPath.startsWith('file://') ? newPath.slice(7) : newPath;
    onChange(cleanPath);
  };

  const getDocLink = () => {
    return type === 'javascript'
      ? 'https://www.promptfoo.dev/docs/providers/custom-api/'
      : 'https://www.promptfoo.dev/docs/providers/python/';
  };

  const handleTest = async () => {
    if (!value) {
      setTestResult({
        success: false,
        message: 'Please enter a provider path',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await callApi('/redteam/test-provider', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          path: value.startsWith('file://') ? value : `file://${value}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to test provider');
      }

      const data = await response.json();
      setTestResult({
        success: data.success,
        message: data.message,
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: (error as Error).message || 'Failed to test provider',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Box display="flex" gap={2} alignItems="flex-start">
        <TextField
          fullWidth
          label="Provider Path"
          value={value}
          onChange={(e) => handlePathChange(e.target.value)}
          placeholder={`path/to/custom_provider.${type === 'javascript' ? 'js' : 'py'}`}
          error={testResult?.success === false}
          helperText={testResult?.success === false ? testResult.message : undefined}
        />
        <Button
          variant="outlined"
          onClick={handleTest}
          disabled={!value || testing}
          startIcon={testing ? <CircularProgress size={20} /> : <PlayArrowIcon />}
          sx={{ minWidth: '100px', height: '56px' }}
        >
          {testing ? 'Testing...' : 'Test'}
        </Button>
      </Box>

      {testResult && (
        <Alert severity={testResult.success ? 'success' : 'error'} sx={{ mt: 2 }}>
          {testResult.message}
        </Alert>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        Learn how to set up a custom {type === 'javascript' ? 'JavaScript' : 'Python'} provider{' '}
        <Link href={getDocLink()} target="_blank" rel="noopener">
          here
        </Link>
        .
      </Typography>
    </Box>
  );
});

LocalProviderSelector.displayName = 'LocalProviderSelector';

export default LocalProviderSelector;
