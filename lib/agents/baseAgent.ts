import { AgentConfig, AgentResponse, AgentTask } from './types';

export abstract class BaseAgent {
  protected config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  abstract execute<T>(task: AgentTask): Promise<AgentResponse<T>>;
  
  protected log(message: string): void {
    console.log(`[${this.config.name}] ${message}`);
  }
}
