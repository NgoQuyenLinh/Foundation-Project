// src/pages/personal/components/PersonalDocumentsSection.tsx

import { useState, useEffect, useCallback } from "react";
import { FileX, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DocumentCard } from "@/components/shared/documents/DocumentCard";
import { BundleDocumentCard } from "@/components/shared/documents/DocumentCard/BundleDocumentCard";
import { BundleExpandedFrame } from "./BundleExpandedFrame";
import { type DocumentAction } from "@/components/shared/documents/DocumentContextMenu";
import {
  DocumentListView,
  DocumentDetailView,
  type DocumentListItem,
} from "@/components/shared/documents";
import { ViewToggle, type ViewMode } from "@/components/shared/feedback/ViewToggle";
import EmptyState from "@/components/shared/feedback/EmptyState";
import { cn } from "@/utils/cn";
import { documentService } from "@/services/documentService";
import { formatSize } from "@/utils/formatSize";
import { getFileExtension } from "@/utils/file";

export interface DocCardType {
  id: string;
  name: string;
  type: string;
  updatedAt: string;
  size: string;
  extension?: string;
  thumbnail_path?: string | null;
  markdown_path?: string | null;
  file_path?: string | null;
  owner?: { name: string; avatar: string };
  rawType?: string | null;
  tags?: any[];
  is_bundle?: boolean;
  bundle_parent_id?: number | null;
  bundle_children_count?: number | null;
  // Bổ sung cho Detail view
  content?: string | null;
  pages?: number | null;
  view_count?: number;
  personal_view_count?: number;
  trending_score?: number;
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
  isFilterActive: boolean;
  searchQuery?: string;
  selectedTagId?: number | null;
}

/**
 * Convert size string (vd: "2.5 MB") về bytes để DocumentListView / DocumentDetailView format lại.
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
 * Map DocCardType -> DocumentListItem để dùng cho DocumentListView và DocumentDetailView.
 */
