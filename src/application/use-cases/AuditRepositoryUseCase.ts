import {
  AuditReport,
  AuditFinding,
  JobLead,
  calculateAuditStats,
  ILlmClient,
} from '../../domain/index.js';
import { IngestRepositoryUseCase } from './IngestRepositoryUseCase.js';
import {
  MASTER_SYSTEM_INSTRUCTION,
  formatRepoForAuditPrompt,
} from '../../infrastructure/llm/MasterAuditorPrompt.js';
import {
  AuditResponseSchema,
  RawAuditResponse,
} from '../../infrastructure/llm/AuditResponseSchema.js';
import {
  AuditRepositoryRequestDto,
  AuditRepositoryResponseDto,
} from '../dtos/AuditDto.js';

export class AuditRepositoryUseCase {
  private ingestUseCase: IngestRepositoryUseCase;
  private llmClient: ILlmClient;

  constructor(llmClient: ILlmClient, ingestUseCase?: IngestRepositoryUseCase) {
    this.llmClient = llmClient;
    this.ingestUseCase = ingestUseCase ?? new IngestRepositoryUseCase();
  }

  public async execute(
    request: AuditRepositoryRequestDto
  ): Promise<AuditRepositoryResponseDto> {
    const startTime = Date.now();

    try {
      // 1. Ingest repository files & extract metadata
      const ingestResult = await this.ingestUseCase.execute({
        target: request.target,
        options: request.ingestionOptions,
      });

      if (!ingestResult.success || !ingestResult.data) {
        return {
          success: false,
          error: ingestResult.error ?? 'Failed to ingest target repository',
          executionTimeMs: Date.now() - startTime,
        };
      }

      const ingested = ingestResult.data;

      if (ingested.files.length === 0) {
        return {
          success: false,
          error: 'No readable source files found in target repository to audit',
          executionTimeMs: Date.now() - startTime,
        };
      }

      // 2. Format context prompt with numbered source lines
      const prompt = formatRepoForAuditPrompt(ingested);

      // 3. Call LLM with schema enforcement
      const rawResponse = await this.llmClient.generateStructuredContent<unknown>(
        prompt,
        {
          systemInstruction: MASTER_SYSTEM_INSTRUCTION,
          model: request.model,
          temperature: 0.2,
        }
      );

      // 4. Validate output with Zod
      const validated: RawAuditResponse = AuditResponseSchema.parse(rawResponse);

      // 5. Transform validated findings into domain models
      const findings: AuditFinding[] = validated.findings.map(f => ({
        id: f.id,
        title: f.title,
        category: f.category,
        severity: f.severity,
        cweId: f.cweId,
        filePath: f.filePath,
        lineStart: f.lineStart,
        lineEnd: f.lineEnd,
        snippet: f.snippet,
        explanation: f.explanation,
        impact: f.impact,
        remediation: f.remediation,
      }));

      // 6. Calculate summary metrics and health score
      const stats = calculateAuditStats(findings);
      stats.executiveSummary = validated.executiveSummary;
      if (typeof validated.overallScore === 'number') {
        stats.healthScore = validated.overallScore;
      }

      const report: AuditReport = {
        id: `AUDIT-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        repoMetadata: ingested.metadata,
        summary: stats,
        findings,
        generatedAt: new Date().toISOString(),
        scannerVersion: '1.0.0-flash',
      };

      // 7. Assemble freelance lead magnet if available
      let jobLead: JobLead | undefined;
      if (validated.freelanceLead) {
        jobLead = {
          repoIdentifier: ingested.metadata.name,
          ownerOrOrg: ingested.metadata.name.includes('/')
            ? ingested.metadata.name.split('/')[0] ?? 'Founder'
            : 'Maintainer',
          topVulnerabilitiesSummary: validated.freelanceLead.topVulnerabilitiesSummary,
          pitchDraft: validated.freelanceLead.suggestedPitch,
          estimatedRemediationHours: validated.freelanceLead.estimatedRemediationHours,
          suggestedQuoteUsd: validated.freelanceLead.suggestedQuoteUsd,
        };
      }

      return {
        success: true,
        report,
        jobLead,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unknown error during audit execution';
      return {
        success: false,
        error: message,
        executionTimeMs: Date.now() - startTime,
      };
    }
  }
}
