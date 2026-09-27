import { describe, it, expect } from 'vitest';
import { AuditResponseSchema } from '../../src/infrastructure/llm/AuditResponseSchema.js';

describe('AuditResponseSchema', () => {
  it('should successfully validate a complete, structured LLM response', () => {
    const validData = {
      executiveSummary: 'Repository demonstrates overall clean design with 1 critical SQL injection in auth.',
      overallScore: 68,
      findings: [
        {
          id: 'SEC-001',
          title: 'Direct SQL String Concatenation in User Lookup',
          category: 'SECURITY',
          severity: 'CRITICAL',
          cweId: 'CWE-89',
          filePath: 'src/routes/login.ts',
          lineStart: 42,
          lineEnd: 46,
          snippet: 'db.query("SELECT * FROM users WHERE email = \'" + email + "\'");',
          explanation: 'Tainted user input concatenated into query string without prepared statements.',
          impact: 'Full authentication bypass and database exfiltration.',
          remediation: {
            explanation: 'Use parameterized queries with placeholders ($1).',
            unifiedDiff: '--- a/src/routes/login.ts\n+++ b/src/routes/login.ts\n@@ -42,1 +42,1 @@\n- db.query("SELECT * FROM users WHERE email = \'" + email + "\'");\n+ db.query("SELECT * FROM users WHERE email = $1", [email]);',
          },
        },
      ],
      freelanceLead: {
        suggestedPitch: 'Hey maintainer, I discovered a critical SQL injection in your login route...',
        estimatedRemediationHours: 4,
        suggestedQuoteUsd: '$300 - $600',
        topVulnerabilitiesSummary: [
          'Critical SQL Injection in login endpoint (CWE-89)',
        ],
      },
    };

    const parsed = AuditResponseSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.findings.length).toBe(1);
      expect(parsed.data.findings[0]?.severity).toBe('CRITICAL');
      expect(parsed.data.freelanceLead?.suggestedQuoteUsd).toBe('$300 - $600');
    }
  });

  it('should reject responses with missing mandatory fields', () => {
    const invalidData = {
      executiveSummary: 'Broken response without findings',
    };

    const parsed = AuditResponseSchema.safeParse(invalidData);
    expect(parsed.success).toBe(false);
  });
});
