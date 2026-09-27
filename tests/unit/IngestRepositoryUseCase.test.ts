import { describe, it, expect } from 'vitest';
import { IngestRepositoryUseCase } from '../../src/application/use-cases/IngestRepositoryUseCase.js';
import { IRepoFetcher, IngestedRepo } from '../../src/domain/index.js';

describe('IngestRepositoryUseCase', () => {
  it('should route local paths to localReader and return success', async () => {
    const mockRepo: IngestedRepo = {
      metadata: {
        name: 'test-local',
        sourceType: 'local',
        sourceUrlOrPath: './test',
        totalFiles: 1,
        totalTokens: 10,
        languages: { typescript: 1 },
        ingestedAt: new Date().toISOString(),
      },
      files: [],
    };

    const mockLocalReader: IRepoFetcher = {
      fetch: async () => mockRepo,
    };

    const mockGithubCloner: IRepoFetcher = {
      fetch: async () => {
        throw new Error('Should not call github cloner for local path');
      },
    };

    const useCase = new IngestRepositoryUseCase(mockLocalReader, mockGithubCloner);
    // Use current directory '.' as a real local path
    const response = await useCase.execute({ target: '.' });

    expect(response.success).toBe(true);
    expect(response.data?.metadata.name).toBe('test-local');
  });

  it('should route non-local targets to githubCloner', async () => {
    const mockRepo: IngestedRepo = {
      metadata: {
        name: 'facebook/react',
        sourceType: 'github',
        sourceUrlOrPath: 'https://github.com/facebook/react.git',
        totalFiles: 50,
        totalTokens: 5000,
        languages: { javascript: 50 },
        ingestedAt: new Date().toISOString(),
      },
      files: [],
    };

    const mockLocalReader: IRepoFetcher = {
      fetch: async () => {
        throw new Error('Should not call local reader for github url');
      },
    };

    const mockGithubCloner: IRepoFetcher = {
      fetch: async () => mockRepo,
    };

    const useCase = new IngestRepositoryUseCase(mockLocalReader, mockGithubCloner);
    const response = await useCase.execute({ target: 'facebook/react' });

    expect(response.success).toBe(true);
    expect(response.data?.metadata.sourceType).toBe('github');
  });
});
