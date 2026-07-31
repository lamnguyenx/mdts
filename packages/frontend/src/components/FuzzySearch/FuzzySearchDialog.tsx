import SearchIcon from '@mui/icons-material/Search';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import {
  Box,
  Dialog,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { filterAndSort, FuzzyMatchResult } from './fuzzy';
import { useFileList } from './useFileList';

interface FuzzySearchDialogProps {
  open: boolean;
  onClose: () => void;
}

function highlightPath(path: string, positions: number[]): React.ReactNode {
  if (positions.length === 0) return path;

  const elements: React.ReactNode[] = [];
  let lastPos = -1;
  const sorted = [...positions].sort((a, b) => a - b);

  for (const pos of sorted) {
    if (pos > lastPos + 1) {
      elements.push(path.slice(lastPos + 1, pos));
    }
    elements.push(
      <Box component="mark" key={pos} sx={{ color: 'primary.main', bgcolor: 'transparent', fontWeight: 'bold' }}>
        {path[pos]}
      </Box>
    );
    lastPos = pos;
  }

  if (lastPos + 1 < path.length) {
    elements.push(path.slice(lastPos + 1));
  }

  return <>{elements}</>;
}

interface ResultItemProps {
  path: string;
  match: FuzzyMatchResult;
  selected: boolean;
  index: number;
  onSelect: (index: number) => void;
  onMouseEnter: (index: number) => void;
}

const ResultItemInner: React.FC<ResultItemProps> = ({
  path,
  match,
  selected,
  index,
  onSelect,
  onMouseEnter,
}) => {
  const handleClick = useCallback(() => {
    onSelect(index);
  }, [onSelect, index]);

  const handleMouseEnter = useCallback(() => {
    onMouseEnter(index);
  }, [onMouseEnter, index]);

  return (
    <ListItemButton
      selected={selected}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      sx={{ py: 0.75 }}
    >
      <ListItemIcon sx={{ minWidth: 36 }}>
        <InsertDriveFileOutlinedIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText
        primary={highlightPath(path, match.positions)}
        primaryTypographyProps={{
          fontSize: '0.875rem',
          fontFamily: 'monospace',
          noWrap: true,
        }}
      />
    </ListItemButton>
  );
};

const ResultItem = React.memo(ResultItemInner);

const FuzzySearchDialog: React.FC<FuzzySearchDialogProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const fileList = useFileList();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const results: { path: string; match: FuzzyMatchResult }[] = useMemo(
    () => filterAndSort(query, fileList),
    [query, fileList]
  );

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  const navigateToSelected = useCallback(() => {
    if (results.length > 0 && selectedIndex < results.length) {
      onClose();
      navigate(`/${results[selectedIndex].path}`);
    }
  }, [results, selectedIndex, navigate, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          navigateToSelected();
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [results.length, navigateToSelected, onClose]
  );

  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.querySelector('[aria-selected="true"]');
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleResultSelect = useCallback(
    (index: number) => {
      if (results.length > 0 && index < results.length) {
        onClose();
        navigate(`/${results[index].path}`);
      }
    },
    [results, navigate, onClose]
  );

  const handleResultMouseEnter = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{
        '& .MuiDialog-container': {
          alignItems: 'flex-start',
          pt: '16vh',
        },
      }}
      slotProps={{
        backdrop: {
          sx: { backgroundColor: 'rgba(0, 0, 0, 0.5)' },
        },
        paper: {
          sx: {
            borderRadius: 2,
            maxHeight: '60vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      <Box sx={{ p: 2, pb: 1 }}>
        <TextField
          inputRef={inputRef}
          fullWidth
          placeholder="Search files..."
          value={query}
          onChange={handleQueryChange}
          onKeyDown={handleKeyDown}
          variant="outlined"
          size="small"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              sx: { fontSize: '0.95rem' },
            },
          }}
        />
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
        {results.length === 0 ? (
          <Box sx={{ px: 3, py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {fileList.length === 0 ? 'No files available' : 'No matching files'}
            </Typography>
          </Box>
        ) : (
          <List ref={listRef} dense disablePadding>
            {results.map((item, index) => (
              <ResultItem
                key={item.path}
                path={item.path}
                match={item.match}
                selected={index === selectedIndex}
                index={index}
                onSelect={handleResultSelect}
                onMouseEnter={handleResultMouseEnter}
              />
            ))}
          </List>
        )}
      </Box>

      <Box
        sx={{
          px: 2,
          py: 1,
          borderTop: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          {results.length} of {fileList.length} files
        </Typography>
        <Typography variant="caption" color="text.secondary">
          <Box component="span" sx={{ mx: 0.5, px: 0.5, py: 0.25, border: '1px solid', borderColor: 'divider', borderRadius: 0.5, fontSize: '0.7rem' }}>↑↓</Box>
          navigate
          <Box component="span" sx={{ mx: 0.5, px: 0.5, py: 0.25, border: '1px solid', borderColor: 'divider', borderRadius: 0.5, fontSize: '0.7rem' }}>enter</Box>
          open
          <Box component="span" sx={{ mx: 0.5, px: 0.5, py: 0.25, border: '1px solid', borderColor: 'divider', borderRadius: 0.5, fontSize: '0.7rem' }}>esc</Box>
          close
        </Typography>
      </Box>
    </Dialog>
  );
};

export default FuzzySearchDialog;
