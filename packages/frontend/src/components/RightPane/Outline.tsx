import { Box } from '@mantine/core';
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

  return (
    <Box
      py="xs"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}
    >
      <OutlineHeader isOpen={isMobile || isOpen} onToggle={onToggle} />
      {(isMobile || isOpen) && (
        <OutlineContent
          outline={outline}
          loading={loading}
          error={error}
          onItemClick={isMobile ? handleItemClickWithClose : onItemClick}
        />
      )}
    </Box>
  );
};

export default Outline;
