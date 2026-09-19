// src/pages/personal/components/PersonalDocumentsSection.tsx

import { FileX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DocumentCard } from "@/components/shared/DocumentCard";
import { type DocumentAction } from "@/components/shared/DocumentContextMenu";
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
  return (
    <section className="pb-70">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Tài liệu</h2>
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