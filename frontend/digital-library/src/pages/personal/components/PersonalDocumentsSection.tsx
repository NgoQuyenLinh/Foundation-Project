// src/pages/personal/components/PersonalDocumentsSection.tsx

import { useState } from "react";
import { FileX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DocumentCard } from "@/components/shared/DocumentCard";
import { type DocumentAction } from "@/components/shared/DocumentContextMenu";
import {
  DocumentListView,
  type DocumentListItem,
} from "@/components/shared/DocumentListView";
import { ViewToggle, type ViewMode } from "@/components/shared/ViewToggle";
import EmptyState from "@/components/shared/EmptyState";
import { cn } from "@/utils/cn";

export interface DocCardType {
  id: string;
  name: string;
  type: string;
  updatedAt: string;
  size: string;
  extension?: string;
  thumbnail_path?: string | null;
  file_path?: string | null;
  owner?: { name: string; avatar: string };
  rawType?: string | null;
  tags?: any[];
}

interface PersonalDocumentsSectionProps {
  docsLoading: boolean;
  isFetching: boolean;
  filteredDocCards: DocCardType[];
  docData?: {
    total: number;
    total_pages: number;
  };
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  onDocumentAction: (action: DocumentAction | string, documentId: string) => void;
  onOpenUploadModal: () => void;
  CardSkeleton: React.ComponentType<{ variant: "folder" | "document" }>;
}

/**
 * Convert size string (vd: "2.5 MB") về bytes để DocumentListView có thể format lại.
 */
function parseSizeToBytes(size?: string): number | undefined {
  if (!size) return undefined;
  const match = size.trim().match(/^([\d.,]+)\s*(B|KB|MB|GB|TB)$/i);
  if (!match) return undefined;

  const value = parseFloat(match[1].replace(",", "."));
  if (Number.isNaN(value)) return undefined;

  const unit = match[2].toUpperCase();
  const multipliers: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 ** 2,
    GB: 1024 ** 3,
    TB: 1024 ** 4,
  };

  return value * (multipliers[unit] ?? 1);
}

/**
 * Map DocCardType -> DocumentListItem để dùng chung DocumentListView.
 */
function toListItem(doc: DocCardType): DocumentListItem {
  return {
    id: doc.id,
    title: doc.name,
    type: doc.type,
    updatedAt: doc.updatedAt,
    size: parseSizeToBytes(doc.size),
    thumbnail_path: doc.thumbnail_path,
    owner: doc.owner ? { full_name: doc.owner.name } : undefined,
    tags: doc.tags,
    workspace_type: "personal",
  };
}

export function PersonalDocumentsSection({
  docsLoading,
  isFetching,
  filteredDocCards,
  docData,
  page,
  setPage,
  onDocumentAction,
  onOpenUploadModal,
  CardSkeleton,
}: PersonalDocumentsSectionProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const listItems = filteredDocCards.map(toListItem);

  return (
    <section className="pb-70">
      {/* Header: title + view toggle */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">Tài liệu</h2>
        <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>

      {/* Grid view */}
      {viewMode === "grid" ? (
        <div
          className={cn(
            "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4",
            isFetching && "opacity-60 pointer-events-none"
          )}
        >
          {docsLoading ? (
            Array.from({ length: 10 }).map((_, index) => (
              <CardSkeleton key={index} variant="document" />
            ))
          ) : filteredDocCards.length > 0 ? (
            filteredDocCards.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onAction={onDocumentAction}
              />
            ))
          ) : (
            <div className="col-span-full">
              <EmptyState
                icon={<FileX className="h-6 w-6" />}
                title="Không tìm thấy tài liệu"
                description="Không có tài liệu nào phù hợp với bộ lọc hiện tại."
                actionLabel="Tải lên ngay"
                onAction={onOpenUploadModal}
              />
            </div>
          )}
        </div>
      ) : (
        /* List view */
        <div className={cn(isFetching && "opacity-60 pointer-events-none")}>
          <DocumentListView
            documents={listItems}
            isLoading={docsLoading}
            onAction={(action, docId) =>
              onDocumentAction(action, String(docId))
            }
          />
        </div>
      )}

      {/* Pagination */}
      {docData && docData.total_pages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4 text-sm text-gray-600">
          <span>
            Trang {page} / {docData.total_pages} • Tổng {docData.total} tài liệu
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ← Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === docData.total_pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Tiếp →
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}