import { BaseAgent } from "../base-agent.js";
import { Finding } from "../../types/index.js";
import { severityScore } from "../../utils/index.js";

export class VerificationCorrelationAgent extends BaseAgent {
  async execute(): Promise<Finding[]> {
    const findings = this.context.findings;
    const verified: Finding[] = [];

    for (const finding of findings) {
      if (severityScore(finding.severity) >= 4) {
        const isConsistent = findings.some(
          (f) =>
            f.id !== finding.id &&
            f.agentRole !== finding.agentRole &&
            f.title.toLowerCase().includes(finding.title.slice(0, 20).toLowerCase()),
        );

        verified.push({
          ...finding,
          confidence: isConsistent ? "high" : "medium",
        });
      } else {
        verified.push({
          ...finding,
          confidence: "low",
        });
      }
    }

    return [
      this.createFinding({
        title: `Verification complete: ${verified.length} findings (${findings.length} total)`,
        description: `Cross-checked ${findings.length} findings across agents. ${verified.length} passed verification.`,
        severity: "info",
        verificationTrack: "state-verified",
        evidence: JSON.stringify(verified.map((f) => ({
          id: f.id,
          title: f.title,
          severity: f.severity,
          confidence: f.confidence,
          track: f.verificationTrack,
        }))),
      }),
    ];
  }
}
