// MAOS WebSocket Server - Entry point
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import type { ServerMessage, ClientMessage, AgentState, AgentMessage } from './types.js';
import { messageBus } from './message-bus.js';
import { orchestrator } from './orchestrator.js';

const PORT = process.env.MAOS_PORT ? parseInt(process.env.MAOS_PORT) : 3001;
const HOST = process.env.MAOS_HOST || 'localhost';

// Client connection management
interface Client {
  id: string;
  socket: WebSocket;
  sessionId: string;
}

const clients: Map<string, Client> = new Map();

// Broadcast to all connected clients
function broadcast(message: ServerMessage): void {
  const data = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(data);
    }
  });
}

// Send to specific client
function sendTo(clientId: string, message: ServerMessage): void {
  const client = clients.get(clientId);
  if (client && client.socket.readyState === WebSocket.OPEN) {
    client.socket.send(JSON.stringify(message));
  }
}

// Setup message bus event forwarding
function setupMessageBus(): void {
  // Forward agent updates to all clients
  messageBus.on('agent_created', (agent: AgentState) => {
    broadcast({ type: 'agent_status', payload: agent });
  });

  messageBus.on('agent_updated', (agent: AgentState) => {
    broadcast({ type: 'agent_status', payload: agent });
  });

  messageBus.on('message', (message: AgentMessage) => {
    broadcast({ type: 'new_message', payload: message });
  });

  messageBus.on('plan_completed', () => {
    const agents = messageBus.getAllAgents();
    broadcast({
      type: 'task_completed',
      payload: {
        planId: orchestrator.getPlan()?.id || '',
        result: 'Task completed successfully',
        agents,
      },
    });
  });
}

// Handle client messages
async function handleClientMessage(clientId: string, message: ClientMessage): Promise<void> {
  console.log(`[Client ${clientId}] Message:`, message.type);

  switch (message.type) {
    case 'start_task': {
      const { description } = message.payload;

      // Clear previous state
      messageBus.clear();
      orchestrator.stop();

      // Create new orchestrator instance
      const plan = await orchestrator.analyzeTask(description);

      // Send plan to client
      sendTo(clientId, { type: 'plan_created', payload: plan });

      // Start execution
      await orchestrator.executePlan();
      break;
    }

    case 'send_message': {
      const { to, content } = message.payload;
      const msg: AgentMessage = {
        id: uuidv4(),
        type: 'message',
        from: 'user',
        to,
        content,
        timestamp: Date.now(),
      };
      messageBus.addMessage(msg);
      break;
    }

    case 'request_status': {
      // Send current state to requesting client
      const agents = messageBus.getAllAgents();
      const messages = messageBus.getMessages({ limit: 100 });

      for (const agent of agents) {
        sendTo(clientId, { type: 'agent_status', payload: agent });
      }

      for (const msg of messages) {
        sendTo(clientId, { type: 'new_message', payload: msg });
      }
      break;
    }

    case 'stop_task': {
      const { agentId } = message.payload;
      if (agentId) {
        messageBus.updateAgent(agentId, { status: 'failed', currentTask: 'Stopped by user' });
      } else {
        orchestrator.stop();
      }
      break;
    }

    default:
      console.warn(`[Client ${clientId}] Unknown message type:`, (message as any).type);
  }
}

// Create WebSocket server
const wss = new WebSocketServer({ port: PORT, host: HOST });

console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   MAOS Server - Multi-Agent Operating System               ║
║                                                            ║
║   WebSocket: ws://${HOST}:${PORT}                           ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);

// Setup message bus forwarding
setupMessageBus();

// Handle connections
wss.on('connection', (socket: WebSocket, req) => {
  const clientId = uuidv4();
  const sessionId = uuidv4();

  clients.set(clientId, { id: clientId, socket, sessionId });

  console.log(`[Connection] Client ${clientId} connected from ${req.socket.remoteAddress}`);
  console.log(`[Stats] Total clients: ${clients.size}`);

  // Send connection confirmation
  sendTo(clientId, {
    type: 'connected',
    payload: { sessionId },
  });

  // Send current state
  const agents = messageBus.getAllAgents();
  for (const agent of agents) {
    sendTo(clientId, { type: 'agent_status', payload: agent });
  }

  // Handle messages
  socket.on('message', async (data: Buffer) => {
    try {
      const message: ClientMessage = JSON.parse(data.toString());
      await handleClientMessage(clientId, message);
    } catch (error) {
      console.error(`[Client ${clientId}] Error handling message:`, error);
      sendTo(clientId, {
        type: 'error',
        payload: {
          code: 'INVALID_MESSAGE',
          message: 'Failed to process message',
        },
      });
    }
  });

  // Handle disconnection
  socket.on('close', () => {
    console.log(`[Connection] Client ${clientId} disconnected`);
    clients.delete(clientId);
    console.log(`[Stats] Total clients: ${clients.size}`);
  });

  // Handle errors
  socket.on('error', (error) => {
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

process.on('SIGTERM', () => {
  console.log('\n[Shutdown] Closing server...');
  wss.close(() => {
    console.log('[Shutdown] Server closed');
    process.exit(0);
  });
});
