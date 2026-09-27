#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import * as dotenv from 'dotenv';
import * as path from 'node:path';
import {
  AuditRepositoryUseCase,
  GenerateReportUseCase,
  ReportFormat,
} from '../../application/index.js';
import {
  GeminiFlashAdapter,
  GeminiRateLimiter,
} from '../../infrastructure/index.js';

// Load environment variables from .env
dotenv.config();

const program = new Command();

program
  .name('code-auditor')
  .description('🛡️ Autonomous Repository Security & Quality Audit Engine powered by Gemini 1M Context Window')
  .version('0.1.0')
  .option('-p, --path <directory>', 'Path to local directory to audit')
  .option('-r, --repo <urlOrShorthand>', 'GitHub repository URL or "owner/repo" to shallow-clone and audit')
  .option('-o, --output <filePath>', 'Destination path for generated audit report')
  .option('-f, --format <format>', 'Report format: html, json, or markdown', 'html')
  .option('-k, --key <apiKey>', 'Google Gemini API key (defaults to GEMINI_API_KEY env var)')
  .option('-m, --model <modelName>', 'Gemini model to use', 'gemini-2.5-flash')
  .option('--pitch', 'Display generated freelance/founder outreach pitch in terminal')
  .action(async (options) => {
    console.log(chalk.bold.hex('#3b82f6')(`\n🛡️  AI CODE AUDITOR — Autonomous Repository Engine`));
    console.log(chalk.dim(`Context-Window Dominance • Zero API Cost Architecture\n`));

    const target = options.path || options.repo;
    if (!target) {
      console.error(chalk.red('❌ Error: You must specify either --path <local_dir> or --repo <github_url_or_slug>'));
      console.log(chalk.dim('\nExample:'));
      console.log(chalk.cyan('  npx code-auditor --path ./my-app'));
      console.log(chalk.cyan('  npx code-auditor --repo expressjs/express\n'));
      process.exit(1);
    }

    const apiKey = options.key || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error(chalk.red('❌ Error: Gemini API key is missing.'));
      console.log(chalk.yellow('To fix this, get a free key from Google AI Studio (https://aistudio.google.com/):'));
      console.log(chalk.dim('  1. Add to .env: GEMINI_API_KEY=your_key_here'));
      console.log(chalk.dim('  2. Or pass via flag: --key your_key_here\n'));
      process.exit(1);
    }

    const spinner = ora({
      text: chalk.blue(`Ingesting repository target: ${target}...`),
      color: 'cyan',
    }).start();

    try {
      // 1. Initialize Gemini Adapter & Use Case
      const rateLimiter = new GeminiRateLimiter({ requestsPerMinute: 14 });
      const llmClient = new GeminiFlashAdapter({
        apiKey,
        model: options.model,
        rateLimiter,
      });

      const auditUseCase = new AuditRepositoryUseCase(llmClient);

      spinner.text = chalk.blue(`Ingesting and filtering repository files...`);
      const auditResult = await auditUseCase.execute({
        target,
        model: options.model,
      });

      if (!auditResult.success || !auditResult.report) {
        spinner.fail(chalk.red(`Audit failed: ${auditResult.error}`));
        process.exit(1);
      }

      const report = auditResult.report;
      spinner.succeed(chalk.green(`Audit completed in ${(auditResult.executionTimeMs / 1000).toFixed(1)}s!`));

      // 2. Render Terminal Summary Table
      renderTerminalSummary(report);

      // 3. Export Report
      const format = (options.format.toLowerCase() as ReportFormat) || 'html';
      const defaultOutput = `./audit-report-${report.repoMetadata.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.${format === 'markdown' ? 'md' : format}`;
      const outputPath = options.output || defaultOutput;

      const reportUseCase = new GenerateReportUseCase();
      const exportResult = await reportUseCase.execute({
        report,
        jobLead: auditResult.jobLead,
        format,
        outputPath,
      });

      console.log(chalk.green(`\n📄 Report saved successfully:`));
      console.log(chalk.bold.underline(`file://${path.resolve(exportResult.filePath!)}`));

      // 4. Optionally display pitch
      if (options.pitch && auditResult.jobLead) {
        console.log(chalk.bold.hex('#8b5cf6')(`\n🚀 Suggested Founder Outreach Pitch:`));
        console.log(chalk.dim(`Estimated Remediation: ${auditResult.jobLead.estimatedRemediationHours}h | Quote Range: ${auditResult.jobLead.suggestedQuoteUsd}`));
        console.log(chalk.gray('--------------------------------------------------'));
        console.log(chalk.white(auditResult.jobLead.pitchDraft));
        console.log(chalk.gray('--------------------------------------------------\n'));
      }
    } catch (err: unknown) {
      spinner.fail(chalk.red(`Unexpected error during audit: ${err instanceof Error ? err.message : String(err)}`));
      process.exit(1);
    }
  });

function renderTerminalSummary(report: any): void {
  const { summary, repoMetadata } = report;

  console.log(`\n${chalk.bold('Target Repository')}: ${chalk.cyan(repoMetadata.name)} (${repoMetadata.sourceType})`);
  console.log(`${chalk.bold('Files Audited')}: ${repoMetadata.totalFiles} | ${chalk.bold('Tokens')}: ~${repoMetadata.totalTokens.toLocaleString()}`);

  const scoreColor = summary.healthScore >= 80 ? chalk.green : summary.healthScore >= 60 ? chalk.yellow : chalk.red;
  console.log(`${chalk.bold('Health Score')}: ${scoreColor(`${summary.healthScore} / 100`)} (${summary.riskLevel} RISK)`);

  const table = new Table({
    head: [
      chalk.bold('Severity'),
      chalk.bold('Count'),
      chalk.bold('Weight'),
    ],
    colWidths: [18, 12, 12],
  });

  table.push(
    [chalk.red.bold('CRITICAL'), chalk.red.bold(String(summary.bySeverity.CRITICAL)), chalk.dim('-25 pts')],
    [chalk.hex('#f97316').bold('HIGH'), chalk.hex('#f97316').bold(String(summary.bySeverity.HIGH)), chalk.dim('-12 pts')],
    [chalk.yellow.bold('MEDIUM'), chalk.yellow.bold(String(summary.bySeverity.MEDIUM)), chalk.dim('-5 pts')],
    [chalk.green.bold('LOW'), chalk.green.bold(String(summary.bySeverity.LOW)), chalk.dim('-1 pt')],
    [chalk.gray.bold('INFO'), chalk.gray.bold(String(summary.bySeverity.INFO)), chalk.dim('0 pts')]
  );

  console.log(table.toString());

  if (summary.executiveSummary) {
    console.log(`\n${chalk.bold('Executive Summary:')}`);
    console.log(chalk.dim(summary.executiveSummary));
  }

  if (report.findings.length > 0) {
    console.log(`\n${chalk.bold('Top Findings Preview:')}`);
    const top = report.findings.slice(0, 3);
    top.forEach((f: any, idx: number) => {
      const sevBadge = f.severity === 'CRITICAL' ? chalk.bgRed.black(` ${f.severity} `) : chalk.bgHex('#f97316').black(` ${f.severity} `);
      console.log(`  ${idx + 1}. ${sevBadge} ${chalk.bold(f.title)}`);
      console.log(`     ${chalk.dim(`Location:`)} ${chalk.cyan(f.filePath)}:L${f.lineStart}`);
    });
  }
}

program.parse(process.argv);
