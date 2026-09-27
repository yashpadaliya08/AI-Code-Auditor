import { describe, it, expect } from 'vitest';
import { GitHubIssueExporter } from '../../src/infrastructure/storage/GitHubIssueExporter.js';
import { AuditFinding, RepoMetadata } from '../../src/domain/index.js';

describe('GitHubIssueExporter', () => {
  it('should format a complete GitHub Issue markdown payload with diff and labels', () => {
    const finding: AuditFinding = {
      id: 'SEC-001',
      title: 'SQL Injection in user route',
      category: 'SECURITY',
      severity: 'CRITICAL',
      cweId: 'CWE-89',
      filePath: 'src/routes/user.ts',
      lineStart: 12,
      lineEnd: 15,
      snippet: 'db.query("SELECT * FROM users WHERE id = " + id);',
      explanation: 'User id is concatenated directly into query.',
      impact: 'Arbitrary database read/write access.',
      remediation: {
        explanation: 'Use parameterized queries.',
        unifiedDiff: '--- a/src/routes/user.ts\n+++ b/src/routes/user.ts\n- old\n+ new',
      },
    };

    const metadata: RepoMetadata = {
      name: 'expressjs/express',
      sourceType: 'github',
      sourceUrlOrPath: 'https://github.com/expressjs/express.git',
      totalFiles: 1,
      totalTokens: 100,
      languages: { typescript: 1 },
      ingestedAt: new Date().toISOString(),
    };

    const payload = GitHubIssueExporter.formatIssue(finding, metadata);

    expect(payload.title).toContain('[Security] SQL Injection in user route in src/routes/user.ts:12');
    expect(payload.labels).toContain('security');
    expect(payload.labels).toContain('severity:critical');
    expect(payload.labels).toContain('cwe-89');
    expect(payload.body).toContain('## 🛡️ Security Vulnerability Report');
    expect(payload.body).toContain('CWE-89');
    expect(payload.body).toContain('Proposed Remediation Patch');
  });
});
