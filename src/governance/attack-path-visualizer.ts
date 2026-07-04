import { Finding } from "../types/index.js";
import { generateId, timestamp } from "../utils/index.js";

export interface AttackChain {
  id: string;
  name: string;
  steps: AttackStep[];
  impact: string;
  severity: "critical" | "high" | "medium" | "low";
  confidence: "high" | "medium" | "low";
}

export interface AttackStep {
  order: number;
  findingId: string;
  findingTitle: string;
  technique: string;
  prerequisite: string | null;
  gain: string;
}

/**
 * Attack-Path / Chain Visualization
 * Turns "17 separate findings" into "here's the 3-step chain that gets
 * an attacker to admin" — more persuasive to a security team than a flat list.
 * BloodHound-style reasoning generalized beyond Active Directory.
 */
export class AttackPathVisualizer {
  analyze(findings: Finding[]): AttackChain[] {
    if (findings.length < 2) return [];

    const chains: AttackChain[] = [];
    const sorted = [...findings].sort((a, b) => {
      const order = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
      return (order[b.severity] ?? 0) - (order[a.severity] ?? 0);
    });

    const credentialFindings = sorted.filter((f) => f.isCredential);
    const accessFindings = sorted.filter((f) =>
      f.title.toLowerCase().includes("access") ||
      f.title.toLowerCase().includes("auth") ||
      f.title.toLowerCase().includes("permission")
    );
    const misconfigFindings = sorted.filter((f) =>
      f.title.toLowerCase().includes("misconfig") ||
      f.title.toLowerCase().includes("exposed") ||
      f.title.toLowerCase().includes("public")
    );
    const injectionFindings = sorted.filter((f) =>
      f.title.toLowerCase().includes("injection") ||
      f.title.toLowerCase().includes("ssrf") ||
      f.title.toLowerCase().includes("rce")
    );

    if (credentialFindings.length && accessFindings.length) {
      const chain: AttackChain = {
        id: generateId(),
        name: "Credential Access → Privilege Escalation Chain",
        steps: [
          {
            order: 1,
            findingId: credentialFindings[0]!.id,
            findingTitle: credentialFindings[0]!.title,
            technique: "Credential Harvesting",
            prerequisite: null,
            gain: "Valid credentials obtained",
          },
          {
            order: 2,
            findingId: accessFindings[0]!.id,
            findingTitle: accessFindings[0]!.title,
            technique: "Privilege Escalation / Access Control Bypass",
            prerequisite: credentialFindings[0]!.id,
            gain: "Unauthorized access to protected resources",
          },
        ],
        impact: "Attacker obtains valid credentials and escalates to unauthorized access",
        severity: "critical",
        confidence: "medium",
      };
      chains.push(chain);
    }

    if (misconfigFindings.length && accessFindings.length) {
      const chain: AttackChain = {
        id: generateId(),
        name: "Misconfiguration Exploitation Chain",
        steps: [
          {
            order: 1,
            findingId: misconfigFindings[0]!.id,
            findingTitle: misconfigFindings[0]!.title,
            technique: "Discover Misconfiguration",
            prerequisite: null,
            gain: "Exposed endpoint or resource identified",
          },
          {
            order: 2,
            findingId: accessFindings[0]!.id,
            findingTitle: accessFindings[0]!.title,
            technique: "Access Control Bypass",
            prerequisite: misconfigFindings[0]!.id,
            gain: "Sensitive data or functionality accessed",
          },
        ],
        impact: "Misconfiguration exposed entry points bypassing access controls",
        severity: "high",
        confidence: "medium",
      };
      chains.push(chain);
    }

    if (injectionFindings.length && accessFindings.length) {
      const chain: AttackChain = {
        id: generateId(),
        name: "Injection → Access Control Bypass Chain",
        steps: [
          {
            order: 1,
            findingId: injectionFindings[0]!.id,
            findingTitle: injectionFindings[0]!.title,
            technique: "Injection Attack",
            prerequisite: null,
            gain: "Code execution or data extraction",
          },
          {
            order: 2,
            findingId: accessFindings[0]!.id,
            findingTitle: accessFindings[0]!.title,
            technique: "Post-Injection Access Escalation",
            prerequisite: injectionFindings[0]!.id,
            gain: "Full compromise via chained exploit",
          },
        ],
        impact: "Injection vulnerability chained with access control bypass for full compromise",
        severity: "critical",
        confidence: "medium",
      };
      chains.push(chain);
    }

    return chains;
  }

  generateReport(chains: AttackChain[]): string {
    if (chains.length === 0) return "No attack chains identified from the current findings.";

    let report = "# Attack-Path Analysis\n\n";
    report += `Generated: ${timestamp()}\n\n`;

    for (const chain of chains) {
      report += `## ${chain.name} (${chain.severity.toUpperCase()})\n\n`;
      report += `**Confidence:** ${chain.confidence}\n`;
      report += `**Impact:** ${chain.impact}\n\n`;

      for (const step of chain.steps) {
        const arrow = step.prerequisite ? "  └── (needs step above)" : "  →";
        report += `${step.order}.${arrow} **${step.technique}**\n`;
        report += `   Finding: ${step.findingTitle}\n`;
        report += `   Gains: ${step.gain}\n\n`;
      }
    }

    return report;
  }
}