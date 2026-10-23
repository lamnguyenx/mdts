import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import DirectoryContent from './DirectoryContent/DirectoryContent';
import MarkdownContent from './MarkdownContent/MarkdownContent';
import { Box, ScrollArea } from '@mantine/core';
import { setScrollPosition } from '../../store/slices/contentSlice';

interface ContentProps {
  onFileSelect: (path: string) => void;
  onDirectorySelect: (path: string) => void;
  scrollToId: string | null;
}

const Content: React.FC<ContentProps> = ({ onFileSelect, onDirectorySelect, scrollToId }) => {
  const dispatch = useDispatch();
  const { currentPath, isDirectory } = useSelector((state: RootState) => state.history);
  const { scrollPosition, loading } = useSelector((state: RootState) => state.content);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    return () => {
      if (viewport) {
        dispatch(setScrollPosition(viewport.scrollTop));
      }
    };
  }, [dispatch]);

  useEffect(() => {
    if (!loading && viewportRef.current) {
      viewportRef.current.scrollTop = scrollPosition;
    }
  }, [loading, scrollPosition]);

  return (
    <Box style={{ flexGrow: 1, minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <ScrollArea
        viewportRef={viewportRef}
        type="hover"
        style={{ flexGrow: 1, minHeight: 0 }}
      >
        <Box w="100%" style={{ minWidth: 0 }}>
          {currentPath && isDirectory ? (
            <DirectoryContent onFileSelect={onFileSelect} onDirectorySelect={onDirectorySelect} />
          ) : (
            <MarkdownContent onDirectorySelect={onDirectorySelect} scrollToId={scrollToId} />
          )}
        </Box>
      </ScrollArea>
    </Box>
  );
};

export default Content;
