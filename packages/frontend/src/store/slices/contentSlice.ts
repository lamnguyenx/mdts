
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { fetchData } from '../../api';

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

export const fetchContent = createAsyncThunk(
  'content/fetchContent',
  async (path: string | null) => {
    const url = path ? `/api/markdown/${path}` : '/api/markdown/mdts-welcome-markdown.md';
    const data = await fetchData<string>(url, 'text');
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
        // Ignore responses superseded by a newer request (e.g. when navigating quickly).
        if (action.meta.requestId !== state.latestRequestId) return;
        state.loading = false;
        state.content = action.payload;
        state.loadedPath = action.meta.arg;
      })
      .addCase(fetchContent.rejected, (state, action) => {
        if (action.meta.requestId !== state.latestRequestId) return;
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch content';
      });
  },
});

export const { setScrollPosition } = contentSlice.actions;

export default contentSlice.reducer;
