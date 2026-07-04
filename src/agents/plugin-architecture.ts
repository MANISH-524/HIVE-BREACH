import { AgentCard, AgentRole } from "../types/index.js";
import { registerAgent } from "./registry.js";
import { BaseAgent } from "./base-agent.js";

export interface AgentPlugin {
  agentCard: AgentCard;
  implementation: typeof BaseAgent;
  register(): void;
}

/**
 * Plugin / Extensibility Architecture
 * The community should be able to add new expert agents (new cloud providers,
 * new frameworks) without forking the orchestrator core.
 * This determines whether HiveBreach stays a personal project or becomes a real ecosystem.
 */
export class PluginManager {
  private plugins: AgentPlugin[] = [];

  install(plugin: AgentPlugin): { success: boolean; reason?: string } {
    const existing = this.plugins.find((p) => p.agentCard.role === plugin.agentCard.role);
    if (existing) {
      return { success: false, reason: `Agent role "${plugin.agentCard.role}" already registered by an installed plugin` };
    }

    const coreDefined = getCoreAgentRoles().includes(plugin.agentCard.role);
    if (coreDefined) {
      return { success: false, reason: `Agent role "${plugin.agentCard.role}" is a core agent — cannot override` };
    }

    this.plugins.push(plugin);
    plugin.register();
    return { success: true };
  }

  uninstall(role: AgentRole): boolean {
    const idx = this.plugins.findIndex((p) => p.agentCard.role === role);
    if (idx === -1) return false;
    this.plugins.splice(idx, 1);
    return true;
  }

  listPlugins(): AgentPlugin[] {
    return [...this.plugins];
  }

  createPluginFromCard(card: AgentCard, ctor: typeof BaseAgent): AgentPlugin {
    return {
      agentCard: card,
      implementation: ctor,
      register: () => {
        registerAgent(card.role, ctor);
      },
    };
  }
}

function getCoreAgentRoles(): AgentRole[] {
  return [
    "recon", "web-expert", "api-testing", "active-testing",
    "cloud-expert", "network-expert", "server-side", "client-side",
    "mobile-app", "password-credential", "wireless", "exploit-poc",
    "verification-correlation", "cleanup-teardown", "report",
    "sca-sbom", "threat-modeling", "secrets-scanning",
  ];
}