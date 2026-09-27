import { IngestionOptions, IngestedRepo } from '../../domain/index.js';

export interface IngestRepoRequestDto {
  /** Local directory path or GitHub URL / 'owner/repo' */
  target: string;
  /** Ingestion configuration options */
  options?: IngestionOptions;
}

export interface IngestRepoResponseDto {
  success: boolean;
  data?: IngestedRepo;
  error?: string;
}
