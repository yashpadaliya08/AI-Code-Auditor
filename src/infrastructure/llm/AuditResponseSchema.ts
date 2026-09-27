import { z } from 'zod';

export const RemediationSchema = z.object({
  explanation: z.string().describe('Clear, concise description of the fix'),
  unifiedDiff: z.string().describe('Syntactically valid unified git diff patch ready to apply'),
});

export const FindingSchema = z.object({
  id: z.string().describe('Unique identifier for this finding (e.g. SEC-001, PERF-001)'),
  title: z.string().describe('Concise headline of the vulnerability or flaw'),
  category: z.enum(['SECURITY', 'PERFORMANCE', 'ARCHITECTURE', 'REMEDIATION']),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']),
  cweId: z.string().optional().describe('CWE ID if applicable, e.g. CWE-89, CWE-798'),
  filePath: z.string().describe('Relative path to the affected source file in the repository'),
  lineStart: z.number().int().positive().describe('Starting line number of the vulnerable block (1-indexed)'),
  lineEnd: z.number().int().positive().describe('Ending line number of the vulnerable block (1-indexed)'),
  snippet: z.string().describe('Exact code snippet containing the flaw'),
  explanation: z.string().describe('Detailed technical explanation of the vulnerability and attack vector'),
  impact: z.string().describe('Specific real-world impact if exploited or triggered'),
  remediation: RemediationSchema.optional(),
});

export const FreelanceLeadSchema = z.object({
  suggestedPitch: z.string().describe('Warm, professional, value-first pitch email draft for the founder/maintainer'),
  estimatedRemediationHours: z.number().describe('Estimated hours required to fix all critical/high findings'),
  suggestedQuoteUsd: z.string().describe('Suggested freelance pricing quote range (e.g. $350 - $700)'),
  topVulnerabilitiesSummary: z.array(z.string()).describe('Top 2-3 most compelling critical flaw summaries for outreach'),
});

export const AuditResponseSchema = z.object({
  executiveSummary: z.string().describe('High-level executive overview of repository security posture and architectural health'),
  overallScore: z.number().min(0).max(100).describe('Health/security score from 0 (compromised) to 100 (rock solid)'),
  findings: z.array(FindingSchema).describe('List of discovered findings grounded in actual code'),
  freelanceLead: FreelanceLeadSchema.optional().describe('Freelance lead magnet analysis for founder outreach'),
});

export type RawAuditResponse = z.infer<typeof AuditResponseSchema>;
