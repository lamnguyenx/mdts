import configureStore, { MockStoreEnhanced } from 'redux-mock-store';
import { thunk, ThunkDispatch } from 'redux-thunk';
import { AnyAction } from '@reduxjs/toolkit';
import { RootState } from '../src/store/store';

const mockStore = configureStore<RootState, ThunkDispatch<RootState, undefined, AnyAction>>([thunk]);

export const createMockStore = (
  initialState: Partial<RootState> = {},
): MockStoreEnhanced<RootState, ThunkDispatch<RootState, undefined, AnyAction>> => {
  const defaultState: RootState = {
    appSetting: {
      darkMode: 'dark',
      contentMode: 'compact',
      fileTreeOpen: true,
      outlineOpen: true,
    },
    fileTree: {
      fileTree: [
        { path: 'test.md' },
        { folder: [{ path: 'folder/subfile.md' }] },
      ],
      filteredFileTree: [
        { path: 'test.md' },
        { folder: [{ path: 'folder/subfile.md' }] },
      ],
      loading: false,
      error: null,
      searchQuery: '',
      expandedNodes: [],
      mountedDirectoryPath: '',
    },
    content: {
      content: '',
      loading: false,
      error: null,
      scrollPosition: 0,
      latestRequestId: null,
    },
    outline: {
      outline: [],
      loading: false,
      error: null,
      latestRequestId: null,
    },
    history: {
      currentPath: null,
      isDirectory: false,
    },
    config: {
      fontFamily: 'Roboto',
      fontFamilyMonospace: 'monospace',
      fontSize: 14,
      syntaxHighlighterTheme: 'atom-dark',
      theme: 'default',
      enableBreaks: false,
    },
    plantUML: {
      svgCache: {},
      loading: {},
      errors: {},
    },
  };

  const state: RootState = {
    ...defaultState,
    ...initialState,
    appSetting: {
      ...defaultState.appSetting,
      ...(initialState.appSetting || {}),
    },
    fileTree: {
      ...defaultState.fileTree,
      ...(initialState.fileTree || {}),
    },
    content: {
      ...defaultState.content,
      ...(initialState.content || {}),
    },
    outline: {
      ...defaultState.outline,
      ...(initialState.outline || {}),
    },
    history: {
      ...defaultState.history,
      ...(initialState.history || {}),
    },
    config: {
      ...defaultState.config,
      ...(initialState.config || {}),
    },
    plantUML: {
      ...defaultState.plantUML,
      ...(initialState.plantUML || {}),
    },
  };

  return mockStore(state);
};
