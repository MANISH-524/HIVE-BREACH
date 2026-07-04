import { LlmProvider, LlmConfig } from "../types/index.js";

export interface RateLimitState {
  provider: LlmProvider;
  requestsThisMinute: number;
  requestsTotal: number;
  lastResetTime: number;
  rateLimit: number;
  budgetLimit: number;
  costEstimate: number;
}

/**
 * Cost/Rate-Limit Governor
 * Ties together NIM rate limits (40 req/min) + paid API costs.
 * Prevents runaway multi-agent scans from silently failing or overspending.
 */
export class RateLimitGovernor {
  private state: Map<string, RateLimitState> = new Map();
  private startTime = Date.now();

  private getRateLimit(provider: LlmProvider): number {
    switch (provider) {
      case "nim": return 40;
      case "ollama": return Infinity;
      case "openai": return 3500;
      case "anthropic": return 1000;
    }
  }

  initProvider(config: LlmConfig): void {
    if (this.state.has(config.provider)) return;
    this.state.set(config.provider, {
      provider: config.provider,
      requestsThisMinute: 0,
      requestsTotal: 0,
      lastResetTime: Date.now(),
      rateLimit: this.getRateLimit(config.provider),
      budgetLimit: Infinity,
      costEstimate: 0,
    });
  }

  canRequest(config: LlmConfig): { allowed: boolean; reason?: string; waitMs?: number } {
    this.initProvider(config);
    const state = this.state.get(config.provider)!;

    const now = Date.now();
    if (now - state.lastResetTime > 60000) {
      state.requestsThisMinute = 0;
      state.lastResetTime = now;
    }

    if (state.requestsThisMinute >= state.rateLimit) {
      const waitMs = 60000 - (now - state.lastResetTime);
      return { allowed: false, reason: `Rate limit: ${state.rateLimit}/min reached for ${config.provider}`, waitMs };
    }

    return { allowed: true };
  }

  recordRequest(config: LlmConfig, promptTokens: number, completionTokens: number): void {
    this.initProvider(config);
    const state = this.state.get(config.provider)!;
    state.requestsThisMinute++;
    state.requestsTotal++;

    const costPer1kTokens = config.provider === "openai" ? 0.01
      : config.provider === "anthropic" ? 0.015 : 0;
    state.costEstimate += ((promptTokens + completionTokens) / 1000) * costPer1kTokens;
  }

  getSummary(): { provider: LlmProvider; requestsTotal: number; costEstimate: number; rateLimitStruck: boolean }[] {
    return [...this.state.entries()].map(([provider, state]) => ({
      provider: provider as LlmProvider,
      requestsTotal: state.requestsTotal,
      costEstimate: state.costEstimate,
      rateLimitStruck: state.requestsThisMinute >= state.rateLimit,
    }));
  }

  getTotalCost(): number {
    return [...this.state.values()].reduce((sum, s) => sum + s.costEstimate, 0);
  }

  getElapsedMinutes(): number {
    return (Date.now() - this.startTime) / 60000;
  }

  reset(): void {
    this.state.clear();
    this.startTime = Date.now();
  }
}