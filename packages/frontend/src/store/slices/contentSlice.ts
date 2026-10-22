import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { fetchData } from '../../api';
import { isStaleRequest } from '../isStaleRequest';

interface ContentState {
  content: string;
  loading: boolean;
  error: string | null;
  scrollPosition: number;
  loadedPath: string | null;
  latestRequestId: string | null;
}

const initialState: ContentState = {
  content: '',
  loading: true,
  error: null,
  scrollPosition: 0,
  loadedPath: null,
  latestRequestId: null,
};

const encodePath = (path: string): string =>
  path.split('/').map(encodeURIComponent).join('/');

const markdownApiUrl = (path: string | null): string => (
  path
    ? `/api/markdown/${encodePath(path)}`
    : '/api/markdown/mdts-welcome-markdown.md'
);

export const fetchContent = createAsyncThunk(
  'content/fetchContent',
  async (path: string | null, { signal }) => {
    const data = await fetchData<string>(markdownApiUrl(path), 'text', signal);
    return data || '';
  }
);

const contentSlice = createSlice({
  name: 'content',
  initialState,
  reducers: {
    setScrollPosition: (state, action: PayloadAction<number>) => {
      state.scrollPosition = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchContent.pending, (state, action) => {
        // Show the loading indicator when opening a different file, but keep the
        // current content visible when (re)loading the file already displayed.
        if (action.meta.arg !== state.loadedPath || !state.content) {
          state.loading = true;
        } else {
          state.loading = false;
        }
        state.latestRequestId = action.meta.requestId;
        state.error = null;
      })
      .addCase(fetchContent.fulfilled, (state, action) => {
        if (isStaleRequest(state, action)) {
          return;
        }
        state.loading = false;
        state.content = action.payload;
        state.loadedPath = action.meta.arg;
      })
      .addCase(fetchContent.rejected, (state, action) => {
        if (isStaleRequest(state, action)) {
          return;
        }
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch content';
      });
  },
});

export const { setScrollPosition } = contentSlice.actions;

export default contentSlice.reducer;
