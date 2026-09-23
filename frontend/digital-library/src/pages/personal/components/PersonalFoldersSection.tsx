// src/pages/personal/components/PersonalFoldersSection.tsx

import { FolderOpen, Plus } from "lucide-react";
import { FolderCard } from "@/components/shared/FolderCard";
import { type FolderAction } from "@/components/shared/FolderContextMenu";
import { cn } from "@/utils/cn";

// Khai báo kiểu cho Folder trả về từ API
export interface FolderType {
  id: number;
  name: string;
  document_count?: number;
  color?: string;
  tags?: any[];
}

interface PersonalFoldersSectionProps {
  folders?: FolderType[];
  foldersLoading: boolean;
  selectedFolderId: number | null;
  onSelectFolder: (id: number | null) => void;
  onFolderAction: (action: FolderAction, folderId: number) => void;
  onOpenCreateModal: () => void;
  CardSkeleton: React.ComponentType<{ variant: "folder" | "document" }>;
}

export function PersonalFoldersSection({
  folders,
  foldersLoading,
  selectedFolderId,
  onSelectFolder,
  onFolderAction,
  onOpenCreateModal,
  CardSkeleton,
}: PersonalFoldersSectionProps) {
return (
    <section className="w-full">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">
        Thư mục cá nhân
      </h2>

      {/* Container 1 hàng duy nhất + cuộn ngang */}
      <div className="flex w-full items-center gap-3 overflow-x-auto pb-3 flex-nowrap custom-scrollbar">
        {foldersLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-[96px] w-[220px] shrink-0">
              <CardSkeleton variant="folder" />
            </div>
          ))
        ) : (
          <>
            {/* Thẻ Tất cả (Đã đồng bộ kích thước h-[96px] với FolderCard) */}
            <div
              className={cn(
                "flex h-[96px] shrink-0 cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-all duration-300 bg-white",
                selectedFolderId === null
                  ? "border-primary-500 bg-primary-50/20 shadow-md min-w-[180px]"
                  : "border-gray-200 hover:border-gray-300 hover:shadow-sm min-w-[160px]",
              )}
              onClick={() => onSelectFolder(null)}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                <FolderOpen className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 leading-tight">
                  Tất cả
                </h3>
                <p className="mt-0.5 text-xs text-gray-400 font-medium">
                  Tất cả tài liệu
                </p>
              </div>
            </div>

            {/* Danh sách Thư mục (Render trực tiếp FolderCard, không cần div bọc) */}
            {folders?.map((folder) => (
              <FolderCard
                key={folder.id}
                id={folder.id}
                name={folder.name}
                count={folder.document_count ?? 0}
                color={folder.color}
                tags={folder.tags}
                isSelected={selectedFolderId === folder.id}
                onClick={() => onSelectFolder(folder.id)}
                onAction={onFolderAction}
              />
            ))}
          </>
        )}

        {/* Nút Thêm thư mục mới (Cố định shrink-0 để không bị bóp nghẹt khi cuộn) */}
        <button
          type="button"
          onClick={onOpenCreateModal}
          className="
            flex 
            h-[96px] 
            min-w-[200px] 
            shrink-0 
            items-center 
            justify-center 
            gap-2 
            rounded-xl 
            border 
            border-dashed 
            border-gray-300 
            bg-gray-50/50 
            text-sm 
            font-medium 
            text-gray-500 
            transition-all 
            duration-200 
            hover:border-primary-400 
            hover:bg-primary-50/40 
            hover:text-primary-600
          "
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white shadow-xs">
            <Plus className="h-4 w-4 text-gray-600" />
          </div>
          <span>Tạo thư mục mới</span>
        </button>
      </div>
    </section>
  );
}
