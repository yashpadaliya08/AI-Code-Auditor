import { describe, it, expect } from 'vitest';
import { GenerateReportUseCase } from '../../src/application/use-cases/GenerateReportUseCase.js';
import { AuditReport } from '../../src/domain/index.js';

describe('GenerateReportUseCase', () => {
  const mockReport: AuditReport = {
    id: 'AUDIT-TEST',
    repoMetadata: {
      name: 'ecommerce-api',
      sourceType: 'local',
      sourceUrlOrPath: '/local/ecommerce-api',
      totalFiles: 3,
      totalTokens: 300,
      languages: { typescript: 3 },
      ingestedAt: new Date().toISOString(),
    },
    summary: {
      totalFindings: 1,
      bySeverity: { CRITICAL: 0, HIGH: 1, MEDIUM: 0, LOW: 0, INFO: 0 },
      byCategory: { PERFORMANCE: 1 },
      healthScore: 88,
      riskLevel: 'HIGH',
      executiveSummary: 'Detected N+1 database queries.',
    },
    findings: [],
    generatedAt: new Date().toISOString(),
    scannerVersion: '1.0.0-flash',
  };

  it('should export HTML format correctly', async () => {
    const useCase = new GenerateReportUseCase();
    const result = await useCase.execute({
      report: mockReport,
      format: 'html',
    });

    expect(result.content).toContain('<!DOCTYPE html>');
    expect(result.content).toContain('ecommerce-api');
  });

  it('should export JSON format correctly', async () => {
    const useCase = new GenerateReportUseCase();
    const result = await useCase.execute({
      report: mockReport,
      format: 'json',
    });

    const parsed = JSON.parse(result.content);
    expect(parsed.id).toBe('AUDIT-TEST');
    expect(parsed.summary.healthScore).toBe(88);
  });

  it('should export Markdown format correctly', async () => {
    const useCase = new GenerateReportUseCase();
    const result = await useCase.execute({
      report: mockReport,
      format: 'markdown',
    });

    expect(result.content).toContain('# 🛡️ Security & Architecture Audit: ecommerce-api');
    expect(result.content).toContain('Health Score');
  });
});
