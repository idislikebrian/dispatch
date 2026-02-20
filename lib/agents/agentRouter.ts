import { BaseAgent } from './baseAgent';
import { MinimaxAgent } from './minimaxAgent';
import { AgentTask, AgentResponse } from './types';

export class AgentRouter {
  private agents: Map<string, BaseAgent> = new Map();

  constructor() {
    this.agents.set('minimax', new MinimaxAgent({
      name: 'minimax',
      model: 'M2.1',
    }));
  }

  async route<T>(agentType: string, task: AgentTask): Promise<AgentResponse<T>> {
    const agent = this.agents.get(agentType);
    if (!agent) {
      return { success: false, error: `Unknown agent: ${agentType}` };
    }
    return agent.execute<T>(task);
  }
}

export const agentRouter = new AgentRouter();
