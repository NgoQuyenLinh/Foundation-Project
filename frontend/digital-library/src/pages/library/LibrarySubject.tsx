// frontend/digital-library/src/pages/library/LibrarySubject.tsx

import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  BookOpen,
  ArrowLeft,
  Download,
  BookmarkPlus,
  FileText,
  Calendar,
  Layers,
  ArrowUpDown,
} from "lucide-react";
import { PublicLayout } from "@/components/library/PublicLayout";
import { StarRating } from "@/components/shared/StarRating";
import { FileIcon } from "@/components/shared/FileIcon";
import { ViewToggle, type ViewMode } from "@/components/shared/ViewToggle";
import { CardSkeleton } from "@/components/shared/CardSkeleton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuthStore } from "@/stores/authStore";
import { libraryService } from "@/services/libraryService";
import { formatSize } from "@/utils/formatSize";
import { formatRelativeDate } from "@/utils/formatDate";
import type { CommunityDocument } from "@/types/library";

const DOC_TYPE_TABS = [
  "Tất cả",
  "Giáo trình",
  "Đề thi",
  "Slide bài giảng",
  "Bài tập",
  "Khác",
];

const ACADEMIC_YEARS = [
  "Tất cả",
  "2024-2025",
  "2023-2024",
  "2022-2023",
  "2021-2022",
  "2020-2021",
];

