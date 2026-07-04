import { LlmConfig, LlmMessage, LlmResponse } from "../types/index.js";
import { LlmAdapter } from "./adapter.js";

export class OpenaiAdapter implements LlmAdapter {
  readonly provider = "openai";

  async complete(messages: LlmMessage[], config: LlmConfig): Promise<LlmResponse> {
    const apiKey = config.apiKey ?? process.env["OPENAI_API_KEY"];

    if (!apiKey) {
      throw new Error("OpenAI requires an API key (set OPENAI_API_KEY env var or config.llm.apiKey)");
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
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
      throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
      usage?: { prompt_tokens: number; completion_tokens: number };
    };

    return {
      content: data.choices[0]!.message.content,
      model: config.model,
      provider: "openai",
      usage: data.usage
        ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens }
        : undefined,
    };
  }
}
