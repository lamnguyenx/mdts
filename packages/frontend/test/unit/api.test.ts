import { fetchData, folderUrl, getCurrentFolder, withFolder } from '../../src/api';

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

const createResponse = ({
  ok = true,
  status = 200,
  json = undefined,
  text = '',
}: {
  ok?: boolean;
  status?: number;
  json?: unknown;
  text?: string;
}) => ({
  ok,
  status,
  json: jest.fn().mockResolvedValue(json),
  text: jest.fn().mockResolvedValue(text),
}) as unknown as Response;

describe('fetchData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns parsed json when responseType is json', async () => {
    const payload = { value: 'test' };
    mockFetch.mockResolvedValueOnce(createResponse({ json: payload }));

    await expect(fetchData<typeof payload>('/api/config', 'json')).resolves.toEqual(payload);
    expect(mockFetch).toHaveBeenCalledWith('/api/config', { signal: undefined });
  });

  it('returns text when responseType is text', async () => {
    mockFetch.mockResolvedValueOnce(createResponse({ text: 'markdown content' }));

    await expect(fetchData<string>('/api/markdown/test.md', 'text')).resolves.toBe('markdown content');
  });

  it('logs and rethrows http errors', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    mockFetch.mockResolvedValueOnce(createResponse({ ok: false, status: 500 }));

    await expect(fetchData('/api/config', 'json')).rejects.toThrow('HTTP error! status: 500');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error fetching from /api/config:',
      expect.any(Error),
    );
  });

  it('logs and rethrows fetch failures', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('Network down');

    mockFetch.mockRejectedValueOnce(error);

    await expect(fetchData('/api/config', 'json')).rejects.toThrow(error);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching from /api/config:', error);
  });

  it('rethrows abort errors without logging', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const abortError = new DOMException('Aborted', 'AbortError');

    mockFetch.mockRejectedValueOnce(abortError);

    await expect(fetchData('/api/config', 'json')).rejects.toBe(abortError);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});

describe('folder URL helpers', () => {
  it('reads the folder from the query string', () => {
    expect(getCurrentFolder('?folder=%2Fworkspace')).toBe('/workspace');
    expect(getCurrentFolder('')).toBeNull();
  });

  it('appends the folder to API URLs', () => {
    expect(withFolder('/api/filetree', '?folder=%2Fworkspace'))
      .toBe('/api/filetree?folder=%2Fworkspace');
    expect(withFolder('/api/outline?filePath=a.md', '?folder=%2Fworkspace'))
      .toBe('/api/outline?filePath=a.md&folder=%2Fworkspace');
  });

  it('appends the folder before a hash', () => {
    expect(withFolder('/image.png#preview', '?folder=%2Fworkspace'))
      .toBe('/image.png?folder=%2Fworkspace#preview');
  });

  it('leaves URLs unchanged without a folder', () => {
    expect(withFolder('/api/filetree', '')).toBe('/api/filetree');
    expect(folderUrl('/docs/readme.md', '')).toBe('/docs/readme.md');
  });

  it('builds navigation URLs that keep the folder', () => {
    expect(folderUrl('/docs/readme.md', '?folder=%2Fworkspace'))
      .toBe('/docs/readme.md?folder=%2Fworkspace');
  });
});
