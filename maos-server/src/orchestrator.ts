// Orchestrator - Main Agent that analyzes tasks and dynamically coordinates SubAgents
import { v4 as uuidv4 } from 'uuid';
import type {
  AgentState,
  AgentDefinition,
  Task,
  OrchestrationPlan,
} from './types.js';
import { messageBus } from './message-bus.js';

export class Orchestrator {
  private plan: OrchestrationPlan | null = null;
  private masterAgentId: string;
  private isRunning: boolean = false;

  // Available tools for different agent types
  private availableTools = {
    exploration: ['FileRead', 'Glob', 'Grep', 'Bash', 'WebSearch'],
    planning: ['FileRead', 'SendMessage', 'TaskCreate'],
    implementation: ['FileRead', 'FileEdit', 'FileWrite', 'Bash', 'SendMessage'],
    verification: ['FileRead', 'Bash', 'SendMessage'],
    communication: ['SendMessage', 'AskUserQuestion'],
    research: ['WebSearch', 'WebFetch', 'FileRead'],
  };

  constructor() {
    this.masterAgentId = `master-${uuidv4()}`;
    this.registerMasterAgent();
  }

  private registerMasterAgent(): void {
    const masterAgent: AgentState = {
      id: this.masterAgentId,
      name: 'Master',
      type: 'Master',
      role: 'Task orchestrator and coordinator - analyzes tasks and assembles optimal agent teams',
      status: 'running',
      progress: 0,
      currentTask: 'Waiting for task',
      dependencies: [],
      createdAt: Date.now(),
      tools: ['Agent', 'SendMessage', 'TaskCreate'],
      model: 'sonnet',
      tokenUsage: { input: 0, output: 0 },
    };
    messageBus.registerAgent(masterAgent);
  }

  /**
   * Analyze task and dynamically create an orchestration plan
   * The key insight: Agent types are NOT fixed. Master agent decides what specialists are needed.
   */
  async analyzeTask(description: string): Promise<OrchestrationPlan> {
    this.updateMasterStatus('analyzing task requirements', 10);

    // TODO: In production, this should call Claude API to analyze the task
    // For now, using an intelligent pattern-based approach that mimics LLM reasoning
    const plan = this.intelligentPlanGeneration(description);

    this.plan = plan;
    this.updateMasterStatus('creating agent team', 20);

    // Broadcast plan creation
    messageBus.emit('plan_created', plan);

    return plan;
  }

  /**
   * Intelligent plan generation - mimics how an LLM would analyze and plan
   * This creates DYNAMIC agent types based on task analysis, not fixed types
   */
  private intelligentPlanGeneration(description: string): OrchestrationPlan {
    const planId = `plan-${uuidv4()}`;
    const agents: AgentDefinition[] = [];
    const tasks: Task[] = [];

    // Analyze task characteristics
    const analysis = this.analyzeTaskCharacteristics(description);

    // Phase 1: Information Gathering (if needed)
    if (analysis.needsExploration) {
      const explorer = this.createAgentDefinition({
        purpose: 'exploration',
        taskContext: analysis.context,
        sequence: 1,
      });
      agents.push(explorer);
      tasks.push(this.createTask(explorer, 'Gather information and context', []));
    }

    // Phase 2: Analysis & Planning (if complex)
    if (analysis.needsPlanning) {
      const planner = this.createAgentDefinition({
        purpose: 'planning',
        taskContext: analysis.context,
        sequence: 2,
        dependencies: analysis.needsExploration ? [agents[agents.length - 1].name] : [],
      });
      agents.push(planner);
      tasks.push(this.createTask(
        planner,
        'Analyze requirements and create implementation strategy',
        analysis.needsExploration ? [tasks[tasks.length - 1].id] : []
      ));
    }

    // Phase 3: Execution (parallel when possible)
    if (analysis.needsImplementation) {
      // Create specialized workers based on task domain
      const workerCount = analysis.parallelizationFactor || 1;
      const previousTaskIds = tasks.length > 0 ? [tasks[tasks.length - 1].id] : [];

      for (let i = 0; i < workerCount; i++) {
        const worker = this.createAgentDefinition({
          purpose: 'implementation',
          taskContext: analysis.context,
          sequence: 3 + i,
          specialization: analysis.domain,
          index: i,
        });
        agents.push(worker);
        tasks.push(this.createTask(
          worker,
          `Execute ${analysis.domain || 'implementation'} tasks - Part ${i + 1}`,
          previousTaskIds
        ));
      }
    }

    // Phase 4: Quality Assurance (if applicable)
    if (analysis.needsVerification) {
      const verifier = this.createAgentDefinition({
        purpose: 'verification',
        taskContext: analysis.context,
        sequence: agents.length + 1,
        dependencies: agents
          .filter(a => a.role.includes('implementation'))
          .map(a => a.name),
      });
      agents.push(verifier);
      tasks.push(this.createTask(
        verifier,
        'Verify quality and correctness',
        tasks.filter(t => t.assignedTo !== verifier.name).map(t => t.id)
      ));
    }

    // Phase 5: Integration/Coordination (if multiple workers)
    if (analysis.needsIntegration && agents.filter(a => a.role.includes('implementation')).length > 1) {
      const integrator = this.createAgentDefinition({
        purpose: 'integration',
        taskContext: analysis.context,
        sequence: agents.length + 1,
      });
      agents.push(integrator);
      tasks.push(this.createTask(
        integrator,
        'Integrate work from all team members',
        tasks.filter(t => t.assignedTo !== integrator.name).map(t => t.id)
      ));
    }

    // Fallback: if no agents created, create a generalist
    if (agents.length === 0) {
      const generalist = this.createAgentDefinition({
        purpose: 'general',
        taskContext: 'general task execution',
        sequence: 1,
      });
      agents.push(generalist);
      tasks.push(this.createTask(generalist, 'Execute task', []));
    }

    return {
      id: planId,
      originalTask: description,
      agents,
      tasks,
      workflow: analysis.parallelizationFactor && analysis.parallelizationFactor > 1 ? 'parallel' : 'sequential',
      createdAt: Date.now(),
    };
  }

