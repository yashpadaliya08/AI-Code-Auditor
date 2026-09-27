export interface RateLimiterOptions {
  /** Maximum requests per minute (default: 14 to safely stay under 15 RPM) */
  requestsPerMinute?: number;
  /** Minimum delay between sequential calls in ms (default: 4200ms) */
  minIntervalMs?: number;
  /** Maximum retry attempts on 429 rate limit errors (default: 4) */
  maxRetries?: number;
  /** Initial backoff delay on 429 in ms (default: 2000ms) */
  initialBackoffMs?: number;
  /** Maximum backoff delay on 429 in ms (default: 30000ms) */
  maxBackoffMs?: number;
}

export class GeminiRateLimiter {
  private minIntervalMs: number;
  private maxRetries: number;
  private initialBackoffMs: number;
  private maxBackoffMs: number;
  private lastRequestTimestamp: number = 0;
  private queue: Array<() => void> = [];
  private isProcessingQueue: boolean = false;

  constructor(options?: RateLimiterOptions) {
    const rpm = options?.requestsPerMinute ?? 14;
    // 60,000ms / 14 RPM ≈ 4,285ms between requests
    this.minIntervalMs = options?.minIntervalMs ?? Math.ceil(60000 / rpm);
    this.maxRetries = options?.maxRetries ?? 4;
    this.initialBackoffMs = options?.initialBackoffMs ?? 2000;
    this.maxBackoffMs = options?.maxBackoffMs ?? 30000;
  }

  /**
   * Schedules an asynchronous task through the rate-limited token bucket.
   * If a 429 / RESOURCE_EXHAUSTED occurs, performs exponential jittered backoff.
   */
  public async schedule<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await this.executeWithBackoff(task);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.queue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLast = now - this.lastRequestTimestamp;
      const waitTime = Math.max(0, this.minIntervalMs - timeSinceLast);

      if (waitTime > 0) {
        await this.delay(waitTime);
      }

      const nextTask = this.queue.shift();
      if (nextTask) {
        this.lastRequestTimestamp = Date.now();
        await nextTask();
      }
    }

    this.isProcessingQueue = false;
  }

  private async executeWithBackoff<T>(task: () => Promise<T>): Promise<T> {
    let attempt = 0;
    let currentBackoff = this.initialBackoffMs;

    while (true) {
      try {
        return await task();
      } catch (err: unknown) {
        attempt++;
        const isRateLimit = this.isRateLimitError(err);

        if (!isRateLimit || attempt > this.maxRetries) {
          throw err;
        }

        // Add randomized jitter (100ms - 500ms) to prevent thundering herd
        const jitter = Math.floor(Math.random() * 400) + 100;
        const sleepTime = Math.min(currentBackoff + jitter, this.maxBackoffMs);

        await this.delay(sleepTime);
        currentBackoff = Math.min(currentBackoff * 2, this.maxBackoffMs);
      }
    }
  }

  private isRateLimitError(err: unknown): boolean {
    if (!err) return false;
    const msg = String(err).toLowerCase();
    return (
      msg.includes('429') ||
      msg.includes('503') ||
      msg.includes('resource_exhausted') ||
      msg.includes('unavailable') ||
      msg.includes('high demand') ||
      msg.includes('quota') ||
      msg.includes('rate limit')
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
