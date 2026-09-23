// frontend/digital-library/src/pages/library/admin/LibraryAdminSubmissions.tsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  Check,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  User,
  GraduationCap,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { libraryService } from "@/services/libraryService";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatRelativeDate } from "@/utils/formatDate";
import type { Submission } from "@/types/library";

export function LibraryAdminSubmissions() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const isAdmin = user && ["faculty_admin", "school_admin", "system_admin"].includes(user.role);

  // States
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [page, setPage] = useState(1);
  const [rejectingSubmission, setRejectingSubmission] = useState<Submission | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Query submissions
  const { data: submissionData, isLoading } = useQuery({
    queryKey: ["library-admin-submissions", activeTab, page],
    queryFn: () =>
      libraryService.getAdminSubmissions({
        status: activeTab,
        page,
        page_size: 15,
      }),
    enabled: Boolean(isAdmin),
  });

  // Mutation: Approve
  const approveMutation = useMutation({
    mutationFn: (id: number) => libraryService.approveSubmission(id),
    onSuccess: (sub) => {
      queryClient.invalidateQueries({ queryKey: ["library-admin-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["library-faculties"] });
      setActionSuccessMsg(`Đã duyệt tài liệu "${sub.source_document_title}" vào kho học liệu!`);
      setTimeout(() => setActionSuccessMsg(null), 3500);
    },
    onError: () => {
      alert("Đã có lỗi xảy ra khi phê duyệt tài liệu. Vui lòng thử lại sau.");
    },
  });

  // Mutation: Reject
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      libraryService.rejectSubmission(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["library-admin-submissions"] });
      setRejectingSubmission(null);
      setRejectReason("");
      setActionSuccessMsg("Đã từ chối tài liệu và gửi phản hồi cho người đóng góp.");
      setTimeout(() => setActionSuccessMsg(null), 3500);
    },
    onError: () => {
      setRejectError("Không thể từ chối tài liệu. Vui lòng kiểm tra lại.");
    },
  });

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center p-6">
        <Shield className="h-12 w-12 text-red-500 mb-3" />
        <h2 className="text-xl font-bold text-gray-900">Không có quyền truy cập</h2>
        <p className="mt-1 text-sm text-gray-500 max-w-sm">
          Bạn cần quyền Quản trị viên Khoa hoặc Quản trị viên Hệ thống để duyệt tài liệu.
        </p>
        <Button variant="primary" className="mt-4" onClick={() => navigate("/library")}>
          Về Kho học liệu
        </Button>
      </div>
    );
  }

  const handleApprove = (sub: Submission) => {
    if (window.confirm(`Duyệt tài liệu "${sub.source_document_title}" vào môn ${sub.subject_name}?`)) {
      approveMutation.mutate(sub.id);
    }
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingSubmission) return;
    if (rejectReason.trim().length < 5) {
      setRejectError("Vui lòng nhập lý do từ chối chi tiết (tối thiểu 5 ký tự).");
      return;
    }
    setRejectError(null);
    rejectMutation.mutate({
      id: rejectingSubmission.id,
      reason: rejectReason.trim(),
    });
  };

  const submissions = submissionData?.items || [];
  const total = submissionData?.total || 0;
  const totalPages = submissionData?.total_pages || 1;

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">
              Quản lý Phê duyệt Học liệu
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Kiểm tra và kiểm duyệt các tài liệu do sinh viên/giảng viên đóng góp
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/library")}
        >
          Xem Kho học liệu
        </Button>
      </div>

      {/* Action Success Alert */}
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

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          type="button"
          onClick={() => {
            setActiveTab("pending");
            setPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "pending"
              ? "bg-amber-500 text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Chờ duyệt</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("approved");
            setPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "approved"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>Đã duyệt</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("rejected");
            setPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "rejected"
              ? "bg-red-600 text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <XCircle className="h-4 w-4" />
          <span>Đã từ chối</span>
        </button>
      </div>

      {/* Submissions List */}
      <div className="flex flex-col gap-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : submissions.length > 0 ? (
          submissions.map((sub) => (
            <Card
              key={sub.id}
              className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-gray-200/90 shadow-sm hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start gap-3.5 min-w-0 flex-1">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 mt-1">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-gray-900 leading-snug">
                      {sub.source_document_title}
                    </h3>
                    {sub.doc_type && (
                      <span className="rounded bg-primary-50 px-2 py-0.5 text-[10px] font-bold text-primary-700">
                        {sub.doc_type}
                      </span>
                    )}
                    {sub.academic_year && (
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                        {sub.academic_year}
                      </span>
                    )}
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <GraduationCap className="h-3.5 w-3.5 text-gray-400" />
                      <span className="font-semibold text-gray-700">{sub.faculty_name}</span>
                      <span>›</span>
                      <span className="font-semibold text-primary-700">{sub.subject_name}</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-gray-400" />
                      <span>{sub.submitter_name}</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      <span>{formatRelativeDate(sub.created_at || "")}</span>
                    </div>
                  </div>

                  {sub.note && (
                    <div className="mt-2.5 rounded-lg bg-gray-50 p-2 text-xs text-gray-700 border border-gray-100">
                      <span className="font-medium text-gray-500 mr-1">Ghi chú sinh viên:</span>
                      {sub.note}
                    </div>
                  )}

                  {sub.status === "rejected" && sub.reject_reason && (
                    <div className="mt-2.5 rounded-lg bg-red-50 p-2 text-xs text-red-700 border border-red-200 flex items-start gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-600 mt-0.5" />
                      <div>
                        <span className="font-semibold">Lý do từ chối:</span> {sub.reject_reason}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons for pending items */}
              {sub.status === "pending" && (
                <div className="flex items-center gap-2 shrink-0 md:self-center border-t md:border-t-0 pt-3 md:pt-0 border-gray-100">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 font-semibold"
                    onClick={() => {
                      setRejectingSubmission(sub);
                      setRejectReason("");
                      setRejectError(null);
                    }}
                    icon={<X className="h-4 w-4" />}
                  >
                    Từ chối
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="font-semibold"
                    onClick={() => handleApprove(sub)}
                    disabled={approveMutation.isPending}
                    icon={<Check className="h-4 w-4" />}
                  >
                    Phê duyệt
                  </Button>
                </div>
              )}
            </Card>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center bg-white">
            <CheckCircle2 className="mx-auto h-12 w-12 text-gray-300 mb-2" />
            <h3 className="text-base font-semibold text-gray-900">Không có yêu cầu nào</h3>
            <p className="text-sm text-gray-500 mt-1">
              {activeTab === "pending"
                ? "Hiện tại không có tài liệu nào đang chờ duyệt."
                : `Không có tài liệu nào trong danh mục ${activeTab === "approved" ? "đã duyệt" : "đã từ chối"}.`}
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-gray-200 bg-white p-4 rounded-xl text-sm text-gray-600 shadow-sm">
            <span>
              Trang {page} / {totalPages} • Tổng {total} yêu cầu
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
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Tiếp →
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Reject Reason Modal */}
      {rejectingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl animate-in fade-in zoom-in-95 overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="text-base font-bold text-gray-900">
                  Từ chối yêu cầu đóng góp
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectingSubmission(null)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 focus:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="p-6 space-y-4">
              <p className="text-xs text-gray-600">
                Tài liệu: <span className="font-bold text-gray-900">{rejectingSubmission.source_document_title}</span>
              </p>

              {rejectError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-600">
                  {rejectError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Lý do từ chối <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Nêu rõ lý do từ chối (vd: trùng lặp, chất lượng bản scan mờ, sai danh mục môn học...)"
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRejectingSubmission(null)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  size="sm"
                  disabled={rejectMutation.isPending}
                >
                  {rejectMutation.isPending ? "Đang xử lý..." : "Xác nhận từ chối"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default LibraryAdminSubmissions;
