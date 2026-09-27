import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  AuditReport,
  IReportExporter,
  ExportResult,
  JobLead,
} from '../../domain/index.js';

export interface HtmlExporterOptions {
  jobLead?: JobLead;
}

export class HtmlReportExporter implements IReportExporter {
  private jobLead?: JobLead;

  constructor(options?: HtmlExporterOptions) {
    this.jobLead = options?.jobLead;
  }

  public async export(
    report: AuditReport,
    destinationPath?: string
  ): Promise<ExportResult> {
    const html = this.generateHtml(report, this.jobLead);

    let finalPath = destinationPath;
    if (finalPath) {
      const resolved = path.resolve(finalPath);
      await fs.mkdir(path.dirname(resolved), { recursive: true });
      await fs.writeFile(resolved, html, 'utf-8');
      finalPath = resolved;
    }

    return {
      filePath: finalPath,
      content: html,
    };
  }

  private generateHtml(report: AuditReport, jobLead?: JobLead): string {
    const { summary, findings, repoMetadata } = report;

    const safeJsonFindings = JSON.stringify(findings).replace(/</g, '\\u003c');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security & Quality Audit: ${this.escapeHtml(repoMetadata.name)}</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --card-border: #1f293d;
      --card-hover: #162035;
      --text-main: #f3f4f6;
      --text-muted: #9ca3af;
      --primary: #3b82f6;
      --critical: #ef4444;
      --critical-bg: rgba(239, 68, 68, 0.15);
      --high: #f97316;
      --high-bg: rgba(249, 115, 22, 0.15);
      --medium: #eab308;
      --medium-bg: rgba(234, 179, 8, 0.15);
      --low: #10b981;
      --low-bg: rgba(16, 185, 129, 0.15);
      --info: #6b7280;
      --info-bg: rgba(107, 114, 128, 0.15);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text-main);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      padding: 2rem 1.5rem;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 2rem;
      border-bottom: 1px solid var(--card-border);
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1.5rem;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .logo-badge {
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      color: white;
      font-weight: 800;
      font-size: 1.25rem;
      padding: 0.5rem 0.75rem;
      border-radius: 8px;
      letter-spacing: -0.5px;
    }

