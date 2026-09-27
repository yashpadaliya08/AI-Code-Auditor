import { describe, it, expect } from 'vitest';
import {
  calculateAuditStats,
  AuditFinding,
  estimateTokens,
  detectLanguage,
  Severities,
  AuditCategories,
} from '../../src/domain/index.js';

describe('Domain Models', () => {
  it('should calculate audit summary stats accurately', () => {
    const findings: AuditFinding[] = [
      {
        id: 'SEC-001',
        title: 'SQL Injection in User Lookup',
        category: 'SECURITY',
        severity: 'CRITICAL',
        cweId: 'CWE-89',
        filePath: 'src/repositories/UserRepository.ts',
        lineStart: 42,
        lineEnd: 45,
        snippet: 'db.query(`SELECT * FROM users WHERE id = ${id}`);',
        explanation: 'Direct parameter interpolation into raw SQL',
        impact: 'Full database exfiltration',
      },
      {
        id: 'PERF-001',
        title: 'N+1 Query in Order Listing',
        category: 'PERFORMANCE',
        severity: 'HIGH',
        filePath: 'src/services/OrderService.ts',
        lineStart: 18,
        lineEnd: 24,
        snippet: 'orders.map(async o => await getItems(o.id))',
        explanation: 'Looping individual DB queries in async map',
        impact: 'High DB latency under load',
      },
    ];

    const stats = calculateAuditStats(findings);

    expect(stats.totalFindings).toBe(2);
    expect(stats.bySeverity.CRITICAL).toBe(1);
    expect(stats.bySeverity.HIGH).toBe(1);
    expect(stats.bySeverity.MEDIUM).toBe(0);
    expect(stats.byCategory.SECURITY).toBe(1);
    expect(stats.byCategory.PERFORMANCE).toBe(1);
    expect(stats.riskLevel).toBe('CRITICAL');
    // 100 - (1 * 25 + 1 * 12) = 63
    expect(stats.healthScore).toBe(63);
  });

  it('should estimate tokens correctly using ~4 chars per token rule', () => {
    const text = '12345678';
    expect(estimateTokens(text)).toBe(2);

    const oddText = '123456789';
    expect(estimateTokens(oddText)).toBe(3);
  });

  it('should detect languages properly from extensions', () => {
    expect(detectLanguage('.ts')).toBe('typescript');
    expect(detectLanguage('.py')).toBe('python');
    expect(detectLanguage('.go')).toBe('go');
    expect(detectLanguage('.sql')).toBe('sql');
    expect(detectLanguage('.unknown')).toBe('plaintext');
  });

  it('should verify severity constants', () => {
    expect(Severities.CRITICAL).toBe('CRITICAL');
    expect(Severities.HIGH).toBe('HIGH');
    expect(AuditCategories.SECURITY).toBe('SECURITY');
  });
});
