import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { navigateToBundle, getCurrentFullPath } from "@/utils/bundleNavigation";
import {
  Heart,
  BookOpen,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  X,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookmarkCheck,
  FileText,
  AlertCircle,
  Loader2,
  HeartCrack,
} from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DocumentCard } from "@/components/shared/documents/DocumentCard";
import { DocumentListView } from "@/components/shared/documents/DocumentListView";
import {
  ViewToggle,
  type ViewMode,
} from "@/components/shared/feedback/ViewToggle";
import { favoriteService } from "@/services/favoriteService";
import { useAuthStore } from "@/stores/authStore";
import { useFavoriteStore } from "@/stores/favoriteStore";
import { formatSize } from "@/utils/formatSize";
import { formatRelativeDate } from "@/utils/formatDate";
import { cn } from "@/utils/cn";
import type {
  FavoriteDocument,
  FavoriteTag,
  ReadingStatus,
} from "@/types/document";

// ==========================================
// CONSTANTS & HELPERS
// ==========================================

const READING_STATUS_CONFIG: Record<
  ReadingStatus,
  {
    label: string;
    icon: typeof Clock;
    badgeCls: string;
    bgCls: string;
    borderCls: string;
    textCls: string;
  }
> = {
  to_read: {
    label: "Đọc sau",
    icon: Clock,
    badgeCls: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200",
    bgCls: "bg-amber-50",
    borderCls: "border-amber-300",
    textCls: "text-amber-700",
  },
  reading: {
    label: "Đang đọc",
    icon: BookOpen,
    badgeCls: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200",
    bgCls: "bg-blue-50",
    borderCls: "border-blue-300",
    textCls: "text-blue-700",
  },
  completed: {
    label: "Đã đọc",
    icon: CheckCircle2,
    badgeCls:
      "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200",
    bgCls: "bg-emerald-50",
    borderCls: "border-emerald-300",
    textCls: "text-emerald-700",
  },
};

const SORT_OPTIONS = [
  {
    label: "Mới yêu thích nhất",
    sort_by: "created_at",
    sort_order: "desc" as const,
  },
  { label: "Cũ nhất", sort_by: "created_at", sort_order: "asc" as const },
  {
    label: "Tên tài liệu (A - Z)",
    sort_by: "title",
    sort_order: "asc" as const,
  },
  {
    label: "Tên tài liệu (Z - A)",
    sort_by: "title",
    sort_order: "desc" as const,
  },
];

