import { LlmConfig, LlmMessage, LlmResponse } from "../types/index.js";
import { LlmAdapter } from "./adapter.js";

export class OllamaAdapter implements LlmAdapter {
  readonly provider = "ollama";

  async complete(messages: LlmMessage[], config: LlmConfig): Promise<LlmResponse> {
    const baseUrl = config.baseUrl ?? "http://localhost:11434";
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model,
        messages,
        options: {
          temperature: config.temperature ?? 0.3,
          num_predict: config.maxTokens ?? 4096,
        },
        stream: false,
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama error ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as { message: { content: string }; eval_count?: number };

    return {
      content: data.message.content,
      model: config.model,
      provider: "ollama",
      usage: data.eval_count ? { promptTokens: 0, completionTokens: data.eval_count } : undefined,
    };
  }
}
