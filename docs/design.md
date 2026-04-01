# MAOS - Multi-Agent Operating System 设计文档

## 1. 项目概述

MAOS 是一个基于 Claude Code 源码改造的多智能体操作系统，通过 Web 可视化画布展示多 Agent 协作过程。

### 1.1 核心特性
- **自主任务编排**：主 Agent 自动分析任务并创建合适的 SubAgents
- **实时可视化**：Web 画布展示 Agent 状态、消息流、任务依赖图
- **自适应协作**：SubAgents 之间可以相互通信、动态调整任务分配
- **复用核心能力**：完全复用 Claude Code 的 Agent 调度、工具执行、权限系统

### 1.2 使用场景
```bash
# 启动 MAOS 并自动分析任务
maos run "重构这个代码库的服务层"

# 系统自动：
# 1. 主 Agent 分析任务复杂度
# 2. 创建 Explore Agent 探索代码结构
# 3. 创建 Plan Agent 制定重构计划
# 4. 并行创建多个 Dev Agent 执行重构
# 5. 创建 Verify Agent 验证结果
```

## 2. 系统架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Web 可视化前端                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐   │
│  │   Agent 面板    │  │   消息流面板     │  │     任务依赖图          │   │
│  │  ┌───────────┐  │  │  ┌───────────┐  │  │  ┌─────────────────┐   │   │
│  │  │ 🤖 Master │  │  │  │ 10:23:45  │  │  │  │    [Master]     │   │   │
│  │  │   编排中   │  │  │  │ Master→Exp│  │  │  │      │          │   │   │
│  │  └───────────┘  │  │  │ 探索代码   │  │  │  │   ┌──┴──┐       │   │   │
│  │  ┌───────────┐  │  │  └───────────┘  │  │  │  │[Explore]      │   │   │
│  │  │ 🔍 Explore│  │  │  ┌───────────┐  │  │  │  │      │        │   │   │
│  │  │   已完成   │  │  │  │ 10:24:12  │  │  │  │   ┌──┴──┐     │   │   │
│  │  └───────────┘  │  │  │ Exp→Master│  │  │  │  │[Plan]│      │   │   │
│  │  ┌───────────┐  │  │  │ 发现150个 │  │  │  │  └──────┘      │   │   │
│  │  │ 📋 Plan   │  │  │  │ 文件      │  │  │  │      │         │   │   │
│  │  │   运行中   │  │  │  └───────────┘  │  │  │   ┌──┼──┐      │   │   │
│  │  └───────────┘  │  │                 │  │  │  [D1][D2][D3]   │   │   │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘   │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │ WebSocket
┌─────────────────────────────────▼───────────────────────────────────────┐
│                        MAOS Runtime Server                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Orchestrator (主 Agent)                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │   │
│  │  │ 任务分析器   │  │ Agent 调度器 │  │      状态聚合器          │  │   │
│  │  │  - 拆解任务  │  │  - 创建Agent │  │  - 收集进度              │  │   │
│  │  │  - 评估复杂度│  │  - 分配任务  │  │  - 决策下一步            │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘  │   │
│  └───────────────────────────────┬─────────────────────────────────┘   │
│                                  │                                      │
│       ┌──────────┬──────────┬────┴────┬──────────┬──────────┐          │
│       ▼          ▼          ▼         ▼          ▼          ▼          │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐    │
│  │Explore │ │  Plan  │ │ Dev-1  │ │ Dev-2  │ │ Dev-3  │ │Verify  │    │
│  │ Agent  │ │ Agent  │ │ Agent  │ │ Agent  │ │ Agent  │ │ Agent  │    │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘    │
└───────────────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────┐
│                     Claude Code Core (复用部分)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │  query.ts   │  │ AgentTool   │  │toolExecution│  │  prompts.ts     │ │
│  │  主对话循环  │  │  Agent调度   │  │  工具执行    │  │  系统提示词     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 模块划分

| 模块 | 路径 | 职责 |
|------|------|------|
| **Web 前端** | `maos-web/` | React 应用，Agent 可视化画布 |
| **WebSocket Server** | `maos-server/` | 桥接前后端，广播 Agent 状态 |
| **Orchestrator** | `maos-orchestrator.ts` | 主 Agent 编排逻辑 |
| **Claude Code Core** | `src/` | 复用的核心功能 |

## 3. 数据模型

### 3.1 Agent 状态

