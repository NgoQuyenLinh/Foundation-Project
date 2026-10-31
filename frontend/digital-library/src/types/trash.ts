// frontend/digital-library/src/types/trash.ts

export interface TrashDocument {
  id: number;
  name: string;
  type: string;
  size: string;
  sizeBytes?: number;
  source: string;
  groupName?: string | null;
  deletedAt: string;
  deletedTime?: string;
  remainingDays: number;
  expiresAt?: string;
  previewUrl?: string;
  originalPath?: string;
}

export interface TrashBatch {
  id: number;
  dateKey: string;
  shortDate?: string;
  deletedAt: string;
  deletedAtTimestamp: number; // Trường bắt buộc theo khai báo cũ của bạn
  documentCount: number;
  totalSize: string;
  totalSizeBytes?: number;
  remainingDays: number;
  expiresAt: string;
  source: string;
  groupName?: string | null;
  docIds: number[];
  documents: TrashDocument[];
}