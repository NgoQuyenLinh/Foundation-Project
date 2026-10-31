import { useNavigate, useLocation } from "react-router-dom";
import { Package, Heart } from "lucide-react";
import { DocumentContextMenu } from "@/components/shared/documents/DocumentContextMenu";
import { useFavoriteStore } from "@/stores/favoriteStore";
import { navigateToBundle } from "@/utils/bundleNavigation";
import type { DocumentCardProps } from "./DocumentCard";

export function BundleDocumentCard({
  document,
  onAction,
  basePath = "/personal/documents",
  allowedActions,
  extraItems,
}: DocumentCardProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const targetUrl = basePath.startsWith("/groups/")
    ? `${basePath.split("/documents")[0]}/bundle/${document.id}`
    : `/personal/bundle/${document.id}`;

  const handleOpenBundle = () => {
    navigateToBundle(navigate, location, targetUrl);
  };

  const handleAction = (action: string) => {
    if (action === "view") handleOpenBundle();
    else onAction(action, document.id);
  };

  const tags = document.tags || [];
  const childrenCount = document.bundle_children_count ?? 0;
  const docNumId = Number(document.id);
  const isFavorite = useFavoriteStore((state) => (isNaN(docNumId) ? false : state.isFavorite(docNumId)));
  const toggleFavorite = useFavoriteStore((state) => state.toggleFavorite);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isNaN(docNumId)) {
      await toggleFavorite(docNumId);
    }
  };

  return (
    <div
      id={`doc-${document.id}`}
      className={`group relative flex h-[280px] w-full flex-col rounded-xl border shadow-xs transition-all duration-200 hover:z-30 hover:-translate-y-1 hover:shadow-md focus-within:z-30 ${
        isFavorite
          ? "border-rose-300 ring-1 ring-rose-200 bg-rose-50/20 shadow-rose-50"
          : "border-purple-200 bg-purple-50/20 hover:border-purple-300"
      }`}
    >
      {/* Khung Preview Bundle */}
      <div
        className="relative h-[135px] w-full shrink-0 cursor-pointer overflow-hidden rounded-t-xl bg-purple-100/40 flex items-center justify-center transition-colors"
        onClick={handleOpenBundle}
      >
        <div className="absolute left-2.5 top-2.5 z-10">
          <span className="inline-flex items-center rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-purple-700 backdrop-blur-xs">
            BUNDLE
          </span>
        </div>

        <div className="flex flex-col items-center justify-center gap-2">
          <div className="relative">
            <Package className="h-16 w-16 text-purple-500" />
            <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">
              {childrenCount}
            </span>
          </div>
        </div>
      </div>

      {/* Thông tin Chi tiết */}
      <div className="relative flex flex-1 flex-col justify-between p-3.5 rounded-b-xl bg-white">
        <div>
          <div className="flex items-start justify-between gap-1.5">
            <h3
              onClick={handleOpenBundle}
              className="line-clamp-2 flex-1 cursor-pointer text-sm font-semibold text-gray-800 transition-colors hover:text-purple-600 leading-snug"
              title={document.name}
            >
              {document.name}
            </h3>

            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={handleFavoriteClick}
                title={isFavorite ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
                className={`p-1 rounded-full transition-all duration-150 focus:outline-none ${
                  isFavorite
                    ? "opacity-100 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                    : "opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-500 hover:bg-gray-100"
                }`}
              >
                <Heart
                  className={`h-4 w-4 ${isFavorite ? "fill-rose-500 text-rose-500" : ""}`}
                />
              </button>

              <div
                className="relative z-50 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <DocumentContextMenu
                  documentId={document.id}
                  onAction={handleAction}
                  allowedActions={allowedActions}
                  extraItems={extraItems}
                />
              </div>
            </div>
          </div>

          <p className="mt-0.5 text-xs font-medium text-purple-600">
            {childrenCount} tài liệu bên trong
          </p>

          <p className="mt-1.5 text-[11px] font-medium text-gray-400 flex items-center gap-1.5">
            <span>{document.size}</span>
            <span className="h-1 w-1 rounded-full bg-gray-300" />
            <span>{document.updatedAt}</span>
          </p>
        </div>

        {/* Tags */}
        <div className="mt-2.5 pt-2 border-t border-gray-100/80">
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-1 max-h-[26px] overflow-hidden">
              {tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 transition-colors hover:bg-gray-200/80"
                >
                  {tag.name}
                </span>
              ))}
              {tags.length > 3 && (
                <span className="inline-flex items-center rounded-md bg-gray-50 px-1 py-0.5 text-[10px] font-medium text-gray-400">
                  +{tags.length - 3}
                </span>
              )}
            </div>
          ) : (
            <span className="text-[11px] italic text-gray-300">Chưa có tag</span>
          )}
        </div>

         <div className="pointer-events-none absolute bottom-full left-0 mb-1.5 z-50 hidden max-w-xs rounded-md bg-gray-900/90 px-2.5 py-1 text-[11px] font-medium text-white shadow-lg opacity-0 transition-opacity duration-200 group-hover:block group-hover:opacity-100 whitespace-normal leading-tight">
                {document.name}
              </div>
      </div>
    </div>
  );
}