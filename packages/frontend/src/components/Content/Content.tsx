import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import DirectoryContent from './DirectoryContent/DirectoryContent';
import MarkdownContent from './MarkdownContent/MarkdownContent';
import { Box } from '@mantine/core';
import { setScrollPosition } from '../../store/slices/contentSlice';

interface ContentProps {
  onFileSelect: (path: string) => void;
  onDirectorySelect: (path: string) => void;
  scrollToId: string | null;
}

const Content: React.FC<ContentProps> = ({ onFileSelect, onDirectorySelect, scrollToId }) => {
  const dispatch = useDispatch();
  const { currentPath, isDirectory } = useSelector((state: RootState) => state.history);
  const { contentMode } = useSelector((state: RootState) => state.appSetting);
  const { scrollPosition, loading } = useSelector((state: RootState) => state.content);
  const scrollableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollableElement = scrollableRef.current;
    return () => {
      if (scrollableElement) {
        dispatch(setScrollPosition(scrollableElement.scrollTop));
      }
    };
  }, [dispatch]);

  useEffect(() => {
    if (!loading && scrollableRef.current) {
      scrollableRef.current.scrollTop = scrollPosition;
    }
  }, [loading, scrollPosition]);

  return (
    <Box
      style={{
        display: 'flex',
        height: 'calc(100vh - var(--app-header-height))',
        flexGrow: 1,
        minWidth: 0,
        justifyContent: 'center',
        backgroundColor: contentMode === 'full' ? 'var(--app-paper)' : undefined,
      }}
    >
      <Box
        ref={scrollableRef}
        className="custom-scrollbar"
        style={{
          overflowY: 'scroll',
          overflowX: 'auto',
          width: '100%',
          minWidth: 0,
        }}
      >
        {currentPath && isDirectory ? (
          <DirectoryContent onFileSelect={onFileSelect} onDirectorySelect={onDirectorySelect} />
        ) : (
          <MarkdownContent onDirectorySelect={onDirectorySelect} scrollToId={scrollToId} />
        )}
      </Box>
    </Box>
  );
};

export default Content;
