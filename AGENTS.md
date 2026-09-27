# AGENTS.md — AI Code Auditor Core Directive & Architecture Guidelines

> **Project**: AI Code Auditor (Autonomous Repository Security & Quality Audit Engine)  
> **Target Audience**: Developers, Students, Open-Source Maintainers, and Freelance Auditing Clients.  
> **Economic Constraint**: **$0.00 Capital Requirement**. Built purely on free-tier APIs (Google Gemini API Free Tier), open-source static analysis tools, and free hosting (Vercel / Render / Cloudflare Workers).

---

## 1. Prime Mission & Core Philosophy

You are an expert autonomous software engineer and security auditor working on **AI Code Auditor**.
When continuing or expanding this repository:
1. **Never introduce paid dependencies or require credit card-backed APIs.** The entire toolchain must run either locally or against free-tier endpoints.
2. **Context-Window Dominance**: Leverage Gemini's large context window (1M+ tokens) to ingest full file trees and deep cross-file dependency chains rather than superficial single-file inspections.
3. **No Hallucinated Findings**: Every reported vulnerability, code smell, or performance bottleneck must be grounded in an exact file path, line numbers, and verifiable code snippet with an actionable fix.
4. **Hexagonal / Clean Architecture**: Maintain strict separation between Domain models (Vulnerabilities, Repositories, Audit Reports), Application use-cases, and Infrastructure adapters (GitHub API, LLM Providers, Static Analyzers, Exporters).

---

## 2. Directory & Component Layout

```
code-auditor/
├── src/
│   ├── domain/               # Enterprise business rules (zero external deps)
│   │   ├── models/           # RepoMetadata, SourceFile, AuditFinding, AuditReport
│   │   ├── values/           # Severity (CRITICAL, HIGH, MEDIUM, LOW, INFO), CweId
│   │   └── repositories/     # Interface definitions (ILlmClient, IRepoFetcher, IReportExporter)
│   ├── application/          # Application business rules
│   │   ├── use-cases/        # AuditRepositoryUseCase, IngestGitHubRepoUseCase, GenerateReportUseCase
│   │   └── dtos/             # AuditRequestDto, AuditResponseDto
│   ├── infrastructure/       # Interface adapters
│   │   ├── github/           # GitHub public API / git shallow clone runner
│   │   ├── llm/              # GeminiFlashAdapter (with strict token bucket rate-limiter & backoff)
│   │   ├── parsers/          # AST, file scanner, and ignore filters (node_modules, dist, binaries)
│   │   └── storage/          # Local JSON / SQLite audit run cache
│   └── presentation/         # CLI entry point or Web API / Dashboard
│       ├── cli/              # Terminal runner with rich tables & colored badges
│       └── web/              # Fastify / Express or Next.js frontend
├── tests/                    # Unit and integration test suites
├── docs/                     # Architecture blueprints, prompt design, and threat models
├── AGENTS.md                 # Agent instruction manifest (this file)
└── package.json
```

---

## 3. Gemini Free-Tier Constraint Protocols

Because the system relies on Gemini's Free Tier:
- **Rate Limit Ceiling**: Gemini Free Tier has quotas (typically 15 Requests Per Minute [RPM], 1,000,000 Tokens Per Minute [TPM], 1,500 Requests Per Day [RPD]).
- **Token Bucket / Rate Limiter**: All outbound calls to the LLM must pass through an asynchronous token-bucket rate limiter (`GeminiRateLimiter`).
- **Chunking & Filtering**:
  - Always strip irrelevant files before sending to LLM: `.git/`, `node_modules/`, `dist/`, `build/`, `*.lock`, `*.min.js`, image/video/font assets.
  - Prioritize critical attack-surface files: entry points, auth routes, database models, configuration files, and API endpoints.
- **Failover / Backoff**: On HTTP 429 (`RESOURCE_EXHAUSTED`), implement exponential jittered backoff (initial delay 2s, factor 2x, max 30s).

---

## 4. Audit Engine Pillars

Every repository audit must assess four distinct vectors:

1. **Security & Vulnerabilities (OWASP Top 10 / CWE)**
   - Hardcoded secrets, keys, and tokens (regex + semantic confirmation)
   - Injection flaws (SQL, NoSQL, OS Command, Code Execution)
   - Broken Authentication & Access Control flaws
   - Insecure direct object references (IDOR) and unsafe deserialization

2. **Performance & Memory Leaks**
   - Unbounded memory accumulation (unclosed streams, event listeners)
   - N+1 query patterns in ORMs / queries
   - Uncached expensive computations or blocking synchronous I/O in async loops

3. **Architecture & Technical Debt**
   - God classes, circular dependencies, and monolithic coupling
   - Missing error boundaries and silent try/catch suppression
   - Type-safety degradation (`any` abuse, unchecked type assertions)

4. **Remediation & Instant Diffs**
   - For every high/critical finding, produce a unified git diff snippet ready to apply.

---

## 5. Development Conventions & Commands

- **Language**: TypeScript (Node.js >= 18 or Bun)
- **Strict Typing**: `"strict": true` in `tsconfig.json`. No `any` without explicit justification.
- **Testing**: Vitest or Jest with deterministic mock fixtures for Gemini responses.
- **Standard Run Commands**:
  - `npm install` — install dependencies
  - `npm test` — run unit test suite
  - `npm run audit -- --repo <github_url>` — run CLI audit against a repo

---

## 6. How Next Agent Should Pick Up

When starting a fresh chat session in this project:
1. Read `PROJECT_SPEC.md` to see current phase progress.
2. Initialize `package.json` with TypeScript, `@google/genai` (or `@google/generative-ai`), `dotenv`, `simple-git` or `@octokit/rest`, and `zod`.
3. Build the core Domain models and the Gemini adapter first before tackling UI or complex CLI logic.
