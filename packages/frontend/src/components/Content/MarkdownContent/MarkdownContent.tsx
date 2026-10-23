import { Badge, Box, Group, Paper, Title } from '@mantine/core';
import { IconFileText } from '@tabler/icons-react';
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFrontmatter } from '../../../hooks/useFrontmatter';
import useIsMobile from '../../../hooks/useIsMobile';
import { useViewMode } from '../../../hooks/useViewMode';
import { fetchContent } from '../../../store/slices/contentSlice';
import type { AppDispatch, RootState } from '../../../store/store';
import ErrorView from '../../ErrorView';
import BreadCrumb from '../BreadCrumb';
import MarkdownContentTabs from './MarkdownContentTabs';
import MarkdownContentView from './MarkdownContentView';

interface MarkdownContentProps {
  scrollToId: string | null;
  onDirectorySelect?: (directoryPath: string) => void;
}

const MarkdownContent: React.FC<MarkdownContentProps> = ({ scrollToId, onDirectorySelect }) => {
  const dispatch = useDispatch<AppDispatch>();

  const { currentPath } = useSelector((state: RootState) => state.history);
  const { contentMode } = useSelector((state: RootState) => state.appSetting);
  const { content, loading: contentLoading, error } = useSelector((state: RootState) => state.content);
  const { loading: fileTreeLoading } = useSelector((state: RootState) => state.fileTree);
  const { fontFamily } = useSelector((state: RootState) => state.config);

  const { frontmatter, markdownContent } = useFrontmatter(content);
  const viewMode = useViewMode();
  const isMobile = useIsMobile();
  const loading = contentLoading || fileTreeLoading;
  const isCard = contentMode === 'compact' && !isMobile;

  useEffect(() => {
    const request = dispatch(fetchContent(currentPath));
    return () => {
      request.abort();
    };
  }, [dispatch, currentPath]);

  useEffect(() => {
    if (scrollToId) {
      const element = document.getElementById(scrollToId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [scrollToId, content]);

  const displayFileName = frontmatter.title
    ? String(frontmatter.title)
    : currentPath
      ? currentPath.split('/').pop()
      : loading
        ? ''
        : '🎉 Welcome to mdts!';

  const hasFrontmatter = Object.keys(frontmatter).length > 0;

  if (error) {
    return <ErrorView error={error} />;
  }

  return (
    <Box maw={isCard ? 800 : '100%'} mx="auto" w="100%" px={isMobile ? 'sm' : 'lg'} py="lg">
      <BreadCrumb onDirectorySelect={onDirectorySelect} />
      <Paper
        shadow={isCard ? 'sm' : undefined}
        radius={isCard ? 'md' : 0}
        withBorder={isCard}
        p={isMobile ? 'sm' : 'xl'}
        bg={isCard ? 'var(--mantine-color-default)' : 'transparent'}
      >
        <Group gap="xs" mb="sm" wrap="nowrap" align="center">
          <IconFileText size={isMobile ? 24 : 32} />
          <Title order={isMobile ? 5 : 4} style={{ wordBreak: 'break-word' }}>
            {displayFileName}
          </Title>
        </Group>
        {Array.isArray(frontmatter.tags) && frontmatter.tags.length > 0 && (
          <Group gap={4} mb="xs">
            {frontmatter.tags.map((tag) => (
              <Badge key={String(tag)} size="sm" variant="light" tt="none">{String(tag)}</Badge>
            ))}
          </Group>
        )}
        {Array.isArray(frontmatter.categories) && frontmatter.categories.length > 0 && (
          <Group gap={4} mb="xs">
            {frontmatter.categories.map((category) => (
              <Badge key={String(category)} size="sm" variant="outline" tt="none">{String(category)}</Badge>
            ))}
          </Group>
        )}
        <MarkdownContentTabs viewMode={viewMode} hasFrontmatter={hasFrontmatter} />
        <Box style={{ fontFamily }}>
          <MarkdownContentView
            loading={loading}
            viewMode={viewMode}
            content={content}
            frontmatter={frontmatter}
            markdownContent={markdownContent}
          />
        </Box>
      </Paper>
    </Box>
  );
};

export default MarkdownContent;
