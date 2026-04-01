import { useEffect, useRef, useCallback, useState } from 'react';
import { useMAOSStore } from '../store';
import type { AgentState, AgentMessage } from '../types';

interface Position {
  x: number;
  y: number;
}

interface AgentNode extends AgentState {
  position: Position;
  targetPosition: Position;
  velocity: Position;
  radius: number;
  color: string;
  pulsePhase: number;
}

interface MessageEdge {
  id: string;
  from: string;
  to: string;
  timestamp: number;
  progress: number;
}

const AGENT_COLORS: Record<string, string> = {
  Master: '#8b5cf6',
  Explore: '#3b82f6',
  Plan: '#10b981',
  Dev: '#f59e0b',
  Verify: '#ef4444',
  General: '#6b7280',
};

const AGENT_EMOJIS: Record<string, string> = {
  Master: '🧠',
  Explore: '🔍',
  Plan: '📋',
  Dev: '💻',
  Verify: '✅',
  General: '🤖',
};

export function AgentCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const agents = useMAOSStore((state) => state.getAllAgents());
  const messages = useMAOSStore((state) => state.messages);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const agentNodesRef = useRef<Map<string, AgentNode>>(new Map());
  const messageEdgesRef = useRef<MessageEdge[]>([]);
  const animationRef = useRef<number>();

  // Initialize or update agent nodes
  useEffect(() => {
    const nodes = agentNodesRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    agents.forEach((agent, index) => {
      if (!nodes.has(agent.id)) {
        // New agent - position in a circle around center
        const angle = (index / Math.max(agents.length, 1)) * Math.PI * 2;
        const radius = 200;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        nodes.set(agent.id, {
          ...agent,
          position: { x, y },
          targetPosition: { x, y },
          velocity: { x: 0, y: 0 },
          radius: agent.type === 'Master' ? 50 : 40,
          color: AGENT_COLORS[agent.type] || AGENT_COLORS.General,
          pulsePhase: Math.random() * Math.PI * 2,
        });
      } else {
        // Update existing agent data
        const node = nodes.get(agent.id)!;
        Object.assign(node, agent);
      }
    });

    // Remove nodes for agents that no longer exist
    nodes.forEach((_, id) => {
      if (!agents.find(a => a.id === id)) {
        nodes.delete(id);
      }
    });
  }, [agents]);

  // Update message edges
  useEffect(() => {
    const newMessages = messages.slice(-10); // Keep last 10 messages
    messageEdgesRef.current = newMessages.map((msg, idx) => ({
      id: msg.id,
      from: msg.from,
      to: msg.to,
      timestamp: msg.timestamp,
      progress: 1 - (idx / 10), // Fade out older messages
    }));
  }, [messages]);

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const gridSize = 50 * scale;
    const offsetX = offset.x % gridSize;
    const offsetY = offset.y % gridSize;

    for (let x = offsetX; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = offsetY; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    const nodes = agentNodesRef.current;

    // Draw message edges
    messageEdgesRef.current.forEach(edge => {
      const fromNode = nodes.get(edge.from);
      const toNode = nodes.get(edge.to === '*' ? edge.from : edge.to);
      if (!fromNode) return;

      const targetNode = toNode || fromNode;

      ctx.beginPath();
      ctx.strokeStyle = `rgba(59, 130, 246, ${edge.progress * 0.5})`;
      ctx.lineWidth = 2;

      const startX = fromNode.position.x + offset.x;
      const startY = fromNode.position.y + offset.y;
      const endX = targetNode.position.x + offset.x + (toNode ? 0 : 100);
      const endY = targetNode.position.y + offset.y + (toNode ? 0 : -50);

      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(
        (startX + endX) / 2,
        Math.min(startY, endY) - 50,
        endX,
        endY
      );
      ctx.stroke();

      // Draw animated packet
      const t = (Date.now() / 1000) % 1;
      const packetX = startX + (endX - startX) * t;
      const packetY = startY + (endY - startY) * t;

      ctx.fillStyle = `rgba(59, 130, 246, ${edge.progress})`;
      ctx.beginPath();
      ctx.arc(packetX, packetY, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Update and draw agent nodes
    nodes.forEach((node, id) => {
      // Update position with smooth movement
      const dx = node.targetPosition.x - node.position.x;
      const dy = node.targetPosition.y - node.position.y;
      node.velocity.x += dx * 0.01;
      node.velocity.y += dy * 0.01;
      node.velocity.x *= 0.9;
      node.velocity.y *= 0.9;
      node.position.x += node.velocity.x;
      node.position.y += node.velocity.y;

      // Update pulse phase
      node.pulsePhase += 0.05;

      const x = node.position.x + offset.x;
      const y = node.position.y + offset.y;

      // Draw connection line to dependencies
      node.dependencies.forEach(depId => {
        const depNode = nodes.get(depId);
        if (depNode) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]);
          ctx.moveTo(x, y);
          ctx.lineTo(depNode.position.x + offset.x, depNode.position.y + offset.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });

      // Draw pulse effect for running agents
      if (node.status === 'running') {
        const pulseRadius = node.radius + Math.sin(node.pulsePhase) * 10 + 10;
        const gradient = ctx.createRadialGradient(x, y, node.radius, x, y, pulseRadius);
        gradient.addColorStop(0, `${node.color}40`);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, pulseRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw agent circle
      ctx.fillStyle = node.color;
      ctx.beginPath();
      ctx.arc(x, y, node.radius, 0, Math.PI * 2);
      ctx.fill();

      // Draw border
      ctx.strokeStyle = selectedAgent === id ? '#ffffff' : '#1e293b';
      ctx.lineWidth = selectedAgent === id ? 4 : 2;
      ctx.stroke();

      // Draw emoji
      ctx.font = `${node.radius}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(AGENT_EMOJIS[node.type] || '🤖', x, y - 5);

      // Draw name
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Arial';
      ctx.fillText(node.name, x, y + node.radius + 15);

      // Draw status
      ctx.font = '10px Arial';
      ctx.fillStyle = node.status === 'running' ? '#4ade80' :
                      node.status === 'completed' ? '#22c55e' :
                      node.status === 'failed' ? '#ef4444' : '#9ca3af';
      ctx.fillText(node.status, x, y + node.radius + 28);

      // Draw progress bar
      if (node.progress > 0) {
        const barWidth = node.radius * 1.5;
        const barHeight = 6;
        const barX = x - barWidth / 2;
        const barY = y + node.radius + 35;

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        ctx.fillStyle = node.color;
        ctx.fillRect(barX, barY, barWidth * (node.progress / 100), barHeight);
      }
    });

    animationRef.current = requestAnimationFrame(animate);
  }, [scale, offset, selectedAgent]);

  // Start animation
  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);

  // Handle mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicked on an agent
    let clickedAgent: string | null = null;
    agentNodesRef.current.forEach((node, id) => {
      const dx = x - (node.position.x + offset.x);
      const dy = y - (node.position.y + offset.y);
      if (Math.sqrt(dx * dx + dy * dy) < node.radius) {
        clickedAgent = id;
      }
    });

    if (clickedAgent) {
      setSelectedAgent(clickedAgent);
      useMAOSStore.getState().setSelectedAgentId(clickedAgent);
    } else {
      setIsDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  }, [offset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(s => Math.max(0.5, Math.min(2, s * delta)));
  }, []);

  // Resize canvas
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight - 100; // Leave space for input
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-900">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="cursor-move"
        style={{ transform: `scale(${scale})`, transformOrigin: '0 0' }}
      />

      {/* Controls */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={() => setScale(s => Math.min(2, s * 1.2))}
          className="px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700"
        >
          +
        </button>
        <button
          onClick={() => setScale(1)}
          className="px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700"
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          onClick={() => setScale(s => Math.max(0.5, s * 0.8))}
          className="px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700"
        >
          -
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-slate-800/80 p-4 rounded-lg text-white text-sm">
        <h3 className="font-bold mb-2">Agents</h3>
        {Object.entries(AGENT_EMOJIS).map(([type, emoji]) => (
          <div key={type} className="flex items-center gap-2 mb-1">
            <span>{emoji}</span>
            <span style={{ color: AGENT_COLORS[type] }}>{type}</span>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="absolute top-4 left-4 bg-slate-800/80 p-4 rounded-lg text-white text-sm max-w-xs">
        <h3 className="font-bold mb-2">Controls</h3>
        <ul className="space-y-1 text-xs text-slate-300">
          <li>🖱️ Drag to pan</li>
          <li>🔍 Scroll to zoom</li>
          <li>👆 Click agent to select</li>
          <li>✨ Blue pulses = running</li>
          <li>💫 Dotted lines = dependencies</li>
        </ul>
      </div>
    </div>
  );
}
