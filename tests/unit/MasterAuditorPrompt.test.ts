import { describe, it, expect } from 'vitest';
import { formatRepoForAuditPrompt } from '../../src/infrastructure/llm/MasterAuditorPrompt.js';
import { IngestedRepo } from '../../src/domain/index.js';

describe('MasterAuditorPrompt', () => {
  it('should format repository metadata and source files with line numbers', () => {
    const mockIngested: IngestedRepo = {
      metadata: {
        name: 'test-backend',
        sourceType: 'local',
        sourceUrlOrPath: '/path/to/test-backend',
        totalFiles: 1,
        totalTokens: 50,
        languages: { typescript: 1 },
        ingestedAt: new Date().toISOString(),
      },
      files: [
        {
          path: '/path/to/test-backend/src/auth.ts',
          relativePath: 'src/auth.ts',
          content: 'const secret = "hardcoded-key";\nfunction verify() { return true; }',
          sizeBytes: 65,
          tokenEstimate: 16,
          extension: '.ts',
          language: 'typescript',
        },
      ],
    };

    const formatted = formatRepoForAuditPrompt(mockIngested);

    expect(formatted).toContain('Name: test-backend');
    expect(formatted).toContain('- src/auth.ts (typescript, ~16 tokens)');
    expect(formatted).toContain('--- START OF FILE: src/auth.ts (Language: typescript) ---');
    expect(formatted).toContain('1: const secret = "hardcoded-key";');
    expect(formatted).toContain('2: function verify() { return true; }');
    expect(formatted).toContain('--- END OF FILE: src/auth.ts ---');
  });
});
