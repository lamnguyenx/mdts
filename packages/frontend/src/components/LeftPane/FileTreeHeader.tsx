import { ActionIcon, Box, Group, Text, Tooltip } from '@mantine/core';
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsDown,
  IconChevronsUp,
} from '@tabler/icons-react';
import React from 'react';

interface FileTreeHeaderProps {
  isOpen: boolean;
  onToggle: () => void;
  onExpandAllClick: () => void;
  onCollapseAll: () => void;
}

const FileTreeHeader: React.FC<FileTreeHeaderProps> = ({ isOpen, onToggle, onExpandAllClick, onCollapseAll }) => {
  return (
    <Box
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 30,
        marginBottom: 'var(--mantine-spacing-xs)',
        paddingLeft: isOpen ? 'var(--mantine-spacing-sm)' : 4,
        paddingRight: isOpen ? 'var(--mantine-spacing-sm)' : 4,
      }}
    >
      {isOpen && (
        <Group gap={4} style={{ flex: 1 }} wrap="nowrap">
          <Text fw={600} style={{ flex: 1, marginLeft: 'var(--mantine-spacing-xs)' }}>
            File Tree
          </Text>
          <Tooltip label="Expand all">
            <ActionIcon onClick={onExpandAllClick} size="sm" variant="subtle" color="gray" aria-label="expand all">
              <IconChevronsDown size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Collapse all">
            <ActionIcon onClick={onCollapseAll} size="sm" variant="subtle" color="gray" aria-label="collapse all">
              <IconChevronsUp size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      )}
      <ActionIcon
        onClick={onToggle}
        size="sm"
        variant="subtle"
        color="gray"
        aria-label="toggle file tree"
        style={{ marginLeft: isOpen ? 0 : 12 }}
      >
        {isOpen ? <IconChevronLeft size={16} /> : <IconChevronRight size={16} />}
      </ActionIcon>
    </Box>
  );
};

export default FileTreeHeader;
