import { AuditReport, JobLead, IngestionOptions } from '../../domain/index.js';

export interface AuditRepositoryRequestDto {
  /** Local directory path or GitHub URL / 'owner/repo' */
  target: string;
  /** Ingestion configuration options */
  ingestionOptions?: IngestionOptions;
  /** If provided, overrides default model */
  model?: string;
}

export interface AuditRepositoryResponseDto {
  success: boolean;
  report?: AuditReport;
  jobLead?: JobLead;
  error?: string;
  executionTimeMs: number;
}
