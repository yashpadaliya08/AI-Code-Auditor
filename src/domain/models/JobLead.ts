export interface JobLead {
  /** Target repository full name or local identifier */
  repoIdentifier: string;
  /** Repository owner or company / organization name */
  ownerOrOrg: string;
  /** High priority security or architectural vulnerabilities discovered */
  topVulnerabilitiesSummary: string[];
  /** Suggested outreach pitch / email draft for the founder / maintainer */
  pitchDraft: string;
  /** Estimated remediation hours / freelance scope */
  estimatedRemediationHours: number;
  /** Suggested freelance quote (e.g. '$200 - $500') */
  suggestedQuoteUsd: string;
  /** Discovered contact email or social handles from repo metadata */
  contactInfo?: {
    email?: string;
    twitterOrX?: string;
    website?: string;
  };
}
