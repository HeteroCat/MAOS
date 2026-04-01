import { useMAOSStore } from '../store';
import { X, Bot, MessageSquare, Activity, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const statusIcons = {
  pending: Clock,
  running: Activity,
  completed: CheckCircle,
  failed: AlertCircle,
};

const statusColors = {
  pending: 'text-gray-400',
  running: 'text-blue-400',
  completed: 'text-green-400',
  failed: 'text-red-400',
};

export function SidePanel() {
  const selectedAgentId = useMAOSStore((state) => state.selectedAgentId);
  const agents = useMAOSStore((state) => state.getAllAgents());
  const messages = useMAOSStore((state) => state.messages);
  const setSelectedAgentId = useMAOSStore((state) => state.setSelectedAgentId);

  const agent = selectedAgentId ? agents.find(a => a.id === selectedAgentId) : null;

  if (!agent) {
    return (
      <div className="w-80 bg-slate-900 border-l border-slate-800 p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-4 text-slate-400">
          <Bot className="w-5 h-5" />
          <h2 className="font-semibold">Agent Details</h2>
        </div>
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
          <div className="text-center">
            <Bot className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Select an agent on the canvas</p>
            <p className="text-xs mt-1">to view details</p>
          </div>
        </div>
      </div>
    );
  }

  const StatusIcon = statusIcons[agent.status];
  const agentMessages = messages.filter(
    m => m.from === agent.id || m.to === agent.id || m.to === '*'
  );

  return (
    <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-white text-lg">{agent.name}</h2>
          <button
            onClick={() => setSelectedAgentId(null)}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <StatusIcon className={`w-4 h-4 ${statusColors[agent.status]}`} />
          <span className={statusColors[agent.status]}>{agent.status}</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">{agent.type}</span>
        </div>
      </div>

      {/* Details */}
      <div className="p-4 border-b border-slate-800 space-y-4">
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase mb-1">Role</h3>
          <p className="text-sm text-slate-300">{agent.role}</p>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase mb-1">Current Task</h3>
          <p className="text-sm text-slate-300">{agent.currentTask || 'Idle'}</p>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase mb-1">Progress</h3>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${agent.progress}%` }}
            />
          </div>
          <p className="text-right text-xs text-slate-400 mt-1">{agent.progress}%</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase mb-1">Model</h3>
            <p className="text-sm text-slate-300">{agent.model}</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase mb-1">Token Usage</h3>
            <p className="text-sm text-slate-300">
              {(agent.tokenUsage.input + agent.tokenUsage.output).toLocaleString()}
            </p>
          </div>
        </div>

        {agent.tools.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase mb-1">Tools</h3>
            <div className="flex flex-wrap gap-1">
              {agent.tools.map(tool => (
                <span
                  key={tool}
                  className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded"
                >
                  {tool}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-slate-800 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-slate-400" />
          <h3 className="font-semibold text-slate-300">Messages</h3>
          <span className="ml-auto text-xs text-slate-500">{agentMessages.length}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {agentMessages.length === 0 ? (
            <p className="text-center text-slate-500 text-sm">No messages yet</p>
          ) : (
            agentMessages.map(msg => (
              <div
                key={msg.id}
                className={`p-3 rounded-lg text-sm ${
                  msg.from === agent.id
                    ? 'bg-blue-900/30 border border-blue-800'
                    : 'bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <span>{msg.from === agent.id ? '→' : '←'}</span>
                  <span>{msg.to === '*' ? 'All' : msg.to}</span>
                  <span className="ml-auto">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-slate-300">{msg.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