    .brand-text h1 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #fff;
    }

    .brand-text p {
      font-size: 0.875rem;
      color: var(--text-muted);
    }

    .meta-badges {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .badge {
      font-size: 0.75rem;
      padding: 0.35rem 0.7rem;
      border-radius: 9999px;
      font-weight: 600;
      background: #1f2937;
      color: #d1d5db;
      border: 1px solid #374151;
    }

    /* Score Ring and Summary Grid */
    .summary-grid {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    @media (max-width: 860px) {
      .summary-grid { grid-template-columns: 1fr; }
    }

    .score-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }

    .score-circle {
      width: 130px;
      height: 130px;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
      border: 6px solid ${this.getScoreColor(summary.healthScore)};
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.4);
    }

    .score-number {
      font-size: 2.75rem;
      font-weight: 800;
      line-height: 1;
      color: #fff;
    }

    .score-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .risk-pill {
      margin-top: 0.5rem;
      font-size: 0.85rem;
      font-weight: 700;
      padding: 0.3rem 0.9rem;
      border-radius: 9999px;
      text-transform: uppercase;
      background: ${this.getRiskBg(summary.riskLevel)};
      color: ${this.getRiskColor(summary.riskLevel)};
    }

    .details-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .exec-summary {
      font-size: 0.95rem;
      color: #e5e7eb;
      margin-bottom: 1.5rem;
      line-height: 1.6;
    }

    .counters-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 0.75rem;
    }

    .counter-box {
      background: #0d121f;
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 0.75rem;
      text-align: center;
    }

    .counter-value {
      font-size: 1.5rem;
      font-weight: 700;
    }

    .counter-name {
      font-size: 0.7rem;
      text-transform: uppercase;
      color: var(--text-muted);
      letter-spacing: 0.5px;
      margin-top: 0.2rem;
    }

    .color-critical { color: var(--critical); }
    .color-high { color: var(--high); }
    .color-medium { color: var(--medium); }
    .color-low { color: var(--low); }
    .color-info { color: var(--info); }

    /* Filter & Search Bar */
    .controls-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .filter-tabs {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .filter-btn {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      color: var(--text-muted);
      padding: 0.45rem 0.9rem;
      border-radius: 6px;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .filter-btn.active, .filter-btn:hover {
      background: #1f293d;
      color: #fff;
      border-color: #3b82f6;
    }

    .search-input {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      color: #fff;
      padding: 0.45rem 1rem;
      border-radius: 6px;
      font-size: 0.85rem;
      width: 260px;
    }
    .search-input:focus {
      outline: none;
      border-color: var(--primary);
    }

    /* Findings List */
    .findings-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .finding-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 1.25rem;
      transition: border-color 0.2s;
    }
    .finding-card:hover {
      border-color: #374151;
    }

    .finding-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: 0.75rem;
      flex-wrap: wrap;
    }

    .finding-title-group {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      flex-wrap: wrap;
    }

    .severity-badge {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
      text-transform: uppercase;
    }

    .badge-CRITICAL { background: var(--critical-bg); color: var(--critical); border: 1px solid var(--critical); }
    .badge-HIGH { background: var(--high-bg); color: var(--high); border: 1px solid var(--high); }
    .badge-MEDIUM { background: var(--medium-bg); color: var(--medium); border: 1px solid var(--medium); }
    .badge-LOW { background: var(--low-bg); color: var(--low); border: 1px solid var(--low); }
    .badge-INFO { background: var(--info-bg); color: var(--info); border: 1px solid var(--info); }

    .cwe-tag {
      font-size: 0.75rem;
      color: #93c5fd;
      background: rgba(59, 130, 246, 0.1);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      border: 1px solid rgba(59, 130, 246, 0.3);
      font-family: monospace;
    }

    .finding-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: #fff;
    }

    .location-info {
      font-family: monospace;
      font-size: 0.8rem;
      color: #9ca3af;
      margin-bottom: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .code-block {
      background: #090d16;
      border: 1px solid #1f2937;
      border-radius: 6px;
      padding: 0.85rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.85rem;
      overflow-x: auto;
      margin-bottom: 0.85rem;
      color: #d1d5db;
    }

    .explanation-text {
      font-size: 0.9rem;
      color: #d1d5db;
      margin-bottom: 0.6rem;
    }

    .impact-box {
      font-size: 0.85rem;
      color: #fca5a5;
      background: rgba(239, 68, 68, 0.08);
      border-left: 3px solid var(--critical);
      padding: 0.5rem 0.75rem;
      border-radius: 0 4px 4px 0;
      margin-bottom: 0.85rem;
    }

    .diff-section {
      background: #080d1a;
      border: 1px solid #1e293b;
      border-radius: 6px;
      margin-top: 0.85rem;
      overflow: hidden;
    }

    .diff-header {
      background: #0f172a;
      padding: 0.4rem 0.85rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #1e293b;
    }

    .diff-code {
      font-family: ui-monospace, monospace;
      font-size: 0.8rem;
      padding: 0.75rem;
      white-space: pre-wrap;
      overflow-x: auto;
      line-height: 1.4;
    }

    .diff-add { color: #4ade80; background: rgba(74, 222, 128, 0.1); display: block; }
    .diff-sub { color: #f87171; background: rgba(248, 113, 113, 0.1); display: block; }

    .copy-btn {
      background: #1e293b;
      color: #cbd5e1;
      border: 1px solid #334155;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.7rem;
      cursor: pointer;
    }
    .copy-btn:hover { background: #334155; color: #fff; }

    /* Pitch Card for Freelance / Bounty outreach */
    .pitch-banner {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(139, 92, 246, 0.12));
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }
    .pitch-banner h3 {
      font-size: 1.1rem;
      color: #60a5fa;
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .pitch-body {
      font-size: 0.9rem;
      color: #cbd5e1;
      white-space: pre-wrap;
      background: rgba(0, 0, 0, 0.3);
      padding: 1rem;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      margin-top: 0.75rem;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">
        <div class="logo-badge">🛡️ AI</div>
        <div class="brand-text">
          <h1>Security & Architecture Audit</h1>
          <p>Repository: <strong>${this.escapeHtml(repoMetadata.name)}</strong> (${repoMetadata.sourceType})</p>
        </div>
      </div>
      <div class="meta-badges">
        <span class="badge">Branch: ${this.escapeHtml(repoMetadata.branch ?? 'default')}</span>
        <span class="badge">Commit: ${this.escapeHtml((repoMetadata.commitHash ?? 'HEAD').slice(0, 8))}</span>
        <span class="badge">Files Audited: ${repoMetadata.totalFiles}</span>
        <span class="badge">Tokens: ~${repoMetadata.totalTokens.toLocaleString()}</span>
        <span class="badge">Date: ${new Date(report.generatedAt).toLocaleDateString()}</span>
      </div>
    </header>

    ${jobLead ? `
    <div class="pitch-banner">
      <h3>🚀 Founder / Bug Bounty Outreach Draft</h3>
      <p style="font-size: 0.85rem; color: #94a3b8;">
        Estimated Remediation: <strong>${jobLead.estimatedRemediationHours} hours</strong> |
        Suggested Freelance Range: <strong>${this.escapeHtml(jobLead.suggestedQuoteUsd)}</strong>
      </p>
      <div class="pitch-body">${this.escapeHtml(jobLead.pitchDraft)}</div>
    </div>
    ` : ''}

    <div class="summary-grid">
      <div class="score-card">
        <div class="score-circle">
          <div class="score-number">${summary.healthScore}</div>
          <div class="score-label">Health Score</div>
        </div>
        <div class="risk-pill">${summary.riskLevel} RISK</div>
      </div>

      <div class="details-card">
        <div>
          <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem; color: #fff;">Executive Summary</h3>
          <p class="exec-summary">${this.escapeHtml(summary.executiveSummary || 'Audit completed across full codebase context.')}</p>
        </div>
        <div class="counters-row">
          <div class="counter-box">
            <div class="counter-value color-critical">${summary.bySeverity.CRITICAL}</div>
            <div class="counter-name">Critical</div>
          </div>
          <div class="counter-box">
            <div class="counter-value color-high">${summary.bySeverity.HIGH}</div>
            <div class="counter-name">High</div>
          </div>
          <div class="counter-box">
            <div class="counter-value color-medium">${summary.bySeverity.MEDIUM}</div>
            <div class="counter-name">Medium</div>
          </div>
          <div class="counter-box">
            <div class="counter-value color-low">${summary.bySeverity.LOW}</div>
            <div class="counter-name">Low</div>
          </div>
          <div class="counter-box">
            <div class="counter-value color-info">${summary.bySeverity.INFO}</div>
            <div class="counter-name">Info</div>
          </div>
        </div>
      </div>
    </div>

    <div class="controls-row">
      <div class="filter-tabs">
        <button class="filter-btn active" onclick="filterFindings('ALL')">All (${findings.length})</button>
        <button class="filter-btn" onclick="filterFindings('CRITICAL')">Critical (${summary.bySeverity.CRITICAL})</button>
        <button class="filter-btn" onclick="filterFindings('HIGH')">High (${summary.bySeverity.HIGH})</button>
        <button class="filter-btn" onclick="filterFindings('MEDIUM')">Medium (${summary.bySeverity.MEDIUM})</button>
        <button class="filter-btn" onclick="filterFindings('LOW')">Low (${summary.bySeverity.LOW})</button>
      </div>
      <input type="text" id="searchInput" class="search-input" placeholder="Search by title, file, or CWE..." oninput="handleSearch()">
    </div>

    <div id="findingsContainer" class="findings-list">
      ${findings.map((f, idx) => `
      <div class="finding-card" data-severity="${f.severity}" data-search="${this.escapeHtml(`${f.title} ${f.filePath} ${f.cweId ?? ''}`).toLowerCase()}">
        <div class="finding-header">
          <div class="finding-title-group">
            <span class="severity-badge badge-${f.severity}">${f.severity}</span>
            ${f.cweId ? `<span class="cwe-tag">${this.escapeHtml(f.cweId)}</span>` : ''}
            <span class="badge">${f.category}</span>
            <h2 class="finding-title">${this.escapeHtml(f.title)}</h2>
          </div>
          <span style="font-family: monospace; font-size: 0.75rem; color: #6b7280;">#${this.escapeHtml(f.id)}</span>
        </div>

        <div class="location-info">
          📁 ${this.escapeHtml(f.filePath)} : L${f.lineStart} - L${f.lineEnd}
        </div>

        <div class="code-block">${this.escapeHtml(f.snippet)}</div>

        <p class="explanation-text">${this.escapeHtml(f.explanation)}</p>

        <div class="impact-box">
          <strong>Impact:</strong> ${this.escapeHtml(f.impact)}
        </div>

        ${f.remediation ? `
        <div class="diff-section">
          <div class="diff-header">
            <span>Proposed Remediation: ${this.escapeHtml(f.remediation.explanation)}</span>
            <button class="copy-btn" onclick="copyDiff(${idx})">Copy Diff</button>
          </div>
          <div class="diff-code" id="diff-${idx}">${this.formatDiffLines(f.remediation.unifiedDiff)}</div>
        </div>
        ` : ''}
      </div>
      `).join('')}
    </div>
  </div>

  <script>
    const findingsData = ${safeJsonFindings};

    function filterFindings(sev) {
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      event.target.classList.add('active');

      const cards = document.querySelectorAll('.finding-card');
      cards.forEach(card => {
        if (sev === 'ALL' || card.getAttribute('data-severity') === sev) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    }

    function handleSearch() {
      const q = document.getElementById('searchInput').value.toLowerCase().trim();
      const cards = document.querySelectorAll('.finding-card');
      cards.forEach(card => {
        const text = card.getAttribute('data-search') || '';
        if (!q || text.includes(q)) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    }

    function copyDiff(idx) {
      const finding = findingsData[idx];
      if (finding && finding.remediation && finding.remediation.unifiedDiff) {
        navigator.clipboard.writeText(finding.remediation.unifiedDiff).then(() => {
          alert('Unified git diff copied to clipboard!');
        });
      }
    }
  </script>
</body>
</html>`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private formatDiffLines(diff: string): string {
    const lines = diff.split(/\r?\n/);
    return lines.map(line => {
      const escaped = this.escapeHtml(line);
      if (line.startsWith('+') && !line.startsWith('+++')) {
        return `<span class="diff-add">${escaped}</span>`;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        return `<span class="diff-sub">${escaped}</span>`;
      }
      return escaped;
    }).join('\n');
  }

  private getScoreColor(score: number): string {
    if (score >= 85) return '#10b981';
    if (score >= 70) return '#eab308';
    if (score >= 50) return '#f97316';
    return '#ef4444';
  }

  private getRiskColor(risk: string): string {
    switch (risk) {
      case 'CRITICAL': return '#ef4444';
      case 'HIGH': return '#f97316';
      case 'ELEVATED': return '#eab308';
      case 'MODERATE': return '#3b82f6';
      default: return '#10b981';
    }
  }

  private getRiskBg(risk: string): string {
    switch (risk) {
      case 'CRITICAL': return 'rgba(239, 68, 68, 0.2)';
      case 'HIGH': return 'rgba(249, 115, 22, 0.2)';
      case 'ELEVATED': return 'rgba(234, 179, 8, 0.2)';
      case 'MODERATE': return 'rgba(59, 130, 246, 0.2)';
      default: return 'rgba(16, 185, 129, 0.2)';
    }
  }
}
