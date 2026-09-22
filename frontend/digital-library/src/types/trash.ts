export interface TrashDocument {
  id: number;
  name: string;
  type: string;
  size: string;
  source: "personal" | "group_orphaned" | "group" | string;
  groupName?: string | null;
  deletedBy?: {
    id: number;
    name: string;
    avatar?: string;
  };
}

export interface TrashBatch {
  id: number;
  deletedAt: string;
  deletedAtTimestamp: number;
  documentCount: number;
  totalSize: string;
  source: string;
  groupName?: string | null;
  expiresAt: string;
  remainingDays: number;
  documents: TrashDocument[];
  docIds: number[];
}