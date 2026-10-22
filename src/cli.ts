import type { Command } from 'commander' with { 'resolution-mode': 'import' };
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { serve } from './server/server';
import { ServerOptions } from './server/context';
import { logger } from './utils/logger';

const DEFAULT_PORT = 8521;

export class CLI {
  run(): Promise<void> {
    return this.requireOpen()
      .then(async (open) => {
        const { Command } = await this.requireCommander();
        const program: Command = new Command();

        const packageJsonPath = path.join(__dirname, '..', 'package.json');
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

        program
          .version(packageJson.version)
          .description('A zero-config CLI tool to preview local Markdown files in a browser')
          .option('-H, --host <host>', 'host to listen on', 'localhost')
          .option('-p, --port <port>', 'port to serve on (use "auto" to find an available port)', String(DEFAULT_PORT))
          .option('-s, --silent', 'suppress server logs', false)
          .option('--no-open', 'do not open the browser automatically')
          .option('-g, --glob <patterns...>', 'glob patterns to filter markdown files (e.g. "docs/*.md")')
          .argument('[directory]', 'directory to open (omit to start with the dashboard)')
          .action(async (directory, options) => {
            logger.setSilent(options.silent);

            logger.showLogo();
            logger.log('Announcement', '🎉 Thanks for using mdts!');
            logger.log('Announcement', '✨ Like it? Star it on GitHub: https://github.com/unhappychoice/mdts');

            logger.log('CLI', '⚙  Options: ' + JSON.stringify(options));
            const autoPort = options.port === 'auto';
            const port = autoPort ? DEFAULT_PORT : parseInt(options.port, 10);
            const host = options.host;
            const defaultDirectory = directory
              ? path.resolve(process.cwd(), directory)
              : undefined;
            const serverOptions: ServerOptions = {
              defaultDirectory,
              globPatterns: options.glob,
            };

            let actualPort: number;
            try {
              ({ port: actualPort } = await serve(serverOptions, port, host, autoPort));
            } catch (err) {
              logger.error(`❌ Failed to start server: ${err instanceof Error ? err.message : err}`);
              process.exitCode = 1;
              return;
            }

            const displayHost = (host === '0.0.0.0' || host === '::') ? 'localhost' : host;
            const baseUrl = `http://${displayHost}:${actualPort}`;
            const openUrl = defaultDirectory
              ? this.folderUrl(baseUrl, defaultDirectory)
              : baseUrl;

            if (options.open) {
              logger.log('CLI', defaultDirectory
                ? `🌐 Opening folder at ${openUrl}`
                : `🌐 Opening dashboard at ${openUrl}`);
              open(openUrl);
            } else {
              logger.log('CLI', defaultDirectory
                ? `🌐 Folder available at ${openUrl}`
                : `🌐 Dashboard available at ${openUrl}`);
            }
          });

        await program.parseAsync(process.argv);
      });
  }

  private folderUrl(baseUrl: string, directory: string): string {
    const defaultPages = ['README.md', 'index.md'];
    const defaultPage = defaultPages.find((name) => existsSync(path.join(directory, name)));
    const pagePath = defaultPage ? `/${defaultPage}` : '/';
    return `${baseUrl}${pagePath}?folder=${encodeURIComponent(directory)}`;
  }

  requireOpen(): Promise<(file: string) => void> {
    return import('open').then((module) => module.default);
  }

  requireCommander(): Promise<typeof import('commander', { with: { 'resolution-mode': 'import' } })> {
    return import('commander');
  }
}