```typescript
interface AgentState {
  id: string;                    // 唯一标识
  name: string;                  // 显示名称
  type: string;                  // Agent 类型 (Explore/Plan/Dev/Verify/...)
  role: string;                  // 角色描述
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;              // 0-100
  currentTask: string;           // 当前任务描述
  dependencies: string[];        // 依赖的其他 Agent IDs
  createdAt: number;             // 创建时间戳
  completedAt?: number;          // 完成时间戳
  parentId?: string;             // 父 Agent ID (主 Agent为null)
  tools: string[];               // 可用工具列表
  model: string;                 // 使用的模型
  tokenUsage: {                  // Token 使用统计
    input: number;
    output: number;
  };
}
```

### 3.2 Agent 消息

```typescript
interface AgentMessage {
  id: string;                    // 消息唯一ID
  type: 'message' | 'tool_call' | 'tool_result' | 'status_update';
  from: string;                  // 发送者 Agent ID
  to: string;                    // 接收者 Agent ID ("*" 表示广播)
  content: string;               // 消息内容
  timestamp: number;             // 时间戳
  metadata?: {                   // 附加信息
    toolName?: string;           // 工具名称 (type=tool_call时)
    toolInput?: object;          // 工具输入
    toolResult?: object;         // 工具结果
    progress?: number;           // 进度更新
  };
}
```

### 3.3 任务定义

```typescript
interface Task {
  id: string;                    // 任务ID
  description: string;           // 任务描述
  assignedTo: string;            // 分配给哪个 Agent
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  dependencies: string[];        // 依赖的前置任务
  subtasks: string[];            // 子任务列表
  result?: string;               // 任务结果
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}
```

### 3.4 编排计划

```typescript
interface OrchestrationPlan {
  id: string;                    // 计划ID
  originalTask: string;          // 原始任务描述
  agents: AgentDefinition[];     // 需要创建的 Agents
  tasks: Task[];                 // 任务列表
  workflow: 'sequential' | 'parallel' | 'adaptive'; // 工作流类型
  createdAt: number;
}

interface AgentDefinition {
  type: string;                  // Agent 类型
  name: string;                  // 名称
  role: string;                  // 角色描述
  whenToUse: string;             // 使用时机说明
  tools: string[];               // 可用工具
  model?: string;                // 指定模型
  dependencies?: string[];       // 依赖的其他 Agent 类型
}
```

## 4. API 设计

### 4.1 WebSocket 协议

#### 客户端 → 服务器

```typescript
// 启动任务
interface StartTaskMessage {
  type: 'start_task';
  payload: {
    description: string;         // 任务描述
  };
}

// 发送消息给 Agent
interface SendMessage {
  type: 'send_message';
  payload: {
    to: string;                  // Agent ID
    content: string;             // 消息内容
  };
}

// 请求状态更新
interface RequestStatus {
  type: 'request_status';
}

// 停止任务
interface StopTask {
  type: 'stop_task';
  payload: {
    agentId?: string;            // 特定 Agent (null表示全部)
  };
}
```

#### 服务器 → 客户端

```typescript
// Agent 状态更新
interface AgentStatusUpdate {
  type: 'agent_status';
  payload: AgentState;
}

// 新消息
interface NewMessage {
  type: 'new_message';
  payload: AgentMessage;
}

// 任务完成
interface TaskCompleted {
  type: 'task_completed';
  payload: {
    planId: string;
    result: string;
    agents: AgentState[];
  };
}

// 错误通知
interface ErrorNotification {
  type: 'error';
  payload: {
    code: string;
    message: string;
    agentId?: string;
  };
}
```

## 5. 组件设计

### 5.1 Web 前端组件

```
maos-web/
├── src/
│   ├── components/
│   │   ├── AgentCard/           # Agent 状态卡片
│   │   │   ├── index.tsx
│   │   │   └── styles.css
│   │   ├── AgentPanel/          # Agent 列表面板
│   │   │   └── index.tsx
│   │   ├── MessageStream/       # 消息流面板
│   │   │   └── index.tsx
│   │   ├── TaskGraph/           # 任务依赖图
│   │   │   └── index.tsx
│   │   ├── TaskInput/           # 任务输入框
│   │   │   └── index.tsx
│   │   └── StatusBar/           # 状态栏
│   │       └── index.tsx
│   ├── hooks/
│   │   └── useWebSocket.ts      # WebSocket 连接钩子
│   ├── store/
│   │   └── index.ts             # 状态管理 (Zustand)
│   ├── types/
│   │   └── index.ts             # TypeScript 类型定义
│   ├── App.tsx
│   └── main.tsx
├── package.json
└── vite.config.ts
```

### 5.2 服务端组件

```
maos-server/
├── src/
│   ├── server.ts                # WebSocket 服务器入口
│   ├── orchestrator.ts          # 主 Agent 编排器
│   ├── agent-bridge.ts          # Agent 桥接器
│   ├── message-bus.ts           # 消息总线
│   └── types.ts                 # 类型定义
├── package.json
└── tsconfig.json
```

