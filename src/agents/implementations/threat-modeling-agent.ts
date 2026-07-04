import { BaseAgent } from "../base-agent.js";
import { Finding, AgentRole } from "../../types/index.js";

export interface ThreatModelRiskMap {
  prioritizedAgents: AgentRole[];
  highRiskAreas: string[];
  recommendedTimeBudgetMinutes: number;
  confidence: "high" | "medium" | "low";
}

export class ThreatModelingAgent extends BaseAgent {
  async execute(): Promise<Finding[]> {
    const target = this.context.target.value;
    const findings: Finding[] = [];

    const result = await this.llmComplete(
      `You are a Threat Modeling Expert. Before any testing begins, analyze the target and rank risks.
Your output determines agent dispatch ORDER — critical threats are tested FIRST.

Output these three sections AS JSON:
{
  "riskMap": { priority list of agent types to spawn, in rank order },
  "highRiskAreas": [ list of specific areas that are highest risk ],
  "overallRisk": "critical" | "high" | "medium" | "low"
}
Agent types available: recon, web-expert, api-testing, active-testing, cloud-expert, network-expert,
server-side, client-side, mobile-app, password-credential, exploit-poc, sca-sbom.

Rank by WHAT IS ACTUALLY DANGEROUS, not by what you can test.
E.g.: an S3 bucket with public read = higher priority than a missing HTTP security header.
A Django app with unpatched CVEs = higher priority than fuzzing random endpoints.`,
      `Target: ${target}\n\nBuild a prioritized risk map. Return JSON with riskMap, highRiskAreas, overallRisk.`,
    );

    try {
      const parsed = JSON.parse(result);
      const riskMap = parsed.riskMap as ThreatModelRiskMap["prioritizedAgents"] | undefined;

      if (riskMap && Array.isArray(riskMap)) {
        findings.push(this.createFinding({
          title: "Threat Model Risk Map Generated",
          description: `Prioritized ${riskMap.length} agents in risk-ranked order. High-risk areas: ${(parsed.highRiskAreas as string[])?.join(", ") ?? "none identified"}`,
          severity: "info",
          verificationTrack: "state-verified",
          evidence: JSON.stringify(parsed),
          rawOutput: result,
        }));
      }
    } catch {
      findings.push(this.createFinding({
        title: "Threat Model (raw)",
        description: result.slice(0, 500),
        severity: "info",
        verificationTrack: "state-verified",
        evidence: result,
      }));
    }

    return findings;
  }
}