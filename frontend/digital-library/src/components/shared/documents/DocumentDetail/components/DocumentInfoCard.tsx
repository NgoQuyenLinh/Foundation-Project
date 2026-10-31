// src/components/shared/documents/DocumentDetail/components/DocumentInfoCard.tsx

import { Card } from "@/components/ui/Card";
import type { TagType } from "../DocumentDetail.types";
import { DocumentTagSection } from "./DocumentTagSection";

interface InfoRowProps {
  label: string;
  value: string;
  title?: string;
}

export function InfoRow({ label, value, title }: InfoRowProps) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-gray-100 last:border-0 min-w-0">
      <span className="text-sm text-gray-500 shrink-0 w-22">{label}</span>
      <span
        className="text-sm font-semibold text-gray-900 text-right min-w-0 flex-1 break-words [overflow-wrap:anywhere]"
        title={title || value}
      >
        {value}
      </span>
    </div>
  );
}

interface StatItemProps {
  label: string;
  value: number;
  title?: string;
}

export function StatItem({ label, value, title }: StatItemProps) {
  return (
    <div className="flex flex-col items-center gap-1" title={title}>
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-lg font-bold text-gray-900">{value}</span>
    </div>
  );
}

interface DocumentInfoCardProps {
  title: string;
  fileTypeLabel: string;
  sizeLabel: string;
  uploadedAt: string;
  tags: TagType[];
  canManageTags: boolean;
  allTags: TagType[];
  isLoadingTags: boolean;
  onSaveTags: (tagIds: number[]) => void;
  isSavingTags: boolean;
  onCreateTag: (newTag: { name: string; color: string }, onCreated?: (tag: TagType) => void) => void;
  isCreatingTag: boolean;
  onRemoveTag: (tagId: number) => void;
  isRemovingTag: boolean;
  viewCount?: number;
  downloadCount?: number;
  shareCount?: number;
  personalViewCount?: number;
  isPersonal?: boolean;
}

/**
 * DocumentInfoCard - Card hiển thị chi tiết thuộc tính tệp, nhãn dán và thống kê
 */
export function DocumentInfoCard({
  title,
  fileTypeLabel,
  sizeLabel,
  uploadedAt,
  tags,
  canManageTags,
  allTags,
  isLoadingTags,
  onSaveTags,
  isSavingTags,
  onCreateTag,
  isCreatingTag,
  onRemoveTag,
  isRemovingTag,
  viewCount = 0,
  downloadCount = 0,
  shareCount = 0,
  personalViewCount = 0,
  isPersonal = true,
}: DocumentInfoCardProps) {
  const displayTitle = title.length > 25 ? title.slice(0, 25) + "…" : title;

  return (
    <Card className="min-w-0 overflow-hidden">
      <h2 className="text-base font-semibold text-gray-900 mb-3">
        Thông tin tệp
      </h2>

      <div>
        <InfoRow label="Tên tệp" value={displayTitle} title={title} />
        <InfoRow label="Loại tệp" value={fileTypeLabel} />
        <InfoRow label="Dung lượng" value={sizeLabel} />
        <InfoRow label="Ngày tải lên" value={uploadedAt} />
      </div>

      {/* Quản lý danh sách nhãn dán */}
      <DocumentTagSection
        tags={tags}
        canManageTags={canManageTags}
        allTags={allTags}
        isLoadingTags={isLoadingTags}
        onSaveTags={onSaveTags}
        isSavingTags={isSavingTags}
        onCreateTag={onCreateTag}
        isCreatingTag={isCreatingTag}
        onRemoveTag={onRemoveTag}
        isRemovingTag={isRemovingTag}
      />

      {/* Thống kê tương tác */}
      <div className="mt-6 flex justify-around border-t border-gray-100 pt-4">
        <StatItem
          label="Lượt xem"
          value={viewCount}
          title={
            isPersonal
              ? `Bạn đã mở xem ${personalViewCount || viewCount} lần`
              : `Tổng ${viewCount} lượt xem${personalViewCount ? ` (của bạn: ${personalViewCount})` : ""}`
          }
        />
        <div className="w-px bg-gray-100" />
        <StatItem
          label="Tải xuống"
          value={downloadCount}
          title="Số lần tải xuống tài liệu"
        />
        <div className="w-px bg-gray-100" />
        <StatItem
          label="Đã chia sẻ"
          value={shareCount}
          title={
            isPersonal
              ? "Số lần tài liệu được chia sẻ vào nhóm hoặc cộng đồng"
              : "Số lần tài liệu được chia sẻ"
          }
        />
      </div>
    </Card>
  );
}
