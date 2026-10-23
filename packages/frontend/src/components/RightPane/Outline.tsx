import { Box, Drawer } from '@mantine/core';
import React, { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import useIsMobile from '../../hooks/useIsMobile';
import { fetchOutline } from '../../store/slices/outlineSlice';
import type { AppDispatch, RootState } from '../../store/store';
import OutlineContent from './OutlineContent/OutlineContent';
import OutlineHeader from './OutlineHeader';

interface OutlineProps {
  filePath: string | null;
  onItemClick: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const Outline: React.FC<OutlineProps> = ({ filePath, onItemClick, isOpen, onToggle }) => {
  const dispatch = useDispatch<AppDispatch>();
  const isMobile = useIsMobile();
  const { outline, loading, error } = useSelector((state: RootState) => state.outline);

  useEffect(() => {
    const request = dispatch(fetchOutline(filePath));
    return () => {
      request.abort();
    };
  }, [dispatch, filePath]);

  const handleItemClickWithClose = useCallback((id: string) => {
    onItemClick(id);
    if (isMobile) onToggle();
  }, [onItemClick, isMobile, onToggle]);

  const panelContent = (
    <>
      <OutlineHeader isOpen={isMobile ? true : isOpen} onToggle={onToggle} />
      {(isMobile || isOpen) && (
        <OutlineContent
          outline={outline}
          loading={loading}
          error={error}
          onItemClick={isMobile ? handleItemClickWithClose : onItemClick}
        />
      )}
    </>
  );

  if (isMobile) {
    return (
      <Drawer
        opened={isOpen}
        onClose={onToggle}
        position="right"
        size={260}
        withCloseButton={false}
        keepMounted
        padding="sm"
        styles={{
          content: {
            backgroundColor: 'var(--app-paper)',
            borderLeft: '1px solid var(--mantine-color-default-border)',
          },
        }}
      >
        {panelContent}
      </Drawer>
    );
  }

  return (
    <Box
      style={{
        width: isOpen ? 260 : 56,
        paddingTop: 'var(--mantine-spacing-xs)',
        paddingBottom: 'var(--mantine-spacing-xs)',
        backgroundColor: 'var(--app-paper)',
        borderLeft: '1px solid var(--mantine-color-default-border)',
        minHeight: '100%',
        flexShrink: 0,
      }}
    >
      {panelContent}
    </Box>
  );
};

export default Outline;
