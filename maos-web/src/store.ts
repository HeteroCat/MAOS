import { create } from 'zustand';
import type { AgentState, AgentMessage, OrchestrationPlan, ConnectionStatus } from './types';

interface MAOSState {
  // Connection
  connectionStatus: ConnectionStatus;
  sessionId: string | null;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setSessionId: (id: string) => void;

  // Agents
  agents: Map<string, AgentState>;
  setAgent: (agent: AgentState) => void;
  updateAgent: (id: string, updates: Partial<AgentState>) => void;
  getAgent: (id: string) => AgentState | undefined;
  getAllAgents: () => AgentState[];
  clearAgents: () => void;

  // Messages
  messages: AgentMessage[];
  addMessage: (message: AgentMessage) => void;
  getMessages: (options?: { from?: string; to?: string; limit?: number }) => AgentMessage[];
  clearMessages: () => void;

  // Plan
  currentPlan: OrchestrationPlan | null;
  setCurrentPlan: (plan: OrchestrationPlan | null) => void;

  // UI State
  selectedAgentId: string | null;
  setSelectedAgentId: (id: string | null) => void;
  isTaskRunning: boolean;
  setIsTaskRunning: (running: boolean) => void;
}

export const useMAOSStore = create<MAOSState>((set, get) => ({
  // Connection
  connectionStatus: 'connecting',
  sessionId: null,
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setSessionId: (id) => set({ sessionId: id }),

  // Agents
  agents: new Map(),
  setAgent: (agent) => {
    const agents = new Map(get().agents);
    agents.set(agent.id, agent);
    set({ agents });
  },
  updateAgent: (id, updates) => {
    const agents = new Map(get().agents);
    const agent = agents.get(id);
    if (agent) {
      agents.set(id, { ...agent, ...updates });
      set({ agents });
    }
  },
  getAgent: (id) => get().agents.get(id),
  getAllAgents: () => Array.from(get().agents.values()),
  clearAgents: () => set({ agents: new Map() }),

  // Messages
  messages: [],
  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message].slice(-1000), // Keep last 1000 messages
    }));
  },
  getMessages: (options) => {
    let msgs = get().messages;
    if (options?.from) {
      msgs = msgs.filter((m) => m.from === options.from);
    }
    if (options?.to) {
      msgs = msgs.filter((m) => m.to === options.to || m.to === '*');
    }
    if (options?.limit) {
      msgs = msgs.slice(-options.limit);
    }
    return msgs;
  },
  clearMessages: () => set({ messages: [] }),

  // Plan
  currentPlan: null,
  setCurrentPlan: (plan) => set({ currentPlan: plan }),

  // UI State
  selectedAgentId: null,
  setSelectedAgentId: (id) => set({ selectedAgentId: id }),
  isTaskRunning: false,
  setIsTaskRunning: (running) => set({ isTaskRunning: running }),
}));
