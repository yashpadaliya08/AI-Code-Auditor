import { describe, it, expect, vi } from 'vitest';
import { GeminiRateLimiter } from '../../src/infrastructure/llm/GeminiRateLimiter.js';

describe('GeminiRateLimiter', () => {
  it('should execute tasks in order and return results', async () => {
    const limiter = new GeminiRateLimiter({
      requestsPerMinute: 600, // fast for testing
      minIntervalMs: 10,
    });

    const results: number[] = [];

    await Promise.all([
      limiter.schedule(async () => {
        results.push(1);
        return 'first';
      }),
      limiter.schedule(async () => {
        results.push(2);
        return 'second';
      }),
    ]);

    expect(results).toEqual([1, 2]);
  });

  it('should automatically retry on 429 quota exhaustion and succeed', async () => {
    const limiter = new GeminiRateLimiter({
      minIntervalMs: 5,
      initialBackoffMs: 20,
      maxBackoffMs: 100,
      maxRetries: 3,
    });

    let attempts = 0;

    const result = await limiter.schedule(async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('429 RESOURCE_EXHAUSTED: Quota exceeded for model');
      }
      return 'recovered';
    });

    expect(result).toBe('recovered');
    expect(attempts).toBe(3);
  });

  it('should fail if max retries exceeded on 429', async () => {
    const limiter = new GeminiRateLimiter({
      minIntervalMs: 5,
      initialBackoffMs: 10,
      maxBackoffMs: 50,
      maxRetries: 2,
    });

    let attempts = 0;

    await expect(
      limiter.schedule(async () => {
        attempts++;
        throw new Error('429 Quota Exceeded');
      })
    ).rejects.toThrow('429 Quota Exceeded');

    expect(attempts).toBe(3); // Initial + 2 retries
  });
});
