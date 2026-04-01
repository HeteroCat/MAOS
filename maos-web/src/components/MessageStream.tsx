import { useRef, useEffect } from 'react';
import { useMAOSStore } from '../store';
import { MessageSquare, ArrowRight, AlertCircle, Wrench, CheckCircle } from 'lucide-react';
import type { AgentMessage } from '../types';

interface MessageItemProps {
  message: AgentMessage;
  isSelected: boolean;
}

const messageTypeIcons: Record<string, typeof MessageSquare> = {
  message: MessageSquare,
  tool_call: Wrench,
  tool_result: CheckCircle,
  status_update: AlertCircle,
  error: AlertCircle,
};

const messageTypeColors: Record<string, string> = {
  message: 'bg-blue-50 border-blue-200',
  tool_call: 'bg-yellow-50 border-yellow-200',
  tool_result: 'bg-green-50 border-green-200',
  status_update: 'bg-gray-50 border-gray-200',
  error: 'bg-red-50 border-red-200',
};

function MessageItem({ message, isSelected }: MessageItemProps) {
  const agents = useMAOSStore((state) => state.getAllAgents());
  const fromAgent = agents.find((a) => a.id === message.from);
  const toAgent = agents.find((a) => a.id === message.to);

  const Icon = messageTypeIcons[message.type] || MessageSquare;
  const time = new Date(message.timestamp).toLocaleTimeString();

  return (
    <div
      className={`
        p-3 rounded-lg border transition-all
        ${messageTypeColors[message.type] || messageTypeColors.message}
        ${isSelected ? 'ring-2 ring-blue-500' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
        <Icon className="w-3 h-3" />
        <span className="font-medium text-gray-700">
          {fromAgent?.name || message.from}
        </span>
        <ArrowRight className="w-3 h-3" />
        <span>{message.to === '*' ? 'All' : toAgent?.name || message.to}</span>
        <span className="ml-auto">{time}</span>
      </div>

      {/* Content */}
      <p className="text-sm text-gray-800 whitespace-pre-wrap">{message.content}</p>

      {/* Metadata */}
      {message.metadata && (
        <div className="mt-2 text-xs text-gray-500">
          {message.metadata.toolName && (
            <span className="inline-block px-2 py-1 bg-white rounded mr-2">
              Tool: {message.metadata.toolName}
            </span>
          )}
          {message.metadata.progress !== undefined && (
            <span className="inline-block px-2 py-1 bg-white rounded">
              Progress: {message.metadata.progress}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function MessageStream() {
  const messages = useMAOSStore((state) => state.messages);
  const selectedAgentId = useMAOSStore((state) => state.selectedAgentId);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Filter messages if an agent is selected
  const filteredMessages = selectedAgentId
    ? messages.filter(
        (m) =>
          m.from === selectedAgentId ||
          m.to === selectedAgentId ||
          m.to === '*'
      )
    : messages;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">Message Stream</h2>
          </div>
          {selectedAgentId && (
            <button
              onClick={() =>
                useMAOSStore.getState().setSelectedAgentId(null)
              }
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Show All
            </button>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {filteredMessages.length} messages
          {selectedAgentId && ' (filtered)'}
        </p>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {filteredMessages.length > 0 ? (
          filteredMessages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              isSelected={message.from === selectedAgentId}
            />
          ))
        ) : (
          <div className="text-center py-8 text-gray-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No messages yet</p>
            <p className="text-sm">Start a task to see agent communication</p>
          </div>
        )}
      </div>
    </div>
  );
}
