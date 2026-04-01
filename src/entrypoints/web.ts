#!/usr/bin/env bun
/**
 * MAOS Web Service Entry Point
 * Transforms Claude Code into a web-based multi-agent orchestration system
 */

import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../query.js';
import { AgentTool } from '../tools/AgentTool/AgentTool.js';
import { getTools } from '../tools.js';
import type { ToolUseContext } from '../Tool.js';
import type { Message } from '../types/message.js';
import { getSystemPrompt } from '../constants/prompts.js';
import { getUserContext } from '../context.js';
import { init } from './init.js';

// Types for WebSocket communication
interface AgentState {
  id: string;
  name: string;
  type: string;
  role: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  currentTask: string;
  createdAt: number;
  messages: Message[];
  parentId?: string;
}

interface AgentMessage {
  id: string;
  type: 'message' | 'tool_call' | 'tool_result' | 'status_update';
  from: string;
  to: string;
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

type ClientMessage =
  | { type: 'start_task'; payload: { description: string; context?: string } }
  | { type: 'send_message'; payload: { to: string; content: string } }
  | { type: 'request_status' }
  | { type: 'stop_task'; payload: { agentId?: string } };

type ServerMessage =
  | { type: 'agent_status'; payload: AgentState }
  | { type: 'new_message'; payload: AgentMessage }
  | { type: 'task_completed'; payload: { result: string; agents: AgentState[] } }
  | { type: 'error'; payload: { code: string; message: string } }
  | { type: 'connected'; payload: { sessionId: string } };

// Agent Orchestrator
class AgentOrchestrator {
  private agents: Map<string, AgentState> = new Map();
  private messageHistory: AgentMessage[] = [];
  private masterAgentId: string;
  private isRunning: boolean = false;
  private wsClients: Map<string, WebSocket> = new Map();

  constructor() {
    this.masterAgentId = `master-${uuidv4()}`;
    this.createMasterAgent();
  }

  private createMasterAgent() {
    const master: AgentState = {
      id: this.masterAgentId,
      name: 'Master',
      type: 'Master',
      role: 'Task orchestrator - analyzes tasks and dynamically assembles agent teams',
      status: 'running',
      progress: 0,
      currentTask: 'Waiting for task',
      createdAt: Date.now(),
      messages: [],
    };
    this.agents.set(this.masterAgentId, master);
    this.broadcast({ type: 'agent_status', payload: master });
  }

  addClient(id: string, ws: WebSocket) {
    this.wsClients.set(id, ws);
    // Send current state to new client
    this.agents.forEach(agent => {
      this.sendToClient(id, { type: 'agent_status', payload: agent });
    });
  }

  removeClient(id: string) {
    this.wsClients.delete(id);
  }

