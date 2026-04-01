import { useMAOSStore } from '../store';
import type { AgentState } from '../types';
import { Bot, Search, FileText, Code, CheckCircle, AlertCircle, Clock, Cpu } from 'lucide-react';

interface AgentCardProps {
  agent: AgentState;
}

const agentTypeIcons: Record<string, typeof Bot> = {
  Master: Bot,
  Explore: Search,
  Plan: FileText,
  Dev: Code,
  Verify: CheckCircle,
  General: Cpu,
};

const agentTypeColors: Record<string, string> = {
  Master: 'border-agent-master bg-purple-50',
  Explore: 'border-agent-explore bg-blue-50',
  Plan: 'border-agent-plan bg-green-50',
  Dev: 'border-agent-dev bg-yellow-50',
  Verify: 'border-agent-verify bg-red-50',
  General: 'border-agent-general bg-gray-50',
};

const statusIcons: Record<string, typeof Clock> = {
  pending: Clock,
  running: Bot,
  completed: CheckCircle,
  failed: AlertCircle,
};

const statusColors: Record<string, string> = {
  pending: 'text-status-pending',
  running: 'text-status-running animate-pulse',
  completed: 'text-status-completed',
  failed: 'text-status-failed',
};

export function AgentCard({ agent }: AgentCardProps) {
  const selectedAgentId = useMAOSStore((state) => state.selectedAgentId);
  const setSelectedAgentId = useMAOSStore((state) => state.setSelectedAgentId);

  const isSelected = selectedAgentId === agent.id;
  const Icon = agentTypeIcons[agent.type] || Bot;
  const StatusIcon = statusIcons[agent.status] || Clock;

  return (
    <div
      onClick={() => setSelectedAgentId(isSelected ? null : agent.id)}
      className={`
        relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
        ${agentTypeColors[agent.type] || agentTypeColors.General}
        ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'}
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-full bg-white shadow-sm">
          <Icon className="w-5 h-5 text-gray-700" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{agent.name}</h3>
          <p className="text-xs text-gray-500">{agent.type}</p>
        </div>
        <StatusIcon className={`w-5 h-5 ${statusColors[agent.status]}`} />
      </div>

      {/* Role */}
      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{agent.role}</p>

      {/* Current Task */}
      {agent.currentTask && (
        <div className="mb-3 p-2 bg-white/50 rounded text-xs text-gray-700">
          <span className="font-medium">Task:</span> {agent.currentTask}
        </div>
      )}

      {/* Progress Bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span>{agent.progress}%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-500"
            style={{ width: `${agent.progress}%` }}
          />
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex justify-between items-center text-xs text-gray-400">
        <span>{agent.model}</span>
        {agent.tokenUsage.input > 0 && (
          <span>
            {agent.tokenUsage.input + agent.tokenUsage.output} tokens
          </span>
        )}
      </div>

      {/* Status Badge */}
      <div
        className={`
          absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium
          ${agent.status === 'running' ? 'bg-blue-100 text-blue-700' : ''}
          ${agent.status === 'completed' ? 'bg-green-100 text-green-700' : ''}
          ${agent.status === 'failed' ? 'bg-red-100 text-red-700' : ''}
          ${agent.status === 'pending' ? 'bg-gray-100 text-gray-700' : ''}
        `}
      >
        {agent.status}
      </div>
    </div>
  );
}
