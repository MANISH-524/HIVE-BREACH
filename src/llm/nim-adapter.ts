import { LlmConfig, LlmMessage, LlmResponse } from "../types/index.js";
import { LlmAdapter } from "./adapter.js";

export class NimAdapter implements LlmAdapter {
  readonly provider = "nim";

  async complete(messages: LlmMessage[], config: LlmConfig): Promise<LlmResponse> {
    const baseUrl = config.baseUrl ?? "https://api.nvcf.nvidia.com/v2/nvcf";
    const apiKey = config.apiKey ?? process.env["NVIDIA_API_KEY"];

    if (!apiKey) {
      throw new Error("NVIDIA NIM requires an API key (set NVIDIA_API_KEY env var or config.llm.apiKey)");
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: config.temperature ?? 0.3,
        max_tokens: config.maxTokens ?? 4096,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) {
        throw new Error("NVIDIA NIM rate limit exceeded (429). Consider queuing/throttling agent calls.");
      }
      throw new Error(`NVIDIA NIM error ${res.status}: ${text}`);
    }

    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
      usage?: { prompt_tokens: number; completion_tokens: number };
    };

    return {
      content: data.choices[0]!.message.content,
      model: config.model,
      provider: "nim",
      usage: data.usage
        ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens }
        : undefined,
    };
  }
}
