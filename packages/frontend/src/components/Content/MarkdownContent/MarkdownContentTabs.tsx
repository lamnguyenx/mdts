import { Box, Tabs } from '@mantine/core';
import React, { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import useIsMobile from '../../../hooks/useIsMobile';
import type { ViewMode } from '../../../hooks/useViewMode';

interface MarkdownContentTabsProps {
  viewMode: ViewMode;
  hasFrontmatter: boolean;
}

const MarkdownContentTabs: React.FC<MarkdownContentTabsProps> = ({ viewMode, hasFrontmatter }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();

  const handleChange = useCallback((newValue: string | null) => {
    if (!newValue) return;
    searchParams.set('tab', newValue);
    setSearchParams(searchParams);
  }, [searchParams, setSearchParams]);

  const handleClick = useCallback(() => {
    handleChange('preview');
  }, [handleChange]);

  return (
    <Box
      style={{
        marginLeft: isMobile ? -12 : -24,
        marginRight: isMobile ? -12 : -24,
        paddingLeft: isMobile ? 4 : 16,
        borderBottom: '1px solid var(--mantine-color-default-border)',
      }}
    >
      <Tabs
        value={viewMode}
        onChange={handleChange}
        variant="default"
        aria-label="view mode tabs"
      >
        <Tabs.List style={{ flexWrap: 'nowrap', overflowX: 'auto' }}>
          <Tabs.Tab value="preview" onClick={handleClick}>Preview</Tabs.Tab>
          {hasFrontmatter && <Tabs.Tab value="frontmatter">Frontmatter</Tabs.Tab>}
          <Tabs.Tab value="raw">Raw</Tabs.Tab>
        </Tabs.List>
      </Tabs>
    </Box>
  );
};

export default MarkdownContentTabs;
