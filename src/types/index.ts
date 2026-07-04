import { z } from "zod";

// ── LLM Provider ──────────────────────────────────────────────
export const LlmProviderSchema = z.enum(["ollama", "nim", "openai", "anthropic"]);
export type LlmProvider = z.infer<typeof LlmProviderSchema>;

export interface LlmConfig {
  provider: LlmProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmResponse {
  content: string;
  model: string;
  provider: LlmProvider;
  usage?: { promptTokens: number; completionTokens: number };
}

// ── Skill ─────────────────────────────────────────────────────
export const SkillCategorySchema = z.enum([
  "penetration-testing",
  "cloud-security",
  "dfir",
  "malware-analysis",
  "threat-intel",
  "network-security",
  "api-security",
  "mobile-security",
]);
export type SkillCategory = z.infer<typeof SkillCategorySchema>;

export type VerificationTrack = "exploit-verified" | "state-verified";

export interface SkillMetadata {
  id: string;
  name: string;
  category: SkillCategory;
  mitreAttackIds: string[];
  owaspMapping: string[];
  cweIds: string[];
  verificationTrack: VerificationTrack;
  severity: "critical" | "high" | "medium" | "low" | "info";
  tools: string[];
  stage: string;
  tags: string[];
}

export interface Skill {
  metadata: SkillMetadata;
  body: string;
}

// ── Agent ─────────────────────────────────────────────────────
export const AgentRoleSchema = z.enum([
  "recon",
  "web-expert",
  "api-testing",
  "active-testing",
  "cloud-expert",
  "network-expert",
  "server-side",
  "client-side",
  "mobile-app",
  "password-credential",
  "wireless",
  "exploit-poc",
  "verification-correlation",
  "cleanup-teardown",
  "report",
  "sca-sbom",
  "threat-modeling",
  "secrets-scanning",
]);
export type AgentRole = z.infer<typeof AgentRoleSchema>;

export const AgentRiskLevelSchema = z.enum(["low", "medium", "high", "highest"]);
export type AgentRiskLevel = z.infer<typeof AgentRiskLevelSchema>;

export const AgentDefaultModeSchema = z.enum([
  "autonomous",
  "scope-gated",
  "sandbox-only",
  "requires-roe",
]);
export type AgentDefaultMode = z.infer<typeof AgentDefaultModeSchema>;

export interface AgentCard {
  role: AgentRole;
  name: string;
  description: string;
  stage: string;
  mitreTactics: string[];
  owaspMapping: string[];
  tools: string[];
  verificationMethod: string;
  communicatesWith: AgentRole[];
  riskLevel: AgentRiskLevel;
  defaultMode: AgentDefaultMode;
  expertise: string;
  workingStyle: string;
}

export interface AgentContext {
  sessionId: string;
  target: TargetSpec;
  llmConfig: LlmConfig;
  scope: Scope;
  findings: Finding[];
  messages: LlmMessage[];
}

export interface Finding {
  id: string;
  agentRole: AgentRole;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  verificationTrack: VerificationTrack;
  confidence: "high" | "medium" | "low";
  mitreAttackIds: string[];
  owaspMapping: string[];
  cweIds: string[];
  cvssScore?: number;
  evidence: string;
  poc?: string;
  fixSuggestion?: string;
  rawOutput: string;
  timestamp: string;
  isCredential: boolean;
}

// ── Target & Scope ────────────────────────────────────────────
export interface TargetSpec {
  type: "url" | "repo" | "ip" | "domain" | "local-path";
  value: string;
  metadata?: Record<string, string>;
}

export interface Scope {
  authorizedTargets: string[];
  authorizedHeaders?: Record<string, string>;
  allowedTechniques: string[];
  maxConcurrentRequests: number;
  rateLimitPerSecond: number;
  timeBudgetMinutes: number;
  allowCredentialAttacks: boolean;
  wirelessTestingAuthorized: boolean;
}

// ── Orchestration ─────────────────────────────────────────────
export interface OrchestratorPlan {
  sessionId: string;
  target: TargetSpec;
  scope: Scope;
  agentsToSpawn: AgentRole[];
  priority: "low" | "medium" | "high" | "critical";
  status: "planned" | "running" | "completed" | "failed" | "cancelled";
}

export interface BusMessage {
  id: string;
  from: AgentRole;
  to: AgentRole | "all";
  type: "finding" | "request-help" | "handoff" | "status" | "challenge";
  payload: unknown;
  timestamp: string;
}

export interface SanityCheckRule {
  id: string;
  description: string;
  check: (plan: OrchestratorPlan) => SanityCheckResult;
}

export type SanityCheckResult =
  | { allowed: true }
  | { allowed: false; reason: string };

// ── Tool Registry ─────────────────────────────────────────────
export interface ToolEntry {
  name: string;
  category: string;
  installed: boolean;
  osCompatibility: ("windows" | "linux" | "macos")[];
  description: string;
  stage: string;
  documentationUrl?: string;
}

// ── Execution Environment ─────────────────────────────────────
export interface SandboxConfig {
  enabled: boolean;
  image: string;
  memoryLimit: string;
  cpuLimit: string;
  networkEnabled: boolean;
  cleanupOnExit: boolean;
}

export interface SecretsVaultEntry {
  id: string;
  findingId: string;
  secretValue: string;
  source: AgentRole;
  retentionHours: number;
  encrypted: boolean;
}

// ── Report ────────────────────────────────────────────────────
export interface Report {
  sessionId: string;
  target: TargetSpec;
  timestamp: string;
  duration: number;
  summary: ReportSummary;
  findings: Finding[];
  complianceMapping?: ComplianceReference[];
  auditLog: string[];
  disclaimer: string;
}

export interface ReportSummary {
  totalFindings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  exploitVerified: number;
  stateVerified: number;
}

export interface ComplianceReference {
  standard: string;
  control: string;
  findingId: string;
}
