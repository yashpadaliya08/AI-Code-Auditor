import { describe, it, expect, vi } from 'vitest';
import { AuditRepositoryUseCase } from '../../src/application/use-cases/AuditRepositoryUseCase.js';
import { ILlmClient, IRepoFetcher, IngestedRepo } from '../../src/domain/index.js';
import { IngestRepositoryUseCase } from '../../src/application/use-cases/IngestRepositoryUseCase.js';

describe('AuditRepositoryUseCase', () => {
  it('should orchestrate ingestion, LLM analysis, stats calculation, and lead assembly', async () => {
    const mockIngested: IngestedRepo = {
      metadata: {
        name: 'owner/vulnerable-repo',
        sourceType: 'github',
        sourceUrlOrPath: 'https://github.com/owner/vulnerable-repo.git',
        totalFiles: 1,
        totalTokens: 100,
        languages: { typescript: 1 },
        ingestedAt: new Date().toISOString(),
      },
      files: [
        {
          path: '/mock/src/index.ts',
          relativePath: 'src/index.ts',
          content: 'console.log("hello");',
          sizeBytes: 21,
          tokenEstimate: 5,
          extension: '.ts',
          language: 'typescript',
        },
      ],
    };

    const mockLlmResponse = {
      executiveSummary: 'Repository contains critical issues.',
      overallScore: 65,
      findings: [
        {
          id: 'SEC-001',
          title: 'Remote Command Execution via child_process.exec',
          category: 'SECURITY',
          severity: 'CRITICAL',
          cweId: 'CWE-78',
          filePath: 'src/index.ts',
          lineStart: 1,
          lineEnd: 1,
          snippet: 'console.log("hello");',
          explanation: 'Demonstration of RCE',
          impact: 'Server takeover',
          remediation: {
            explanation: 'Sanitize input',
            unifiedDiff: 'diff --git a/src/index.ts b/src/index.ts',
          },
        },
      ],
      freelanceLead: {
        suggestedPitch: 'Hi Owner, I found an RCE flaw in your index.ts...',
        estimatedRemediationHours: 5,
        suggestedQuoteUsd: '$400 - $800',
        topVulnerabilitiesSummary: ['Critical RCE in index.ts (CWE-78)'],
      },
    };

    const mockLlmClient: ILlmClient = {
      generateStructuredContent: vi.fn().mockResolvedValue(mockLlmResponse),
      estimateTokens: vi.fn().mockReturnValue(100),
      verifyConnection: vi.fn().mockResolvedValue(true),
    };

    const mockLocalReader: IRepoFetcher = {
      fetch: vi.fn().mockResolvedValue(mockIngested),
    };

    const ingestUseCase = new IngestRepositoryUseCase(mockLocalReader, mockLocalReader);
    const auditUseCase = new AuditRepositoryUseCase(mockLlmClient, ingestUseCase);

    const response = await auditUseCase.execute({ target: '.' });

    expect(response.success).toBe(true);
    expect(response.report).toBeDefined();
    expect(response.report?.findings.length).toBe(1);
    expect(response.report?.findings[0]?.id).toBe('SEC-001');
    expect(response.report?.summary.bySeverity.CRITICAL).toBe(1);
    expect(response.jobLead).toBeDefined();
    expect(response.jobLead?.suggestedQuoteUsd).toBe('$400 - $800');
    expect(response.jobLead?.ownerOrOrg).toBe('owner');
  });

  it('should handle ingestion failures gracefully', async () => {
    const mockLlmClient: ILlmClient = {
      generateStructuredContent: vi.fn(),
      estimateTokens: vi.fn().mockReturnValue(0),
      verifyConnection: vi.fn().mockResolvedValue(true),
    };

    const mockLocalReader: IRepoFetcher = {
      fetch: vi.fn().mockRejectedValue(new Error('Directory not found')),
    };

    const ingestUseCase = new IngestRepositoryUseCase(mockLocalReader, mockLocalReader);
    const auditUseCase = new AuditRepositoryUseCase(mockLlmClient, ingestUseCase);

    const response = await auditUseCase.execute({ target: './invalid-directory-path-xyz' });

    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
  });
});
