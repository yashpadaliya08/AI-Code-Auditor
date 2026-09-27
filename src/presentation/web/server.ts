import * as http from 'node:http';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import {
  AuditRepositoryUseCase,
  GenerateReportUseCase,
} from '../../application/index.js';
import {
  GeminiFlashAdapter,
  GeminiRateLimiter,
  GitHubIssueExporter,
} from '../../infrastructure/index.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, 'public');

export function createAuditServer(defaultPort: number = 3000) {
  const rateLimiter = new GeminiRateLimiter({ requestsPerMinute: 14 });

  const server = http.createServer(async (req, res) => {
    // Enable CORS for local dev
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url ?? '/', `http://localhost:${defaultPort}`);
    const pathname = parsedUrl.pathname;

    // Healthcheck endpoint
    if (pathname === '/api/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', version: '0.1.0-flash' }));
      return;
    }

    // Run audit endpoint
    if (pathname === '/api/audit' && req.method === 'POST') {
      try {
        const bodyText = await readRequestBody(req);
        const body = JSON.parse(bodyText);

        const target = body.target?.trim();
        if (!target) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Target repository or path is required.' }));
          return;
        }

        const apiKey = body.apiKey?.trim() || process.env.GEMINI_API_KEY;
        if (!apiKey) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Gemini API key is required. Provide it in the UI or set GEMINI_API_KEY in .env',
          }));
          return;
        }

        const llmClient = new GeminiFlashAdapter({
          apiKey,
          model: body.model || 'gemini-2.5-flash',
          rateLimiter,
        });

        const auditUseCase = new AuditRepositoryUseCase(llmClient);
        const auditResponse = await auditUseCase.execute({
          target,
          model: body.model,
        });

        res.writeHead(auditResponse.success ? 200 : 422, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(auditResponse));
      } catch (err: unknown) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: err instanceof Error ? err.message : 'Internal server error during audit',
        }));
      }
      return;
    }

    // Export report endpoint
    if (pathname === '/api/export' && req.method === 'POST') {
      try {
        const bodyText = await readRequestBody(req);
        const body = JSON.parse(bodyText);
        const { report, jobLead, format = 'html' } = body;

        const reportUseCase = new GenerateReportUseCase();
        const exportResult = await reportUseCase.execute({
          report,
          jobLead,
          format,
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, content: exportResult.content }));
      } catch (err: unknown) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: err instanceof Error ? err.message : 'Error exporting report',
        }));
      }
      return;
    }

    // Format GitHub issue payload endpoint
    if (pathname === '/api/format-github-issue' && req.method === 'POST') {
      try {
        const bodyText = await readRequestBody(req);
        const { finding, repoMetadata } = JSON.parse(bodyText);

        const issuePayload = GitHubIssueExporter.formatIssue(finding, repoMetadata);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, issue: issuePayload }));
      } catch (err: unknown) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: err instanceof Error ? err.message : 'Error formatting issue',
        }));
      }
      return;
    }

    // Serve static frontend files
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
    try {
      const stats = await fs.stat(filePath);
      if (stats.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      const content = await fs.readFile(filePath);
      const ext = path.extname(filePath);
      const contentType = getMimeType(ext);

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch {
      // Fallback to index.html for SPA
      try {
        const indexHtml = await fs.readFile(path.join(PUBLIC_DIR, 'index.html'));
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(indexHtml);
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    }
  });

  return server;
}

function readRequestBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function getMimeType(ext: string): string {
  switch (ext.toLowerCase()) {
    case '.html': return 'text/html';
    case '.css': return 'text/css';
    case '.js': return 'application/javascript';
    case '.json': return 'application/json';
    case '.png': return 'image/png';
    case '.svg': return 'image/svg+xml';
    default: return 'text/plain';
  }
}

// Direct execution entry
const PORT = Number(process.env.PORT) || 3000;
if (process.argv[1] && process.argv[1].endsWith('server.ts')) {
  const server = createAuditServer(PORT);
  server.listen(PORT, () => {
    console.log(`\n🛡️  AI Code Auditor Web Dashboard running at: http://localhost:${PORT}\n`);
  });
}