  /**
   * Analyze task to understand its characteristics
   */
  private analyzeTaskCharacteristics(description: string): {
    needsExploration: boolean;
    needsPlanning: boolean;
    needsImplementation: boolean;
    needsVerification: boolean;
    needsIntegration: boolean;
    parallelizationFactor: number;
    context: string;
    domain?: string;
  } {
    const lower = description.toLowerCase();

    // Task complexity indicators
    const isComplex = lower.includes('refactor') ||
                      lower.includes('implement') ||
                      lower.includes('build') ||
                      lower.includes('design') ||
                      lower.includes('架构') ||
                      lower.includes('重构');

    const isExploration = lower.includes('explore') ||
                          lower.includes('analyze') ||
                          lower.includes('find') ||
                          lower.includes('search') ||
                          lower.includes('分析') ||
                          lower.includes('探索');

    const isVerification = lower.includes('test') ||
                           lower.includes('verify') ||
                           lower.includes('check') ||
                           lower.includes('验证');

    const isMultiFile = lower.includes('codebase') ||
                        lower.includes('project') ||
                        lower.includes('module') ||
                        lower.includes('service');

    // Domain detection
    let domain: string | undefined;
    if (lower.includes('api') || lower.includes('endpoint')) domain = 'API';
    else if (lower.includes('database') || lower.includes('db') || lower.includes('sql')) domain = 'Database';
    else if (lower.includes('ui') || lower.includes('frontend') || lower.includes('component')) domain = 'Frontend';
    else if (lower.includes('test') || lower.includes('spec')) domain = 'Testing';
    else if (lower.includes('security') || lower.includes('auth')) domain = 'Security';
    else if (lower.includes('performance') || lower.includes('optimize')) domain = 'Performance';

    return {
      needsExploration: isExploration || isComplex,
      needsPlanning: isComplex,
      needsImplementation: !isExploration || isComplex,
      needsVerification: isVerification || isComplex,
      needsIntegration: isMultiFile || isComplex,
      parallelizationFactor: isComplex && isMultiFile ? 2 : 1,
      context: domain || 'general',
      domain,
    };
  }

