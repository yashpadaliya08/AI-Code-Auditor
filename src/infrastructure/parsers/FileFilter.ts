import ignoreModule, { Ignore } from 'ignore';
import * as path from 'node:path';

// Interop wrapper for ignore in ESM/CJS dual-mode
const createIgnoreInstance = (): Ignore => {
  if (typeof ignoreModule === 'function') {
    return (ignoreModule as unknown as () => Ignore)();
  }
  const defaultFn = (ignoreModule as unknown as { default?: () => Ignore }).default;
  if (typeof defaultFn === 'function') {
    return defaultFn();
  }
  throw new Error('Failed to instantiate ignore engine');
};

export const DEFAULT_IGNORED_DIRECTORIES = [
  '.git',
  '.svn',
  '.hg',
  'node_modules',
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  'target',
  'vendor',
  'venv',
  '.venv',
  'env',
  '__pycache__',
  '.pytest_cache',
  '.idea',
  '.vscode',
  'coverage',
  '.nyc_output',
  '.turbo',
  '.audit-cache',
];

export const DEFAULT_IGNORED_EXTENSIONS = new Set([
  // Binaries & Executables
  '.exe', '.dll', '.so', '.dylib', '.bin', '.pyc', '.class', '.jar', '.war',
  // Media
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.tiff', '.bmp',
  '.mp3', '.wav', '.flac', '.ogg',
  '.mp4', '.mov', '.avi', '.mkv', '.webm',
  // Archives
  '.zip', '.tar', '.gz', '.7z', '.rar', '.bz2',
  // Fonts
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  // Docs & PDFs
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  // Source maps & Minified artifacts
  '.map',
  // Database files
  '.sqlite', '.sqlite3', '.db',
]);

export const DEFAULT_IGNORED_PATTERNS = [
  '*.min.js',
  '*.min.css',
  '*.bundle.js',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'composer.lock',
  'Cargo.lock',
  'Gemfile.lock',
  'poetry.lock',
  '.env',
  '.env.local',
  '.env.production',
  '.env.test',
  '*.pem',
  '*.key',
  'id_rsa*',
];

export interface FileFilterOptions {
  extraIgnorePatterns?: string[];
  maxFileSizeBytes?: number;
}

export class FileFilter {
  private ig: Ignore;
  private maxFileSizeBytes: number;

  constructor(options?: FileFilterOptions) {
    // Instantiate ignore instance with default patterns
    this.ig = createIgnoreInstance();
    this.maxFileSizeBytes = options?.maxFileSizeBytes ?? 150 * 1024; // Default: 150 KB limit per file

    // Add default ignore patterns
    this.ig.add(DEFAULT_IGNORED_DIRECTORIES.map(dir => `${dir}/**`));
    this.ig.add(DEFAULT_IGNORED_DIRECTORIES.map(dir => dir));
    this.ig.add(DEFAULT_IGNORED_PATTERNS);

    if (options?.extraIgnorePatterns && options.extraIgnorePatterns.length > 0) {
      this.ig.add(options.extraIgnorePatterns);
    }
  }

  /**
   * Add patterns from a repository's .gitignore file
   */
  public addGitignoreContent(content: string): void {
    const lines = content
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#'));
    if (lines.length > 0) {
      this.ig.add(lines);
    }
  }

  /**
   * Evaluates if a relative file path should be ignored.
   * Path should be forward-slash normalized relative to repo root (e.g. 'src/index.ts').
   */
  public isIgnored(relativeFilePath: string): boolean {
    const normalized = relativeFilePath.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!normalized) return true;

    // Check against extension set
    const ext = path.extname(normalized).toLowerCase();
    if (DEFAULT_IGNORED_EXTENSIONS.has(ext)) {
      return true;
    }

    // Check ignore rules
    return this.ig.ignores(normalized);
  }

  /**
   * Check if file size exceeds acceptable ingestion threshold
   */
  public isTooLarge(sizeBytes: number): boolean {
    return sizeBytes > this.maxFileSizeBytes;
  }

  /**
   * Calculate priority rank for a file (lower number = higher priority).
   * Used when repository exceeds token budget.
   */
  public getFilePriority(relativeFilePath: string): number {
    const normalized = relativeFilePath.toLowerCase().replace(/\\/g, '/');
    const filename = path.basename(normalized);

    // Rank 1: Critical project configs and manifests
    if (
      filename === 'package.json' ||
      filename === 'tsconfig.json' ||
      filename === 'docker-compose.yml' ||
      filename === 'docker-compose.yaml' ||
      filename === 'dockerfile' ||
      filename === '.env.example' ||
      filename === 'requirements.txt' ||
      filename === 'go.mod' ||
      filename === 'pom.xml' ||
      filename === 'cargo.toml'
    ) {
      return 1;
    }

    // Rank 5: Tests and documentation (checked before domain/auth so test files aren't ranked as prod code)
    if (
      normalized.includes('/test/') ||
      normalized.includes('/tests/') ||
      normalized.startsWith('test/') ||
      normalized.startsWith('tests/') ||
      normalized.includes('__tests__') ||
      normalized.includes('/spec/') ||
      normalized.startsWith('spec/') ||
      normalized.includes('.test.') ||
      normalized.includes('.spec.') ||
      normalized.endsWith('.md')
    ) {
      return 5;
    }

    // Rank 2: Attack surface & authorization boundaries
    if (
      normalized.includes('/auth') ||
      normalized.startsWith('auth') ||
      normalized.includes('/routes') ||
      normalized.includes('/api') ||
      normalized.includes('/controllers') ||
      normalized.includes('/middleware') ||
      normalized.includes('/security')
    ) {
      return 2;
    }

    // Rank 3: Core domain & persistence layer
    if (
      normalized.includes('/domain') ||
      normalized.includes('/models') ||
      normalized.includes('/entities') ||
      normalized.includes('/services') ||
      normalized.includes('/repositories') ||
      normalized.includes('/db') ||
      normalized.includes('/database')
    ) {
      return 3;
    }

    // Rank 4: Utilities and business logic
    return 4;
  }
}
