import { Severity } from '../values/Severity.js';
import { AuditCategory } from '../values/AuditCategory.js';

export interface RemediationPatch {
  /** Concise explanation of how to fix */
  explanation: string;
  /** Unified git diff patch that can be directly applied */
  unifiedDiff: string;
}

export interface AuditFinding {
  /** Unique ID for the finding, e.g. SEC-001, PERF-002 */
  id: string;
  /** Short descriptive title of the defect or vulnerability */
  title: string;
  /** Category of the issue */
  category: AuditCategory;
  /** Severity level */
  severity: Severity;
  /** Common Weakness Enumeration ID if security-related (e.g. CWE-89) */
  cweId?: string;
  /** Target relative file path */
  filePath: string;
  /** 1-indexed starting line number of the vulnerability */
  lineStart: number;
  /** 1-indexed ending line number */
  lineEnd: number;
  /** Exact code snippet demonstrating the flaw */
  snippet: string;
  /** Deep root-cause explanation grounded in the codebase */
  explanation: string;
  /** Potential business or security impact */
  impact: string;
  /** Ready-to-apply remediation and git diff */
  remediation?: RemediationPatch;
}
