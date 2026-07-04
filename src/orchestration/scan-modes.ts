import { AgentRole } from "../types/index.js";

export type ScanMode = "ci" | "deep" | "custom";

export interface ScanModeConfig {
  mode: ScanMode;
  agents: AgentRole[];
  timeBudgetMinutes: number;
  description: string;
  scopeHint: string;
}

/**
 * CI-mode vs Deep-mode Split
 * PR scans need to finish in minutes and only test the diff.
 * Scheduled/manual scans run the full exhaustive multi-agent sweep.
 * One mode for both is either too slow for CI or too shallow for real assessment.
 */
export class ScanModeSelector {
  static readonly MODES: ScanModeConfig[] = [
    {
      mode: "ci",
      description: "Diff-only fast scan targeting changed code — completes in ≤10 minutes",
      scopeHint: "Use only on PR targets. Tests changed routes/files, dependencies, secrets.",
      agents: [
        "threat-modeling",
        "secrets-scanning",
        "sca-sbom",
        "active-testing",
        "verification-correlation",
        "cleanup-teardown",
        "report",
      ],
      timeBudgetMinutes: 10,
    },
    {
      mode: "deep",
      description: "Full exhaustive multi-agent sweep — runs all agents in priority order",
      scopeHint: "Use on scheduled scans or manual runs. Full reconnaissance, exploitation, and verification.",
      agents: [
        "secrets-scanning",
        "sca-sbom",
        "threat-modeling",
        "recon",
        "web-expert",
        "api-testing",
        "active-testing",
        "cloud-expert",
        "network-expert",
        "server-side",
        "client-side",
        "mobile-app",
        "exploit-poc",
        "verification-correlation",
        "cleanup-teardown",
        "report",
      ],
      timeBudgetMinutes: 120,
    },
  ];

  static getMode(mode: ScanMode): ScanModeConfig | undefined {
    return this.MODES.find((m) => m.mode === mode);
  }

  static getCiAgents(): AgentRole[] {
    return this.MODES.find((m) => m.mode === "ci")!.agents;
  }

  static getDeepAgents(): AgentRole[] {
    return this.MODES.find((m) => m.mode === "deep")!.agents;
  }

  static selectAgents(mode: ScanMode, customAgents?: AgentRole[]): AgentRole[] {
    if (mode === "custom" && customAgents) return customAgents;
    return this.getMode(mode)?.agents ?? this.getDeepAgents();
  }
}