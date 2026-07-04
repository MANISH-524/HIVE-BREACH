import { Finding, ComplianceReference } from "../types/index.js";

export interface ComplianceStandard {
  id: string;
  name: string;
  controls: ComplianceControl[];
}

export interface ComplianceControl {
  id: string;
  title: string;
  mapping: {
    severity: string[];
    owaspMapping?: string[];
    cweIds?: string[];
    keywords?: string[];
  };
}

/**
 * Compliance Mapping Layer
 * Maps findings to SOC2/PCI-DSS/ISO 27001/NIST controls.
 * Layers on top of existing OWASP/MITRE/CWE tagging.
 * Makes the report usable by security/compliance teams, not just devs.
 */
export class ComplianceMapper {
  private standards: ComplianceStandard[] = [];

  constructor() {
    this.registerDefaultStandards();
  }

  private registerDefaultStandards(): void {
    this.registerStandard({
      id: "pci-dss",
      name: "PCI DSS v4.0",
      controls: [
        { id: "6.3.1", title: "Secure SDLC", mapping: { severity: ["critical", "high"], keywords: ["injection", "dependency"] } },
        { id: "6.5", title: "Address Coding Vulnerabilities", mapping: { severity: ["critical", "high", "medium"], owaspMapping: ["A01", "A02", "A03", "A04"] } },
        { id: "3.4", title: "Protect Cardholder Data", mapping: { severity: ["critical", "high"], keywords: ["encryption", "secret", "key", "exposure"] } },
        { id: "7.2", title: "Access Control Systems", mapping: { severity: ["critical", "high"], keywords: ["access", "auth", "privilege", "iam"] } },
      ],
    });

    this.registerStandard({
      id: "iso-27001",
      name: "ISO 27001:2022",
      controls: [
        { id: "A.8.8", title: "Technical Vulnerability Management", mapping: { severity: ["critical", "high", "medium"] } },
        { id: "A.5.15", title: "Access Control", mapping: { severity: ["critical", "high"], keywords: ["access", "privilege", "iam"] } },
        { id: "A.8.12", title: "Data Leakage Prevention", mapping: { severity: ["critical"], keywords: ["secret", "exposure", "leak"] } },
        { id: "A.5.17", title: "Authentication Information", mapping: { severity: ["critical", "high"], keywords: ["credential", "auth", "password"] } },
        { id: "A.8.26", title: "Application Security Requirements", mapping: { severity: ["critical", "high", "medium"], owaspMapping: ["A01", "A03", "A05"] } },
      ],
    });

    this.registerStandard({
      id: "soc2",
      name: "SOC 2 (CC Criteria)",
      controls: [
        { id: "CC6.1", title: "Logical Access Security", mapping: { severity: ["critical", "high"], keywords: ["access", "iam", "privilege"] } },
        { id: "CC6.6", title: "Vulnerability Remediation", mapping: { severity: ["critical", "high", "medium"] } },
        { id: "CC6.8", title: "Detection of Unauthorized Activities", mapping: { severity: ["critical", "high"], keywords: ["detection", "monitoring"] } },
        { id: "CC7.1", title: "Change Detection", mapping: { severity: ["high", "medium"], keywords: ["misconfig", "change"] } },
      ],
    });

    this.registerStandard({
      id: "nist-800-53",
      name: "NIST SP 800-53",
      controls: [
        { id: "RA-5", title: "Vulnerability Scanning", mapping: { severity: ["critical", "high", "medium", "low"] } },
        { id: "AC-3", title: "Access Enforcement", mapping: { severity: ["critical", "high"], keywords: ["access", "iam", "privilege"] } },
        { id: "CM-6", title: "Configuration Settings", mapping: { severity: ["high", "medium"], keywords: ["misconfig", "config", "exposure"] } },
        { id: "IA-5", title: "Authenticator Management", mapping: { severity: ["critical", "high"], keywords: ["credential", "auth", "password"] } },
        { id: "SC-8", title: "Transmission Confidentiality", mapping: { severity: ["high", "medium"], keywords: ["tls", "ssl", "encryption"] } },
      ],
    });
  }

  registerStandard(standard: ComplianceStandard): void {
    this.standards.push(standard);
  }

  mapFinding(finding: Finding): ComplianceReference[] {
    const refs: ComplianceReference[] = [];

    for (const std of this.standards) {
      for (const ctrl of std.controls) {
        let matches = false;

        if (ctrl.mapping.severity.includes(finding.severity)) {
          if (ctrl.mapping.owaspMapping?.some((o) => finding.owaspMapping.includes(o))) matches = true;
          else if (ctrl.mapping.cweIds?.some((c) => finding.cweIds.includes(c))) matches = true;
          else if (ctrl.mapping.keywords?.some((kw) =>
            finding.title.toLowerCase().includes(kw.toLowerCase()) ||
            finding.description.toLowerCase().includes(kw.toLowerCase())
          )) matches = true;
          else if (!ctrl.mapping.owaspMapping && !ctrl.mapping.cweIds && !ctrl.mapping.keywords) matches = true;
        }

        if (matches) {
          refs.push({ standard: `${std.name} — ${ctrl.id} ${ctrl.title}`, control: ctrl.id, findingId: finding.id });
        }
      }
    }

    return refs;
  }

  getAllStandards(): ComplianceStandard[] {
    return [...this.standards];
  }
}