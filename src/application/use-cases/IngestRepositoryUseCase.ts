import * as fs from 'node:fs/promises';
import { IRepoFetcher, IngestedRepo } from '../../domain/index.js';
import { LocalRepoReader } from '../../infrastructure/parsers/LocalRepoReader.js';
import { GitHubCloner } from '../../infrastructure/github/GitHubCloner.js';
import { IngestRepoRequestDto, IngestRepoResponseDto } from '../dtos/IngestDto.js';

export class IngestRepositoryUseCase {
  private localReader: IRepoFetcher;
  private githubCloner: IRepoFetcher;

  constructor(localReader?: IRepoFetcher, githubCloner?: IRepoFetcher) {
    this.localReader = localReader ?? new LocalRepoReader();
    this.githubCloner = githubCloner ?? new GitHubCloner();
  }

  public async execute(dto: IngestRepoRequestDto): Promise<IngestRepoResponseDto> {
    const { target, options } = dto;

    try {
      const isLocal = await this.isLocalPath(target);
      let ingested: IngestedRepo;

      if (isLocal) {
        ingested = await this.localReader.fetch(target, options);
      } else {
        ingested = await this.githubCloner.fetch(target, options);
      }

      return {
        success: true,
        data: ingested,
      };
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error during repository ingestion';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private async isLocalPath(target: string): Promise<boolean> {
    try {
      const stat = await fs.stat(target);
      return stat.isDirectory() || stat.isFile();
    } catch {
      return false;
    }
  }
}
