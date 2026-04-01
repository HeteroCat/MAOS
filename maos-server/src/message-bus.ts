// Message Bus - Central event management for Agent communication
import { EventEmitter } from 'events';
import type { AgentState, AgentMessage, AgentEvents } from './types.js';

export class MessageBus extends EventEmitter {
  private agents: Map<string, AgentState> = new Map();
  private messages: AgentMessage[] = [];
  private maxMessages: number = 1000;

  constructor(maxMessages: number = 1000) {
    super();
    this.maxMessages = maxMessages;
  }

  // Agent Management
  registerAgent(agent: AgentState): void {
    this.agents.set(agent.id, agent);
    this.emit('agent_created', agent);
  }

  updateAgent(agentId: string, updates: Partial<AgentState>): AgentState | null {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    const updated = { ...agent, ...updates };
    this.agents.set(agentId, updated);
    this.emit('agent_updated', updated);
    return updated;
  }

  getAgent(agentId: string): AgentState | undefined {
    return this.agents.get(agentId);
  }

  getAllAgents(): AgentState[] {
    return Array.from(this.agents.values());
  }

  getAgentsByStatus(status: AgentState['status']): AgentState[] {
    return this.getAllAgents().filter(a => a.status === status);
  }

  // Message Management
  addMessage(message: AgentMessage): void {
    this.messages.push(message);

    // Limit message history
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages);
    }

    this.emit('message', message);
  }

  getMessages(options?: {
    from?: string;
    to?: string;
    after?: number;
    limit?: number;
  }): AgentMessage[] {
    let msgs = this.messages;

    if (options?.from) {
      msgs = msgs.filter(m => m.from === options.from);
    }
    if (options?.to) {
      msgs = msgs.filter(m => m.to === options.to || m.to === '*');
    }
    if (options?.after) {
      msgs = msgs.filter(m => m.timestamp > options.after!);
    }

    if (options?.limit) {
      msgs = msgs.slice(-options.limit);
    }

    return msgs;
  }

  // Broadcast to all listeners
  broadcast(message: AgentMessage): void {
    this.addMessage(message);
  }

  // Clear all data
  clear(): void {
    this.agents.clear();
    this.messages = [];
  }

  // Get system statistics
  getStats(): {
    totalAgents: number;
    runningAgents: number;
    completedAgents: number;
    failedAgents: number;
    totalMessages: number;
  } {
    const agents = this.getAllAgents();
    return {
      totalAgents: agents.length,
      runningAgents: agents.filter(a => a.status === 'running').length,
      completedAgents: agents.filter(a => a.status === 'completed').length,
      failedAgents: agents.filter(a => a.status === 'failed').length,
      totalMessages: this.messages.length,
    };
  }
}

// Singleton instance
export const messageBus = new MessageBus();
