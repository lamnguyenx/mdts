import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';

interface BrowseEntry {
  name: string;
  path: string;
}

interface BrowseResponse {
  path: string;
  parent: string | null;
  directories: BrowseEntry[];
  home: string;
}

interface FolderPickerDialogProps {
  open: boolean;
  initialPath?: string;
  onClose: () => void;
  onOpen: (path: string) => void;
}

interface DirectoryRowProps {
  directory: BrowseEntry;
  onSelect: (path: string) => void;
}

const DirectoryRow: React.FC<DirectoryRowProps> = ({ directory, onSelect }) => {
  const handleClick = useCallback(() => onSelect(directory.path), [directory.path, onSelect]);

  return (
    <ListItemButton onClick={handleClick}>
      <ListItemIcon sx={{ minWidth: 40 }}>
        <FolderOutlinedIcon color="primary" fontSize="small" />
      </ListItemIcon>
      <ListItemText
        primary={directory.name}
        slotProps={{ primary: { noWrap: true } }}
      />
    </ListItemButton>
  );
};

const FolderPickerDialog: React.FC<FolderPickerDialogProps> = ({
  open,
  initialPath,
  onClose,
  onOpen,
}) => {
  const [currentPath, setCurrentPath] = useState('');
  const [pathInput, setPathInput] = useState('');
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [directories, setDirectories] = useState<BrowseEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const browse = useCallback(async (targetPath?: string) => {
    setLoading(true);
    setError(null);

    try {
      const query = targetPath ? `?path=${encodeURIComponent(targetPath)}` : '';
      const response = await fetch(`/api/folders/browse${query}`);

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || `Unable to open folder (${response.status})`);
      }

      const data = await response.json() as BrowseResponse;
      setCurrentPath(data.path);
      setPathInput(data.path);
      setParentPath(data.parent);
      setDirectories(data.directories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to browse folders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    browse(initialPath);
  }, [open, initialPath, browse]);

  const handleGo = useCallback(() => {
    if (pathInput.trim()) {
      browse(pathInput.trim());
    }
  }, [browse, pathInput]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleGo();
    }
  }, [handleGo]);

  const handlePathInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setPathInput(event.target.value);
  }, []);

  const handleParentClick = useCallback(() => {
    if (parentPath) browse(parentPath);
  }, [browse, parentPath]);

  const handleDirectorySelect = useCallback((directoryPath: string) => {
    browse(directoryPath);
  }, [browse]);

  const handleOpenCurrent = useCallback(() => {
    if (currentPath) onOpen(currentPath);
  }, [currentPath, onOpen]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 1 }}>
        Open a folder
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Pick any folder on this machine. It opens in its own workspace tab.
        </Typography>
      </DialogTitle>

      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          size="small"
          label="Folder path"
          value={pathInput}
          onChange={handlePathInputChange}
          onKeyDown={handleKeyDown}
          placeholder="/home/you/project"
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <Button size="small" onClick={handleGo} disabled={loading}>
                    Go
                  </Button>
                </InputAdornment>
              ),
            },
          }}
          sx={{ mt: 1 }}
        />

        <Typography
          variant="caption"
          color={error ? 'error.main' : 'text.secondary'}
          sx={{ display: 'block', mt: 1.5, minHeight: '1.2em', wordBreak: 'break-all' }}
        >
          {error || currentPath}
        </Typography>

        <Box
          sx={{
            mt: 1,
            height: 300,
            overflowY: 'auto',
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            position: 'relative',
          }}
        >
          {loading && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.paper',
                opacity: 0.75,
                zIndex: 1,
              }}
            >
              <CircularProgress size={26} />
            </Box>
          )}

          <List dense disablePadding>
            {parentPath && (
              <ListItemButton onClick={handleParentClick}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <ArrowUpwardIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary=".." secondary="Parent folder" />
              </ListItemButton>
            )}

            {!loading && directories.length === 0 && (
              <Box sx={{ px: 2, py: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No subfolders here.
                </Typography>
              </Box>
            )}

            {directories.map((directory) => (
              <DirectoryRow
                key={directory.path}
                directory={directory}
                onSelect={handleDirectorySelect}
              />
            ))}
          </List>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          startIcon={<FolderOpenIcon />}
          disabled={!currentPath || loading}
          onClick={handleOpenCurrent}
        >
          Open this folder
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FolderPickerDialog;
