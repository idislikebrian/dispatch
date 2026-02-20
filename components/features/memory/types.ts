export interface Memory {
  id: string;
  content: string;
  type: MemoryType;
  source: string | null;
  embedding: number[] | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export type MemoryType = 'conversation' | 'document' | 'observation' | 'insight';
