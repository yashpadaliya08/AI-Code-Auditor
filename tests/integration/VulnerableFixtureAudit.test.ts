import { describe, it, expect, vi } from 'vitest';
import * as path from 'node:path';
import { LocalRepoReader } from '../../src/infrastructure/parsers/LocalRepoReader.js';
import { formatRepoForAuditPrompt } from '../../src/infrastructure/llm/MasterAuditorPrompt.js';
import { AuditRepositoryUseCase } from '../../src/application/use-cases/AuditRepositoryUseCase.js';
import { ILlmClient } from '../../src/domain/index.js';

describe('Vulnerable App Fixture Audit Integration', () => {
  const fixturePath = path.resolve('tests/fixtures/vulnerable-app');

  it('should ingest all fixture files and prioritize config and auth routes', async () => {
    const reader = new LocalRepoReader();
    const ingested = await reader.fetch(fixturePath);

    expect(ingested.metadata.name).toBe('vulnerable-app');
    expect(ingested.files.length).toBe(4);

    const relativePaths = ingested.files.map(f => f.relativePath);
    expect(relativePaths).toContain('package.json');
    expect(relativePaths).toContain('src/controllers/auth.controller.ts');
    expect(relativePaths).toContain('src/services/billing.service.ts');
    expect(relativePaths).toContain('src/services/report.service.ts');

    // Rank 1 (package.json) must come first
    expect(relativePaths[0]).toBe('package.json');
  });

  it('should package the vulnerable code into structured audit prompt with line numbers', async () => {
    const reader = new LocalRepoReader();
    const ingested = await reader.fetch(fixturePath);
    const prompt = formatRepoForAuditPrompt(ingested);

    expect(prompt).toContain('=== TARGET REPOSITORY METADATA ===');
    expect(prompt).toContain('--- START OF FILE: src/controllers/auth.controller.ts (Language: typescript) ---');
    // Ensure line numbers are present with indentation
    expect(prompt).toMatch(/\d+:\s*const JWT_SECRET =/);
    expect(prompt).toMatch(/\d+:\s+const query = "SELECT \* FROM users/);
  });

  it('should run full audit workflow against vulnerable fixture with simulated Gemini response', async () => {
    const simulatedLlmResponse = {
      executiveSummary: 'Multiple critical security flaws detected including SQL injection, hardcoded JWT secret, and OS command injection.',
      overallScore: 35,
      findings: [
        {
          id: 'SEC-001',
          title: 'SQL Injection in User Login',
          category: 'SECURITY',
          severity: 'CRITICAL',
          cweId: 'CWE-89',
          filePath: 'src/controllers/auth.controller.ts',
          lineStart: 8,
          lineEnd: 9,
          snippet: 'const query = "SELECT * FROM users WHERE email = \'" + email + "\' AND password = \'" + password + "\'";',
          explanation: 'User-controlled email and password are concatenated directly into raw SQL query without parameterization.',
          impact: 'Complete authentication bypass and full database exfiltration.',
          remediation: {
            explanation: 'Use parameterized query placeholders.',
            unifiedDiff: '--- a/src/controllers/auth.controller.ts\n+++ b/src/controllers/auth.controller.ts\n@@ -8,2 +8,2 @@\n- const query = "SELECT * FROM users WHERE email = \'" + email + "\' AND password = \'" + password + "\'";\n- const user = await db.query(query);\n+ const query = "SELECT * FROM users WHERE email = $1 AND password = $2";\n+ const user = await db.query(query, [email, password]);',
          },
        },
        {
          id: 'SEC-002',
          title: 'OS Command Injection via wkhtmltopdf',
          category: 'SECURITY',
          severity: 'CRITICAL',
          cweId: 'CWE-78',
          filePath: 'src/services/billing.service.ts',
          lineStart: 6,
          lineEnd: 8,
          snippet: 'const cmd = `wkhtmltopdf https://billing.internal/invoices/${invoiceId} /tmp/${outputName}.pdf`;\nexec(cmd);',
          explanation: 'Unsanitized invoiceId and outputName parameters interpolated into shell execution command.',
          impact: 'Remote code execution (RCE) on the host server.',
          remediation: {
            explanation: 'Use execFile or spawn with argument array instead of shell exec.',
            unifiedDiff: '--- a/src/services/billing.service.ts\n+++ b/src/services/billing.service.ts\n@@ -6,2 +6,2 @@\n- exec(cmd);\n+ execFile("wkhtmltopdf", [url, outputPath]);',
          },
        },
      ],
      freelanceLead: {
        suggestedPitch: 'Hi maintainer, we identified 2 critical vulnerabilities (SQL Injection and RCE) in your e-commerce repository...',
        estimatedRemediationHours: 8,
        suggestedQuoteUsd: '$600 - $1,200',
        topVulnerabilitiesSummary: [
          'Critical SQL Injection in auth.controller.ts (CWE-89)',
          'Critical Remote Command Injection in billing.service.ts (CWE-78)',
        ],
      },
    };

    const mockLlm: ILlmClient = {
      generateStructuredContent: vi.fn().mockResolvedValue(simulatedLlmResponse),
      estimateTokens: vi.fn().mockReturnValue(300),
      verifyConnection: vi.fn().mockResolvedValue(true),
    };

    const auditUseCase = new AuditRepositoryUseCase(mockLlm);
    const result = await auditUseCase.execute({ target: fixturePath });

    expect(result.success).toBe(true);
    expect(result.report).toBeDefined();
    expect(result.report?.findings.length).toBe(2);
    expect(result.report?.summary.bySeverity.CRITICAL).toBe(2);
    expect(result.report?.summary.healthScore).toBe(35);
    expect(result.report?.summary.riskLevel).toBe('CRITICAL');
    expect(result.jobLead).toBeDefined();
    expect(result.jobLead?.suggestedQuoteUsd).toBe('$600 - $1,200');
  });
});
