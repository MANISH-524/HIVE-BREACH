import { LlmConfig, LlmMessage, LlmResponse } from "../types/index.js";
import { LlmAdapter } from "./adapter.js";

export class AnthropicAdapter implements LlmAdapter {
  readonly provider = "anthropic";

  async complete(messages: LlmMessage[], config: LlmConfig): Promise<LlmResponse> {
    const apiKey = config.apiKey ?? process.env["ANTHROPIC_API_KEY"];

    if (!apiKey) {
      throw new Error("Anthropic requires an API key (set ANTHROPIC_API_KEY env var or config.llm.apiKey)");
    }

    const systemMessages = messages.filter((m) => m.role === "system").map((m) => m.content);
    const nonSystem = messages.filter((m) => m.role !== "system");
    const converted = nonSystem.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.model,
        system: systemMessages.join("\n") || undefined,
        messages: converted,
        max_tokens: config.maxTokens ?? 4096,
        temperature: config.temperature ?? 0.3,
      }),
    });

    if (!res.ok) {
      throw new Error(`Anthropic error ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as {
      content: { text: string }[];
      usage?: { input_tokens: number; output_tokens: number };
    };

    return {
      content: data.content[0]!.text,
      model: config.model,
      provider: "anthropic",
      usage: data.usage
        ? { promptTokens: data.usage.input_tokens, completionTokens: data.usage.output_tokens }
        : undefined,
    };
  }
}
