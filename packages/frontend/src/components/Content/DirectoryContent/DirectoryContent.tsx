import { Box, Center, Divider, Group, Loader, Paper, Title } from '@mantine/core';
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
  const isCard = contentMode === 'compact' && !isMobile;

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
          <IconFolder size={isMobile ? 24 : 32} color="var(--mantine-primary-color-filled)" />
          <Title order={isMobile ? 5 : 4} style={{ wordBreak: 'break-word' }}>
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
      </Paper>
    </Box>
  );
};

export default DirectoryContent;
