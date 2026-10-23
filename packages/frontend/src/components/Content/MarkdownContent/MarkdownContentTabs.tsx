import { Tabs } from '@mantine/core';
import React, { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ViewMode } from '../../../hooks/useViewMode';

interface MarkdownContentTabsProps {
  viewMode: ViewMode;
  hasFrontmatter: boolean;
}

const MarkdownContentTabs: React.FC<MarkdownContentTabsProps> = ({ viewMode, hasFrontmatter }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const handleChange = useCallback((newValue: string | null) => {
    if (!newValue) return;
    searchParams.set('tab', newValue);
    setSearchParams(searchParams);
  }, [searchParams, setSearchParams]);

  const handleClick = useCallback(() => {
    handleChange('preview');
  }, [handleChange]);

  return (
    <Tabs
      value={viewMode}
      onChange={handleChange}
      variant="default"
      mb="md"
      aria-label="view mode tabs"
    >
      <Tabs.List style={{ flexWrap: 'nowrap', overflowX: 'auto' }}>
        <Tabs.Tab value="preview" onClick={handleClick}>Preview</Tabs.Tab>
        {hasFrontmatter && <Tabs.Tab value="frontmatter">Frontmatter</Tabs.Tab>}
        <Tabs.Tab value="raw">Raw</Tabs.Tab>
      </Tabs.List>
    </Tabs>
  );
};

export default MarkdownContentTabs;