export function LibrarySubject() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  const sId = Number(subjectId);

  // States
  const [activeTab, setActiveTab] = useState("Tất cả");
  const [selectedYear, setSelectedYear] = useState("Tất cả");
  const [sortBy, setSortBy] = useState<"newest" | "popular" | "rating">("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [page, setPage] = useState(1);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Query documents
  const { data: docData, isLoading } = useQuery({
    queryKey: ["library-subject-documents", sId, page, sortBy, activeTab, selectedYear],
    queryFn: () =>
      libraryService.getDocuments(sId, {
        page,
        page_size: 12,
        sort: sortBy,
        doc_type: activeTab,
        academic_year: selectedYear,
      }),
    enabled: Boolean(sId),
  });

  // Save to personal mutation
  const saveMutation = useMutation({
    mutationFn: (docId: number) => libraryService.saveToPersonal(docId),
    onSuccess: (res) => {
      setActionSuccessMessage(res.message || "Đã lưu tài liệu về kho cá nhân thành công!");
      setTimeout(() => setActionSuccessMessage(null), 3000);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: () => {
      alert("Đã có lỗi xảy ra khi lưu tài liệu. Vui lòng thử lại sau.");
    },
  });

  const handleSaveToPersonal = (doc: CommunityDocument, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!isAuthenticated) {
      sessionStorage.setItem("redirect_after_login", window.location.pathname);
      navigate("/login");
      return;
    }
    saveMutation.mutate(doc.id);
  };

  const handleDownload = (doc: CommunityDocument, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const downloadUrl = libraryService.getDownloadUrl(doc.id);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const firstDoc = docData?.items?.[0];
  const subjectName = firstDoc?.subject_name || `Môn học #${sId}`;
  const facultyName = firstDoc?.faculty_name || "Khoa";
  const facultyId = firstDoc?.faculty_id;

  const totalDocs = docData?.total || 0;
  const totalDownloads = (docData?.items || []).reduce((acc, d) => acc + d.download_count, 0);
  const avgRatings = (docData?.items || []).filter((d) => d.rating_avg > 0);
  const subjectAvgRating =
    avgRatings.length > 0
      ? avgRatings.reduce((acc, d) => acc + d.rating_avg, 0) / avgRatings.length
      : 0;

  return (
    <PublicLayout>
      <div className="flex flex-col gap-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-medium text-gray-500 flex-wrap">
          <Link to="/library" className="hover:text-primary-600 transition-colors flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            Kho học liệu
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          {facultyId ? (
            <Link to={`/library/faculty/${facultyId}`} className="hover:text-primary-600 transition-colors">
              {facultyName}
            </Link>
          ) : (
            <span>{facultyName}</span>
          )}
          <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-gray-900 font-semibold truncate">{subjectName}</span>
        </nav>

        {/* Success alert message */}
        {actionSuccessMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 flex items-center justify-between animate-in fade-in">
            <span>{actionSuccessMessage}</span>
            <button
              type="button"
              onClick={() => setActionSuccessMessage(null)}
              className="text-emerald-600 hover:text-emerald-800 text-xs font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Header Subject Details */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                <BookOpen className="h-7 w-7" />
              </div>
              <div>
                <span className="rounded bg-primary-100 px-2 py-0.5 text-xs font-bold text-primary-700 uppercase">
                  {facultyName}
                </span>
                <h1 className="mt-1 text-2xl font-bold text-gray-900 leading-tight">
                  {subjectName}
                </h1>
                {/* Stats Bar */}
                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-gray-400" />
                    <span>{totalDocs} tài liệu</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1.5">
                    <Download className="h-3.5 w-3.5 text-gray-400" />
                    <span>{totalDownloads} lượt tải</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1.5">
                    <StarRating value={subjectAvgRating} size="sm" showValue={subjectAvgRating > 0} />
                  </div>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => (facultyId ? navigate(`/library/faculty/${facultyId}`) : navigate("/library"))}
              icon={<ArrowLeft className="h-4 w-4" />}
            >
              Về danh sách môn
            </Button>
          </div>
        </div>

        {/* Filter and Control Bar */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex flex-col gap-4">
          {/* Tabs loại tài liệu */}
          <div className="flex gap-2 overflow-x-auto pb-1 border-b border-gray-100">
            {DOC_TYPE_TABS.map((tab) => {
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab);
                    setPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    active
                      ? "bg-primary-600 text-white shadow-xs"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Secondary Controls: Năm học + Sắp xếp + ViewToggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Dropdown Năm học */}
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-gray-500 font-medium">Năm học:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-xs text-gray-800 font-medium focus:border-primary-500 focus:outline-none"
                >
                  {ACADEMIC_YEARS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort by */}
              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-gray-500 font-medium">Sắp xếp:</span>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as any);
                    setPage(1);
                  }}
                  className="h-8 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-xs text-gray-800 font-medium focus:border-primary-500 focus:outline-none"
                >
                  <option value="newest">Mới nhất</option>
                  <option value="popular">Tải nhiều nhất</option>
                  <option value="rating">Đánh giá cao nhất</option>
                </select>
              </div>
            </div>

            {/* ViewToggle */}
            <div className="ml-auto">
              <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
            </div>
          </div>
        </div>

        {/* Documents Grid / List */}
        <section className="flex flex-col gap-4">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <CardSkeleton key={i} variant="document" />
              ))}
            </div>
          ) : (docData?.items || []).length > 0 ? (
            viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {docData?.items.map((doc) => (
                  <Card
                    key={doc.id}
                    onClick={() => navigate(`/library/document/${doc.id}`)}
                    className="group relative flex flex-col justify-between rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm hover:-translate-y-1 hover:border-primary-400 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div>
                      {/* Top bar with file icon & doc type */}
                      <div className="flex items-start justify-between gap-2">
                        <FileIcon type={doc.file_type || "pdf"} />
                        <div className="flex flex-col items-end gap-1">
                          {doc.doc_type && (
                            <span className="rounded bg-primary-50 px-2 py-0.5 text-[10px] font-bold text-primary-700">
                              {doc.doc_type}
                            </span>
                          )}
                          {doc.academic_year && (
                            <span className="text-[10px] text-gray-400">
                              {doc.academic_year}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h3
                        className="mt-3 text-sm font-semibold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2 leading-snug"
                        title={doc.title}
                      >
                        {doc.title}
                      </h3>

                      <p className="mt-1 text-xs text-gray-400 line-clamp-1">
                        Bởi: <span className="font-medium text-gray-600">{doc.contributed_by}</span>
                      </p>
                    </div>

                    {/* Bottom Metadata & Actions */}
                    <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <StarRating value={doc.rating_avg} size="sm" showValue={doc.rating_avg > 0} count={doc.rating_count} />
                        <span>{formatSize(doc.file_size || 0)}</span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 pt-1">
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1 text-xs h-8"
                          onClick={(e) => handleDownload(doc, e)}
                          icon={<Download className="h-3.5 w-3.5" />}
                        >
                          Tải về
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5"
                          title="Lưu về kho cá nhân"
                          onClick={(e) => handleSaveToPersonal(doc, e)}
                        >
                          <BookmarkPlus className="h-4 w-4 text-primary-600" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                <div className="divide-y divide-gray-100">
                  {docData?.items.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => navigate(`/library/document/${doc.id}`)}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer gap-3"
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                        <FileIcon type={doc.file_type || "pdf"} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-gray-900 group-hover:text-primary-600 transition-colors truncate">
                              {doc.title}
                            </h3>
                            {doc.doc_type && (
                              <span className="rounded bg-primary-50 px-2 py-0.5 text-[10px] font-bold text-primary-700 shrink-0">
                                {doc.doc_type}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                            <span>Đóng góp: {doc.contributed_by}</span>
                            <span>•</span>
                            <span>{formatRelativeDate(doc.created_at || "")}</span>
                            <span>•</span>
                            <span>{formatSize(doc.file_size || 0)}</span>
                            <span>•</span>
                            <span>{doc.download_count} lượt tải</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <StarRating value={doc.rating_avg} size="sm" showValue={doc.rating_avg > 0} count={doc.rating_count} />
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs font-medium"
                            onClick={(e) => handleSaveToPersonal(doc, e)}
                            icon={<BookmarkPlus className="h-3.5 w-3.5 text-primary-600" />}
                          >
                            Lưu
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            className="h-8 text-xs font-medium"
                            onClick={(e) => handleDownload(doc, e)}
                            icon={<Download className="h-3.5 w-3.5" />}
                          >
                            Tải
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center bg-white">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-2" />
              <h3 className="text-base font-semibold text-gray-900">Chưa có tài liệu nào</h3>
              <p className="text-sm text-gray-500 mt-1">
                Không tìm thấy tài liệu phù hợp với bộ lọc đã chọn trong môn học này.
              </p>
            </div>
          )}

          {/* Pagination */}
          {docData && docData.total_pages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-gray-200 bg-white p-4 rounded-xl text-sm text-gray-600 shadow-sm">
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
      </div>
    </PublicLayout>
  );
}

export default LibrarySubject;
