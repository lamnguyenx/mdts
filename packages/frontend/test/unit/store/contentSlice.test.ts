import { configureStore } from '@reduxjs/toolkit';
import { fetchData } from '../../../src/api';
import contentReducer, { fetchContent, setScrollPosition } from '../../../src/store/slices/contentSlice';

jest.mock('../../../src/api', () => ({
  fetchData: jest.fn(),
}));

const mockFetchData = fetchData as jest.MockedFunction<typeof fetchData>;

const aborted = <T extends { meta: { aborted?: boolean } }>(action: T): T => ({
  ...action,
  meta: { ...action.meta, aborted: true },
});

describe('contentSlice', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const initialState = {
    content: '',
    loading: true,
    error: null,
    scrollPosition: 0,
    loadedPath: null,
    latestRequestId: null,
  };

  it('should return the initial state', () => {
    expect(contentReducer(undefined, { type: '' })).toEqual(initialState);
  });

  describe('fetchContent.pending', () => {
    it('should set loading to true when content is empty', () => {
      const previousState = { ...initialState, loading: false, content: '' };
      expect(contentReducer(previousState, fetchContent.pending('requestId', null))).toEqual({
        ...initialState,
        loading: true,
        content: '',
        latestRequestId: 'requestId',
      });
    });

    it('should not set loading to true when reloading the displayed file', () => {
      const previousState = {
        ...initialState,
        loading: false,
        content: 'old content',
        loadedPath: 'path/to/test.md',
        latestRequestId: 'request-1',
      };
      expect(contentReducer(previousState, fetchContent.pending('request-2', 'path/to/test.md'))).toEqual({
        ...previousState,
        latestRequestId: 'request-2',
      });
    });

    it('should clear loading when returning to the displayed file while another request is pending', () => {
      const previousState = {
        ...initialState,
        loading: true,
        content: 'content of test.md',
        loadedPath: 'path/to/test.md',
        latestRequestId: 'request-2',
      };
      expect(contentReducer(previousState, fetchContent.pending('request-3', 'path/to/test.md'))).toEqual({
        ...previousState,
        loading: false,
        latestRequestId: 'request-3',
      });
    });

    it('should set loading to true when opening a different file than the displayed one', () => {
      const previousState = {
        ...initialState,
        loading: false,
        content: 'old content',
        loadedPath: 'path/to/test.md',
        latestRequestId: 'request-1',
      };
      expect(contentReducer(previousState, fetchContent.pending('request-2', 'path/to/other.md'))).toEqual({
        ...previousState,
        loading: true,
        latestRequestId: 'request-2',
      });
    });
  });

  it('should handle fetchContent.fulfilled', () => {
    const previousState = {
      ...initialState,
      content: 'old content',
      loading: true,
      latestRequestId: 'request-1',
    };
    expect(
      contentReducer(previousState, fetchContent.fulfilled('new content', 'request-1', 'path/to/test.md'))
    ).toEqual({
      ...initialState,
      content: 'new content',
      loading: false,
      loadedPath: 'path/to/test.md',
      latestRequestId: 'request-1',
    });
  });

  it('should ignore a fulfilled response superseded by a newer request', () => {
    const previousState = {
      ...initialState,
      content: 'newest content',
      loading: false,
      loadedPath: 'path/to/other.md',
      latestRequestId: 'request-2',
    };
    expect(
      contentReducer(previousState, fetchContent.fulfilled('stale content', 'request-1', 'path/to/test.md'))
    ).toEqual(previousState);
  });

  it('should handle fetchContent.rejected', () => {
    const previousState = {
      ...initialState,
      content: 'old content',
      loading: true,
      latestRequestId: 'request-1',
    };
    const error = new Error('Failed to fetch');
    expect(contentReducer(previousState, fetchContent.rejected(error, 'request-1', null))).toEqual({
      ...initialState,
      content: 'old content',
      loading: false,
      error: 'Failed to fetch',
      latestRequestId: 'request-1',
    });
  });

  it('should ignore a rejected response superseded by a newer request', () => {
    const previousState = {
      ...initialState,
      content: 'newest content',
      loading: false,
      loadedPath: 'path/to/other.md',
      latestRequestId: 'request-2',
    };
    const error = new Error('Failed to fetch');
    expect(
      contentReducer(previousState, fetchContent.rejected(error, 'request-1', 'path/to/test.md'))
    ).toEqual(previousState);
  });

  it('should ignore aborted fetchContent.rejected results', () => {
    const previousState = {
      ...initialState,
      content: 'current file',
      loading: false,
      latestRequestId: 'requestId',
    };
    expect(contentReducer(
      previousState,
      aborted(fetchContent.rejected(new Error('Aborted'), 'requestId', null)),
    )).toEqual(previousState);
  });

  it('fetches the selected file instead of welcome markdown', async () => {
    mockFetchData.mockResolvedValue('# selected file');
    const store = configureStore({ reducer: { content: contentReducer } });

    await store.dispatch(fetchContent('audit-review.md'));

    expect(mockFetchData).toHaveBeenCalledWith(
      '/api/markdown/audit-review.md',
      'text',
      expect.any(AbortSignal),
    );
    expect(store.getState().content.content).toBe('# selected file');
  });

  it('encodes markdown path segments when fetching content', async () => {
    mockFetchData.mockResolvedValue('# encoded');
    const store = configureStore({ reducer: { content: contentReducer } });

    await store.dispatch(fetchContent('docs/my file.md'));

    expect(mockFetchData).toHaveBeenCalledWith(
      '/api/markdown/docs/my%20file.md',
      'text',
      expect.any(AbortSignal),
    );
  });

  it('fetches welcome markdown when no file is selected', async () => {
    mockFetchData.mockResolvedValue('# Welcome');
    const store = configureStore({ reducer: { content: contentReducer } });

    await store.dispatch(fetchContent(null));

    expect(mockFetchData).toHaveBeenCalledWith(
      '/api/markdown/mdts-welcome-markdown.md',
      'text',
      expect.any(AbortSignal),
    );
  });

  it('should handle setScrollPosition', () => {
    const previousState = { ...initialState };
    expect(contentReducer(previousState, setScrollPosition(100))).toEqual({
      ...initialState,
      scrollPosition: 100,
    });
  });
});
