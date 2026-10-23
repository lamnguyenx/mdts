import { ActionIcon, Box, Group, Text } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import React from 'react';

interface OutlineHeaderProps {
  isOpen: boolean;
  onToggle: () => void;
}

const OutlineHeader: React.FC<OutlineHeaderProps> = ({ isOpen, onToggle }) => {
  return (
    <Box
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center',
        height: 30,
        marginBottom: 'var(--mantine-spacing-xs)',
        paddingLeft: isOpen ? 'var(--mantine-spacing-sm)' : 4,
        paddingRight: isOpen ? 'var(--mantine-spacing-sm)' : 4,
      }}
    >
      <ActionIcon
        onClick={onToggle}
        size="sm"
        variant="subtle"
        color="gray"
        aria-label="toggle outline"
        style={{ marginLeft: isOpen ? 0 : 12 }}
      >
        {isOpen ? <IconChevronRight size={16} /> : <IconChevronLeft size={16} />}
      </ActionIcon>
      {isOpen && (
        <Group gap="xs" style={{ marginLeft: 'var(--mantine-spacing-xs)' }}>
          <Text fw={600}>Outline</Text>
        </Group>
      )}
    </Box>
  );
};

export default OutlineHeader;
