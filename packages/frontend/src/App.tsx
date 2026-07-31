import { CssBaseline, ThemeProvider } from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import FuzzySearchDialog from './components/FuzzySearch/FuzzySearchDialog';
import SettingsDialog from './components/SettingsDialog/SettingsDialog';
import { useTheme } from './hooks/useTheme';
import { useWebSocket } from './hooks/useWebSocket';
import Layout from './Layout';
import { saveAppSetting } from './store/slices/appSettingSlice';
import { fetchConfig } from './store/slices/configSlice';
import { fetchFileTree } from './store/slices/fileTreeSlice';
import { updateHistoryFromLocation } from './store/slices/historySlice';
import { AppDispatch, RootState } from './store/store';

const App: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();

  const { currentPath } = useSelector((state: RootState) => state.history);
  const { darkMode, contentMode } = useSelector((state: RootState) => state.appSetting);
  const { fontSize } = useSelector((state: RootState) => state.config);
  const theme = useTheme();

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

  useWebSocket(currentPath);

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
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Layout onSettingsClick={handleSettingsClick} onFuzzySearchClick={handleFuzzySearchClick} />
      <SettingsDialog open={isSettingsDialogOpen} onClose={handleCloseSettingsDialog} />
      <FuzzySearchDialog open={isFuzzySearchOpen} onClose={handleCloseFuzzySearch} />
    </ThemeProvider>
  );
};

export default App;
