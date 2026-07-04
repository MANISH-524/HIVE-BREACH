import { BaseAgent } from "../base-agent.js";
import { Finding } from "../../types/index.js";

export class SecretsScanningAgent extends BaseAgent {
  async execute(): Promise<Finding[]> {
    const target = this.context.target.value;

    const result = await this.llmComplete(
      `You are a Secrets Scanning Expert. Find ANY leaked credential, API key, or secret.

Search for these patterns:
- AWS Access Key IDs (AKIA*), AWS Secret Keys
- GCP service account keys
- Azure Storage keys, Connection strings
- GitHub tokens (ghp_*, gho_*, github_pat_*)
- Private keys (BEGIN RSA PRIVATE KEY, BEGIN OPENSSH PRIVATE KEY)
- API keys (stripe, sendgrid, twilio, slack, datadog)
- Database connection strings with passwords
- Hardcoded passwords in config files
- JWT secrets, encryption keys
- .env files with secrets committed

IMPORTANT: For each finding that IS a live credential, the finding MUST include:
- isCredential: true
- The secret value location (file path, line number) as evidence
- NEVER embed the raw secret value in the description — put it ONLY in the evidence field

Return JSON array with: title, description (anonymized), severity ("critical" for live production keys), evidence, isCredential (boolean).`,
      `Target: ${target}\n\nScan for secrets and credentials. Return JSON array.`,
    );

    try {
      const parsed = JSON.parse(result);
      if (Array.isArray(parsed)) {
        return parsed.map((item: Record<string, unknown>) =>
          this.createFinding({
            title: (item.title as string) ?? "Secret found",
            description: (item.description as string) ?? "",
            severity: (item.severity as Finding["severity"]) ?? "critical",
            verificationTrack: "state-verified",
            evidence: (item.evidence as string) ?? "",
            rawOutput: JSON.stringify(item),
            isCredential: true,
          }),
        );
      }
    } catch { /* fallthrough */ }
    return [this.createFinding({ title: "Secrets scan output", description: result.slice(0, 500), severity: "info", verificationTrack: "state-verified", evidence: result })];
  }
}