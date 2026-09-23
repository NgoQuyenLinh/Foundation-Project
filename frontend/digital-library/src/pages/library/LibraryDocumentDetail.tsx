// frontend/digital-library/src/pages/library/LibraryDocumentDetail.tsx

import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  BookOpen,
  ArrowLeft,
  Download,
  BookmarkPlus,
  MessageSquare,
  Upload,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { PublicLayout } from "@/components/library/PublicLayout";
import { StarRating } from "@/components/shared/StarRating";
import { RatingCard } from "@/components/shared/RatingCard";
import { FileIcon } from "@/components/shared/FileIcon";
import { ContributeModal } from "@/components/shared/ContributeModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuthStore } from "@/stores/authStore";
import { libraryService } from "@/services/libraryService";
import { formatSize } from "@/utils/formatSize";
import { formatRelativeDate } from "@/utils/formatDate";

export function LibraryDocumentDetail() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();

  const docId = Number(documentId);

  // States
  const [ratingStars, setRatingStars] = useState<number>(5);
  const [ratingComment, setRatingComment] = useState<string>("");
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);

  // Query document detail
  const { data: document, isLoading, error } = useQuery({
    queryKey: ["library-document", docId],
    queryFn: () => libraryService.getDocument(docId),
    enabled: Boolean(docId),
  });

  // Query document ratings
  const { data: ratings = [] } = useQuery({
    queryKey: ["library-document-ratings", docId],
    queryFn: () => libraryService.getRatings(docId),
    enabled: Boolean(docId),
  });

  // Mutation: Save to personal
  const saveMutation = useMutation({
    mutationFn: () => libraryService.saveToPersonal(docId),
    onSuccess: (res) => {
      setActionSuccessMsg(res.message || "Đã lưu tài liệu vào kho cá nhân thành công!");
      setTimeout(() => setActionSuccessMsg(null), 3500);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: () => {
      alert("Đã có lỗi xảy ra khi lưu tài liệu. Vui lòng thử lại sau.");
    },
  });

  // Mutation: Submit rating
  const ratingMutation = useMutation({
    mutationFn: (payload: { stars: number; comment?: string }) =>
      libraryService.submitRating(docId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["library-document-ratings", docId] });
      queryClient.invalidateQueries({ queryKey: ["library-document", docId] });
      setShowRatingForm(false);
      setRatingComment("");
      setActionSuccessMsg("Đã gửi đánh giá của bạn!");
      setTimeout(() => setActionSuccessMsg(null), 3000);
    },
    onError: () => {
      alert("Đã có lỗi khi gửi đánh giá. Vui lòng thử lại sau.");
    },
  });

  // Mutation: Delete rating
  const deleteRatingMutation = useMutation({
    mutationFn: (ratingId: number) => libraryService.deleteRating(docId, ratingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["library-document-ratings", docId] });
      queryClient.invalidateQueries({ queryKey: ["library-document", docId] });
    },
  });

  const handleDownload = () => {
    const downloadUrl = libraryService.getDownloadUrl(docId);
    const link = window.document.createElement("a");
    link.href = downloadUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const handleSaveToPersonal = () => {
    if (!isAuthenticated) {
      sessionStorage.setItem("redirect_after_login", window.location.pathname);
      navigate("/login");
      return;
    }
    saveMutation.mutate();
  };

  const handleRatingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      sessionStorage.setItem("redirect_after_login", window.location.pathname);
      navigate("/login");
      return;
    }
    ratingMutation.mutate({
      stars: ratingStars,
      comment: ratingComment.trim() || undefined,
    });
  };

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="flex flex-col gap-6 animate-pulse">
          <div className="h-6 w-48 bg-gray-200 rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
            <div className="h-96 bg-gray-200 rounded-2xl" />
            <div className="h-96 bg-gray-200 rounded-2xl" />
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (error || !document) {
    return (
      <PublicLayout>
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 shadow-sm max-w-md mx-auto">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-3" />
          <h2 className="text-lg font-bold text-gray-900">Không tìm thấy tài liệu</h2>
          <p className="mt-1 text-sm text-gray-500">
            Tài liệu này không tồn tại hoặc đã bị gỡ khỏi kho học liệu cộng đồng.
          </p>
          <Button
            variant="primary"
            className="mt-6"
            onClick={() => navigate("/library")}
          >
            Về trang chủ Kho học liệu
          </Button>
        </div>
      </PublicLayout>
    );
  }

  const downloadUrl = libraryService.getDownloadUrl(docId);
  const userRating = ratings.find((r) => r.user_id === user?.id);

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
          {document.faculty_id ? (
            <Link to={`/library/faculty/${document.faculty_id}`} className="hover:text-primary-600 transition-colors">
              {document.faculty_name}
            </Link>
          ) : (
            <span>{document.faculty_name || "Khoa"}</span>
          )}
          <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          {document.subject_id ? (
            <Link to={`/library/subject/${document.subject_id}`} className="hover:text-primary-600 transition-colors">
              {document.subject_name}
            </Link>
          ) : (
            <span>{document.subject_name || "Môn học"}</span>
          )}
          <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-gray-900 font-semibold truncate max-w-[200px]">{document.title}</span>
        </nav>

        {/* Success Alert */}
        {actionSuccessMsg && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{actionSuccessMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionSuccessMsg(null)}
              className="text-emerald-600 hover:text-emerald-800 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
          {/* LEFT COLUMN: Preview & Reviews */}
          <div className="flex flex-col gap-6">
            {/* Header & Preview */}
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <FileIcon type={document.file_type || "pdf"} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {document.doc_type && (
                      <span className="rounded bg-primary-50 px-2.5 py-0.5 text-xs font-bold text-primary-700">
                        {document.doc_type}
                      </span>
                    )}
                    {document.academic_year && (
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {document.academic_year}
                      </span>
                    )}
                  </div>
                  <h1 className="mt-2 text-xl sm:text-2xl font-bold text-gray-900 leading-snug">
                    {document.title}
                  </h1>
                </div>
              </div>

              {document.description && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h3 className="text-xs font-bold uppercase text-gray-500 mb-1">Mô tả tài liệu</h3>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                    {document.description}
                  </p>
                </div>
              )}

              {/* Preview frame */}
              <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
                <div className="flex items-center justify-between border-b border-gray-200 bg-gray-100/70 px-4 py-2.5 text-xs text-gray-600">
                  <span className="font-medium">Xem trước tài liệu</span>
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-primary-600 hover:text-primary-700 font-semibold"
                  >
                    <span>Mở trong thẻ mới</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
                <iframe
                  src={downloadUrl}
                  title={document.title}
                  className="w-full h-[550px] border-none bg-white"
                />
              </div>
            </Card>

            {/* Reviews & Ratings Section */}
            <Card className="p-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary-600" />
                    Đánh giá & Bình luận
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {document.rating_count} đánh giá từ người học
                  </p>
                </div>

                {!showRatingForm && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (!isAuthenticated) {
                        sessionStorage.setItem("redirect_after_login", window.location.pathname);
                        navigate("/login");
                        return;
                      }
                      if (userRating) {
                        setRatingStars(userRating.stars);
                        setRatingComment(userRating.comment || "");
                      }
                      setShowRatingForm(true);
                    }}
                  >
                    {userRating ? "Sửa đánh giá của bạn" : "Viết đánh giá"}
                  </Button>
                )}
              </div>

              {/* Rating Summary Bar */}
              <div className="mt-4 flex items-center gap-6 rounded-xl bg-gray-50 p-4 border border-gray-100">
                <div className="text-center shrink-0 pr-4 border-r border-gray-200">
                  <div className="text-3xl font-extrabold text-gray-900">
                    {document.rating_avg > 0 ? document.rating_avg.toFixed(1) : "—"}
                  </div>
                  <StarRating value={document.rating_avg} size="sm" />
                  <span className="text-[11px] text-gray-400 block mt-1">
                    {document.rating_count} lượt đánh giá
                  </span>
                </div>

                <div className="text-xs text-gray-500 leading-relaxed">
                  Đánh giá giúp cộng đồng chọn lọc tài liệu chất lượng cao. Bạn có thể cho điểm sao và để lại nhận xét chi tiết.
                </div>
              </div>

              {/* Rating Form */}
              {showRatingForm && (
                <form onSubmit={handleRatingSubmit} className="mt-5 rounded-xl border border-primary-200 bg-primary-50/20 p-4 space-y-4 animate-in fade-in">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">
                      Chọn số sao <span className="text-red-500">*</span>
                    </label>
                    <StarRating value={ratingStars} onChange={setRatingStars} size="lg" showValue />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                      Nhận xét của bạn
                    </label>
                    <textarea
                      rows={3}
                      value={ratingComment}
                      onChange={(e) => setRatingComment(e.target.value)}
                      placeholder="Chia sẻ cảm nhận về nội dung, tính cập nhật và chất lượng của tài liệu này..."
                      className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none bg-white"
                    />
                  </div>

                  <div className="flex justify-end gap-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRatingForm(false)}
                    >
                      Hủy
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={ratingMutation.isPending}
                    >
                      {ratingMutation.isPending ? "Đang gửi..." : "Gửi đánh giá"}
                    </Button>
                  </div>
                </form>
              )}

              {/* Ratings List */}
              <div className="mt-6 space-y-3">
                {ratings.length > 0 ? (
                  ratings.map((rating) => (
                    <RatingCard
                      key={rating.id}
                      rating={rating}
                      isOwner={rating.user_id === user?.id}
                      onDelete={(rId) => {
                        if (window.confirm("Bạn có chắc muốn xóa đánh giá này?")) {
                          deleteRatingMutation.mutate(rId);
                        }
                      }}
                    />
                  ))
                ) : (
                  <p className="text-center py-6 text-xs text-gray-400 italic">
                    Chưa có bình luận nào. Hãy là người đầu tiên đánh giá tài liệu này!
                  </p>
                )}
              </div>
            </Card>
          </div>

          {/* RIGHT COLUMN: Sidebar Info & Actions */}
          <div className="flex flex-col gap-6 sticky top-20">
            <Card className="p-6">
              <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">
                Thông tin tài liệu
              </h3>

              <div className="mt-4 divide-y divide-gray-100 text-xs">
                <div className="py-2.5 flex justify-between gap-2">
                  <span className="text-gray-500">Khoa:</span>
                  <span className="font-semibold text-gray-900 text-right">
                    {document.faculty_name}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between gap-2">
                  <span className="text-gray-500">Môn học:</span>
                  <span className="font-semibold text-gray-900 text-right">
                    {document.subject_name}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between gap-2">
                  <span className="text-gray-500">Loại tài liệu:</span>
                  <span className="font-semibold text-primary-700 text-right">
                    {document.doc_type || "Chung"}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between gap-2">
                  <span className="text-gray-500">Năm học:</span>
                  <span className="font-medium text-gray-900 text-right">
                    {document.academic_year || "—"}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between gap-2">
                  <span className="text-gray-500">Đóng góp bởi:</span>
                  <span className="font-semibold text-gray-900 text-right">
                    {document.contributed_by}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between gap-2">
                  <span className="text-gray-500">Đánh giá:</span>
                  <span className="font-semibold text-gray-900 flex items-center gap-1">
                    ⭐ {document.rating_avg > 0 ? document.rating_avg.toFixed(1) : "Chưa có"} ({document.rating_count})
                  </span>
                </div>
                <div className="py-2.5 flex justify-between gap-2">
                  <span className="text-gray-500">Lượt tải về:</span>
                  <span className="font-medium text-gray-900">{document.download_count} lượt</span>
                </div>
                <div className="py-2.5 flex justify-between gap-2">
                  <span className="text-gray-500">Kích thước tệp:</span>
                  <span className="font-medium text-gray-900">{formatSize(document.file_size || 0)}</span>
                </div>
                <div className="py-2.5 flex justify-between gap-2">
                  <span className="text-gray-500">Đăng ngày:</span>
                  <span className="font-medium text-gray-900">{formatRelativeDate(document.created_at || "")}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-col gap-2.5">
                <Button
                  variant="primary"
                  className="w-full py-2.5 h-auto text-sm font-semibold"
                  onClick={handleDownload}
                  icon={<Download className="h-4 w-4" />}
                >
                  Tải xuống tài liệu
                </Button>

                <Button
                  variant="outline"
                  className="w-full py-2.5 h-auto text-sm font-semibold text-gray-700 hover:text-primary-600 border-gray-300"
                  onClick={handleSaveToPersonal}
                  disabled={saveMutation.isPending}
                  icon={<BookmarkPlus className="h-4 w-4 text-primary-600" />}
                >
                  {saveMutation.isPending ? "Đang lưu..." : "Lưu về kho cá nhân"}
                </Button>

                {isAuthenticated && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-gray-500 hover:text-primary-600 mt-1"
                    onClick={() => setIsContributeModalOpen(true)}
                    icon={<Upload className="h-3.5 w-3.5" />}
                  >
                    Đóng góp tài liệu tương tự
                  </Button>
                )}
              </div>
            </Card>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                document.subject_id
                  ? navigate(`/library/subject/${document.subject_id}`)
                  : navigate("/library")
              }
              icon={<ArrowLeft className="h-4 w-4" />}
              className="w-full"
            >
              Về danh sách môn học
            </Button>
          </div>
        </div>

        {/* Contribute Modal if clicked */}
        {isContributeModalOpen && (
          <ContributeModal
            documentId={docId}
            documentTitle={document.title}
            onClose={() => setIsContributeModalOpen(false)}
          />
        )}
      </div>
    </PublicLayout>
  );
}

export default LibraryDocumentDetail;
