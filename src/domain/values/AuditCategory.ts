export type AuditCategory =
  | 'SECURITY'
  | 'PERFORMANCE'
  | 'ARCHITECTURE'
  | 'REMEDIATION';

export const AuditCategories: Record<AuditCategory, AuditCategory> = {
  SECURITY: 'SECURITY',
  PERFORMANCE: 'PERFORMANCE',
  ARCHITECTURE: 'ARCHITECTURE',
  REMEDIATION: 'REMEDIATION',
};
