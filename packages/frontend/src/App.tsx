import { Center, Loader } from '@mantine/core';
import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import Dashboard from './components/Dashboard/Dashboard';
import FuzzySearchDialog from './components/FuzzySearch/FuzzySearchDialog';
import SettingsDialog from './components/SettingsDialog/SettingsDialog';
import { useFolder } from './hooks/useFolder';
import { useWebSocket } from './hooks/useWebSocket';
import Layout from './Layout';
import { saveAppSetting } from './store/slices/appSettingSlice';
import { fetchConfig } from './store/slices/configSlice';
import { fetchFileTree } from './store/slices/fileTreeSlice';
import { updateHistoryFromLocation } from './store/slices/historySlice';
import type { AppDispatch, RootState } from './store/store';
import AppThemeProvider from './theme/AppThemeProvider';

type AppMode = 'loading' | 'workspace' | 'dashboard' | 'legacy';

interface ServerInfo {
  daemon: boolean;
  defaultFolder: string | null;
  home: string;
}

const LoadingScreen: React.FC = () => (
  <Center mih="100vh" bg="var(--app-background)">
    <Loader role="progressbar" />
  </Center>
);

const Workspace: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const folder = useFolder();

  const { currentPath } = useSelector((state: RootState) => state.history);
  const { darkMode, contentMode } = useSelector((state: RootState) => state.appSetting);
  const { fontSize } = useSelector((state: RootState) => state.config);

  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isFuzzySearchOpen, setIsFuzzySearchOpen] = useState(false);

  const handleSettingsClick = useCallback(() => {
    setIsSettingsDialogOpen(true);
  }, []);

  const handleCloseSettingsDialog = useCallback(() => {
    setIsSettingsDialogOpen(false);
  }, []);

  const handleFuzzySearchClick = useCallback(() => {
    setIsFuzzySearchOpen(true);
  }, []);

  const handleCloseFuzzySearch = useCallback(() => {
    setIsFuzzySearchOpen(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsFuzzySearchOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useWebSocket(currentPath, folder);

  useEffect(() => {
    dispatch(fetchFileTree());
  }, [dispatch, location]);

  useEffect(() => {
    dispatch(updateHistoryFromLocation(location.pathname));
  }, [location, dispatch]);

  useEffect(() => {
    dispatch(fetchConfig());
  }, [dispatch]);

  useEffect(() => {
    const actualSize = Math.floor(fontSize / 0.875);
    document.documentElement.style.fontSize = `${actualSize}px`;
  }, [fontSize]);

  useEffect(() => {
    if (!(['dark', 'light', 'auto'].includes(darkMode))) {
      dispatch(saveAppSetting({ darkMode: 'auto', contentMode: 'compact' }));
    } else {
      dispatch(saveAppSetting({ darkMode, contentMode }));
    }
  }, []);

  return (
    <>
      <Layout onSettingsClick={handleSettingsClick} onFuzzySearchClick={handleFuzzySearchClick} />
      <SettingsDialog open={isSettingsDialogOpen} onClose={handleCloseSettingsDialog} />
      <FuzzySearchDialog open={isFuzzySearchOpen} onClose={handleCloseFuzzySearch} />
    </>
  );
};

const AppContent: React.FC = () => {
  const folder = useFolder();
  const [mode, setMode] = useState<AppMode>(folder ? 'workspace' : 'loading');

  useEffect(() => {
    if (folder) {
      setMode('workspace');
      return;
    }

    let cancelled = false;
    setMode('loading');

    const detectServer = async (): Promise<void> => {
      try {
        const response = await fetch('/api/folders/info');
        if (!response.ok) {
          if (!cancelled) setMode('legacy');
          return;
        }

        const info = await response.json() as ServerInfo;
        const isMdtsServer = Boolean(
          info &&
          typeof info === 'object' &&
          !Array.isArray(info) &&
          typeof info.daemon === 'boolean',
        );
        if (!cancelled) setMode(isMdtsServer ? 'dashboard' : 'legacy');
      } catch {
        if (!cancelled) {
          // The static demo (or an older server) has no folder API. Keep the
          // original single-folder/welcome behaviour in that case.
          setMode('legacy');
        }
      }
    };

    detectServer();

    return () => {
      cancelled = true;
    };
  }, [folder]);

  if (mode === 'loading') return <LoadingScreen />;
  if (mode === 'dashboard') return <Dashboard />;
  return <Workspace />;
};

const App: React.FC = () => (
  <AppThemeProvider>
    <AppContent />
  </AppThemeProvider>
);

export default App;
