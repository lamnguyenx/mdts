import { AppShell } from '@mantine/core';
import React, { useCallback, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { folderUrl } from './api';
import AppHeader from './components/AppHeader';
import Content from './components/Content/Content';
import FileTree from './components/LeftPane/FileTree';
import Outline from './components/RightPane/Outline';
import { useTheme } from './hooks/useTheme';
import useIsMobile from './hooks/useIsMobile';
import { useFolder } from './hooks/useFolder';
import { toggleFileTree, toggleOutline } from './store/slices/appSettingSlice';
import type { RootState } from './store/store';

const HEADER_HEIGHT = 52;
const PANEL_WIDTH = 260;
const RAIL_WIDTH = 56;

interface LayoutProps {
  onSettingsClick: () => void;
  onFuzzySearchClick: () => void;
}

const Layout: React.FC<LayoutProps> = ({ onSettingsClick, onFuzzySearchClick }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const folder = useFolder();
  const isMobile = useIsMobile();
  const { backdrop } = useTheme();
  const { fileTreeOpen, outlineOpen } = useSelector((state: RootState) => state.appSetting);
  const { currentPath, isDirectory } = useSelector((state: RootState) => state.history);
  const [scrollToId, setScrollToId] = useState<string | null>(null);
  const [mobileFileTreeOpen, setMobileFileTreeOpen] = useState(false);
  const [mobileOutlineOpen, setMobileOutlineOpen] = useState(false);

  useEffect(() => {
    if (!isMobile) {
      setMobileFileTreeOpen(false);
      setMobileOutlineOpen(false);
    }
  }, [isMobile]);

  const handleFileSelect = useCallback((path: string) => {
    navigate(folderUrl(`/${path}`, location.search));
  }, [navigate, location.search]);

  const handleDashboardClick = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handleToggleFileTree = useCallback(() => {
    if (isMobile) {
      setMobileFileTreeOpen((prev) => !prev);
      setMobileOutlineOpen(false);
    } else {
      dispatch(toggleFileTree());
    }
  }, [dispatch, isMobile]);

  const handleDirectorySelect = useCallback((path: string) => {
    navigate(folderUrl(`/${path}`, location.search));
  }, [navigate, location.search]);

  const handleOutlineItemClick = useCallback((id: string) => {
    setScrollToId(id);
  }, []);

  const handleToggleOutline = useCallback(() => {
    if (isMobile) {
      setMobileOutlineOpen((prev) => !prev);
      setMobileFileTreeOpen(false);
    } else {
      dispatch(toggleOutline());
    }
  }, [dispatch, isMobile]);

  const fileTreeIsOpen = isMobile ? mobileFileTreeOpen : fileTreeOpen;
  const outlineIsOpen = isMobile ? mobileOutlineOpen : outlineOpen;

  return (
    <AppShell
      header={{ height: HEADER_HEIGHT }}
      navbar={{
        width: fileTreeOpen ? PANEL_WIDTH : RAIL_WIDTH,
        breakpoint: 'md',
        collapsed: { mobile: !fileTreeIsOpen },
      }}
      aside={{
        width: outlineOpen ? PANEL_WIDTH : RAIL_WIDTH,
        breakpoint: 'md',
        collapsed: { mobile: !outlineIsOpen },
      }}
      styles={{
        navbar: { transitionProperty: 'transform, top, height, width' },
        aside: { transitionProperty: 'transform, top, height, width' },
      }}
    >
      <AppShell.Header>
        <AppHeader
          handleFileSelect={handleFileSelect}
          onSettingsClick={onSettingsClick}
          onFuzzySearchClick={onFuzzySearchClick}
          onToggleFileTree={handleToggleFileTree}
          onToggleOutline={handleToggleOutline}
          onDashboardClick={folder ? handleDashboardClick : undefined}
          currentFolder={folder}
        />
      </AppShell.Header>

      <AppShell.Navbar>
        <FileTree
          onFileSelect={handleFileSelect}
          isOpen={fileTreeIsOpen}
          onToggle={handleToggleFileTree}
          selectedFilePath={currentPath}
        />
      </AppShell.Navbar>

      <AppShell.Main
        component="main"
        bg={backdrop}
        style={{ height: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        <Content
          onFileSelect={handleFileSelect}
          onDirectorySelect={handleDirectorySelect}
          scrollToId={scrollToId}
        />
      </AppShell.Main>

      <AppShell.Aside>
        <Outline
          filePath={isDirectory ? null : currentPath}
          onItemClick={handleOutlineItemClick}
          isOpen={outlineIsOpen}
          onToggle={handleToggleOutline}
        />
      </AppShell.Aside>
    </AppShell>
  );
};

export default Layout;
