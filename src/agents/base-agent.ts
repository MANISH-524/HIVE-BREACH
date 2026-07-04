import { AgentCard, AgentContext, Finding, LlmMessage, BusMessage, AgentRole } from "../types/index.js";
import { LlmRouter } from "../llm/router.js";
import { generateId, timestamp } from "../utils/index.js";

export abstract class BaseAgent {
  readonly card: AgentCard;
  protected router: LlmRouter;
  protected context: AgentContext;

  constructor(card: AgentCard, router: LlmRouter, context: AgentContext) {
    this.card = card;
    this.router = router;
    this.context = context;
  }

  abstract execute(): Promise<Finding[]>;

  protected async llmComplete(
    systemPrompt: string,
    userMessage: string,
  ): Promise<string> {
    const messages: LlmMessage[] = [
      { role: "system", content: systemPrompt },
      ...this.context.messages,
      { role: "user", content: userMessage },
    ];

    const response = await this.router.complete(this.context.llmConfig, messages);
    return response.content;
  }

  protected createFinding(params: {
    title: string;
    description: string;
    severity: Finding["severity"];
    verificationTrack: Finding["verificationTrack"];
    evidence: string;
    mitreAttackIds?: string[];
    owaspMapping?: string[];
    cweIds?: string[];
    fixSuggestion?: string;
    poc?: string;
    rawOutput?: string;
    isCredential?: boolean;
  }): Finding {
    return {
      id: generateId(),
      agentRole: this.card.role,
      title: params.title,
      description: params.description,
      severity: params.severity,
      verificationTrack: params.verificationTrack,
      confidence: "medium",
      mitreAttackIds: params.mitreAttackIds ?? [],
      owaspMapping: params.owaspMapping ?? [],
      cweIds: params.cweIds ?? [],
      evidence: params.evidence,
      poc: params.poc,
      fixSuggestion: params.fixSuggestion,
      rawOutput: params.rawOutput ?? "",
      timestamp: timestamp(),
      isCredential: params.isCredential ?? false,
    };
  }

  protected sendToBus(
    to: AgentRole | "all",
    type: BusMessage["type"],
    payload: unknown,
  ): BusMessage {
    return {
      id: generateId(),
      from: this.card.role,
      to,
      type,
      payload,
      timestamp: timestamp(),
    };
  }
}
