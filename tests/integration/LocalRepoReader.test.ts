import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { LocalRepoReader } from '../../src/infrastructure/parsers/LocalRepoReader.js';

describe('LocalRepoReader Integration', () => {
  let tempTestDir: string;

  beforeAll(async () => {
    tempTestDir = path.join(os.tmpdir(), `code-auditor-test-${Date.now()}`);
    await fs.mkdir(path.join(tempTestDir, 'src', 'controllers'), { recursive: true });
    await fs.mkdir(path.join(tempTestDir, 'node_modules', 'dummy'), { recursive: true });

    // Create files
    await fs.writeFile(
      path.join(tempTestDir, 'package.json'),
      JSON.stringify({ name: 'test-app', version: '1.0.0' }, null, 2)
    );
    await fs.writeFile(
      path.join(tempTestDir, 'src', 'controllers', 'auth.ts'),
      'export function login() { return "token"; }'
    );
    await fs.writeFile(
      path.join(tempTestDir, 'node_modules', 'dummy', 'index.js'),
      'module.exports = {};'
    );
    await fs.writeFile(
      path.join(tempTestDir, '.gitignore'),
      'ignored.txt\n*.scratch\n'
    );
    await fs.writeFile(
      path.join(tempTestDir, 'ignored.txt'),
      'this should be ignored'
    );
    await fs.writeFile(
      path.join(tempTestDir, 'notes.scratch'),
      'scratch notes'
    );
  });

  afterAll(async () => {
    try {
      await fs.rm(tempTestDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  it('should scan files, apply .gitignore and defaults, and build accurate metadata', async () => {
    const reader = new LocalRepoReader();
    const result = await reader.fetch(tempTestDir);

    expect(result.metadata.sourceType).toBe('local');
    expect(result.metadata.totalFiles).toBe(3); // package.json, src/controllers/auth.ts, .gitignore

    const relativePaths = result.files.map(f => f.relativePath);
    expect(relativePaths).toContain('package.json');
    expect(relativePaths).toContain('src/controllers/auth.ts');
    expect(relativePaths).toContain('.gitignore');

    // node_modules and ignored files must not be present
    expect(relativePaths.some(p => p.includes('node_modules'))).toBe(false);
    expect(relativePaths).not.toContain('ignored.txt');
    expect(relativePaths).not.toContain('notes.scratch');

    // Priority ordering check: package.json (priority 1) before src/controllers/auth.ts (priority 2)
    expect(relativePaths[0]).toBe('package.json');
  });

  it('should respect maxTokenBudget', async () => {
    const reader = new LocalRepoReader();
    // Tiny token budget to force truncation
    const result = await reader.fetch(tempTestDir, { maxTokenBudget: 15 });

    expect(result.files.length).toBeLessThan(3);
    expect(result.metadata.totalTokens).toBeLessThanOrEqual(15);
  });
});