function toListItem(doc: DocCardType): DocumentListItem {
  return {
    id: doc.id,
    title: doc.name,
    type: doc.type,
    updatedAt: doc.updatedAt,
    size: parseSizeToBytes(doc.size),
    thumbnail_path: doc.thumbnail_path,
    markdown_path: doc.markdown_path ?? null,
    owner: doc.owner ? { full_name: doc.owner.name } : undefined,
    tags: doc.tags,
    workspace_type: "personal",
    is_bundle: doc.is_bundle,
    bundle_parent_id: doc.bundle_parent_id,
    bundle_children_count: doc.bundle_children_count,
    content: doc.content ?? null,
    pages: doc.pages ?? null,
    view_count: doc.view_count,
    personal_view_count: doc.personal_view_count,
    trending_score: doc.trending_score,
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
  isFilterActive,
  searchQuery = "",
  selectedTagId = null,
}: PersonalDocumentsSectionProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("detail");

  // Local state cho Bundle Expanded Grid
  const [isExpandedMode, setIsExpandedMode] = useState(true);
  const [bundleChildrenMap, setBundleChildrenMap] = useState<Map<string, DocCardType[]>>(new Map());
  const [loadingBundleIds, setLoadingBundleIds] = useState<Set<string>>(new Set());

  // Tự động expand khi filter active (không tự collapse khi filter tắt)
  useEffect(() => {
    if (isFilterActive) {
      setIsExpandedMode(true);
    }
  }, [isFilterActive]);

  // Lazy fetch bundle children
  const fetchBundleChildren = useCallback(async (bundleId: string) => {
    if (bundleChildrenMap.has(bundleId) || loadingBundleIds.has(bundleId)) return;

    setLoadingBundleIds((prev) => new Set(prev).add(bundleId));
    try {
      const children = await documentService.getBundleChildren(Number(bundleId));
      const mapped: DocCardType[] = children.map((c: any) => ({
        id: String(c.id),
        name: c.title,
        type: c.file_type || "file",
        updatedAt: c.updated_at || c.created_at,
        size: formatSize(c.file_size || 0),
        extension: getFileExtension(c.file_path, c.file_type, c.title),
        thumbnail_path: c.thumbnail_path ?? null,
        markdown_path: c.markdown_path ?? null,
        file_path: c.file_path ?? null,
        rawType: c.file_type,
        tags: c.tags || [],
        is_bundle: false,
        bundle_parent_id: Number(bundleId),
        bundle_children_count: null,
        content: c.content ?? null,
        pages: c.pages ?? null,
      }));
      setBundleChildrenMap((prev) => new Map(prev).set(bundleId, mapped));
    } finally {
      setLoadingBundleIds((prev) => {
        const next = new Set(prev);
        next.delete(bundleId);
        return next;
      });
    }
  }, [bundleChildrenMap, loadingBundleIds]);

  // Trigger fetch khi expanded
  useEffect(() => {
    if (!isExpandedMode) return;
    const bundles = filteredDocCards.filter((d) => d.is_bundle);
    bundles.forEach((b) => fetchBundleChildren(b.id));
  }, [isExpandedMode, filteredDocCards, fetchBundleChildren]);

  // Filter children logic khi filter active
  const getFilteredChildren = useCallback((bundleId: string): DocCardType[] => {
    const children = bundleChildrenMap.get(bundleId) ?? [];
    if (!isFilterActive) return children;

    return children.filter((c) => {
      if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (
        selectedTagId !== null &&
        !c.tags?.some((t: any) => (t.id ?? t.tag_id) === selectedTagId)
      ) {
        return false;
      }
      return true;
    });
  }, [bundleChildrenMap, isFilterActive, searchQuery, selectedTagId]);

  const listItems = filteredDocCards.map(toListItem);
  const hasBundle = filteredDocCards.some((d) => d.is_bundle);

  return (
    <section className="pb-70">
      {/* Header: title + toggle bundle button (nếu có bundle) + view toggle */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">Tài liệu</h2>
        <div className="flex items-center gap-2">
          {viewMode === "grid" && hasBundle && (
            <button
              type="button"
              onClick={() => setIsExpandedMode((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-purple-700 hover:text-purple-900 border border-purple-200 rounded-lg px-2.5 py-1 hover:bg-purple-50 transition-colors"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              {isExpandedMode ? "Thu gọn bundle" : "Xem nội dung bundle"}
            </button>
          )}
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>
      </div>

      {/* Grid view */}
      {viewMode === "grid" && (
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
            filteredDocCards.map((doc) => {
              if (!doc.is_bundle) {
                return (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    onAction={onDocumentAction}
                  />
                );
              }

              if (!isExpandedMode) {
                return (
                  <BundleDocumentCard
                    key={doc.id}
                    document={doc}
                    onAction={onDocumentAction}
                  />
                );
              }

              const filteredChildren = getFilteredChildren(doc.id);
              const isLoading = loadingBundleIds.has(doc.id);

              if (isFilterActive && !isLoading && filteredChildren.length === 0) {
                return null;
              }

              return (
                <div key={doc.id} className="col-span-full">
                  <BundleExpandedFrame
                    bundle={doc}
                    children={filteredChildren}
                    isLoading={isLoading}
                    onDocumentAction={onDocumentAction}
                    CardSkeleton={CardSkeleton}
                  />
                </div>
              );
            })
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
      )}

      {/* List view */}
      {viewMode === "list" && (
        <div className={cn(isFetching && "opacity-60 pointer-events-none")}>
          <DocumentListView
            documents={listItems}
            isLoading={docsLoading}
            onAction={(action, docId) =>
              onDocumentAction(action, String(docId))
            }
            onToggleBundle={async (bundleId) => {
              const children = await documentService.getBundleChildren(Number(bundleId));
              return children.map((c: any) => ({
                id: String(c.id),
                title: c.title,
                type: c.file_type || "file",
                updatedAt: c.updated_at || c.created_at,
                size: c.file_size,
                thumbnail_path: c.thumbnail_path,
                markdown_path: c.markdown_path ?? null,
                tags: c.tags,
                workspace_type: "personal",
                is_bundle: false,
                content: c.content ?? null,
                pages: c.pages ?? null,
              }));
            }}
          />
        </div>
      )}

      {/* Detail view */}
      {viewMode === "detail" && (
        <div className={cn(isFetching && "opacity-60 pointer-events-none")}>
          <DocumentDetailView
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
            Trang {page} / {docData.total_pages} (Tổng {docData.total} tài liệu)
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