export interface LlmAnalysisOptions {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  systemInstruction?: string;
  responseSchema?: Record<string, unknown>;
}

export interface ILlmClient {
  /**
   * Send code context to LLM and receive structured analysis result.
   */
  generateStructuredContent<T>(
    prompt: string,
    options?: LlmAnalysisOptions
  ): Promise<T>;

  /**
   * Estimate token count for a text string.
   */
  estimateTokens(text: string): number;

  /**
   * Healthcheck to verify free API key validity without exhausting quotas.
   */
  verifyConnection(): Promise<boolean>;
}
