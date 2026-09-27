export type RepoSourceType = 'local' | 'github';

export interface RepoMetadata {
  /** Repository name (e.g., 'fastapi-backend' or 'owner/repo') */
  name: string;
  /** Ingestion source type */
  sourceType: RepoSourceType;
  /** Git remote URL if applicable or local directory path */
  sourceUrlOrPath: string;
  /** Active git branch or tag */
  branch?: string;
  /** Git commit hash / HEAD SHA */
  commitHash?: string;
  /** Total count of files included in the audit */
  totalFiles: number;
  /** Total estimated token volume of audited files */
  totalTokens: number;
  /** Breakdown of languages and their file counts */
  languages: Record<string, number>;
  /** Timestamp when repository was ingested */
  ingestedAt: string;
}
