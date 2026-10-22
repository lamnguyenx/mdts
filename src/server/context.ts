export interface ServerContext {
  directory: string;
  globPatterns?: string[];
  filePatterns?: string[];
}

export interface ServerOptions {
  /** Folder mounted when a request does not specify a ?folder= query parameter. */
  defaultDirectory?: string;
  /** Glob patterns applied inside every folder that is opened. */
  globPatterns?: string[];
  /** Directory for machine-wide settings. Defaults to ~/.config/mdts. */
  configDir?: string;
}
