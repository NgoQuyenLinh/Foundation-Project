// frontend/digital-library/src/utils/trashUtils.ts

import { formatSize } from "@/utils/formatSize";
import type { TrashBatch, TrashDocument } from "@/types/trash";

export const getTrashSourceLabel = (
  source?: string | null,
  groupName?: string | null
): string => {
  if (source === "group_orphaned") {
    return groupName ? `Từ nhóm ${groupName}` : "Từ nhóm đã giải tán";
  }
  if (source === "group") {
    return groupName ? `Nhóm: ${groupName}` : "Kho nhóm";
  }
  return "Kho cá nhân";
};

const formatDocType = (rawType?: string | null): string => {
  if (!rawType) return "FILE";
  if (rawType.includes("/")) {
    const subtype = rawType.split("/")[1]?.toUpperCase() ?? "FILE";
    return subtype.replace(/^VND\./i, "").replace(/^X-/i, "");
  }
  return rawType.toUpperCase();
};

export const groupDocsIntoBatches = (trashedDocs: any[]): TrashBatch[] => {
  if (!trashedDocs || trashedDocs.length === 0) return [];

  const groupedByDay = new Map<string, any[]>();

  trashedDocs.forEach((doc: any) => {
    const rawDate = doc.deleted_at ?? doc.updated_at ?? Date.now();
    const d = new Date(rawDate);
    const validDate = isNaN(d.getTime()) ? new Date() : d;

    const year = validDate.getFullYear();
    const month = String(validDate.getMonth() + 1).padStart(2, "0");
    const day = String(validDate.getDate()).padStart(2, "0");
    const dateKey = `${year}-${month}-${day}`;

    if (!groupedByDay.has(dateKey)) {
      groupedByDay.set(dateKey, []);
    }
    groupedByDay.get(dateKey)!.push({
      ...doc,
      _parsedDate: validDate,
    });
  });

  let batchIndex = 1;

  const batches: TrashBatch[] = Array.from(groupedByDay.entries()).map(
    ([dateKey, docs]) => {
      const [year, month, day] = dateKey.split("-");
      const shortDate = `${day}/${month}`;
      const fullDate = `${day}/${month}/${year}`;

      let totalBytes = 0;
      let minRemainingDays = 30;
      let earliestExpiresDate = new Date();
      let latestTimestamp = 0;

      const mappedDocuments: TrashDocument[] = docs.map((d: any) => {
        const deletedAtDate: Date = d._parsedDate;
        const timestamp = deletedAtDate.getTime();
        if (timestamp > latestTimestamp) {
          latestTimestamp = timestamp;
        }

        const expiresAtDate = new Date(deletedAtDate);
        expiresAtDate.setDate(expiresAtDate.getDate() + 30);

        const remainingDays = Math.max(
          0,
          Math.ceil((expiresAtDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        );

        const fileSize = d.file_size ?? 0;
        totalBytes += fileSize;

        if (remainingDays < minRemainingDays) {
          minRemainingDays = remainingDays;
          earliestExpiresDate = expiresAtDate;
        }

        const hours = String(deletedAtDate.getHours()).padStart(2, "0");
        const minutes = String(deletedAtDate.getMinutes()).padStart(2, "0");
        const seconds = String(deletedAtDate.getSeconds()).padStart(2, "0");

        return {
          id: d.id,
          name: d.title || d.name || `Tài liệu #${d.id}`,
          type: formatDocType(d.file_type),
          size: formatSize(fileSize),
          sizeBytes: fileSize,
          source: d.trash_source ?? "personal",
          groupName: d.trash_group_name,
          deletedAt: `${fullDate} ${hours}:${minutes}:${seconds}`,
          deletedTime: `${hours}:${minutes}`,
          remainingDays,
          expiresAt: expiresAtDate.toLocaleDateString("vi-VN"),
          previewUrl: d.file_url || d.preview_url || d.url || "",
          originalPath: d.folder_name || d.original_path || "Thư mục cá nhân",
        };
      });

      const firstDoc = docs[0];

      return {
        id: batchIndex++,
        dateKey,
        shortDate,
        deletedAt: fullDate,
        deletedAtTimestamp: latestTimestamp || new Date(dateKey).getTime(),
        documentCount: mappedDocuments.length,
        totalSize: formatSize(totalBytes),
        totalSizeBytes: totalBytes,
        remainingDays: minRemainingDays,
        expiresAt: earliestExpiresDate.toLocaleDateString("vi-VN"),
        source: firstDoc.trash_source ?? "personal",
        groupName: firstDoc.trash_group_name,
        docIds: mappedDocuments.map((doc) => doc.id),
        documents: mappedDocuments,
      };
    }
  );

  return batches.sort((a, b) => b.deletedAtTimestamp - a.deletedAtTimestamp);
};