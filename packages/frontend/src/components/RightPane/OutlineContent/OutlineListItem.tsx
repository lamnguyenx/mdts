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
      ps={item.level * 16}
      pe="sm"
      py={2}
      bdrs="sm"
      w="100%"
    >
      <Text size="sm" truncate>{item.content}</Text>
    </UnstyledButton>
  );
};
