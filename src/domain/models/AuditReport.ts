import { AuditFinding } from './AuditFinding.js';
import { RepoMetadata } from './RepoMetadata.js';
import { Severity } from '../values/Severity.js';

export interface AuditSummaryStats {
  totalFindings: number;
  bySeverity: Record<Severity, number>;
  byCategory: Record<string, number>;
  healthScore: number; // 0 - 100
  riskLevel: 'CRITICAL' | 'HIGH' | 'ELEVATED' | 'MODERATE' | 'LOW';
  executiveSummary: string;
}

export interface AuditReport {
  id: string;
  repoMetadata: RepoMetadata;
  summary: AuditSummaryStats;
  findings: AuditFinding[];
  generatedAt: string;
  scannerVersion: string;
}

export function calculateAuditStats(findings: AuditFinding[]): AuditSummaryStats {
  const bySeverity: Record<Severity, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    INFO: 0,
  };

  const byCategory: Record<string, number> = {
    SECURITY: 0,
    PERFORMANCE: 0,
    ARCHITECTURE: 0,
    REMEDIATION: 0,
  };

  for (const f of findings) {
    const currentSev = bySeverity[f.severity];
    if (currentSev !== undefined) {
      bySeverity[f.severity] = currentSev + 1;
    }
    const currentCat = byCategory[f.category];
    byCategory[f.category] = (currentCat ?? 0) + 1;
  }

  const critCount = bySeverity.CRITICAL ?? 0;
  const highCount = bySeverity.HIGH ?? 0;
  const medCount = bySeverity.MEDIUM ?? 0;
  const lowCount = bySeverity.LOW ?? 0;

  // Calculate health score: 100 minus weighted penalties
  // Critical: -25 pts, High: -12 pts, Medium: -5 pts, Low: -1 pt
  const penalty =
    critCount * 25 +
    highCount * 12 +
    medCount * 5 +
    lowCount * 1;

  const healthScore = Math.max(0, Math.min(100, 100 - penalty));

  let riskLevel: AuditSummaryStats['riskLevel'] = 'LOW';
  if (bySeverity.CRITICAL > 0 || healthScore < 50) {
    riskLevel = 'CRITICAL';
  } else if (bySeverity.HIGH > 0 || healthScore < 70) {
    riskLevel = 'HIGH';
  } else if (bySeverity.MEDIUM > 2 || healthScore < 85) {
    riskLevel = 'ELEVATED';
  } else if (bySeverity.MEDIUM > 0 || healthScore < 95) {
    riskLevel = 'MODERATE';
  }

  return {
    totalFindings: findings.length,
    bySeverity,
    byCategory,
    healthScore,
    riskLevel,
    executiveSummary: '',
  };
}
