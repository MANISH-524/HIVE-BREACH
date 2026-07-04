import { BaseAgent } from "../base-agent.js";
import { Finding } from "../../types/index.js";

export class NetworkExpertAgent extends BaseAgent {
  async execute(): Promise<Finding[]> {
    const target = this.context.target.value;
    const result = await this.llmComplete(
      `You are a Network Security Expert. Focus on post-exploitation and lateral movement.
Areas: AD attack-path mapping, service exploitation, pivoting opportunities,
privilege escalation vectors, exposed network services.

Return findings as JSON array. Include MITRE ATT&CK IDs.`,
      `Target network: ${target}\n\nAssess network security posture. Return JSON array.`,
    );

    try {
      const parsed = JSON.parse(result);
      if (Array.isArray(parsed)) {
        return parsed.map((item: Record<string, unknown>) =>
          this.createFinding({
            title: (item.title as string) ?? "Network finding",
            description: (item.description as string) ?? "",
            severity: (item.severity as Finding["severity"]) ?? "medium",
            verificationTrack: "exploit-verified",
            evidence: (item.evidence as string) ?? "",
            mitreAttackIds: item.mitreAttackIds as string[],
            rawOutput: JSON.stringify(item),
          }),
        );
      }
    } catch { /* fallthrough */ }
    return [];
  }
}
