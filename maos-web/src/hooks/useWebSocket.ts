import { useEffect, useRef, useCallback } from 'react';
import { useMAOSStore } from '../store';
import type { ServerMessage, ClientMessage } from '../types';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  const {
    setConnectionStatus,
    setSessionId,
    setAgent,
    updateAgent,
    addMessage,
    setCurrentPlan,
    setIsTaskRunning,
    clearAgents,
    clearMessages,
  } = useMAOSStore();

  const connect = useCallback(() => {
    setConnectionStatus('connecting');

    try {
      ws.current = new WebSocket(WS_URL);

      ws.current.onopen = () => {
        console.log('[WebSocket] Connected');
        setConnectionStatus('connected');

        // Request current status
        send({ type: 'request_status' });
      };

      ws.current.onmessage = (event) => {
        try {
          const message: ServerMessage = JSON.parse(event.data);
          handleServerMessage(message);
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
        }
      };

      ws.current.onclose = () => {
        console.log('[WebSocket] Disconnected');
        setConnectionStatus('disconnected');

        // Attempt to reconnect after 3 seconds
        reconnectTimeout.current = setTimeout(() => {
          console.log('[WebSocket] Attempting to reconnect...');
          connect();
        }, 3000);
      };

      ws.current.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        setConnectionStatus('error');
      };
    } catch (error) {
      console.error('[WebSocket] Failed to connect:', error);
      setConnectionStatus('error');
    }
  }, []);

  const handleServerMessage = useCallback((message: ServerMessage) => {
    switch (message.type) {
      case 'connected':
        setSessionId(message.payload.sessionId);
        break;

      case 'agent_status':
        const existing = useMAOSStore.getState().getAgent(message.payload.id);
        if (existing) {
          updateAgent(message.payload.id, message.payload);
        } else {
          setAgent(message.payload);
        }
        break;

      case 'new_message':
        addMessage(message.payload);
        break;

      case 'plan_created':
        setCurrentPlan(message.payload);
        clearAgents();
        clearMessages();
        setIsTaskRunning(true);
        break;

      case 'task_completed':
        setIsTaskRunning(false);
        break;

      case 'error':
        console.error('[Server Error]', message.payload);
        break;
    }
  }, [setSessionId, setAgent, updateAgent, addMessage, setCurrentPlan, setIsTaskRunning, clearAgents, clearMessages]);

  const send = useCallback((message: ClientMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Not connected, message dropped:', message);
    }
  }, []);

  const startTask = useCallback((description: string) => {
    send({ type: 'start_task', payload: { description } });
  }, [send]);

  const sendMessage = useCallback((to: string, content: string) => {
    send({ type: 'send_message', payload: { to, content } });
  }, [send]);

  const stopTask = useCallback((agentId?: string) => {
    send({ type: 'stop_task', payload: { agentId } });
  }, [send]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      ws.current?.close();
    };
  }, [connect]);

  return {
    send,
    startTask,
    sendMessage,
    stopTask,
  };
}
