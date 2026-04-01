import { useMAOSStore } from '../store';
import { AgentCard } from './AgentCard';
import { Bot, Users, Activity } from 'lucide-react';

export function AgentPanel() {
  const agents = useMAOSStore((state) => state.getAllAgents());
  const isTaskRunning = useMAOSStore((state) => state.isTaskRunning);

  const masterAgent = agents.find((a) => a.type === 'Master');
  const subAgents = agents.filter((a) => a.type !== 'Master');

  const runningCount = agents.filter((a) => a.status === 'running').length;
  const completedCount = agents.filter((a) => a.status === 'completed').length;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center gap-2 mb-2">
          <Bot className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Agents</h2>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1 text-gray-600">
            <Users className="w-4 h-4" />
            <span>{agents.length} total</span>
          </div>
          {isTaskRunning && (
            <div className="flex items-center gap-1 text-blue-600">
              <Activity className="w-4 h-4 animate-pulse" />
              <span>{runningCount} running</span>
            </div>
          )}
          {completedCount > 0 && (
            <div className="flex items-center gap-1 text-green-600">
              <span>{completedCount} completed</span>
            </div>
          )}
        </div>
      </div>

      {/* Master Agent */}
      {masterAgent && (
        <div className="p-4 border-b bg-purple-50">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Orchestrator</h3>
          <AgentCard agent={masterAgent} />
        </div>
      )}

      {/* Sub Agents */}
      <div className="flex-1 overflow-y-auto p-4">
        {subAgents.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              Sub Agents ({subAgents.length})
            </h3>
            {subAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <Bot className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No agents running</p>
            <p className="text-sm">Start a task to see agents</p>
          </div>
        )}
      </div>
    </div>
  );
}
