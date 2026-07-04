import { AgentRole, AgentCard, AgentContext } from "../types/index.js";
import { LlmRouter } from "../llm/router.js";
import { BaseAgent } from "./base-agent.js";

const registry = new Map<AgentRole, unknown>();

export function registerAgent(role: AgentRole, ctor: unknown): void {
  registry.set(role, ctor);
}

export function instantiateAgent(
  role: AgentRole,
  card: AgentCard,
  router: LlmRouter,
  context: AgentContext,
): BaseAgent {
  const ctor = registry.get(role);
  if (!ctor) {
    throw new Error(`No agent implementation registered for role: ${role}`);
  }
  const AgentClass = ctor as new (card: AgentCard, router: LlmRouter, context: AgentContext) => BaseAgent;
  return new AgentClass(card, router, context);
}

export function getRegisteredRoles(): AgentRole[] {
  return [...registry.keys()];
}
