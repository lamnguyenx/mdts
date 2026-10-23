import React from 'react';
import { ActionIcon, Box, TextInput } from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';

interface FileTreeSearchProps {
  searchQuery: string;
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearSearch: () => void;
}

const FileTreeSearch: React.FC<FileTreeSearchProps> = ({ searchQuery, onSearchChange, onClearSearch }) => {
  return (
    <Box mb="xs" px="sm">
      <TextInput
        placeholder="Search files..."
        aria-label="search files"
        size="xs"
        value={searchQuery}
        onChange={onSearchChange}
        leftSection={<IconSearch size={14} />}
        leftSectionWidth={30}
        rightSection={searchQuery ? (
          <ActionIcon
            onClick={onClearSearch}
            size="xs"
            variant="subtle"
            color="gray"
            aria-label="clear search"
          >
            <IconX size={12} />
          </ActionIcon>
        ) : undefined}
        rightSectionWidth={30}
      />
    </Box>
  );
};

export default FileTreeSearch;
