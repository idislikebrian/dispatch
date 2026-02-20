export interface AgentConfig {
  name: string;
  model: string;
  timeoutMs?: number;
}

export interface AgentResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AgentTask {
  id: string;
  prompt: string;
  context?: Record<string, unknown>;
}