  /**
   * Create a dynamic agent definition based on purpose and context
   * This is the KEY function - it creates CUSTOM agent types, not fixed ones
   */
  private createAgentDefinition(params: {
    purpose: 'exploration' | 'planning' | 'implementation' | 'verification' | 'integration' | 'general';
    taskContext: string;
    sequence: number;
    specialization?: string;
    index?: number;
    dependencies?: string[];
  }): AgentDefinition {
    const { purpose, taskContext, sequence, specialization, index, dependencies } = params;

    // Dynamic agent configuration based on purpose
    const configs: Record<string, Partial<AgentDefinition>> = {
      exploration: {
        type: `${specialization || 'Code'}Explorer`,
        name: `${specialization || 'Code'}Explorer-${sequence}`,
        role: `${specialization || 'Code'} exploration specialist - discovers and analyzes relevant files, patterns, and structures`,
        whenToUse: `When task requires understanding ${taskContext} codebase structure, finding relevant files, or gathering context`,
        tools: this.availableTools.exploration,
        model: 'haiku', // Fast for exploration
      },
      planning: {
        type: `${specialization || 'Architecture'}Planner`,
        name: `${specialization || 'Architecture'}Planner-${sequence}`,
        role: `${specialization || 'Architecture'} strategist - designs implementation approach and coordinates execution`,
        whenToUse: `When task requires strategic planning, architecture decisions, or coordination of ${taskContext} work`,
        tools: this.availableTools.planning,
        model: 'sonnet', // Better reasoning for planning
      },
      implementation: {
        type: `${specialization || 'Feature'}Developer`,
        name: `${specialization || 'Feature'}Developer-${index !== undefined ? index + 1 : sequence}`,
        role: `${specialization || 'Feature'} implementation specialist - executes coding tasks with precision`,
        whenToUse: `When task requires implementing ${taskContext} features, writing code, or making modifications`,
        tools: this.availableTools.implementation,
        model: 'sonnet',
      },
      verification: {
        type: `${specialization || 'Quality'}Verifier`,
        name: `${specialization || 'Quality'}Verifier-${sequence}`,
        role: `${specialization || 'Quality'} assurance specialist - validates correctness, performance, and quality`,
        whenToUse: `When task requires verification of ${taskContext} implementation, testing, or quality checks`,
        tools: this.availableTools.verification,
        model: 'sonnet',
      },
      integration: {
        type: `${specialization || 'Integration'}Coordinator`,
        name: `${specialization || 'Integration'}Coordinator-${sequence}`,
        role: `Integration coordinator - synthesizes work from multiple specialists into cohesive solution`,
        whenToUse: `When task requires combining work from multiple agents or ensuring consistency across ${taskContext}`,
        tools: [...this.availableTools.implementation, ...this.availableTools.planning],
        model: 'sonnet',
      },
      general: {
        type: 'GeneralSpecialist',
        name: `Specialist-${sequence}`,
        role: `Versatile problem solver - handles general ${taskContext} tasks efficiently`,
        whenToUse: `For general ${taskContext} tasks that don't require specialized domain knowledge`,
        tools: [...this.availableTools.exploration, ...this.availableTools.implementation],
        model: 'haiku',
      },
    };

    const config = configs[purpose];

    return {
      type: config.type!,
      name: config.name!,
      role: config.role!,
      whenToUse: config.whenToUse!,
      tools: config.tools!,
      model: config.model!,
      dependencies,
    };
  }

  private createTask(agent: AgentDefinition, description: string, dependencies: string[]): Task {
    return {
      id: `task-${uuidv4()}`,
      description,
      assignedTo: agent.name,
      status: 'pending',
      dependencies,
      subtasks: [],
      createdAt: Date.now(),
    };
  }

  // Execute the orchestration plan
  async executePlan(): Promise<void> {
    if (!this.plan) {
      throw new Error('No plan to execute');
    }

    this.isRunning = true;
    this.updateMasterStatus('assembling agent team', 30);

    // Spawn agents in dependency order
    for (const agentDef of this.plan.agents) {
      await this.spawnAgent(agentDef);
      // Small delay to visualize agent creation
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    this.updateMasterStatus('monitoring execution', 50);
  }

  private async spawnAgent(definition: AgentDefinition): Promise<AgentState> {
    const agentId = `agent-${uuidv4()}`;

    const agent: AgentState = {
      id: agentId,
      name: definition.name,
      type: definition.type,
      role: definition.role,
      status: 'pending',
      progress: 0,
      currentTask: 'Initializing',
      dependencies: [],
      createdAt: Date.now(),
      tools: definition.tools,
      model: definition.model || 'sonnet',
      tokenUsage: { input: 0, output: 0 },
      parentId: this.masterAgentId,
    };

    messageBus.registerAgent(agent);

    // Simulate agent starting
    setTimeout(() => {
      messageBus.updateAgent(agentId, {
        status: 'running',
        currentTask: `Executing: ${definition.whenToUse}`
      });
    }, 1000);

    return agent;
  }

  private updateMasterStatus(task: string, progress: number): void {
    messageBus.updateAgent(this.masterAgentId, {
      currentTask: task,
      progress,
    });
  }

  // Handle task completion
  onTaskCompleted(agentId: string, result: string): void {
    const agent = messageBus.getAgent(agentId);
    if (!agent) return;

    messageBus.updateAgent(agentId, {
      status: 'completed',
      progress: 100,
      currentTask: 'Completed',
    });

    // Check if all agents completed
    const allAgents = messageBus.getAllAgents().filter(a => a.id !== this.masterAgentId);
    const allCompleted = allAgents.every(a => a.status === 'completed' || a.status === 'failed');

    if (allCompleted && this.plan) {
      this.updateMasterStatus('orchestration complete', 100);
      messageBus.emit('plan_completed', this.plan);
      this.isRunning = false;
    }
  }

  // Stop orchestration
  stop(): void {
    this.isRunning = false;
    this.updateMasterStatus('orchestration stopped', 0);
  }

  getPlan(): OrchestrationPlan | null {
    return this.plan;
  }

  isActive(): boolean {
    return this.isRunning;
  }
}

// Singleton instance
export const orchestrator = new Orchestrator();
