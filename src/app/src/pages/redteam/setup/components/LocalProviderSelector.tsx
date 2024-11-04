import React, { memo, useState } from 'react';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

interface LocalProviderSelectorProps {
  type: 'javascript' | 'python';
  value: string;
  onChange: (path: string) => void;
}

const LocalProviderSelector = memo(({ type, value, onChange }: LocalProviderSelectorProps) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const getDocLink = () => {
    return type === 'javascript'
      ? 'https://www.promptfoo.dev/docs/providers/custom-api/'
      : 'https://www.promptfoo.dev/docs/providers/python/';
  };

  const handleTest = async () => {
    if (!value.startsWith('file://')) {
      setTestResult({
        success: false,
        message: 'Path must start with file://',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // Mock API call - replace with real API call later
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Simulate success/failure based on file extension
      const hasCorrectExtension =
        type === 'javascript' ? value.endsWith('.js') : value.endsWith('.py');

      if (hasCorrectExtension) {
        setTestResult({
          success: true,
          message: `Successfully loaded ${type} provider`,
        });
      } else {
        setTestResult({
          success: false,
          message: `File must end with .${type === 'javascript' ? 'js' : 'py'}`,
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Failed to test provider: ' + (error as Error).message,
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
          onChange={(e) => onChange(e.target.value)}
          placeholder={`file://path/to/custom_provider.${type === 'javascript' ? 'js' : 'py'}`}
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

      {testResult?.success && (
        <Alert severity="success" sx={{ mt: 2 }}>
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
