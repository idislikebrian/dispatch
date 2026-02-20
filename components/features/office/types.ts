export interface Room {
  id: string;
  name: string;
  type: RoomType;
  capacity: number;
  currentOccupancy: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type RoomType = 'focus' | 'collab' | 'social' | 'meeting';

export interface Presence {
  userId: string;
  roomId: string;
  joinedAt: Date;
}
