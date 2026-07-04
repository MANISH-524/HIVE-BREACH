import { BaseAgent } from "../base-agent.js";
import { Finding } from "../../types/index.js";

export class CloudExpertAgent extends BaseAgent {
  async execute(): Promise<Finding[]> {
    const target = this.context.target.value;
    const result = await this.llmComplete(
      `You are a Cloud Security Expert. Check AWS/Azure/GCP for misconfigurations.
Areas: IAM over-permissioning, exposed storage buckets, insecure serverless functions,
K8s misconfig, cloud metadata exposure, public AMIs/snapshots.

Return findings as JSON array with: title, description, severity, evidence, fixSuggestion.`,
      `Target cloud environment: ${target}\n\nCheck cloud security posture. Return JSON array.`,
    );

    return this.parseFindings(result);
  }

  private parseFindings(raw: string): Finding[] {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item: Record<string, unknown>) =>
          this.createFinding({
            title: (item.title as string) ?? "Cloud finding",
            description: (item.description as string) ?? "",
            severity: (item.severity as Finding["severity"]) ?? "medium",
            verificationTrack: "state-verified",
            evidence: (item.evidence as string) ?? "",
            fixSuggestion: item.fixSuggestion as string,
            rawOutput: JSON.stringify(item),
          }),
        );
      }
    } catch { /* fallthrough */ }
    return [this.createFinding({ title: "Cloud scan output", description: raw.slice(0, 500), severity: "info", verificationTrack: "state-verified", evidence: raw })];
  }
}
