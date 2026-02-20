export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  availability: AvailabilityStatus;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export type AvailabilityStatus = 'online' | 'away' | 'busy' | 'offline';
