// MAOS Server Types

export type AgentStatus = 'pending' | 'running' | 'completed' | 'failed';
export type AgentType = 'Explore' | 'Plan' | 'Dev' | 'Verify' | 'General' | 'Master';

export interface AgentState {
  id: string;
  name: string;
  type: AgentType | string;
  role: string;
  status: AgentStatus;
  progress: number;
  currentTask: string;
  dependencies: string[];
  createdAt: number;
  completedAt?: number;
  parentId?: string;
  tools: string[];
  model: string;
  tokenUsage: {
    input: number;
    output: number;
  };
}

export type MessageType = 'message' | 'tool_call' | 'tool_result' | 'status_update' | 'error';

export interface AgentMessage {
  id: string;
  type: MessageType;
  from: string;
  to: string;
  content: string;
  timestamp: number;
  metadata?: {
    toolName?: string;
    toolInput?: Record<string, unknown>;
    toolResult?: unknown;
    progress?: number;
    error?: string;
  };
}

export interface Task {
  id: string;
  description: string;
  assignedTo: string;
  status: AgentStatus;
  dependencies: string[];
  subtasks: string[];
  result?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface AgentDefinition {
  type: string;
  name: string;
  role: string;
  whenToUse: string;
  tools: string[];
  model?: string;
  dependencies?: string[];
}

export interface OrchestrationPlan {
  id: string;
  originalTask: string;
  agents: AgentDefinition[];
  tasks: Task[];
  workflow: 'sequential' | 'parallel' | 'adaptive';
  createdAt: number;
}

// WebSocket Message Types

export type ClientMessage =
  | { type: 'start_task'; payload: { description: string } }
  | { type: 'send_message'; payload: { to: string; content: string } }
  | { type: 'request_status' }
  | { type: 'stop_task'; payload: { agentId?: string } };

export type ServerMessage =
  | { type: 'agent_status'; payload: AgentState }
  | { type: 'new_message'; payload: AgentMessage }
  | { type: 'task_completed'; payload: { planId: string; result: string; agents: AgentState[] } }
  | { type: 'error'; payload: { code: string; message: string; agentId?: string } }
  | { type: 'connected'; payload: { sessionId: string } }
  | { type: 'plan_created'; payload: OrchestrationPlan };

// EventEmitter types
export interface AgentEvents {
  'agent_created': (agent: AgentState) => void;
  'agent_updated': (agent: AgentState) => void;
  'agent_completed': (agent: AgentState) => void;
  'message': (message: AgentMessage) => void;
  'plan_completed': (plan: OrchestrationPlan) => void;
  'error': (error: Error) => void;
}
