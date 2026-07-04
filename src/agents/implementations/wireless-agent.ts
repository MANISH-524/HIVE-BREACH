import { BaseAgent } from "../base-agent.js";
import { Finding } from "../../types/index.js";

export class WirelessAgent extends BaseAgent {
  async execute(): Promise<Finding[]> {
    if (!this.context.scope.wirelessTestingAuthorized) {
      return [this.createFinding({
        title: "Wireless testing skipped — not authorized",
        description: "Wireless testing requires a separate RoE clause covering physical/RF legal considerations. Set scope.wirelessTestingAuthorized: true to enable.",
        severity: "info",
        verificationTrack: "state-verified",
        evidence: "Wireless agent is disabled by default. Requires explicit RoE authorization.",
      })];
    }

    const target = this.context.target.value;
    const result = await this.llmComplete(
      `You are a Wireless Security Expert. Check for:
1. WPA/WPA2 weaknesses
2. Rogue AP detection
3. WPS pin vulnerabilities
4. MAC filtering bypass techniques
5. Management interface exposures

Return JSON array with title, description, severity, evidence.`,
      `Target wireless environment: ${target}\n\nAssess wireless security. Return JSON array.`,
    );

    try {
      const parsed = JSON.parse(result);
      if (Array.isArray(parsed)) {
        return parsed.map((item: Record<string, unknown>) =>
          this.createFinding({
            title: (item.title as string) ?? "Wireless finding",
            description: (item.description as string) ?? "",
            severity: (item.severity as Finding["severity"]) ?? "medium",
            verificationTrack: "state-verified",
            evidence: (item.evidence as string) ?? "",
            rawOutput: JSON.stringify(item),
          }),
        );
      }
    } catch { /* fallthrough */ }
    return [];
  }
}
