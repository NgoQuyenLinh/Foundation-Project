// src/components/shared/DocumentFilterBar.tsx
import { Search, Upload } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { DynamicFilterDropdown } from "@/components/shared/DynamicFilterDropdown";
import { Button } from "@/components/ui/Button";
import { getNormalizedExtension } from "@/hooks/useDocumentFilters";
import type { WorkspaceMember } from "@/types/group";

export interface TagOption {
  id?: number;
  tag_id?: number;
  name: string;
}

// Khai báo các tùy chọn thời gian cố định
export const TIME_FILTER_OPTIONS = [
  { value: "today", label: "Hôm nay" },
  { value: "last_7_days", label: "7 ngày qua" },
  { value: "last_30_days", label: "30 ngày qua" },
  { value: "this_year", label: "Năm nay" },
];

interface DocumentFilterBarProps {
  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchPlaceholder?: string;

  // Tags Filter
  tags: TagOption[];
  selectedTagId: number | null;
  setSelectedTagId: (id: number | null) => void;

  // File Types Filter
  fileTypes: string[];
  selectedFileType: string | null;
  setSelectedFileType: (type: string | null) => void;

  // Time Filters (Mới thêm)
  selectedUploadTime?: string | null;
  setSelectedUploadTime?: (time: string | null) => void;
  selectedAccessTime?: string | null;
  setSelectedAccessTime?: (time: string | null) => void;

  // Uploader Filter (Dành cho Group)
  members?: WorkspaceMember[];
  selectedUploaderId?: number | null;
  setSelectedUploaderId?: (id: number | null) => void;

  // Actions
  onUploadClick?: () => void;
  showUploadButton?: boolean;
}

export function DocumentFilterBar({
  searchQuery,
  setSearchQuery,
  searchPlaceholder = "Tìm tên tài liệu, nhãn dán, thư mục...",
  tags,
  selectedTagId,
  setSelectedTagId,
  fileTypes,
  selectedFileType,
  setSelectedFileType,
  selectedUploadTime,
  setSelectedUploadTime,
  selectedAccessTime,
  setSelectedAccessTime,
  members,
  selectedUploaderId,
  setSelectedUploaderId,
  onUploadClick,
  showUploadButton = true,
}: DocumentFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Ô Tìm kiếm */}
      <div className="min-w-[240px] flex-1">
        <Input
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<Search className="h-4 w-4" />}
        />
      </div>

      {/* Cụm Dropdown Lọc */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Lọc theo Loại tài liệu */}
        <DynamicFilterDropdown
          label="Loại tài liệu"
          options={fileTypes.map((ft: string) => ({
            value: ft,
            label: getNormalizedExtension(ft).toUpperCase() || "Khác",
          }))}
          selectedValue={selectedFileType}
          onChange={(val) => setSelectedFileType(val as string | null)}
        />

        {/* Lọc theo Nhãn dán */}
        <DynamicFilterDropdown
          label="Nhãn dán"
          options={tags.map((t) => ({
            value: (t.tag_id ?? t.id) as number,
            label: t.name,
          }))}
          selectedValue={selectedTagId}
          onChange={(val) => setSelectedTagId(val as number | null)}
        />

        {/* Lọc theo Ngày sửa/tải lên */}
        {setSelectedUploadTime && (
          <DynamicFilterDropdown
            label="Tải lên gần đây"
            options={TIME_FILTER_OPTIONS}
            selectedValue={selectedUploadTime ?? null}
            onChange={(val) => setSelectedUploadTime(val as string | null)}
          />
        )}

        {/* Lọc theo Lần truy cập */}
        {setSelectedAccessTime && (
          <DynamicFilterDropdown
            label="Mở gần đây"
            options={TIME_FILTER_OPTIONS}
            selectedValue={selectedAccessTime ?? null}
            onChange={(val) => setSelectedAccessTime(val as string | null)}
          />
        )}

        {/* Lọc theo Người tải lên */}
        {members && members.length > 0 && setSelectedUploaderId && (
          <DynamicFilterDropdown
            label="Người tải lên"
            options={members.map((m) => ({
              value: m.user_id,
              label: m.full_name || m.username,
            }))}
            selectedValue={selectedUploaderId ?? null}
            onChange={(val) => setSelectedUploaderId(val as number | null)}
          />
        )}
      </div>

      {/* Nút Tải lên */}
      {showUploadButton && onUploadClick && (
        <div className="ml-auto">
          <Button
            variant="primary"
            icon={<Upload className="h-4 w-4" />}
            onClick={onUploadClick}
          >
            Tải lên
          </Button>
        </div>
      )}
    </div>
  );
}