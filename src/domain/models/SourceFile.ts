export interface SourceFile {
  /** Absolute path on disk */
  path: string;
  /** Relative normalized path within repository (e.g. 'src/services/auth.ts') */
  relativePath: string;
  /** UTF-8 file content */
  content: string;
  /** File size in bytes */
  sizeBytes: number;
  /** Approximate token count for LLM context budget calculation */
  tokenEstimate: number;
  /** Extension (e.g. '.ts', '.py') */
  extension: string;
  /** Detected programming language or file format */
  language: string;
}

export function estimateTokens(content: string): number {
  // Free-tier heuristic: ~4 characters per token
  return Math.ceil(content.length / 4);
}

export function detectLanguage(extension: string): string {
  const ext = extension.toLowerCase();
  switch (ext) {
    case '.ts':
    case '.tsx':
      return 'typescript';
    case '.js':
    case '.jsx':
    case '.mjs':
    case '.cjs':
      return 'javascript';
    case '.py':
      return 'python';
    case '.go':
      return 'go';
    case '.rs':
      return 'rust';
    case '.java':
      return 'java';
    case '.rb':
      return 'ruby';
    case '.php':
      return 'php';
    case '.cs':
      return 'csharp';
    case '.cpp':
    case '.cc':
    case '.c':
    case '.h':
      return 'c_cpp';
    case '.json':
      return 'json';
    case '.yaml':
    case '.yml':
      return 'yaml';
    case '.sql':
      return 'sql';
    case '.html':
      return 'html';
    case '.css':
      return 'css';
    case '.sh':
    case '.bash':
      return 'shell';
    case '.dockerfile':
      return 'dockerfile';
    default:
      return 'plaintext';
  }
}
