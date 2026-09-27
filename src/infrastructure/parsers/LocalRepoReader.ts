import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { simpleGit } from 'simple-git';
import {
  SourceFile,
  RepoMetadata,
  IngestedRepo,
  IRepoFetcher,
  IngestionOptions,
  estimateTokens,
  detectLanguage,
} from '../../domain/index.js';
import { FileFilter } from './FileFilter.js';

export class LocalRepoReader implements IRepoFetcher {
  /**
   * Reads and packages a local directory for AI audit.
   */
  public async fetch(
    targetPath: string,
    options?: IngestionOptions
  ): Promise<IngestedRepo> {
    const absolutePath = path.resolve(targetPath);

    // Validate path exists and is a directory
    const stats = await fs.stat(absolutePath).catch(() => null);
    if (!stats || !stats.isDirectory()) {
      throw new Error(`Target path is not a valid directory: ${absolutePath}`);
    }

    const maxTokenBudget = options?.maxTokenBudget ?? 600_000;
    const filter = new FileFilter({
      extraIgnorePatterns: options?.extraIgnorePatterns,
      maxFileSizeBytes: options?.maxFileSizeBytes,
    });

    // Check for root .gitignore and apply
    const gitignorePath = path.join(absolutePath, '.gitignore');
    try {
      const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
      filter.addGitignoreContent(gitignoreContent);
    } catch {
      // No .gitignore present, continue with defaults
    }

    // Collect all qualifying files
    const collectedFiles: SourceFile[] = [];
    await this.scanDirectory(absolutePath, absolutePath, filter, collectedFiles);

    // Sort files by priority
    collectedFiles.sort((a, b) => {
      const pA = filter.getFilePriority(a.relativePath);
      const pB = filter.getFilePriority(b.relativePath);
      if (pA !== pB) return pA - pB;
      return a.relativePath.localeCompare(b.relativePath);
    });

    // Enforce token budget
    let currentTokenTotal = 0;
    const budgetedFiles: SourceFile[] = [];

    for (const file of collectedFiles) {
      if (currentTokenTotal + file.tokenEstimate <= maxTokenBudget) {
        budgetedFiles.push(file);
        currentTokenTotal += file.tokenEstimate;
      } else {
        // Stop adding if budget is exhausted
        break;
      }
    }

    // Language statistics
    const languages: Record<string, number> = {};
    for (const file of budgetedFiles) {
      languages[file.language] = (languages[file.language] ?? 0) + 1;
    }

    // Attempt to read git metadata if repository has .git
    let branch: string | undefined;
    let commitHash: string | undefined;
    try {
      const git = simpleGit(absolutePath);
      const isRepo = await git.checkIsRepo();
      if (isRepo) {
        const branchSummary = await git.branch();
        branch = branchSummary.current;
        const log = await git.log({ maxCount: 1 });
        commitHash = log.latest?.hash;
      }
    } catch {
      // Not a git repository or git command failed; proceed gracefully
    }

    const metadata: RepoMetadata = {
      name: path.basename(absolutePath),
      sourceType: 'local',
      sourceUrlOrPath: absolutePath,
      branch,
      commitHash,
      totalFiles: budgetedFiles.length,
      totalTokens: currentTokenTotal,
      languages,
      ingestedAt: new Date().toISOString(),
    };

    return {
      metadata,
      files: budgetedFiles,
    };
  }

  private async scanDirectory(
    currentDir: string,
    rootDir: string,
    filter: FileFilter,
    collected: SourceFile[]
  ): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path
        .relative(rootDir, fullPath)
        .replace(/\\/g, '/');

      if (filter.isIgnored(relativePath)) {
        continue;
      }

      if (entry.isDirectory()) {
        await this.scanDirectory(fullPath, rootDir, filter, collected);
      } else if (entry.isFile()) {
        try {
          const fileStat = await fs.stat(fullPath);
          if (filter.isTooLarge(fileStat.size)) {
            continue;
          }

          const content = await fs.readFile(fullPath, 'utf-8');
          // Check for null characters or binary content masquerading as text
          if (content.includes('\0')) {
            continue;
          }

          const ext = path.extname(entry.name);
          collected.push({
            path: fullPath,
            relativePath,
            content,
            sizeBytes: fileStat.size,
            tokenEstimate: estimateTokens(content),
            extension: ext,
            language: detectLanguage(ext),
          });
        } catch {
          // File might be locked, unreadable, or permission denied; skip
          continue;
        }
      }
    }
  }
}
