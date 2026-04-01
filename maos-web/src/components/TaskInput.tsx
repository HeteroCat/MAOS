import { useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useMAOSStore } from '../store';
import { Square, Sparkles } from 'lucide-react';

export function TaskInput() {
  const [description, setDescription] = useState('');
  const { startTask, stopTask } = useWebSocket();
  const isTaskRunning = useMAOSStore((state) => state.isTaskRunning);
  const connectionStatus = useMAOSStore((state) => state.connectionStatus);

  const isConnected = connectionStatus === 'connected';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !isConnected || isTaskRunning) return;

    startTask(description.trim());
    setDescription('');
  };

  const handleStop = () => {
    stopTask();
  };

  const placeholders = [
    '重构这个代码库的服务层...',
    '分析项目结构并找出所有 API 端点...',
    '优化数据库查询性能...',
    '修复所有 TypeScript 类型错误...',
    '为这个函数编写单元测试...',
  ];

  const randomPlaceholder =
    placeholders[Math.floor(Math.random() * placeholders.length)];

  return (
    <div className="bg-slate-800 border-t border-slate-700 px-6 py-4"
>
      <form onSubmit={handleSubmit} className="flex gap-3 max-w-4xl mx-auto"
>
        <div className="flex-1 relative"
>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={randomPlaceholder}
            disabled={!isConnected || isTaskRunning}
            className={`
              w-full px-4 py-3 rounded-lg border bg-slate-900 text-white
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              placeholder-slate-500
              ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}
              ${isTaskRunning ? 'opacity-70' : ''}
            `}
          />
          {!isConnected && (
            <span className="absolute right-3 top-3 text-xs text-slate-500"
>
              Connecting...
            </span>
          )}
        </div
>

        {isTaskRunning ? (
          <button
            type="button"
            onClick={handleStop}
            className="
              px-6 py-3 bg-red-600 text-white rounded-lg
              hover:bg-red-700 transition-colors
              flex items-center gap-2 font-medium
            "
          >
            <Square className="w-4 h-4" />
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!description.trim() || !isConnected}
            className={`
              px-6 py-3 rounded-lg flex items-center gap-2 font-medium
              ${
                description.trim() && isConnected
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }
              transition-colors
            `}
          >
            <Sparkles className="w-4 h-4" />
            Start
          </button>
        )}
      </form>
    </div>
  );
}