  private broadcast(message: ServerMessage) {
    const data = JSON.stringify(message);
    this.wsClients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });
  }

  private sendToClient(clientId: string, message: ServerMessage) {
    const ws = this.wsClients.get(clientId);
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  async analyzeAndExecute(description: string, context?: string) {
    this.isRunning = true;
    this.updateMasterAgent('analyzing task', 10);

    // Analyze task and determine required agents
    const plan = this.createDynamicPlan(description, context);

    this.updateMasterAgent('assembling team', 20);

    // Execute plan - spawn agents in sequence
    for (const agentDef of plan) {
      await this.spawnAgent(agentDef);
    }

    this.updateMasterAgent('monitoring execution', 50);
  }

  private createDynamicPlan(description: string, context?: string): Array<{
    type: string;
    name: string;
    role: string;
    prompt: string;
    tools: string[];
    model?: string;
  }> {
    const lower = description.toLowerCase();
    const plan: Array<{
      type: string;
      name: string;
      role: string;
      prompt: string;
      tools: string[];
      model?: string;
    }> = [];

    // Detect task type
    const needsExploration = lower.includes('explore') || lower.includes('analyze') ||
                            lower.includes('find') || lower.includes('search') ||
                            lower.includes('code') || lower.includes('重构');

    const needsPlanning = lower.includes('plan') || lower.includes('design') ||
                         lower.includes('architecture') || lower.includes('架构');

    const needsImplementation = lower.includes('implement') || lower.includes('build') ||
                               lower.includes('refactor') || lower.includes('create') ||
                               lower.includes('开发') || lower.includes('实现');

    const needsVerification = lower.includes('test') || lower.includes('verify') ||
                             lower.includes('check') || lower.includes('验证');

    // Dynamic agent creation based on task analysis
    if (needsExploration) {
      plan.push({
        type: 'Explorer',
        name: `CodeExplorer-${plan.length + 1}`,
        role: 'Codebase exploration specialist',
        prompt: `Explore the codebase to understand its structure. Focus on: ${description}`,
        tools: ['FileRead', 'Glob', 'Grep', 'Bash'],
        model: 'haiku',
      });
    }

    if (needsPlanning) {
      plan.push({
        type: 'Planner',
        name: `Architect-${plan.length + 1}`,
        role: 'Solution architect',
        prompt: `Create a detailed plan for: ${description}`,
        tools: ['FileRead', 'SendMessage'],
        model: 'sonnet',
      });
    }

    if (needsImplementation) {
      // Could create multiple dev agents for parallel work
      plan.push({
        type: 'Developer',
        name: `Dev-${plan.length + 1}`,
        role: 'Implementation specialist',
        prompt: `Implement the solution for: ${description}`,
        tools: ['FileRead', 'FileEdit', 'FileWrite', 'Bash'],
        model: 'sonnet',
      });
    }

    if (needsVerification) {
      plan.push({
        type: 'Verifier',
        name: `QA-${plan.length + 1}`,
        role: 'Quality assurance specialist',
        prompt: `Verify the implementation of: ${description}`,
        tools: ['FileRead', 'Bash', 'SendMessage'],
        model: 'sonnet',
      });
    }

    // Fallback for simple tasks
    if (plan.length === 0) {
      plan.push({
        type: 'Generalist',
        name: 'Agent-1',
        role: 'General purpose agent',
        prompt: `Handle the following task: ${description}`,
        tools: ['FileRead', 'FileEdit', 'Bash', 'SendMessage'],
        model: 'sonnet',
      });
    }

    return plan;
  }

  private async spawnAgent(definition: {
    type: string;
    name: string;
    role: string;
    prompt: string;
    tools: string[];
    model?: string;
  }) {
    const agentId = `agent-${uuidv4()}`;

    const agent: AgentState = {
      id: agentId,
      name: definition.name,
      type: definition.type,
      role: definition.role,
      status: 'pending',
      progress: 0,
      currentTask: 'Initializing',
      createdAt: Date.now(),
      messages: [],
      parentId: this.masterAgentId,
    };

    this.agents.set(agentId, agent);
    this.broadcast({ type: 'agent_status', payload: agent });

    // Simulate agent startup
    setTimeout(() => {
      agent.status = 'running';
      agent.progress = 10;
      agent.currentTask = 'Starting execution';
      this.broadcast({ type: 'agent_status', payload: agent });

      // In real implementation, this would call AgentTool
      this.executeAgentTask(agent, definition);
    }, 500);
  }

  private async executeAgentTask(
    agent: AgentState,
    definition: {
      type: string;
      name: string;
      role: string;
      prompt: string;
      tools: string[];
      model?: string;
    }
  ) {
    try {
      // TODO: Integrate with actual AgentTool
      // For now, simulate execution with progress updates

      const progressInterval = setInterval(() => {
        if (agent.progress < 90) {
          agent.progress += Math.random() * 15;
          agent.currentTask = this.getRandomTaskUpdate(definition.type);
          this.broadcast({ type: 'agent_status', payload: agent });

          // Add message
          const msg: AgentMessage = {
            id: uuidv4(),
            type: 'message',
            from: agent.id,
            to: '*',
            content: `${agent.name}: ${agent.currentTask}`,
            timestamp: Date.now(),
          };
          this.messageHistory.push(msg);
          this.broadcast({ type: 'new_message', payload: msg });
        }
      }, 2000);

      // Complete after simulated work
      setTimeout(() => {
        clearInterval(progressInterval);
        agent.status = 'completed';
        agent.progress = 100;
        agent.currentTask = 'Task completed';
        this.broadcast({ type: 'agent_status', payload: agent });

        this.checkAllCompleted();
      }, 10000 + Math.random() * 5000);
    } catch (error) {
      agent.status = 'failed';
      agent.currentTask = `Failed: ${error}`;
      this.broadcast({ type: 'agent_status', payload: agent });
    }
  }

  private getRandomTaskUpdate(type: string): string {
    const updates: Record<string, string[]> = {
      Explorer: ['Scanning files...', 'Analyzing structure...', 'Finding patterns...', 'Mapping dependencies...'],
      Planner: ['Defining objectives...', 'Creating roadmap...', 'Estimating effort...', 'Identifying risks...'],
      Developer: ['Writing code...', 'Refactoring...', 'Testing changes...', 'Optimizing...'],
      Verifier: ['Running tests...', 'Checking coverage...', 'Validating output...', 'Reviewing quality...'],
      Generalist: ['Processing...', 'Analyzing...', 'Executing...', 'Verifying...'],
    };

    const typeUpdates = updates[type] || updates.Generalist;
    return typeUpdates[Math.floor(Math.random() * typeUpdates.length)];
  }

  private updateMasterAgent(task: string, progress: number) {
    const master = this.agents.get(this.masterAgentId);
    if (master) {
      master.currentTask = task;
      master.progress = progress;
      this.broadcast({ type: 'agent_status', payload: master });
    }
  }

  private checkAllCompleted() {
    const allAgents = Array.from(this.agents.values()).filter(
      (a) => a.id !== this.masterAgentId
    );
    const allDone = allAgents.every(
      (a) => a.status === 'completed' || a.status === 'failed'
    );

    if (allDone) {
      this.isRunning = false;
      this.updateMasterAgent('All tasks completed', 100);
      this.broadcast({
        type: 'task_completed',
        payload: {
          result: 'Task execution completed',
          agents: Array.from(this.agents.values()),
        },
      });
    }
  }

  stopAgent(agentId?: string) {
    if (agentId) {
      const agent = this.agents.get(agentId);
      if (agent) {
        agent.status = 'failed';
        agent.currentTask = 'Stopped by user';
        this.broadcast({ type: 'agent_status', payload: agent });
      }
    } else {
      this.isRunning = false;
      this.agents.forEach((agent) => {
        if (agent.status === 'running') {
          agent.status = 'failed';
          agent.currentTask = 'Orchestration stopped';
          this.broadcast({ type: 'agent_status', payload: agent });
        }
      });
    }
  }

  getAgent(agentId: string): AgentState | undefined {
    return this.agents.get(agentId);
  }

  getAllAgents(): AgentState[] {
    return Array.from(this.agents.values());
  }

  getMessages(): AgentMessage[] {
    return this.messageHistory;
  }
}

