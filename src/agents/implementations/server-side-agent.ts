import { BaseAgent } from "../base-agent.js";
import { Finding } from "../../types/index.js";

export class ServerSideAgent extends BaseAgent {
  async execute(): Promise<Finding[]> {
    const target = this.context.target.value;
    const result = await this.llmComplete(
      `You are a Server-Side Infrastructure Expert. Check for:
1. Exposed services on non-standard ports
2. TLS/SSL misconfigurations (weak ciphers, expired certs)
3. Outdated daemons with known CVEs
4. Default credentials on services
5. SSH misconfigurations
6. Open administrative interfaces

Return JSON array with title, description, severity, evidence, fixSuggestion, cweIds.`,
      `Target: ${target}\n\nCheck server-side infrastructure. Return JSON array.`,
    );

    try {
      const parsed = JSON.parse(result);
      if (Array.isArray(parsed)) {
        return parsed.map((item: Record<string, unknown>) =>
          this.createFinding({
            title: (item.title as string) ?? "Server finding",
            description: (item.description as string) ?? "",
            severity: (item.severity as Finding["severity"]) ?? "medium",
            verificationTrack: (item.verificationTrack as Finding["verificationTrack"]) ?? "state-verified",
            evidence: (item.evidence as string) ?? "",
            fixSuggestion: item.fixSuggestion as string,
            cweIds: item.cweIds as string[],
            rawOutput: JSON.stringify(item),
          }),
        );
      }
    } catch { /* fallthrough */ }
    return [];
  }
}
