// frontend/src/utils/trashUtils.ts

import { formatSize } from "@/utils/formatSize";
import type { TrashBatch } from "@/types/trash";

export const getTrashSourceLabel = (
  source?: string | null,
  groupName?: string | null
) => {
  if (source === "group_orphaned") {
    return groupName ? `Từ nhóm ${groupName}` : "Từ nhóm đã giải tán";
  }
  if (source === "group") {
    return groupName ? `Nhóm: ${groupName}` : "Kho nhóm";
  }
  return "Kho cá nhân";
};

export const groupDocsIntoBatches = (trashedDocs: any[]): TrashBatch[] => {
  const grouped = new Map<number, typeof trashedDocs>();

  trashedDocs.forEach((doc: any) => {
    const batchKey = doc.trash_batch_id ?? doc.id;
    if (!grouped.has(batchKey)) grouped.set(batchKey, []);
    grouped.get(batchKey)!.push(doc);
  });

  return Array.from(grouped.entries())
    .map(([batchId, docs]) => {
      const firstDoc = docs[0];
      const deletedAtDate = new Date(
        firstDoc.deleted_at ?? firstDoc.updated_at ?? Date.now()
      );
      const expiresAtDate = new Date(deletedAtDate);
      expiresAtDate.setDate(expiresAtDate.getDate() + 30);

      const remainingDays = Math.max(
        0,
        Math.ceil((expiresAtDate.getTime() - Date.now()) / 86400000)
      );

      const totalBytes = docs.reduce(
        (sum: number, d: any) => sum + (d.file_size ?? 0),
        0
      );

      return {
        id: batchId,
        deletedAt: deletedAtDate.toLocaleString("vi-VN"),
        deletedAtTimestamp: deletedAtDate.getTime(),
        documentCount: docs.length,
        totalSize: formatSize(totalBytes),
        source: firstDoc.trash_source ?? "personal",
        groupName: firstDoc.trash_group_name,
        expiresAt: expiresAtDate.toLocaleDateString("vi-VN"),
        remainingDays,
        documents: docs.map((d: any) => ({
          id: d.id,
          name: d.title,
          type: d.file_type?.split("/")[1]?.toUpperCase() ?? "FILE",
          size: formatSize(d.file_size ?? 0),
          source: d.trash_source ?? "personal",
          groupName: d.trash_group_name,
        })),
        docIds: docs.map((d: any) => d.id),
      };
    })
    .sort((a, b) => b.deletedAtTimestamp - a.deletedAtTimestamp);
};