## 6. 核心流程

### 6.1 任务启动流程

```
用户输入任务
    │
    ▼
┌─────────────────┐
│   Orchestrator  │ ──分析任务复杂度、确定需要的 Agents
│   (主 Agent)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 生成编排计划     │ ──创建 OrchestrationPlan
│                 │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ 创建 Explore    │────▶│ WebSocket       │
│ Agent           │     │ 广播状态更新     │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│ 等待结果        │
│                 │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 创建 Plan Agent │────▶ 广播状态更新
└────────┬────────┘
         │
         ▼
    ... 依此类推
```

### 6.2 Agent 创建流程

```typescript
// orchestrator.ts
async function createAgent(definition: AgentDefinition): Promise<AgentState> {
  // 1. 生成 Agent ID
  const agentId = generateAgentId();
  
  // 2. 构建 Agent 提示词
  const prompt = buildAgentPrompt(definition);
  
  // 3. 调用 Claude Code 的 AgentTool
  const result = await AgentTool.call({
    subagent_type: definition.type,
    prompt: prompt,
    name: definition.name,
    model: definition.model,
    // 其他参数...
  });
  
  // 4. 注册到消息总线
  messageBus.registerAgent(agentId, result);
  
  // 5. 广播状态更新
  broadcast({
    type: 'agent_status',
    payload: {
      id: agentId,
      name: definition.name,
      type: definition.type,
      status: 'running',
      // ...
    }
  });
  
  return agentState;
}
```

### 6.3 消息转发流程

```
SubAgent A 发送消息
    │
    ▼
┌─────────────────┐
│  AgentBridge    │ ──拦截 Agent 消息
│                 │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   MessageBus    │ ──解析消息，确定接收者
│                 │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  WebSocket      │ ──转发给 Web 前端
│  Server         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Web Client    │ ──更新 UI
│                 │
└─────────────────┘
```

## 7. 与 Claude Code 的集成点

### 7.1 复用模块

| 模块 | 集成方式 | 说明 |
|------|----------|------|
| `src/query.ts` | 直接导入 | 主对话循环 |
| `src/tools/AgentTool/` | 直接导入 | Agent 调度 |
| `src/services/tools/toolExecution.ts` | 直接导入 | 工具执行 |
| `src/constants/prompts.ts` | 直接导入 | 系统提示词 |
| `src/Tool.ts` | 直接导入 | 工具类型定义 |

### 7.2 扩展点

```typescript
// maos-orchestrator.ts
import { query } from './src/query.js';
import { AgentTool } from './src/tools/AgentTool/AgentTool.js';
import { toolExecution } from './src/services/tools/toolExecution.js';

// 扩展 AgentTool 以支持消息拦截
class ObservableAgentTool extends AgentTool {
  async call(input: AgentInput, context: ToolUseContext) {
    // 拦截消息，发送到 WebSocket
    this.emit('agent_message', {
      from: input.name,
      content: input.prompt,
    });
    
    // 调用原始 AgentTool
    const result = await super.call(input, context);
    
    // 拦截结果
    this.emit('agent_result', result);
    
    return result;
  }
}
```

## 8. 部署方案

### 8.1 开发环境

```bash
# 启动 WebSocket 服务器
bun run maos-server:dev

# 启动 Web 前端 (另一个终端)
bun run maos-web:dev

# 启动完整系统
bun run maos:dev
```

### 8.2 生产环境

```bash
# 构建
bun run build

# 启动服务器 (包含静态文件服务)
bun run maos:start
```

## 9. 未来扩展

### 9.1 可能的增强

- **Replay 模式**：保存并回放整个多 Agent 协作过程
- **模板系统**：保存常用的 Agent 编排模式为模板
- **性能分析**：展示每个 Agent 的 token 消耗、执行时间
- **人工干预**：允许用户在运行时介入，调整 Agent 行为
- **版本控制**：Agent 代码的版本管理和回滚

### 9.2 与其他系统集成

- **CI/CD 集成**：将 MAOS 任务集成到 CI/CD 流程
- **监控系统**：对接 Prometheus/Grafana 监控 Agent 性能
- **日志系统**：对接 ELK 进行日志分析

## 10. 项目结构

```
MAOS/
├── src/                         # Claude Code 源码 (复用)
│   ├── query.ts
│   ├── tools/
│   ├── services/
│   └── ...
├── maos-server/                 # WebSocket 服务器
│   └── src/
├── maos-web/                    # Web 前端
│   └── src/
├── maos-orchestrator.ts         # 主 Agent 编排器
├── docs/                        # 文档
│   └── design.md               # 本设计文档
├── package.json
└── README.md
```

---

**文档版本**: 1.0  
**最后更新**: 2026-04-01
