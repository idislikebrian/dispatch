export interface Content {
  id: string;
  title: string;
  body: string;
  type: ContentType;
  status: ContentStatus;
  authorId: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ContentType = 'post' | 'doc' | 'note' | 'page';
export type ContentStatus = 'draft' | 'review' | 'published' | 'archived';
