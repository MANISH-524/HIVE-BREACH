import { BaseAgent } from "../base-agent.js";
import { Finding } from "../../types/index.js";

export class ScaSbomAgent extends BaseAgent {
  async execute(): Promise<Finding[]> {
    const target = this.context.target.value;

    const result = await this.llmComplete(
      `You are an SCA/SBOM Security Expert. Analyze the target for known-vulnerable dependencies.

Generate findings for:
1. Known CVEs in the tech stack (frameworks, libraries, runtime versions)
2. Dependency versions with published vulnerabilities
3. SBOM inventory (list all detectable components)
4. CVSS severity for each CVE found
5. Fix version availability for each finding

For each finding include: cveIds (CVE-XXXXX), cvssScore (0.0-10.0), fixSuggestion (upgrade version).
Use NVD/Grype/Trivy knowledge to match versions to known CVEs.
This is state-verified — output ranking, not exploit reproduction.`,
      `Target for SCA analysis: ${target}\n\nIdentify all dependencies and match against known CVE databases. Output as JSON array with fields: title, description, severity, cveIds, cvssScore, fixSuggestion, evidence.`,
    );

    try {
      const parsed = JSON.parse(result);
      if (Array.isArray(parsed)) {
        return parsed.map((item: Record<string, unknown>) =>
          this.createFinding({
            title: (item.title as string) ?? "SCA dependency finding",
            description: (item.description as string) ?? "",
            severity: (item.severity as Finding["severity"]) ?? "medium",
            verificationTrack: "state-verified",
            evidence: (item.evidence as string) ?? "",
            cweIds: (item.cweIds as string[]) ?? [],
            fixSuggestion: item.fixSuggestion as string,
            rawOutput: JSON.stringify(item),
          }),
        );
      }
    } catch { /* fallthrough */ }
    return [this.createFinding({ title: "SCA scan completed", description: result.slice(0, 500), severity: "info", verificationTrack: "state-verified", evidence: result })];
  }
}