import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import GitHubIcon from '@mui/icons-material/GitHub';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  CssBaseline,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  ThemeProvider,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { fetchData } from '../../api';
import { useTheme } from '../../hooks/useTheme';
import Logo from '../Logo';
import { fetchConfig } from '../../store/slices/configSlice';
import { AppDispatch } from '../../store/store';
import FolderPickerDialog from './FolderPickerDialog';

interface RecentFolder {
  path: string;
  name: string;
  openedAt: string;
  exists: boolean;
}

interface RecentFoldersResponse {
  recent: RecentFolder[];
}

interface ServerInfo {
  daemon: boolean;
  defaultFolder: string | null;
  home: string;
}

interface RecentFolderItemProps {
  folder: RecentFolder;
  onOpen: (path: string) => void;
  onRemove: (path: string) => void;
}

const RecentFolderItem: React.FC<RecentFolderItemProps> = ({ folder, onOpen, onRemove }) => {
  const handleOpen = useCallback(() => onOpen(folder.path), [onOpen, folder.path]);
  const handleRemove = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onRemove(folder.path);
  }, [onRemove, folder.path]);

  return (
    <ListItemButton onClick={handleOpen} sx={{ py: 1.8, pr: 1 }}>
      <ListItemIcon sx={{ minWidth: 46 }}>
        <FolderOutlinedIcon color={folder.exists ? 'primary' : 'disabled'} />
      </ListItemIcon>
      <ListItemText
        primary={folder.name}
        secondary={folder.path}
        slotProps={{
          primary: { noWrap: true, sx: { fontWeight: 600 } },
          secondary: {
            noWrap: true,
            sx: { fontFamily: 'monospace', fontSize: '0.78rem' },
          },
        }}
      />
      {!folder.exists && (
        <Chip size="small" color="warning" label="Missing" sx={{ mr: 1 }} />
      )}
      <Tooltip title="Remove from recent">
        <IconButton
          edge="end"
          aria-label={`Remove ${folder.name} from recent folders`}
          onClick={handleRemove}
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </ListItemButton>
  );
};

const Dashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const theme = useTheme();
  const [recentFolders, setRecentFolders] = useState<RecentFolder[]>([]);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);

  const loadRecentFolders = useCallback(async () => {
    try {
      const data = await fetchData<RecentFoldersResponse>('/api/folders/recent', 'json');
      setRecentFolders(data?.recent ?? []);
    } catch {
      setRecentFolders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    dispatch(fetchConfig());
    loadRecentFolders();

    fetchData<ServerInfo>('/api/folders/info', 'json')
      .then((info) => setServerInfo(info))
      .catch(() => setServerInfo(null));
  }, [dispatch, loadRecentFolders]);

  const openFolder = useCallback(async (folderPath: string) => {
    try {
      await fetch('/api/folders/recent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: folderPath }),
      });
    } catch {
      // Opening the folder still works even if the recent list cannot be saved.
    }

    window.location.assign(`/?folder=${encodeURIComponent(folderPath)}`);
  }, []);

  const removeFolder = useCallback(async (folderPath: string) => {
    setRecentFolders((folders) => folders.filter((folder) => folder.path !== folderPath));
    try {
      await fetch(`/api/folders/recent?path=${encodeURIComponent(folderPath)}`, {
        method: 'DELETE',
      });
    } catch {
      // The list will be refreshed on the next load.
    }
  }, []);

  const handleOpenFolder = useCallback((folderPath: string) => {
    setPickerOpen(false);
    openFolder(folderPath);
  }, [openFolder]);

  const handleOpenPicker = useCallback(() => {
    setPickerOpen(true);
  }, []);

  const handleClosePicker = useCallback(() => {
    setPickerOpen(false);
  }, []);

  const highlight = alpha(theme.palette.primary.main, 0.16);
  const background = `radial-gradient(circle at 15% 0%, ${highlight} 0%, transparent 42%)`;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background,
        }}
      >
        <Box
          component="header"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            px: { xs: 2, md: 4 },
            py: 1.5,
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: alpha(theme.palette.background.paper, 0.7),
            backdropFilter: 'blur(12px)',
          }}
        >
          <Box sx={{ width: 104, height: 52 }}>
            <Logo />
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title="GitHub Repository">
            <IconButton
              color="inherit"
              href="https://github.com/unhappychoice/mdts"
              target="_blank"
              rel="noopener"
            >
              <GitHubIcon />
            </IconButton>
          </Tooltip>
          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            v{process.env.APP_VERSION}
          </Typography>
        </Box>

        <Container maxWidth="md" sx={{ flexGrow: 1, py: { xs: 7, md: 11 } }}>
          <Typography
            variant="overline"
            color="primary.main"
            sx={{ fontWeight: 700, letterSpacing: '0.16em' }}
          >
            Markdown workspaces
          </Typography>
          <Typography
            variant="h2"
            component="h1"
            sx={{
              mt: 1,
              fontWeight: 700,
              letterSpacing: '-0.045em',
              fontSize: { xs: '2.5rem', md: '3.5rem' },
              lineHeight: 1.05,
            }}
          >
            Pick a folder.
            <br />
            Start reading.
          </Typography>
          <Typography
            color="text.secondary"
            sx={{ mt: 2.5, maxWidth: 560, fontSize: '1.08rem', lineHeight: 1.7 }}
          >
            mdts keeps running in the background. Open as many folders as you like — each one
            gets its own workspace and its own tab.
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4 }}>
            <Button
              size="large"
              variant="contained"
              startIcon={<FolderOpenIcon />}
              onClick={handleOpenPicker}
              sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' }, px: 3, py: 1.3 }}
            >
              Open a folder
            </Button>
          </Stack>

          <Box sx={{ mt: { xs: 7, md: 9 } }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 650 }}>
                Recently viewed
              </Typography>
              {recentFolders.length > 0 && (
                <Chip size="small" label={recentFolders.length} variant="outlined" />
              )}
            </Stack>

            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : recentFolders.length === 0 ? (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    px: 3,
                    py: 6,
                  }}
                >
                  <FolderOutlinedIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    No folders yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Folders you open will show up here.
                  </Typography>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={handleOpenPicker}
                    sx={{ mt: 2 }}
                  >
                    Choose your first folder
                  </Button>
                </Box>
              ) : (
                <List disablePadding>
                  {recentFolders.map((folder) => (
                    <RecentFolderItem
                      key={folder.path}
                      folder={folder}
                      onOpen={openFolder}
                      onRemove={removeFolder}
                    />
                  ))}
                </List>
              )}
            </Paper>
          </Box>
        </Container>

        <Box
          component="footer"
          sx={{
            px: { xs: 2, md: 4 },
            py: 2.5,
            borderTop: 1,
            borderColor: 'divider',
            color: 'text.secondary',
          }}
        >
          <Typography variant="caption">
            Tip: bookmark a workspace URL, or run <code>npx mdts ./docs</code> to open a folder directly.
          </Typography>
        </Box>
      </Box>

      <FolderPickerDialog
        open={pickerOpen}
        initialPath={serverInfo?.home}
        onClose={handleClosePicker}
        onOpen={handleOpenFolder}
      />
    </ThemeProvider>
  );
};

export default Dashboard;
