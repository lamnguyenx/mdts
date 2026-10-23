import { ScrollArea, Stack } from '@mantine/core';
import React from 'react';
import { OutlineListItem } from './OutlineListItem';
import type { OutlineItem } from './types';

interface OutlineListProps {
  outline: OutlineItem[];
  onItemClick: (id: string) => void;
}

export const OutlineList: React.FC<OutlineListProps> = ({ outline, onItemClick }) => (
  <ScrollArea type="hover" px="sm" pb="sm" style={{ flexGrow: 1, minHeight: 0 }}>
    <Stack gap={0}>
      {outline.map((item) => (
        <OutlineListItem key={item.id} item={item} onItemClick={onItemClick} />
      ))}
    </Stack>
  </ScrollArea>
);
