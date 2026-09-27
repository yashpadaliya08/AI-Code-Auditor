import { AuditFinding, RepoMetadata } from '../../domain/index.js';

export interface GitHubIssuePayload {
  title: string;
  body: string;
  labels: string[];
}

export class GitHubIssueExporter {
  /**
   * Generates a ready-to-post GitHub Issue markdown payload for a specific vulnerability finding.
   */
  public static formatIssue(
    finding: AuditFinding,
    repoMetadata: RepoMetadata
  ): GitHubIssuePayload {
    const title = `[Security] ${finding.title} in ${finding.filePath}:${finding.lineStart}`;

    const labels = [
      'security',
      `severity:${finding.severity.toLowerCase()}`,
      finding.category.toLowerCase(),
    ];

    if (finding.cweId) {
      labels.push(finding.cweId.toLowerCase());
    }

    const body = [
      `## 🛡️ Security Vulnerability Report: ${finding.title}`,
      ``,
      `> **Discovered by [AI Code Auditor](https://github.com/your-org/ai-code-auditor)** during an automated codebase audit.`,
      ``,
      `### 1. Overview`,
      `- **Repository**: \`${repoMetadata.name}\``,
      `- **Severity**: **${finding.severity}**`,
      `- **Category**: ${finding.category}`,
      finding.cweId ? `- **CWE Classification**: [${finding.cweId}](https://cwe.mitre.org/data/definitions/${finding.cweId.replace('CWE-', '')}.html)` : '',
      `- **Location**: \`${finding.filePath}\` (Lines ${finding.lineStart} - ${finding.lineEnd})`,
      ``,
      `### 2. Vulnerable Code Snippet`,
      '```' + (finding.filePath.endsWith('.ts') ? 'typescript' : 'javascript'),
      finding.snippet,
      '```',
      ``,
      `### 3. Detailed Root Cause Analysis`,
      finding.explanation,
      ``,
      `### 4. Real-World Business & Security Impact`,
      `> ⚠️ **Impact:** ${finding.impact}`,
      ``,
      finding.remediation ? [
        `### 5. Proposed Remediation Patch`,
        `${finding.remediation.explanation}`,
        ``,
        '```diff',
        finding.remediation.unifiedDiff,
        '```',
      ].join('\n') : '',
      ``,
      `---`,
      `*Reported responsibly via AI Code Auditor. If you would like full repository security hardening, reach out to the auditor maintainers.*`,
    ].filter(Boolean).join('\n');

    return {
      title,
      body,
      labels,
    };
  }
}
