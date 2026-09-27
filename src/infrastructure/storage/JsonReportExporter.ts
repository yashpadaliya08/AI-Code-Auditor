import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  AuditReport,
  IReportExporter,
  ExportResult,
  JobLead,
} from '../../domain/index.js';

export interface JsonExporterOptions {
  jobLead?: JobLead;
}

export class JsonReportExporter implements IReportExporter {
  private jobLead?: JobLead;

  constructor(options?: JsonExporterOptions) {
    this.jobLead = options?.jobLead;
  }

  public async export(
    report: AuditReport,
    destinationPath?: string
  ): Promise<ExportResult> {
    const payload = {
      ...report,
      jobLead: this.jobLead,
    };

    const content = JSON.stringify(payload, null, 2);

    let finalPath = destinationPath;
    if (finalPath) {
      const resolved = path.resolve(finalPath);
      await fs.mkdir(path.dirname(resolved), { recursive: true });
      await fs.writeFile(resolved, content, 'utf-8');
      finalPath = resolved;
    }

    return {
      filePath: finalPath,
      content,
    };
  }
}
