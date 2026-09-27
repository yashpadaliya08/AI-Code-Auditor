import { SourceFile } from '../models/SourceFile.js';
import { RepoMetadata } from '../models/RepoMetadata.js';

export interface IngestionOptions {
  /** Maximum cumulative token budget (default: 150,000 for safe free-tier usage) */
  maxTokenBudget?: number;
  /** Custom extra ignore patterns */
  extraIgnorePatterns?: string[];
  /** Maximum single file size in bytes to ingest (default: 100KB) */
  maxFileSizeBytes?: number;
}

export interface IngestedRepo {
  metadata: RepoMetadata;
  files: SourceFile[];
}

export interface IRepoFetcher {
  /**
   * Ingest repository files and metadata from a local path or remote URL.
   */
  fetch(targetPathOrUrl: string, options?: IngestionOptions): Promise<IngestedRepo>;
}
