import { Text, UnstyledButton } from '@mantine/core';
import React, { useCallback } from 'react';
import type { OutlineItem } from './types';

interface OutlineListItemProps {
  item: OutlineItem;
  onItemClick: (id: string) => void;
}

export const OutlineListItem: React.FC<OutlineListItemProps> = ({ item, onItemClick }) => {
  const handleClick = useCallback(() => {
    onItemClick(item.id);
  }, [onItemClick, item.id]);

  return (
    <UnstyledButton
      onClick={handleClick}
      style={{
        paddingLeft: `${item.level * 16}px`,
        paddingRight: 'var(--mantine-spacing-sm)',
        paddingTop: 2,
        paddingBottom: 2,
        borderRadius: 'var(--mantine-radius-sm)',
        width: '100%',
      }}
    >
      <Text size="sm" truncate>{item.content}</Text>
    </UnstyledButton>
  );
};
