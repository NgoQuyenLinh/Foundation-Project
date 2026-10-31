// src/pages/personal/components/BundleExpandedFrame.tsx

import { useNavigate, useLocation } from "react-router-dom";
import { Package, ExternalLink } from "lucide-react";
import { DocumentCard } from "@/components/shared/documents/DocumentCard";
import { navigateToBundle } from "@/utils/bundleNavigation";
import type { DocCardType } from "./PersonalDocumentsSection";

interface BundleExpandedFrameProps {
  bundle: DocCardType;
  children: DocCardType[];
  isLoading: boolean;
  onDocumentAction: (action: string, documentId: string) => void;
  CardSkeleton: React.ComponentType<{ variant: "folder" | "document" }>;
}

export function BundleExpandedFrame({
  bundle,
  children,
  isLoading,
  onDocumentAction,
  CardSkeleton,
}: BundleExpandedFrameProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const targetUrl = `/personal/bundle/${bundle.id}`;
  const tags = bundle.tags || [];
  const displayCount = children.length;

  return (
    <div className="w-full rounded-xl border border-purple-200 bg-purple-50/20 p-3 flex flex-col gap-3">
      {/* Header khung (1 dòng) */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-100 pb-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="flex items-center gap-1.5 font-semibold text-gray-800 text-sm">
            <Package className="h-4 w-4 text-purple-600 shrink-0" />
            <span className="truncate max-w-[260px] sm:max-w-md" title={bundle.name}>
              {bundle.name}
            </span>
          </div>

          <span className="inline-flex items-center rounded-md bg-purple-100 px-2 py-0.5 text-[11px] font-medium text-purple-700">
            {isLoading ? "Đang tải..." : `${displayCount} tài liệu`}
          </span>

          {tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              {tags.map((tag: any) => (
                <span
                  key={tag.id ?? tag.name}
                  className="inline-flex items-center rounded-md bg-white border border-purple-200 px-1.5 py-0.5 text-[10px] font-medium text-purple-600"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => navigateToBundle(navigate, location, targetUrl)}
          className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 hover:text-purple-900 transition-colors shrink-0"
        >
          <span>Mở trang chi tiết</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Body: Grid con hoặc Loading Skeleton hoặc Empty text */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <CardSkeleton key={idx} variant="document" />
          ))}
        </div>
      ) : children.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {children.map((childDoc) => (
            <DocumentCard
              key={childDoc.id}
              document={childDoc}
              onAction={onDocumentAction}
              basePath="/personal/documents"
            />
          ))}
        </div>
      ) : (
        <div className="py-4 text-center text-xs text-gray-500 italic">
          Không có tài liệu phù hợp
        </div>
      )}
    </div>
  );
}
