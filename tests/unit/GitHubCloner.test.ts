import { describe, it, expect } from 'vitest';
import { GitHubCloner } from '../../src/infrastructure/github/GitHubCloner.js';

describe('GitHubCloner', () => {
  it('should parse owner/repo shorthand target correctly', () => {
    const parsed = GitHubCloner.parseRepoTarget('expressjs/express');
    expect(parsed.cloneUrl).toBe('https://github.com/expressjs/express.git');
    expect(parsed.repoName).toBe('expressjs/express');
  });

  it('should parse full github HTTPS URL correctly', () => {
    const parsed = GitHubCloner.parseRepoTarget('https://github.com/facebook/react');
    expect(parsed.cloneUrl).toBe('https://github.com/facebook/react.git');
    expect(parsed.repoName).toBe('facebook/react');
  });

  it('should handle URL already ending with .git', () => {
    const parsed = GitHubCloner.parseRepoTarget('https://github.com/pallets/flask.git');
    expect(parsed.cloneUrl).toBe('https://github.com/pallets/flask.git');
    expect(parsed.repoName).toBe('pallets/flask');
  });

  it('should throw on invalid target', () => {
    expect(() => GitHubCloner.parseRepoTarget('not a valid repo or url:::')).toThrow();
  });
});
