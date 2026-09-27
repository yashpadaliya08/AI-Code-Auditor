import { describe, it, expect } from 'vitest';
import { HtmlReportExporter } from '../../src/infrastructure/storage/HtmlReportExporter.js';
import { AuditReport, JobLead } from '../../src/domain/index.js';

describe('HtmlReportExporter', () => {
  it('should generate a standalone HTML document containing summary and findings', async () => {
    const mockReport: AuditReport = {
      id: 'AUDIT-123',
      repoMetadata: {
        name: 'test-repo',
        sourceType: 'local',
        sourceUrlOrPath: '/path/test',
        branch: 'main',
        commitHash: 'abcdef123456',
        totalFiles: 2,
        totalTokens: 500,
        languages: { typescript: 2 },
        ingestedAt: new Date().toISOString(),
      },
      summary: {
        totalFindings: 1,
        bySeverity: { CRITICAL: 1, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 },
        byCategory: { SECURITY: 1 },
        healthScore: 75,
        riskLevel: 'CRITICAL',
        executiveSummary: 'One critical flaw detected in auth controller.',
      },
      findings: [
        {
          id: 'SEC-001',
          title: 'Raw SQL Injection',
          category: 'SECURITY',
          severity: 'CRITICAL',
          cweId: 'CWE-89',
          filePath: 'src/controllers/auth.controller.ts',
          lineStart: 8,
          lineEnd: 9,
          snippet: 'db.query("SELECT * FROM users WHERE email = \'" + email + "\'");',
          explanation: 'Direct parameter concatenation.',
          impact: 'Data breach.',
          remediation: {
            explanation: 'Use prepared queries.',
            unifiedDiff: '--- a/src/controllers/auth.controller.ts\n+++ b/src/controllers/auth.controller.ts\n- old\n+ new',
          },
        },
      ],
      generatedAt: new Date().toISOString(),
      scannerVersion: '1.0.0-flash',
    };

    const mockLead: JobLead = {
      repoIdentifier: 'test-repo',
      ownerOrOrg: 'Acme Corp',
      topVulnerabilitiesSummary: ['Critical SQL Injection in auth.controller.ts'],
      pitchDraft: 'Hi Acme Corp, I found a critical vulnerability...',
      estimatedRemediationHours: 4,
      suggestedQuoteUsd: '$300 - $500',
    };

    const exporter = new HtmlReportExporter({ jobLead: mockLead });
    const result = await exporter.export(mockReport);

    expect(result.content).toContain('<!DOCTYPE html>');
    expect(result.content).toContain('test-repo');
    expect(result.content).toContain('Raw SQL Injection');
    expect(result.content).toContain('CWE-89');
    expect(result.content).toContain('diff-add');
    expect(result.content).toContain('Founder / Bug Bounty Outreach Draft');
    expect(result.content).toContain('Hi Acme Corp');
  });
});
