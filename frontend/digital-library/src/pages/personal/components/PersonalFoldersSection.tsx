// src/pages/personal/components/PersonalFoldersSection.tsx

import { FolderOpen, FolderPlus } from "lucide-react";
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
    <section>
      <h2 className="text-sm font-semibold text-gray-700 mb-3">
        Thư mục cá nhân
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {foldersLoading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <CardSkeleton key={index} variant="folder" />
          ))
        ) : (
          <>
            {/* Card Tất cả */}
            <div
              className={cn(
                "cursor-pointer rounded-xl border p-4 hover:border-primary-300 transition-colors bg-white",
                selectedFolderId === null
                  ? "border-primary-500 shadow-sm"
                  : "border-gray-200"
              )}
              onClick={() => onSelectFolder(null)}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-gray-50 text-gray-500">
                  <FolderOpen className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Tất cả
                  </h3>
                </div>
              </div>
            </div>

            {/* Danh sách Thư mục */}
            {folders?.map((folder) => (
              <div
                key={folder.id}
                className={cn(
                  "rounded-xl border transition-colors bg-white",
                  selectedFolderId === folder.id
                    ? "border-primary-500 shadow-sm"
                    : "border-gray-200"
                )}
              >
                <FolderCard
                  id={folder.id}
                  name={folder.name}
                  count={folder.document_count ?? 0}
                  color={folder.color}
                  tags={folder.tags}
                  onClick={() => onSelectFolder(folder.id)}
                  onAction={onFolderAction}
                />
              </div>
            ))}
          </>
        )}

        {/* Nút Thêm thư mục */}
        <button
          onClick={onOpenCreateModal}
          className="flex min-h-[64px] items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-5 text-sm font-medium text-gray-400 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50 transition-all duration-150"
        >
          <FolderPlus className="h-5 w-5" />+ Thêm thư mục
        </button>
      </div>
    </section>
  );
}