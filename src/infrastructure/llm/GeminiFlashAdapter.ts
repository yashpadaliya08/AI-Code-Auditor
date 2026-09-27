import { GoogleGenAI } from '@google/genai';
import {
  ILlmClient,
  LlmAnalysisOptions,
  estimateTokens,
} from '../../domain/index.js';
import { GeminiRateLimiter } from './GeminiRateLimiter.js';
import { AuditResponseSchema, RawAuditResponse } from './AuditResponseSchema.js';

export interface GeminiFlashAdapterOptions {
  apiKey?: string;
  model?: string;
  fallbackModel?: string;
  rateLimiter?: GeminiRateLimiter;
}

export class GeminiFlashAdapter implements ILlmClient {
  private ai: GoogleGenAI;
  private primaryModel: string;
  private fallbackModels: string[];
  private rateLimiter: GeminiRateLimiter;

  constructor(options?: GeminiFlashAdapterOptions) {
    const key = options?.apiKey ?? process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error(
        'Gemini API key is required. Set GEMINI_API_KEY in your .env or pass apiKey to GeminiFlashAdapter.'
      );
    }

    this.ai = new GoogleGenAI({ apiKey: key });
    this.primaryModel = options?.model ?? 'gemini-3.1-flash-lite';
    this.fallbackModels = options?.fallbackModel
      ? [options.fallbackModel, 'gemini-3-flash-preview', 'gemini-3.1-flash-lite-preview', 'gemini-flash-latest']
      : ['gemini-3-flash-preview', 'gemini-3.1-flash-lite-preview', 'gemini-flash-latest'];
    this.rateLimiter = options?.rateLimiter ?? new GeminiRateLimiter();
  }

  /**
   * Generates structured content via Gemini with rate limiting and schema enforcement.
   */
  public async generateStructuredContent<T>(
    prompt: string,
    options?: LlmAnalysisOptions
  ): Promise<T> {
    const candidates = options?.model
      ? [options.model, ...this.fallbackModels]
      : [this.primaryModel, ...this.fallbackModels];

    return this.rateLimiter.schedule(async () => {
      let lastError: unknown;
      for (const model of candidates) {
        try {
          return await this.callGemini<T>(model, prompt, options);
        } catch (err: unknown) {
          lastError = err;
          if (this.shouldTryFallback(err)) {
            continue;
          }
          throw err;
        }
      }
      throw lastError;
    });
  }

  /**
   * Sends prompt to Gemini and parses the resulting JSON.
   */
  private async callGemini<T>(
    modelName: string,
    prompt: string,
    options?: LlmAnalysisOptions
  ): Promise<T> {
    const response = await this.ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: options?.systemInstruction,
        temperature: options?.temperature ?? 0.2, // Low temperature for deterministic, hallucination-free output
        maxOutputTokens: options?.maxOutputTokens ?? 8192,
        responseMimeType: 'application/json',
      },
    });

    const rawText = response.text ?? '';
    const cleanJson = this.extractCleanJson(rawText);

    try {
      const parsed = JSON.parse(cleanJson);
      return parsed as T;
    } catch {
      throw new Error(
        `Failed to parse Gemini output as JSON. Raw response: ${rawText.slice(0, 300)}...`
      );
    }
  }

  /**
   * Specific helper to perform a fully typed and validated repository audit.
   */
  public async analyzeCodebase(
    prompt: string,
    systemInstruction?: string
  ): Promise<RawAuditResponse> {
    const rawResult = await this.generateStructuredContent<unknown>(prompt, {
      systemInstruction,
      temperature: 0.2,
    });

    const validated = AuditResponseSchema.safeParse(rawResult);
    if (!validated.success) {
      throw new Error(
        `Gemini response did not conform to audit schema: ${validated.error.message}`
      );
    }

    return validated.data;
  }

  /**
   * Fast connection verification to test API key validity without wasting tokens.
   */
  public async verifyConnection(): Promise<boolean> {
    try {
      return await this.rateLimiter.schedule(async () => {
        const response = await this.ai.models.generateContent({
          model: this.primaryModel,
          contents: 'Respond with: {"status": "ok"}',
          config: {
            maxOutputTokens: 20,
            responseMimeType: 'application/json',
          },
        });
        return Boolean(response.text && response.text.includes('ok'));
      });
    } catch {
      return false;
    }
  }

  /**
   * Estimates token usage for given text string.
   */
  public estimateTokens(text: string): number {
    return estimateTokens(text);
  }

  /**
   * Strips markdown code fences (```json ... ```) if Gemini wrapped them.
   */
  private extractCleanJson(text: string): string {
    const trimmed = text.trim();
    const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      return jsonMatch[1].trim();
    }
    return trimmed;
  }

  private shouldTryFallback(err: unknown): boolean {
    if (!err) return false;
    const msg = String(err).toLowerCase();
    return (
      msg.includes('not found') ||
      msg.includes('unsupported') ||
      msg.includes('model') ||
      msg.includes('503') ||
      msg.includes('unavailable') ||
      msg.includes('high demand')
    );
  }
}
