import { z } from 'zod';

export const RemediationSchema = z.preprocess((val) => {
  if (typeof val === 'string') {
    return {
      explanation: val,
      unifiedDiff: '',
    };
  }
  return val;
}, z.object({
  explanation: z.string().default('Apply recommended security patch.'),
  unifiedDiff: z.string().default(''),
}));

export const FindingSchema = z.preprocess((raw: any) => {
  if (!raw || typeof raw !== 'object') return raw;

  return {
    id: raw.id || `FINDING-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    title: raw.title || raw.name || 'Unspecified Vulnerability',
    category: (raw.category || raw.type || 'SECURITY').toUpperCase(),
    severity: (raw.severity || 'MEDIUM').toUpperCase(),
    cweId: raw.cweId || raw.cwe || raw.cwe_id,
    filePath: raw.filePath || raw.file || raw.path || raw.location || 'unknown',
    lineStart: Number(raw.lineStart || raw.startLine || raw.line || raw.lines?.[0] || 1),
    lineEnd: Number(raw.lineEnd || raw.endLine || raw.lineStart || raw.line || 1),
    snippet: raw.snippet || raw.code || raw.evidence || '',
    explanation: raw.explanation || raw.description || raw.details || 'Vulnerability detected in codebase.',
    impact: raw.impact || raw.businessImpact || 'Potential security risk or performance degradation.',
    remediation: raw.remediation,
  };
}, z.object({
  id: z.string(),
  title: z.string(),
  category: z.enum(['SECURITY', 'PERFORMANCE', 'ARCHITECTURE', 'REMEDIATION']).default('SECURITY'),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']).default('MEDIUM'),
  cweId: z.string().optional(),
  filePath: z.string(),
  lineStart: z.number().int().positive().default(1),
  lineEnd: z.number().int().positive().default(1),
  snippet: z.string().default(''),
  explanation: z.string(),
  impact: z.string().default('Security risk identified.'),
  remediation: RemediationSchema.optional(),
}));

export const FreelanceLeadSchema = z.preprocess((raw: any) => {
  if (!raw || typeof raw !== 'object') return undefined;
  return {
    suggestedPitch: raw.suggestedPitch || raw.pitch || raw.pitchDraft || 'Hi maintainer, we identified security vulnerabilities...',
    estimatedRemediationHours: Number(raw.estimatedRemediationHours || raw.hours || 4),
    suggestedQuoteUsd: raw.suggestedQuoteUsd || raw.quote || '$300 - $600',
    topVulnerabilitiesSummary: Array.isArray(raw.topVulnerabilitiesSummary)
      ? raw.topVulnerabilitiesSummary
      : [raw.topVulnerabilitiesSummary || 'Critical vulnerabilities detected'],
  };
}, z.object({
  suggestedPitch: z.string(),
  estimatedRemediationHours: z.number().default(4),
  suggestedQuoteUsd: z.string().default('$300 - $600'),
  topVulnerabilitiesSummary: z.array(z.string()).default([]),
}));

export const AuditResponseSchema = z.preprocess((raw: any) => {
  if (!raw || typeof raw !== 'object') return raw;

  return {
    executiveSummary: raw.executiveSummary || raw.summary || raw.overview,
    overallScore: typeof raw.overallScore === 'number'
      ? raw.overallScore
      : typeof raw.score === 'number'
      ? raw.score
      : undefined,
    findings: Array.isArray(raw.findings)
      ? raw.findings
      : Array.isArray(raw.vulnerabilities)
      ? raw.vulnerabilities
      : undefined,
    freelanceLead: raw.freelanceLead || raw.lead || raw.pitch,
  };
}, z.object({
  executiveSummary: z.string(),
  overallScore: z.number().min(0).max(100),
  findings: z.array(FindingSchema),
  freelanceLead: FreelanceLeadSchema.optional(),
}));

export type RawAuditResponse = z.infer<typeof AuditResponseSchema>;
