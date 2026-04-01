import { useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { AgentCanvas } from './components/AgentCanvas';
import { SidePanel } from './components/SidePanel';
import { TaskInput } from './components/TaskInput';
import { useMAOSStore } from './store';
import { Wifi, WifiOff, AlertCircle, Layers } from 'lucide-react';

function ConnectionStatus() {
  const status = useMAOSStore((state) => state.connectionStatus);

  const icons = {
    connecting: <Wifi className="w-4 h-4 text-yellow-500 animate-pulse" />,
    connected: <Wifi className="w-4 h-4 text-green-500" />,
    disconnected: <WifiOff className="w-4 h-4 text-gray-400" />,
    error: <AlertCircle className="w-4 h-4 text-red-500" />,
  };

  const labels = {
    connecting: 'Connecting...',
    connected: 'Connected',
    disconnected: 'Disconnected',
    error: 'Error',
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      {icons[status]}
      <span className={
        status === 'connected' ? 'text-green-400' :
        status === 'error' ? 'text-red-400' :
        status === 'disconnected' ? 'text-gray-400' :
        'text-yellow-400'
      }>
        {labels[status]}
      </span>
    </div>
  );
}

function App() {
  useWebSocket();
  const agents = useMAOSStore((state) => state.getAllAgents());
  const runningCount = agents.filter(a => a.status === 'running').length;
  const completedCount = agents.filter(a => a.status === 'completed').length;

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">MAOS</h1>
              <p className="text-xs text-slate-400">
                {agents.length} agents
                {runningCount > 0 && <span className="text-blue-400 ml-2">{runningCount} running</span>}
                {completedCount > 0 && <span className="text-green-400 ml-2">{completedCount} completed</span>}
              </p>
            </div>
          </div>
          <ConnectionStatus />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <AgentCanvas />
        </div>
        <SidePanel />
      </div>

      {/* Bottom Input */}
      <TaskInput />
    </div>
  );
}

export default App;
