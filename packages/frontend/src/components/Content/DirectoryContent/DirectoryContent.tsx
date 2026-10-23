import { Box, Center, Divider, Group, Loader, Title } from '@mantine/core';
import { IconFolder } from '@tabler/icons-react';
import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import useIsMobile from '../../../hooks/useIsMobile';
import { selectFilteredFileTree } from '../../../store/slices/fileTreeSlice';
import type { RootState } from '../../../store/store';
import ErrorView from '../../ErrorView';
import BreadCrumb from '../BreadCrumb';
import { FileTreeList } from './FileTreeList';

interface DirectoryContentProps {
  onFileSelect: (filePath: string) => void;
  onDirectorySelect: (directoryPath: string) => void;
}

const DirectoryContent: React.FC<DirectoryContentProps> = ({ onFileSelect, onDirectorySelect }) => {
  const { currentPath } = useSelector((state: RootState) => state.history);
  const { contentMode } = useSelector((state: RootState) => state.appSetting);
  const { fileTree: fullFileTree, loading, error, mountedDirectoryPath } = useSelector(
    (state: RootState) => state.fileTree,
  );
  const isMobile = useIsMobile();

  const fileTree = selectFilteredFileTree(fullFileTree, currentPath ?? '');
  const displayPath = currentPath || mountedDirectoryPath;

  const handleItemClick = useCallback((itemPath: string, isDirectory: boolean) => {
    if (isDirectory) {
      onDirectorySelect(itemPath);
    } else {
      onFileSelect(itemPath);
    }
  }, [onDirectorySelect, onFileSelect]);

  if (error) {
    return <ErrorView error={error} />;
  }

  return (
    <Box
      style={{
        width: contentMode === 'compact' && !isMobile ? 800 : '100%',
        minHeight: 'calc(100vh - var(--app-header-height))',
        margin: contentMode === 'compact' && !isMobile ? '0 auto' : 0,
        padding: isMobile ? 'var(--mantine-spacing-sm)' : 'var(--mantine-spacing-lg)',
        backgroundColor: 'var(--app-paper)',
      }}
    >
      <BreadCrumb onDirectorySelect={onDirectorySelect} />
      <Group gap="xs" mb="sm" wrap="nowrap" align="center">
        <IconFolder size={isMobile ? 24 : 32} color="var(--mantine-primary-color-filled)" />
        <Title
          order={isMobile ? 5 : 4}
          style={{ margin: 0, wordBreak: 'break-word' }}
        >
          {displayPath}
        </Title>
      </Group>
      <Divider mb="md" />
      {loading && (
        <Center h={200}>
          <Loader role="progressbar" />
        </Center>
      )}
      <Box mt="md">
        <FileTreeList fileTree={fileTree} handleItemClick={handleItemClick} />
      </Box>
    </Box>
  );
};

export default DirectoryContent;
