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
  if (!isOpen) {
    return (
      <Group justify="center" mb="xs">
        <Tooltip label="Expand file tree" position="right">
          <ActionIcon onClick={onToggle} size="sm" variant="subtle" color="gray" aria-label="toggle file tree">
            <IconChevronRight size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
    );
  }

  return (
    <Box mb="xs" px="sm">
      <Group gap={4} wrap="nowrap" justify="space-between">
        <Text fw={600} pl="xs" style={{ flex: 1 }}>
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
        <Tooltip label="Collapse file tree">
          <ActionIcon onClick={onToggle} size="sm" variant="subtle" color="gray" aria-label="toggle file tree">
            <IconChevronLeft size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Box>
  );
};

export default FileTreeHeader;