export default function FavoritesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { token } = useAuthStore();

  // Filters state
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedStatus, setSelectedStatus] = useState<ReadingStatus | "all">(
    "all",
  );
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [tagMode, setTagMode] = useState<"any" | "all">("any");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortIndex, setSortIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Modals state
  const [notesModalDoc, setNotesModalDoc] = useState<FavoriteDocument | null>(
    null,
  );
  const [tagModalDoc, setTagModalDoc] = useState<FavoriteDocument | null>(null);

  // 1. Fetch Stats
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["favorite-stats"],
    queryFn: favoriteService.getStats,
  });

  // 2. Fetch User Tags
  const { data: availableTags = [] } = useQuery({
    queryKey: ["favorite-tags"],
    queryFn: () => favoriteService.getTags(),
  });

  // 3. Fetch Favorites List
  const currentSort = SORT_OPTIONS[sortIndex];
  const {
    data: favListResponse,
    isLoading: isListLoading,
    isError: isListError,
    refetch: refetchList,
  } = useQuery({
    queryKey: [
      "favorites",
      currentPage,
      pageSize,
      selectedStatus,
      selectedTagIds,
      tagMode,
      currentSort.sort_by,
      currentSort.sort_order,
    ],
    queryFn: () =>
      favoriteService.listFavorites({
        page: currentPage,
        page_size: pageSize,
        reading_status: selectedStatus === "all" ? undefined : selectedStatus,
        tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        tag_mode: tagMode,
        sort_by: currentSort.sort_by as "created_at" | "title",
        sort_order: currentSort.sort_order,
      }),
  });

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: ({ docId, status }: { docId: number; status: ReadingStatus }) =>
      favoriteService.updateFavorite(docId, { reading_status: status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["favorite-stats"] });
    },
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: (docId: number) => favoriteService.removeFavorite(docId),
    onSuccess: (_, docId) => {
      useFavoriteStore.getState().removeFavoriteId(docId);
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["favorite-stats"] });
      queryClient.invalidateQueries({ queryKey: ["favorite-tags"] });
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: ({ docId, tagId }: { docId: number; tagId: number }) =>
      favoriteService.removeTag(docId, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["favorite-tags"] });
    },
  });

  // Handlers
  const handleToggleTagFilter = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId],
    );
    setCurrentPage(1);
  };

  const handleDownload = (doc: FavoriteDocument) => {
    const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
    const downloadUrl = `${apiBase}/documents/${doc.id}/download?token=${token ?? ""}`;
    window.open(downloadUrl, "_blank");
  };

  const handlePreview = (doc: FavoriteDocument) => {
    if (doc.is_bundle) {
      navigateToBundle(navigate, location, `/personal/bundle/${doc.id}`);
    } else {
      navigate(`/personal/documents/${doc.id}`, {
        state: { from: getCurrentFullPath(location) },
      });
    }
  };

  const rawItems = favListResponse?.items || [];
  const filteredItems = searchQuery.trim()
    ? rawItems.filter(
        (doc) =>
          doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (doc.notes &&
            doc.notes.toLowerCase().includes(searchQuery.toLowerCase())),
      )
    : rawItems;

  const totalPages = favListResponse?.total_pages || 1;
  const totalCount = favListResponse?.total || 0;

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 sm:p-8 space-y-8">
      {/* 1. HEADER & THỐNG KÊ TIẾN ĐỘ ĐỌC */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2.5">
              <Heart className="h-6 w-6 text-red-500 fill-red-500" />
              Tài liệu yêu thích
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Quản lý tri thức cá nhân, theo dõi tiến độ đọc và gắn thẻ tài liệu
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card
            onClick={() => {
              setSelectedStatus("all");
              setCurrentPage(1);
            }}
            className={cn(
              "p-4 cursor-pointer transition-all border rounded-2xl hover:shadow-md",
              selectedStatus === "all"
                ? "border-primary-500 ring-2 ring-primary-100 bg-white shadow-sm"
                : "border-gray-200 bg-white hover:border-gray-300",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">
                Tất cả yêu thích
              </span>
              <BookmarkCheck className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-2">
              {isStatsLoading ? "..." : (stats?.total ?? 0)}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Tổng số tài liệu đã lưu
            </p>
          </Card>

          <Card
            onClick={() => {
              setSelectedStatus("to_read");
              setCurrentPage(1);
            }}
            className={cn(
              "p-4 cursor-pointer transition-all border rounded-2xl hover:shadow-md",
              selectedStatus === "to_read"
                ? "border-amber-500 ring-2 ring-amber-100 bg-amber-50/50 shadow-sm"
                : "border-gray-200 bg-white hover:border-amber-200",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-700">
                Đọc sau
              </span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-900 mt-2">
              {isStatsLoading ? "..." : (stats?.to_read ?? 0)}
            </div>
            <p className="text-[11px] text-amber-600/80 mt-1">Chờ đọc</p>
          </Card>

          <Card
            onClick={() => {
              setSelectedStatus("reading");
              setCurrentPage(1);
            }}
            className={cn(
              "p-4 cursor-pointer transition-all border rounded-2xl hover:shadow-md",
              selectedStatus === "reading"
                ? "border-blue-500 ring-2 ring-blue-100 bg-blue-50/50 shadow-sm"
                : "border-gray-200 bg-white hover:border-blue-200",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-blue-700">
                Đang đọc
              </span>
              <BookOpen className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-blue-900 mt-2">
              {isStatsLoading ? "..." : (stats?.reading ?? 0)}
            </div>
            <p className="text-[11px] text-blue-600/80 mt-1">Đang tiến hành</p>
          </Card>

          <Card
            onClick={() => {
              setSelectedStatus("completed");
              setCurrentPage(1);
            }}
            className={cn(
              "p-4 cursor-pointer transition-all border rounded-2xl hover:shadow-md",
              selectedStatus === "completed"
                ? "border-emerald-500 ring-2 ring-emerald-100 bg-emerald-50/50 shadow-sm"
                : "border-gray-200 bg-white hover:border-emerald-200",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-700">
                Đã đọc
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-900 mt-2">
              {isStatsLoading ? "..." : (stats?.completed ?? 0)}
            </div>
            <p className="text-[11px] text-emerald-600/80 mt-1">Hoàn thành</p>
          </Card>
        </div>
      </div>

      {/* 2. THANH CÔNG CỤ LỌC, TÌM KIẾM & SẮP XẾP */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm trong yêu thích hoặc ghi chú..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            {selectedTagIds.length > 1 && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-2.5 py-1.5 rounded-xl border border-gray-200">
                <span>Chế độ thẻ:</span>
                <button
                  type="button"
                  onClick={() => setTagMode(tagMode === "any" ? "all" : "any")}
                  className="font-medium text-primary-600 hover:underline"
                >
                  {tagMode === "any"
                    ? "Chứa một trong số thẻ"
                    : "Chứa tất cả thẻ"}
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs">
              <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
              <select
                value={sortIndex}
                onChange={(e) => {
                  setSortIndex(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {SORT_OPTIONS.map((opt, idx) => (
                  <option key={idx} value={idx}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          </div>
        </div>

        {/* Thanh lọc Thẻ */}
        {availableTags.length > 0 && (
          <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
              <Filter className="h-3 w-3" /> Lọc theo thẻ:
            </span>
            {availableTags.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleToggleTagFilter(tag.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all",
                    isSelected
                      ? "bg-primary-600 text-white shadow-sm ring-2 ring-primary-200"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                  )}
                >
                  <span>#{tag.name}</span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-full",
                      isSelected
                        ? "bg-primary-700 text-white"
                        : "bg-gray-200 text-gray-600",
                    )}
                  >
                    {tag.document_count}
                  </span>
                </button>
              );
            })}
            {selectedTagIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedTagIds([])}
                className="text-xs text-gray-400 hover:text-red-500 ml-1 underline transition-colors"
              >
                Xóa lọc thẻ
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. DANH SÁCH TÀI LIỆU YÊU THÍCH (GRID KHUÔN ĐỘ DÀI/RỘNG CHUẨN) */}
      {isListLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-72 bg-white border border-gray-200 rounded-2xl animate-pulse p-3 space-y-3"
            >
              <div className="h-32 bg-gray-100 rounded-xl" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-8 bg-gray-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : isListError ? (
        <div className="p-12 text-center bg-white border border-red-100 rounded-3xl space-y-4 shadow-sm">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
          <h3 className="text-base font-semibold text-gray-900">
            Không thể tải danh sách yêu thích
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Đã có lỗi xảy ra khi kết nối máy chủ. Vui lòng kiểm tra lại kết nối
            mạng.
          </p>
          <Button
            onClick={() => refetchList()}
            variant="outline"
            size="sm"
            className="rounded-xl"
          >
            Thử lại
          </Button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-16 text-center bg-white border border-gray-200 rounded-3xl space-y-4 shadow-sm">
          <div className="h-14 w-14 bg-red-50 text-red-400 rounded-2xl flex items-center justify-center mx-auto">
            <HeartCrack className="h-7 w-7" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">
            {totalCount === 0
              ? "Chưa có tài liệu yêu thích nào"
              : "Không tìm thấy tài liệu phù hợp"}
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {totalCount === 0
              ? "Đánh dấu trái tim trên bất kỳ tài liệu nào để lưu trữ và quản lý tiến độ đọc tại đây."
              : "Hãy thử thay đổi trạng thái đọc, xóa bộ lọc thẻ hoặc từ khóa tìm kiếm."}
          </p>
          {totalCount === 0 ? (
            <Button
              onClick={() => navigate("/personal/documents")}
              variant="primary"
              size="sm"
              className="rounded-xl mt-2"
            >
              <FileText className="h-4 w-4 mr-2" />
              Khám phá tài liệu cá nhân
            </Button>
          ) : (
            <Button
              onClick={() => {
                setSelectedStatus("all");
                setSelectedTagIds([]);
                setSearchQuery("");
              }}
              variant="outline"
              size="sm"
              className="rounded-xl mt-2"
            >
              Xóa toàn bộ bộ lọc
            </Button>
          )}
        </div>
      ) : viewMode === "list" ? (
        /* Dạng Danh Sách */
        <DocumentListView
          documents={filteredItems.map((doc) => ({
            id: doc.id,
            title: doc.title,
            type: doc.file_type || "pdf",
            size: doc.file_size || 0,
            updatedAt: doc.favorited_at || doc.created_at,
            thumbnail_path: doc.thumbnail_path,
            is_bundle: doc.is_bundle,
            tags: doc.favorite_tags || [],
            owner: doc.owner
              ? {
                  username: doc.owner.username,
                  full_name: doc.owner.full_name || undefined,
                  avatar_url: doc.owner.avatar_url || undefined,
                }
              : undefined,
          }))}
          showOwner={true}
          workspaceType="personal"
          onAction={(action, docId) => {
            const numId = Number(docId);
            const foundDoc = filteredItems.find((d) => d.id === numId);
            if (action === "view" && foundDoc) handlePreview(foundDoc);
            else if (action === "download" && foundDoc)
              handleDownload(foundDoc);
            else if (action === "favorite" && foundDoc)
              removeFavoriteMutation.mutate(numId);
          }}
        />
      ) : (
        /* Dạng Lưới Chuẩn (Tái sử dụng DocumentCard + phần mở rộng PKM) */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredItems.map((doc) => {
            const statusCfg =
              READING_STATUS_CONFIG[doc.reading_status] ||
              READING_STATUS_CONFIG.to_read;
            const StatusIcon = statusCfg.icon;
            const favTags = doc.favorite_tags || [];

            const formattedDoc = {
              id: String(doc.id),
              name: doc.title,
              type: doc.file_type || "file",
              updatedAt: formatRelativeDate(doc.favorited_at || doc.created_at),
              size: formatSize(doc.file_size || 0),
              thumbnail_path: doc.thumbnail_path,
              tags: Array.isArray(doc.tags)
                ? (doc.tags as any[]).map((t: any, idx: number) =>
                    typeof t === "string" ? { id: idx, name: t } : { id: t.id ?? idx, name: t.name }
                  )
                : [],
              is_bundle: Boolean(doc.is_bundle),
              bundle_parent_id: (doc as any).bundle_parent_id,
              bundle_children_count: (doc as any).bundle_children_count,
            };

            return (
              <div
                key={doc.id}
                className="flex flex-col bg-white border border-rose-200/80 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all justify-between"
              >
                {/* 1. TÁI SỬ DỤNG DOCUMENTCARD (Thừa hưởng tim đỏ, viền, thumbnail, bundle nav) */}
                <DocumentCard
                  document={formattedDoc}
                  basePath="/personal/documents"
                  onAction={(action) => {
                    if (action === "view") handlePreview(doc);
                    else if (action === "download") handleDownload(doc);
                    else if (action === "favorite")
                      removeFavoriteMutation.mutate(doc.id);
                  }}
                />

                {/* 2. KHU VỰC MỞ RỘNG PKM: TIẾN ĐỘ ĐỌC, GHI CHÚ & THẺ YÊU THÍCH */}
                <div className="p-3 pt-2 bg-rose-50/20 border-t border-rose-100/60 space-y-2">
                  {/* Tiến độ đọc */}
                  <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-xl border border-gray-100 shadow-2xs">
                    <span className="text-[11px] font-medium text-gray-500 flex items-center gap-1">
                      <StatusIcon
                        className={cn("h-3 w-3", statusCfg.textCls)}
                      />
                      Tiến độ đọc:
                    </span>
                    <select
                      value={doc.reading_status}
                      onChange={(e) =>
                        updateStatusMutation.mutate({
                          docId: doc.id,
                          status: e.target.value as ReadingStatus,
                        })
                      }
                      className={cn(
                        "text-[11px] font-semibold px-2 py-0.5 rounded-lg border focus:outline-none cursor-pointer transition-all",
                        statusCfg.badgeCls,
                      )}
                    >
                      <option value="to_read">Đọc sau</option>
                      <option value="reading">Đang đọc</option>
                      <option value="completed">Đã đọc</option>
                    </select>
                  </div>

                  {/* Ghi chú cá nhân viên thuốc */}
                  <div className="bg-amber-50/50 border border-amber-200/80 rounded-full px-2.5 py-1 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      <Edit3 className="h-3 w-3 text-amber-600 shrink-0" />
                      {doc.notes ? (
                        <span
                          className="truncate italic text-gray-700"
                          title={doc.notes}
                        >
                          "{doc.notes}"
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">
                          Chưa có ghi chú
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotesModalDoc(doc)}
                      className="text-primary-600 hover:text-primary-700 font-medium text-[11px] shrink-0 ml-1.5 hover:underline"
                    >
                      {doc.notes ? "Sửa" : "+ Ghi chú"}
                    </button>
                  </div>

                  {/* Thẻ yêu thích */}
                  <div className="flex items-center justify-between gap-1 pt-1 border-t border-gray-100">
                    <div className="flex flex-wrap gap-1 min-w-0 flex-1">
                      {favTags.length > 0 ? (
                        favTags.map((tag) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-700 border border-gray-200"
                          >
                            <span>#{tag.name}</span>
                            <button
                              type="button"
                              title="Gỡ thẻ"
                              onClick={() =>
                                removeTagMutation.mutate({
                                  docId: doc.id,
                                  tagId: tag.id,
                                })
                              }
                              className="text-gray-400 hover:text-red-500 transition-colors ml-0.5"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">
                          Chưa gắn thẻ
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setTagModalDoc(doc)}
                      className="text-[11px] font-medium text-primary-600 hover:text-primary-700 hover:underline flex items-center gap-0.5 shrink-0"
                    >
                      <Plus className="h-3 w-3" /> Gắn thẻ
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. PHÂN TRANG */}
      {!isListLoading && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-6">
          <div className="text-xs text-gray-500">
            Hiển thị trang <span className="font-semibold">{currentPage}</span>{" "}
            / <span className="font-semibold">{totalPages}</span> (Tổng số{" "}
            {totalCount} tài liệu)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-xl h-8 px-3 text-xs"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-xl h-8 px-3 text-xs"
            >
              Sau <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* 5. MODAL CHỈNH SỬA GHI CHÚ */}
      {notesModalDoc && (
        <EditNotesModal
          doc={notesModalDoc}
          onClose={() => setNotesModalDoc(null)}
          onSave={(newNotes) => {
            updateStatusMutation.mutate({
              docId: notesModalDoc.id,
              status: notesModalDoc.reading_status,
            });
            favoriteService
              .updateFavorite(notesModalDoc.id, { notes: newNotes })
              .then(() => {
                queryClient.invalidateQueries({ queryKey: ["favorites"] });
                setNotesModalDoc(null);
              });
          }}
        />
      )}

      {/* 6. MODAL GẮN THẺ */}
      {tagModalDoc && (
        <AddTagModal
          doc={tagModalDoc}
          availableTags={availableTags}
          onClose={() => setTagModalDoc(null)}
          onAddTag={(tagNameOrId) => {
            const payload =
              typeof tagNameOrId === "number"
                ? { tag_id: tagNameOrId }
                : { name: tagNameOrId };

            favoriteService.addTag(tagModalDoc.id, payload).then(() => {
              queryClient.invalidateQueries({ queryKey: ["favorites"] });
              queryClient.invalidateQueries({ queryKey: ["favorite-tags"] });
              setTagModalDoc(null);
            });
          }}
        />
      )}
    </div>
  );
}

// =========================================================================
// SUB-COMPONENTS: MODALS
// =========================================================================

function EditNotesModal({
  doc,
  onClose,
  onSave,
}: {
  doc: FavoriteDocument;
  onClose: () => void;
  onSave: (notes: string | null) => void;
}) {
  const [notes, setNotes] = useState(doc.notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const maxLength = 5000;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    onSave(notes.trim() ? notes.trim() : null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-gray-100 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Edit3 className="h-4 w-4 text-primary-600" />
            Ghi chú tài liệu
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 rounded-full p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs text-gray-500 font-medium truncate">
          Tài liệu: <span className="text-gray-800">{doc.title}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <textarea
              rows={5}
              maxLength={maxLength}
              placeholder="Nhập ghi chú cá nhân, tóm tắt hoặc nội dung cần lưu ý..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs p-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white resize-none leading-relaxed"
            />
            <div className="flex justify-between text-[11px] text-gray-400 px-1">
              <span>Hỗ trợ tối đa 5000 ký tự</span>
              <span>
                {notes.length}/{maxLength}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {doc.notes ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onSave(null)}
                className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs rounded-xl"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Xóa ghi chú
              </Button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="rounded-xl text-xs"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting}
                className="rounded-xl text-xs"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : null}
                Lưu ghi chú
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddTagModal({
  doc,
  availableTags,
  onClose,
  onAddTag,
}: {
  doc: FavoriteDocument;
  availableTags: FavoriteTag[];
  onClose: () => void;
  onAddTag: (tagNameOrId: string | number) => void;
}) {
  const [inputVal, setInputVal] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentAssignedTagIds = (doc.favorite_tags || []).map((t) => t.id);
  const cleanInput = inputVal.trim().replace(/^#+/, "");

  const suggestions = availableTags.filter(
    (t) =>
      !currentAssignedTagIds.includes(t.id) &&
      (!cleanInput || t.name.toLowerCase().includes(cleanInput.toLowerCase())),
  );

  const handleSelectExisting = (tagId: number) => {
    setIsSubmitting(true);
    onAddTag(tagId);
  };

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cleanInput) return;
    setIsSubmitting(true);
    onAddTag(cleanInput);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-100 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary-600" />
            Gắn thẻ tài liệu
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 rounded-full p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs text-gray-500 font-medium truncate">
          Tài liệu: <span className="text-gray-800">{doc.title}</span>
        </p>

        <form onSubmit={handleCreateNew} className="space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Nhập tên thẻ mới (vd: #ToanCaoCap)..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="w-full pl-4 pr-20 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
            />
            {cleanInput && (
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-xl text-xs h-7 px-3"
              >
                + Thêm
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold text-gray-500">
              Gợi ý thẻ đã dùng:
            </span>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
              {suggestions.length > 0 ? (
                suggestions.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectExisting(t.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200 border border-gray-200 rounded-xl text-xs font-medium transition-all"
                  >
                    <span>#{t.name}</span>
                  </button>
                ))
              ) : (
                <p className="text-xs text-gray-400 italic">
                  {cleanInput
                    ? 'Nhấn "+ Thêm" để tạo mới thẻ này.'
                    : "Không còn thẻ gợi ý nào."}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-xl text-xs"
            >
              Đóng
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
