import { Stack, Text, UnstyledButton } from '@mantine/core';
import { IconFileText, IconFolder } from '@tabler/icons-react';
import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { FileTreeItem } from '../../../store/slices/fileTreeSlice';
import type { RootState } from '../../../store/store';

export interface FileTreeListProps {
  fileTree: (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[];
  handleItemClick: (itemPath: string, isDirectory: boolean) => void;
}

export const FileTreeList: React.FC<FileTreeListProps> = ({ fileTree, handleItemClick }) => {
  return (
    <Stack gap={0}>
      {fileTree.map((item, index) => (
        <FileTreeListItem key={index} item={item} handleItemClick={handleItemClick} />
      ))}
    </Stack>
  );
};

interface FileTreeListItemProps {
  item: FileTreeItem | { [key: string]: (FileTreeItem | object)[] };
  handleItemClick: (itemPath: string, isDirectory: boolean) => void;
}

const FileTreeListItem: React.FC<FileTreeListItemProps> = ({ item, handleItemClick }) => {
  const { currentPath } = useSelector((state: RootState) => state.history);

  const isDirectory = !('path' in item);
  const name = isDirectory ? Object.keys(item)[0] : (item as FileTreeItem).path.split('/').pop() ?? '';
  const itemPath = currentPath === '' ? name : `${currentPath}/${name}`;

  const handleClick = useCallback(() => {
    handleItemClick(itemPath, isDirectory);
  }, [handleItemClick, itemPath, isDirectory]);

  return (
    <UnstyledButton
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--mantine-spacing-xs)',
        padding: '4px 8px',
        borderRadius: 'var(--mantine-radius-sm)',
      }}
    >
      {isDirectory ? (
        <IconFolder size={20} color="var(--mantine-primary-color-filled)" />
      ) : (
        <IconFileText size={20} />
      )}
      <Text size="sm">{name}</Text>
    </UnstyledButton>
  );
};
