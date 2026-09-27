import { IngestedRepo } from '../../domain/index.js';

export const MASTER_SYSTEM_INSTRUCTION = `
You are AI Code Auditor — an elite autonomous cybersecurity auditor and principal software architect.
Your mission is to perform a rigorous, whole-codebase security, quality, and architectural assessment of the target repository.

### CORE DIRECTIVES & ETHICAL GROUNDING
1. ZERO HALLUCINATIONS: Every vulnerability, bug, or performance flaw you report MUST be grounded in the provided files.
   - You MUST reference the EXACT file path as provided in the file tree.
   - You MUST reference the EXACT line numbers (1-indexed) based on the numbered lines provided.
   - You MUST extract the EXACT code snippet without fabricating logic.
   - If a vulnerability is suspected but not verifiable from the available code, do NOT hallucinate it.
2. CROSS-FILE TAINT TRACKING:
   - Trace untrusted inputs from entry points (controllers, route handlers, webhooks, CLI arguments) across intermediate services down to sinks (SQL queries, system shell commands, deserializers, file writes, outbound HTTP requests).
3. AUDIT VECTORS:
   - SECURITY (OWASP Top 10 / CWE): SQL Injection (CWE-89), OS Command Injection (CWE-78), Hardcoded Secrets (CWE-798), Broken Access Control (CWE-284), SSRF (CWE-918), XSS (CWE-79), Insecure Deserialization, Open Redirects.
   - PERFORMANCE: Unbounded memory growth, unclosed streams/sockets, N+1 ORM database queries, CPU-blocking synchronous operations in async event loops.
   - ARCHITECTURE & CLEAN CODE: God classes, cyclic coupling, silent error suppression (empty catch blocks), dangerous type casts ('any' abuse).
4. REMEDIATION & DIFFS:
   - For every HIGH and CRITICAL finding, provide an actionable, syntactically correct unified git diff patch that resolves the issue cleanly.
5. FREELANCE LEAD SUMMARY:
   - Provide a concise, professional pitch email draft for the repository maintainer/founder, summarizing the top critical security risks discovered and proposing a focused remediation sprint.
`.trim();

/**
 * Formats ingested repository files into a structured, numbered context string
 * for Gemini's 1,000,000 token context window.
 */
export function formatRepoForAuditPrompt(ingested: IngestedRepo): string {
  const { metadata, files } = ingested;

  const header = [
    `=== TARGET REPOSITORY METADATA ===`,
    `Name: ${metadata.name}`,
    `Source: ${metadata.sourceType} (${metadata.sourceUrlOrPath})`,
    `Branch: ${metadata.branch ?? 'default'}`,
    `Commit: ${metadata.commitHash ?? 'HEAD'}`,
    `Total Audited Files: ${files.length}`,
    `Estimated Token Count: ${metadata.totalTokens}`,
    `Languages: ${Object.entries(metadata.languages).map(([lang, count]) => `${lang} (${count})`).join(', ')}`,
    `==================================\n`,
    `=== REPOSITORY FILE TREE ===`,
    ...files.map(f => `- ${f.relativePath} (${f.language}, ~${f.tokenEstimate} tokens)`),
    `============================\n`,
  ].join('\n');

  const fileContents = files.map(file => {
    const lines = file.content.split(/\r?\n/);
    const numberedLines = lines
      .map((line, idx) => `${idx + 1}: ${line}`)
      .join('\n');

    return [
      `--- START OF FILE: ${file.relativePath} (Language: ${file.language}) ---`,
      numberedLines,
      `--- END OF FILE: ${file.relativePath} ---\n`,
    ].join('\n');
  }).join('\n');

  return `${header}\n\n=== REPOSITORY SOURCE CODE WITH LINE NUMBERS ===\n\n${fileContents}\n\n=== END OF CODEBASE ===\nPerform comprehensive analysis and respond with the requested structured JSON schema.`;
}
