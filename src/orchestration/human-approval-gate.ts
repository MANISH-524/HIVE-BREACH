import { Finding } from "../types/index.js";
import { timestamp } from "../utils/index.js";

export type ApprovalAction = "auto-approve" | "queue" | "reject";

export interface ApprovalQueueEntry {
  id: string;
  finding: Finding;
  queuedAt: string;
  status: "pending" | "approved" | "rejected" | "auto-approved";
  reviewedAt?: string;
  reviewer?: string;
}

/**
 * Human-in-the-loop Approval Gate
 * Critical/High findings are QUEUED for human review before they leave the pipeline.
 * Prevents automated false positives from shipping unreviewed findings straight
 * to a PR comment or client report — they destroy trust in the tool fast.
 */
export class HumanApprovalGate {
  private queue: ApprovalQueueEntry[] = [];
  private callbacks: Array<(entry: ApprovalQueueEntry) => void> = [];
  private autoApproveThreshold: "critical" | "high" | "medium" | "low" = "high";

  addToQueue(finding: Finding): ApprovalAction {
    if (finding.severity === "critical" || finding.severity === "high") {
      if (finding.severity === "high" && this.autoApproveThreshold === "medium") {
        return "auto-approve";
      }

      const entry: ApprovalQueueEntry = {
        id: crypto.randomUUID(),
        finding,
        queuedAt: timestamp(),
        status: "pending",
      };
      this.queue.push(entry);

      for (const cb of this.callbacks) {
        cb(entry);
      }

      return "queue";
    }

    return "auto-approve";
  }

  approve(id: string, reviewer: string = "operator"): boolean {
    const entry = this.queue.find((e) => e.id === id);
    if (!entry || entry.status !== "pending") return false;

    entry.status = "approved";
    entry.reviewedAt = timestamp();
    entry.reviewer = reviewer;
    return true;
  }

  reject(id: string, reviewer: string = "operator"): boolean {
    const entry = this.queue.find((e) => e.id === id);
    if (!entry || entry.status !== "pending") return false;

    entry.status = "rejected";
    entry.reviewedAt = timestamp();
    entry.reviewer = reviewer;
    return true;
  }

  getPending(): ApprovalQueueEntry[] {
    return this.queue.filter((e) => e.status === "pending");
  }

  getQueue(): ApprovalQueueEntry[] {
    return [...this.queue];
  }

  getAllApproved(): Finding[] {
    return this.queue
      .filter((e) => e.status === "approved" || e.status === "auto-approved")
      .map((e) => e.finding);
  }

  setAutoApproveThreshold(thresh: "critical" | "high"): void {
    this.autoApproveThreshold = thresh;
  }

  onQueue(callback: (entry: ApprovalQueueEntry) => void): void {
    this.callbacks.push(callback);
  }

  clear(): void {
    this.queue = [];
  }
}