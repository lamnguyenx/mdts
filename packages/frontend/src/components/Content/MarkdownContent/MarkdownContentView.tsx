import { Box, Center, Loader, Stack, Text } from '@mantine/core';
import React from 'react';
import { useSelector } from 'react-redux';
import type { ViewMode } from '../../../hooks/useViewMode';
import type { RootState } from '../../../store/store';
import MarkdownRenderer from './MarkdownRenderer/MarkdownRenderer';

interface MarkdownContentViewProps {
  loading: boolean;
  viewMode: ViewMode;
  content: string | null;
  markdownContent: string;
  frontmatter: Record<string, unknown>;
}

const LoadingView: React.FC = () => (
  <Center h={200}>
    <Loader role="progressbar" />
  </Center>
);

const MarkdownContentView: React.FC<MarkdownContentViewProps> = (
  { loading, viewMode, markdownContent, frontmatter, content }
) => {
  const { currentPath } = useSelector((state: RootState) => state.history);
  const { enableBreaks } = useSelector((state: RootState) => state.config);

  if (loading) {
    return <LoadingView />;
  }

  switch (viewMode) {
    case 'preview':
      return <MarkdownRenderer content={markdownContent} selectedFilePath={currentPath} enableBreaks={enableBreaks} />;
    case 'frontmatter':
      return (
        <Box my="xl">
          <Stack gap="xs">
            {Object.entries(frontmatter).map(([key, value]) => (
              <Box key={key}>
                <Text fw={600} size="sm">{key}</Text>
                <Text size="sm" c="dimmed">{String(value)}</Text>
              </Box>
            ))}
          </Stack>
        </Box>
      );
    case 'raw':
      return (
        <MarkdownRenderer content={['`````markdown', content, '``````'].join('\n')} selectedFilePath={currentPath} enableBreaks={enableBreaks} />
      );
    default:
      return null;
  }
};

export default MarkdownContentView;
