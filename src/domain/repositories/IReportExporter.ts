import { AuditReport } from '../models/AuditReport.js';

export interface ExportResult {
  filePath?: string;
  content: string;
}

export interface IReportExporter {
  /**
   * Export an AuditReport to a specific format (e.g., Markdown, HTML, JSON).
   */
  export(report: AuditReport, destinationPath?: string): Promise<ExportResult>;
}
