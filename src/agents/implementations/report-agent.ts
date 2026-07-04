import { BaseAgent } from "../base-agent.js";
import { Finding } from "../../types/index.js";
import { timestamp, severityScore } from "../../utils/index.js";

export class ReportAgent extends BaseAgent {
  async execute(): Promise<Finding[]> {
    const allFindings = this.context.findings;
    const target = this.context.target.value;

    allFindings.sort((a: Finding, b: Finding) => severityScore(b.severity) - severityScore(a.severity));

    const reportMarkdown = this.generateReport(allFindings, target);

    return [
      this.createFinding({
        title: `HiveBreach Report — ${target}`,
        description: reportMarkdown,
        severity: "info",
        verificationTrack: "state-verified",
        evidence: reportMarkdown,
      }),
    ];
  }

  private generateReport(findings: Finding[], target: string): string {
    const critical = findings.filter((f) => f.severity === "critical").length;
    const high = findings.filter((f) => f.severity === "high").length;
    const medium = findings.filter((f) => f.severity === "medium").length;
    const low = findings.filter((f) => f.severity === "low").length;
    const info = findings.filter((f) => f.severity === "info").length;

    let report = `# HiveBreach Security Report\n\n`;
    report += `**Target:** ${target}\n`;
    report += `**Generated:** ${timestamp()}\n\n`;
    report += `## Summary\n\n`;
    report += `| Severity | Count |\n|----------|-------|\n`;
    report += `| Critical | ${critical} |\n| High | ${high} |\n| Medium | ${medium} |\n| Low | ${low} |\n| Info | ${info} |\n\n`;

    if (findings.length === 0) {
      report += `No findings were detected during this scan.\n\n`;
    } else {
      report += `## Findings\n\n`;
      for (const f of findings) {
        report += `### [${f.severity.toUpperCase()}] ${f.title}\n\n`;
        report += `**Agent:** ${f.agentRole}\n`;
        report += `**Verification:** ${f.verificationTrack}\n`;
        report += `**Confidence:** ${f.confidence}\n`;
        if (f.mitreAttackIds.length) report += `**MITRE ATT&CK:** ${f.mitreAttackIds.join(", ")}\n`;
        if (f.owaspMapping.length) report += `**OWASP:** ${f.owaspMapping.join(", ")}\n`;
        if (f.cweIds.length) report += `**CWE:** ${f.cweIds.join(", ")}\n`;
        if (f.cvssScore) report += `**CVSS:** ${f.cvssScore}\n\n`;
        report += `${f.description}\n\n`;
        if (f.evidence) report += `**Evidence:**\n\`\`\`\n${f.evidence.slice(0, 1000)}\n\`\`\`\n\n`;
        if (f.poc) report += `**PoC:**\n\`\`\`\n${f.poc.slice(0, 2000)}\n\`\`\`\n\n`;
        if (f.fixSuggestion) {
          report += `**Fix Suggestion:**\n${f.fixSuggestion}\n\n`;
        }
      }
    }

    report += `---\n\n`;
    report += `*This is a suggested remediation for developer review — it has not been applied or validated as a patch.*\n`;
    report += `*HiveBreach v1.0.0 — Autonomous Multi-Agent Penetration Testing Framework*\n`;

    return report;
  }
}
