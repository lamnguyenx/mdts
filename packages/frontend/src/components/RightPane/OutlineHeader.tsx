import { ActionIcon, Group, Text, Tooltip } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import React from 'react';

interface OutlineHeaderProps {
  isOpen: boolean;
  onToggle: () => void;
}

const OutlineHeader: React.FC<OutlineHeaderProps> = ({ isOpen, onToggle }) => {
  if (!isOpen) {
    return (
      <Group justify="center" mb="xs">
        <Tooltip label="Expand outline" position="left">
          <ActionIcon onClick={onToggle} size="sm" variant="subtle" color="gray" aria-label="toggle outline">
            <IconChevronLeft size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
    );
  }

  return (
    <Group gap="xs" mb="xs" px="sm" justify="space-between" wrap="nowrap">
      <Text fw={600} pl="xs" style={{ flex: 1 }}>
        Outline
      </Text>
      <Tooltip label="Collapse outline">
        <ActionIcon onClick={onToggle} size="sm" variant="subtle" color="gray" aria-label="toggle outline">
          <IconChevronRight size={16} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
};

export default OutlineHeader;
