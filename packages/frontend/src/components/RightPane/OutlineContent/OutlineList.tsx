import { ScrollArea, Stack } from '@mantine/core';
import React from 'react';
import { OutlineListItem } from './OutlineListItem';
import type { OutlineItem } from './types';

interface OutlineListProps {
  outline: OutlineItem[];
  onItemClick: (id: string) => void;
}

export const OutlineList: React.FC<OutlineListProps> = ({ outline, onItemClick }) => (
  <ScrollArea
    type="auto"
    className="custom-scrollbar"
    style={{ height: 'calc(100vh - 108px)' }}
    px="sm"
  >
    <Stack gap={0}>
      {outline.map((item) => (
        <OutlineListItem key={item.id} item={item} onItemClick={onItemClick} />
      ))}
    </Stack>
  </ScrollArea>
);
