import React from 'react';
import { generateOrderedYaml } from '../utils/yamlHelpers';

interface YamlPreviewProps {
  config: Record<string, any>;
}

const YamlPreview: React.FC<YamlPreviewProps> = ({ config }) => {
  // Ensure we're only passing serializable data
  const serializableConfig = {
    ...config,
    // Remove any known function properties or transform them
    onChange: undefined,
    onUpdateTarget: undefined,
    // Add any other function properties that need to be removed
  };

  const yamlContent = generateOrderedYaml(serializableConfig);

  return (
    <pre>
      <code>{yamlContent}</code>
    </pre>
  );
};

export default YamlPreview;
