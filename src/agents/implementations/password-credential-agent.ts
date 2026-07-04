import { BaseAgent } from "../base-agent.js";
import { Finding } from "../../types/index.js";

export class PasswordCredentialAgent extends BaseAgent {
  async execute(): Promise<Finding[]> {
    const target = this.context.target.value;
    const isAuthorized = this.context.scope.allowCredentialAttacks;

    const result = await this.llmComplete(
      `You are a Credential Testing Expert. ${isAuthorized ? "LIVE MODE: authorized to attempt credential attacks against the target." : "SIMULATION MODE: dry-run only. Identify potential credential weaknesses without actually testing them live."}

Check for:
1. Default credentials on common services
2. Weak password policies
3. Credential spraying opportunities
4. Hash capture/reuse risks
5. Known credential dumps (haveibeenpwned-style check)

Return JSON array with title, description, severity, evidence. Mark findings with isCredential: true.`,
      `Target: ${target}\n\n${isAuthorized ? "Perform authorized credential testing." : "Simulate credential testing (dry-run only)."} Return JSON array.`,
    );

    try {
      const parsed = JSON.parse(result);
      if (Array.isArray(parsed)) {
        return parsed.map((item: Record<string, unknown>) =>
          this.createFinding({
            title: (item.title as string) ?? "Credential finding",
            description: (item.description as string) ?? "",
            severity: (item.severity as Finding["severity"]) ?? "high",
            verificationTrack: "state-verified",
            evidence: (item.evidence as string) ?? "",
            rawOutput: JSON.stringify(item),
            isCredential: true,
          }),
        );
      }
    } catch { /* fallthrough */ }
    return [];
  }
}
