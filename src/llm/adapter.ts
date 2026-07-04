import { LlmConfig, LlmMessage, LlmResponse } from "../types/index.js";

export interface LlmAdapter {
  readonly provider: string;
  complete(messages: LlmMessage[], config: LlmConfig): Promise<LlmResponse>;
}
