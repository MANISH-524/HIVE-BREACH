import { LlmConfig, LlmMessage, LlmResponse } from "../types/index.js";
import { LlmAdapter } from "./adapter.js";
import { OllamaAdapter } from "./ollama-adapter.js";
import { NimAdapter } from "./nim-adapter.js";
import { OpenaiAdapter } from "./openai-adapter.js";
import { AnthropicAdapter } from "./anthropic-adapter.js";

const adapters: Record<string, LlmAdapter> = {
  ollama: new OllamaAdapter(),
  nim: new NimAdapter(),
  openai: new OpenaiAdapter(),
  anthropic: new AnthropicAdapter(),
};

export class LlmRouter {
  private adapters: Map<string, LlmAdapter> = new Map();
  private costTracker = { promptTokens: 0, completionTokens: 0 };

  constructor() {
    for (const [key, adapter] of Object.entries(adapters)) {
      this.adapters.set(key, adapter);
    }
  }

  registerAdapter(name: string, adapter: LlmAdapter): void {
    this.adapters.set(name, adapter);
  }

  async complete(config: LlmConfig, messages: LlmMessage[]): Promise<LlmResponse> {
    const adapter = this.adapters.get(config.provider);
    if (!adapter) {
      throw new Error(`Unknown LLM provider: ${config.provider}. Available: ${[...this.adapters.keys()].join(", ")}`);
    }

    const response = await adapter.complete(messages, config);

    if (response.usage) {
      this.costTracker.promptTokens += response.usage.promptTokens;
      this.costTracker.completionTokens += response.usage.completionTokens;
    }

    return response;
  }

  getTotalUsage(): { promptTokens: number; completionTokens: number } {
    return { ...this.costTracker };
  }

  resetUsage(): void {
    this.costTracker = { promptTokens: 0, completionTokens: 0 };
  }
}
