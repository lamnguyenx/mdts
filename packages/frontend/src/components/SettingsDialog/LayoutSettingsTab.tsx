import { Box, SegmentedControl, Switch, Text } from '@mantine/core';
import React, { useCallback } from 'react';

interface LayoutSettingsTabProps {
  contentMode: 'full' | 'compact';
  enableBreaks: boolean;
  handleToggleContentMode: (mode: 'full' | 'compact') => void;
  setEnableBreaks: (enable: boolean) => void;
}

const LayoutSettingsTab: React.FC<LayoutSettingsTabProps> = ({
  contentMode,
  enableBreaks,
  handleToggleContentMode,
  setEnableBreaks,
}) => {
  const handleChange = useCallback((value: string) => {
    handleToggleContentMode(value as 'full' | 'compact');
  }, [handleToggleContentMode]);

  const handleEnableBreaksChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setEnableBreaks(event.target.checked);
  }, [setEnableBreaks]);

  return (
    <Box p="xs">
      <Text size="sm" fw={600} mb="sm">Content Width</Text>
      <SegmentedControl
        value={contentMode}
        onChange={handleChange}
        aria-label="content width"
        fullWidth
        size="sm"
        mb="md"
        data={[
          { value: 'full', label: 'Full' },
          { value: 'compact', label: 'Compact' },
        ]}
      />

      <Text size="sm" fw={600} mb="xs">Markdown</Text>
      <Switch
        checked={enableBreaks}
        onChange={handleEnableBreaksChange}
        size="sm"
        label="Enable soft line breaks"
      />
      <Text size="xs" c="dimmed" mt={4}>
        Convert single line breaks to {'<br>'} elements
      </Text>
    </Box>
  );
};

export default LayoutSettingsTab;
