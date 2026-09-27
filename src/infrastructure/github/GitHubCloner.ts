import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { simpleGit } from 'simple-git';
import {
  IngestedRepo,
  IRepoFetcher,
  IngestionOptions,
  RepoMetadata,
} from '../../domain/index.js';
import { LocalRepoReader } from '../parsers/LocalRepoReader.js';

export interface GitHubClonerOptions {
  /** If true, do not delete the cloned folder after reading */
  persistClone?: boolean;
  /** Custom directory for clones (defaults to os.tmpdir()/code-auditor-clones) */
  baseTempDir?: string;
}

export class GitHubCloner implements IRepoFetcher {
  private localReader: LocalRepoReader;
  private persistClone: boolean;
  private baseTempDir: string;

  constructor(options?: GitHubClonerOptions) {
    this.localReader = new LocalRepoReader();
    this.persistClone = options?.persistClone ?? false;
    this.baseTempDir =
      options?.baseTempDir ??
      path.join(os.tmpdir(), 'code-auditor-clones');
  }

  /**
   * Normalizes a repository string or URL into a valid clone URL and repo name.
   */
  public static parseRepoTarget(target: string): { cloneUrl: string; repoName: string } {
    const trimmed = target.trim();

    // Handle "owner/repo" shorthand
    if (/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(trimmed)) {
      return {
        cloneUrl: `https://github.com/${trimmed}.git`,
        repoName: trimmed,
      };
    }

    // Handle full URL
    try {
      const url = new URL(trimmed);
      const cleanPath = url.pathname.replace(/^\//, '').replace(/\.git$/, '');
      return {
        cloneUrl: trimmed.endsWith('.git') ? trimmed : `${trimmed}.git`,
        repoName: cleanPath,
      };
    } catch {
      throw new Error(`Invalid GitHub repository URL or identifier: "${target}"`);
    }
  }

  /**
   * Shallow clones the target repository and reads its codebase.
   */
  public async fetch(
    targetUrlOrRepo: string,
    options?: IngestionOptions
  ): Promise<IngestedRepo> {
    const { cloneUrl, repoName } = GitHubCloner.parseRepoTarget(targetUrlOrRepo);

    // Create unique temporary directory for this clone
    await fs.mkdir(this.baseTempDir, { recursive: true });
    const sanitizedName = repoName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const targetDir = path.join(
      this.baseTempDir,
      `${sanitizedName}_${Date.now()}`
    );

    const git = simpleGit();

    try {
      // Execute shallow clone with depth 1 for maximum speed and zero cost
      await git.clone(cloneUrl, targetDir, ['--depth', '1', '--single-branch']);

      // Read repository using LocalRepoReader
      const ingested = await this.localReader.fetch(targetDir, options);

      // Enhance metadata with GitHub source details
      const enhancedMetadata: RepoMetadata = {
        ...ingested.metadata,
        name: repoName,
        sourceType: 'github',
        sourceUrlOrPath: cloneUrl,
      };

      return {
        metadata: enhancedMetadata,
        files: ingested.files,
      };
    } finally {
      // Clean up cloned files unless retention is requested
      if (!this.persistClone) {
        try {
          await fs.rm(targetDir, { recursive: true, force: true });
        } catch {
          // Ignore cleanup errors on locked files in Windows temp
        }
      }
    }
  }
}
