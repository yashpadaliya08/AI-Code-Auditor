import {
  AuditReport,
  IReportExporter,
  ExportResult,
  JobLead,
} from '../../domain/index.js';
import { HtmlReportExporter } from '../../infrastructure/storage/HtmlReportExporter.js';
import { JsonReportExporter } from '../../infrastructure/storage/JsonReportExporter.js';
import { MarkdownReportExporter } from '../../infrastructure/storage/MarkdownReportExporter.js';

export type ReportFormat = 'html' | 'json' | 'markdown';

export interface GenerateReportRequestDto {
  report: AuditReport;
  jobLead?: JobLead;
  format?: ReportFormat;
  outputPath?: string;
}

export class GenerateReportUseCase {
  public async execute(
    request: GenerateReportRequestDto
  ): Promise<ExportResult> {
    const { report, jobLead, format = 'html', outputPath } = request;

    let exporter: IReportExporter;
    switch (format) {
      case 'json':
        exporter = new JsonReportExporter({ jobLead });
        break;
      case 'markdown':
        exporter = new MarkdownReportExporter({ jobLead });
        break;
      case 'html':
      default:
        exporter = new HtmlReportExporter({ jobLead });
        break;
    }

    return await exporter.export(report, outputPath);
  }
}