// Web Server Setup
const PORT = process.env.MAOS_PORT ? parseInt(process.env.MAOS_PORT) : 3001;
const HOST = process.env.MAOS_HOST || 'localhost';

async function startWebServer() {
  // Initialize Claude Code core
  await init();

  const orchestrator = new AgentOrchestrator();

  // Create WebSocket server
  const wss = new WebSocketServer({ port: PORT, host: HOST });

  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   🤖 MAOS Web Service                                            ║
║                                                                  ║
║   WebSocket: ws://${HOST}:${PORT}                                 ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
`);

  wss.on('connection', (ws: WebSocket, req) => {
    const clientId = uuidv4();
    console.log(`[Connection] Client ${clientId} connected from ${req.socket.remoteAddress}`);

    orchestrator.addClient(clientId, ws);

    // Send connection confirmation
    ws.send(
      JSON.stringify({
        type: 'connected',
        payload: { sessionId: clientId },
      })
    );

    // Handle messages
    ws.on('message', async (data: Buffer) => {
      try {
        const message: ClientMessage = JSON.parse(data.toString());

        switch (message.type) {
          case 'start_task':
            const { description, context } = message.payload;
            console.log(`[Task] Starting: ${description}`);
            await orchestrator.analyzeAndExecute(description, context);
            break;

          case 'send_message':
            // Handle direct message to agent
            console.log(`[Message] To ${message.payload.to}: ${message.payload.content}`);
            break;

          case 'request_status':
            // Status already sent on connection
            break;

          case 'stop_task':
            orchestrator.stopAgent(message.payload.agentId);
            break;
        }
      } catch (error) {
        console.error(`[Error] Failed to handle message:`, error);
        ws.send(
          JSON.stringify({
            type: 'error',
            payload: {
              code: 'INVALID_MESSAGE',
              message: 'Failed to process message',
            },
          })
        );
      }
    });

    ws.on('close', () => {
      console.log(`[Connection] Client ${clientId} disconnected`);
      orchestrator.removeClient(clientId);
    });

    ws.on('error', (error) => {
      console.error(`[Client ${clientId}] WebSocket error:`, error);
    });
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n[Shutdown] Closing server...');
    wss.close(() => {
      console.log('[Shutdown] Server closed');
      process.exit(0);
    });
  });
}

startWebServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
