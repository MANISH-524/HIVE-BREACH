import { BusMessage, AgentRole, Finding } from "../../types/index.js";
import { generateId, timestamp } from "../../utils/index.js";

type MessageHandler = (message: BusMessage) => void | Promise<void>;

export class CommunicationBus {
  private messages: BusMessage[] = [];
  private subscribers: Map<AgentRole | "all", Set<MessageHandler>> = new Map();
  private findings: Finding[] = [];

  subscribe(agent: AgentRole, handler: MessageHandler): void {
    if (!this.subscribers.has(agent)) {
      this.subscribers.set(agent, new Set());
    }
    this.subscribers.get(agent)!.add(handler);
  }

  unsubscribe(agent: AgentRole, handler: MessageHandler): void {
    this.subscribers.get(agent)?.delete(handler);
  }

  publish(message: BusMessage): void {
    this.messages.push(message);

    if (message.type === "finding") {
      this.findings.push(message.payload as Finding);
    }

    const target = message.to === "all" ? null : message.to;
    if (target) {
      this.subscribers.get(target)?.forEach((handler) => handler(message));
    } else {
      this.subscribers.forEach((handlers) => handlers.forEach((handler) => handler(message)));
    }
  }

  getMessages(): BusMessage[] {
    return [...this.messages];
  }

  getFindings(): Finding[] {
    return [...this.findings];
  }

  getMessagesBySender(role: AgentRole): BusMessage[] {
    return this.messages.filter((m) => m.from === role);
  }

  send(
    from: AgentRole,
    to: AgentRole | "all",
    type: BusMessage["type"],
    payload: unknown,
  ): BusMessage {
    const msg: BusMessage = {
      id: generateId(),
      from,
      to,
      type,
      payload,
      timestamp: timestamp(),
    };
    this.publish(msg);
    return msg;
  }
}
