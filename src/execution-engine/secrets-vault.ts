import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { createCipheriv, createDecipheriv, randomBytes, generateKeySync } from "node:crypto";
import { timestamp, generateId } from "../utils/index.js";

export interface VaultEntry {
  id: string;
  findingId: string;
  encryptedValue: string;
  source: string;
  retentionExpiry: number;
  createdAt: string;
}

/**
 * Encrypted Secrets Vault
 * Any finding classified as a live credential, API key, or secret is routed here —
 * encrypted, access-controlled, short retention window. Never written to the same
 * plain findings log as regular findings.
 */
export class SecretsVault {
  private vaultDir: string;
  private encryptionKey: Buffer;
  private entries: VaultEntry[] = [];

  constructor(baseDir?: string) {
    this.vaultDir = baseDir ?? resolve(process.cwd(), ".hivebreach", "vault");
    if (!existsSync(this.vaultDir)) {
      mkdirSync(this.vaultDir, { recursive: true });
    }

    this.encryptionKey = generateKeySync("aes", { length: 256 }).export();
    this.loadFromDisk();
  }

  store(findingId: string, secretValue: string, source: string, retentionHours: number = 48): VaultEntry {
    const iv = randomBytes(16);
    const cipher = createCipheriv("aes-256-cbc", this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(secretValue, "utf-8"), cipher.final()]);

    const entry: VaultEntry = {
      id: generateId(),
      findingId,
      encryptedValue: `${iv.toString("hex")}:${encrypted.toString("hex")}`,
      source,
      retentionExpiry: Date.now() + retentionHours * 3600 * 1000,
      createdAt: timestamp(),
    };

    this.entries.push(entry);
    this.saveToDisk();
    return entry;
  }

  retrieve(entryId: string): string | null {
    const entry = this.entries.find((e) => e.id === entryId);
    if (!entry) return null;

    const [ivHex, cipherHex] = entry.encryptedValue.split(":");
    if (!ivHex || !cipherHex) return null;

    const iv = Buffer.from(ivHex, "hex");
    const decipher = createDecipheriv("aes-256-cbc", this.encryptionKey, iv);
    return Buffer.concat([decipher.update(Buffer.from(cipherHex, "hex")), decipher.final()]).toString("utf-8");
  }

  purgeExpired(): number {
    const now = Date.now();
    const expiredIds = this.entries.filter((e) => e.retentionExpiry <= now).map((e) => e.id);
    this.entries = this.entries.filter((e) => e.retentionExpiry > now);
    expiredIds.forEach((id) => this.removeFromDisk(id));
    this.saveToDisk();
    return expiredIds.length;
  }

  purgeAll(): void {
    this.entries.forEach((e) => this.removeFromDisk(e.id));
    this.entries = [];
  }

  getEntries(): readonly VaultEntry[] {
    return this.entries;
  }

  private saveToDisk(): void {
    writeFileSync(resolve(this.vaultDir, "vault-index.json"), JSON.stringify(this.entries, null, 2));
  }

  private loadFromDisk(): void {
    const indexPath = resolve(this.vaultDir, "vault-index.json");
    if (existsSync(indexPath)) {
      this.entries = JSON.parse(readFileSync(indexPath, "utf-8"));
    }
  }

  private removeFromDisk(id: string): void {
    const path = resolve(this.vaultDir, `${id}.enc`);
    if (existsSync(path)) rmSync(path, { force: true });
  }
}