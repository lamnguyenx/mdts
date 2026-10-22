import { CLI } from '../../src/cli';
import path from 'path';
import { serve } from '../../src/server/server';
import { logger } from '../../src/utils/logger';

// Mock fs first, before any other imports that might use it
let mockExistingFiles: string[] = [];
jest.mock('fs', () => ({
  existsSync: jest.fn((p: string) => mockExistingFiles.some((name) => p.endsWith(name))),
  readFileSync: jest.fn(() => JSON.stringify({
    version: '0.0.0-test',
  })),
  statSync: jest.fn(() => ({
    isDirectory: () => true,
  })),
}));

// Helper to set the mock result for existsSync
const setExistsSyncResult = (result: boolean) => {
  mockExistingFiles = result ? ['README.md', 'index.md'] : [];
};
const setExistingFiles = (files: string[]) => {
  mockExistingFiles = files;
};

const encodedDirectory = (directory: string): string => encodeURIComponent(directory);
const folderUrl = (directory: string, page = ''): string =>
  `http://localhost:8521${page ? `/${page}` : '/'}?folder=${encodedDirectory(directory)}`;

// Mock the 'open' module
jest.mock('open', () => ({ default: jest.fn(() => Promise.resolve()) }));

// Mock the 'serve' function to prevent actual server startup
jest.mock('../../src/server/server', () => ({
  serve: jest.fn((_options: unknown, port: number) => Promise.resolve({ server: {}, port })),
}));

jest.mock('../../src/utils/logger', () => ({
  logger: {
    setSilent: jest.fn(),
    showLogo: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
  },
}));

describe('cli', () => {
  let cli: CLI;
  let originalArgv: string[];
  const mockOpen = jest.fn();
  let mockServe: jest.Mock;
  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    cli = new CLI();
    originalArgv = process.argv;
    mockServe = serve as jest.Mock;
    process.exitCode = undefined;
    // Reset the mock result for existsSync before each test
    setExistingFiles([]); // Default to empty for safety
    jest.clearAllMocks();

    jest.spyOn(cli, 'requireOpen')
      .mockImplementation(() => Promise.resolve(mockOpen));
  });

  afterEach(() => {
    process.argv = originalArgv;
  });

  it('starts the dashboard when no directory is given', () => {
    process.argv = ['node', 'cli.ts'];

    return cli.run()
      .then(() => {
        expect(mockServe).toHaveBeenCalledWith(
          { defaultDirectory: undefined, globPatterns: undefined },
          8521,
          'localhost',
          false,
        );
        expect(mockOpen).toHaveBeenCalledWith('http://localhost:8521');
      });
  });

  it('opens the current directory when "." is given', () => {
    setExistsSyncResult(true);
    process.argv = ['node', 'cli.ts', '.'];

    return cli.run()
      .then(() => {
        expect(mockServe).toHaveBeenCalledWith(
          { defaultDirectory: path.resolve('.'), globPatterns: undefined },
          8521,
          'localhost',
          false,
        );
        expect(mockOpen).toHaveBeenCalledWith(folderUrl(path.resolve('.'), 'README.md'));
      });
  });

  it('opens the folder root when README.md and index.md do not exist', () => {
    setExistsSyncResult(false);
    process.argv = ['node', 'cli.ts', '.'];

    return cli.run()
      .then(() => {
        expect(mockOpen).toHaveBeenCalledWith(folderUrl(path.resolve('.')));
      });
  });

  it('falls back to index.md when README.md does not exist', () => {
    setExistingFiles(['index.md']);
    process.argv = ['node', 'cli.ts', '.'];

    return cli.run()
      .then(() => {
        expect(mockOpen).toHaveBeenCalledWith(folderUrl(path.resolve('.'), 'index.md'));
      });
  });

  it('prefers README.md over index.md when both exist', () => {
    setExistingFiles(['README.md', 'index.md']);
    process.argv = ['node', 'cli.ts', '.'];

    return cli.run()
      .then(() => {
        expect(mockOpen).toHaveBeenCalledWith(folderUrl(path.resolve('.'), 'README.md'));
      });
  });

  it('uses the specified port and directory', () => {
    setExistsSyncResult(true);
    process.argv = ['node', 'cli.ts', '-p', '9000', './my-dir'];

    return cli.run()
      .then(() => {
        expect(mockServe).toHaveBeenCalledWith(
          { defaultDirectory: path.resolve('./my-dir'), globPatterns: undefined },
          9000,
          'localhost',
          false,
        );
        expect(mockOpen).toHaveBeenCalledWith(
          `http://localhost:9000/README.md?folder=${encodedDirectory(path.resolve('./my-dir'))}`,
        );
      });
  });

  it('asks the server for an available port when --port auto is specified', () => {
    process.argv = ['node', 'cli.ts', '-p', 'auto'];

    return cli.run()
      .then(() => {
        expect(mockServe).toHaveBeenCalledWith(
          { defaultDirectory: undefined, globPatterns: undefined },
          8521,
          'localhost',
          true,
        );
      });
  });

  it('logs the dashboard URL without opening the browser when --no-open is specified', () => {
    process.argv = ['node', 'cli.ts', '--no-open', '--host', '0.0.0.0'];

    return cli.run()
      .then(() => {
        expect(mockServe).toHaveBeenCalledWith(
          { defaultDirectory: undefined, globPatterns: undefined },
          8521,
          '0.0.0.0',
          false,
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          'CLI',
          '🌐 Dashboard available at http://localhost:8521',
        );
        expect(mockOpen).not.toHaveBeenCalled();
      });
  });

  it('logs a folder URL without opening the browser when --no-open is specified', () => {
    setExistsSyncResult(false);
    process.argv = ['node', 'cli.ts', '--no-open', './docs'];

    return cli.run()
      .then(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          'CLI',
          `🌐 Folder available at http://localhost:8521/?folder=${encodedDirectory(path.resolve('./docs'))}`,
        );
        expect(mockOpen).not.toHaveBeenCalled();
      });
  });

  it('logs an error and sets exitCode when serve fails', () => {
    mockServe.mockRejectedValueOnce(new Error('boom'));
    process.argv = ['node', 'cli.ts'];

    return cli.run()
      .then(() => {
        expect(mockLogger.error).toHaveBeenCalledWith('❌ Failed to start server: boom');
        expect(process.exitCode).toBe(1);
        expect(mockOpen).not.toHaveBeenCalled();
      });
  });

  it('passes glob patterns through to the server', () => {
    process.argv = ['node', 'cli.ts', './docs', '--glob', '*.md', 'notes/*.md'];

    return cli.run()
      .then(() => {
        expect(mockServe).toHaveBeenCalledWith(
          {
            defaultDirectory: path.resolve('./docs'),
            globPatterns: ['*.md', 'notes/*.md'],
          },
          8521,
          'localhost',
          false,
        );
      });
  });

  it('resolves the open module in requireOpen', async () => {
    const anotherCli = new CLI();
    const openModule = await import('open');

    await expect(anotherCli.requireOpen()).resolves.toBe(openModule.default);
  });
});
