// frontend/digital-library/src/components/shared/ContributeModal.tsx

import { useState, useEffect } from "react";
import { X, Upload, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { libraryService } from "@/services/libraryService";
import type { Faculty, Subject } from "@/types/library";

export interface ContributeModalProps {
  documentId: number;
  documentTitle: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const DOC_TYPES = [
  "Giáo trình",
  "Đề thi",
  "Slide bài giảng",
  "Bài tập",
  "Tài liệu tham khảo",
  "Khác",
];

const ACADEMIC_YEARS = [
  "2024-2025",
  "2023-2024",
  "2022-2023",
  "2021-2022",
  "2020-2021",
];

export function ContributeModal({
  documentId,
  documentTitle,
  onClose,
  onSuccess,
}: ContributeModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingFaculties, setLoadingFaculties] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // Form State
  const [selectedFacultyId, setSelectedFacultyId] = useState<number | "">("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | "">("");
  const [selectedDocType, setSelectedDocType] = useState<string>("Giáo trình");
  const [academicYear, setAcademicYear] = useState<string>("2023-2024");
  const [note, setNote] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successSubmitted, setSuccessSubmitted] = useState(false);

  // Fetch faculties on mount
  useEffect(() => {
    let isMounted = true;
    setLoadingFaculties(true);
    libraryService
      .getFaculties()
      .then((data) => {
        if (isMounted) setFaculties(data);
      })
      .catch(() => {
        if (isMounted) setError("Không thể tải danh sách khoa.");
      })
      .finally(() => {
        if (isMounted) setLoadingFaculties(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch subjects when faculty changes
  useEffect(() => {
    if (!selectedFacultyId) {
      setSubjects([]);
      setSelectedSubjectId("");
      return;
    }
    let isMounted = true;
    setLoadingSubjects(true);
    libraryService
      .getSubjects(Number(selectedFacultyId))
      .then((data) => {
        if (isMounted) {
          setSubjects(data);
          if (data.length > 0) {
            setSelectedSubjectId(data[0].id);
          } else {
            setSelectedSubjectId("");
          }
        }
      })
      .catch(() => {
        if (isMounted) setError("Không thể tải danh sách môn học.");
      })
      .finally(() => {
        if (isMounted) setLoadingSubjects(false);
      });
    return () => {
      isMounted = false;
    };
  }, [selectedFacultyId]);

  const selectedFaculty = faculties.find((f) => f.id === Number(selectedFacultyId));
  const selectedSubject = subjects.find((s) => s.id === Number(selectedSubjectId));

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacultyId) {
      setError("Vui lòng chọn Khoa.");
      return;
    }
    if (!selectedSubjectId) {
      setError("Vui lòng chọn Môn học.");
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await libraryService.submit({
        source_document_id: documentId,
        subject_id: Number(selectedSubjectId),
        doc_type: selectedDocType,
        academic_year: academicYear,
        note: note.trim() || undefined,
      });
      setSuccessSubmitted(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err: unknown) {
      setError("Đã xảy ra lỗi khi gửi yêu cầu. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl animate-in fade-in zoom-in-95 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
              <Upload className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 leading-tight">
                Đóng góp vào Kho học liệu
              </h3>
              <p className="text-xs text-gray-500">Bước {step} / 2</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        {successSubmitted ? (
          <div className="p-8 text-center flex flex-col items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-3">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h4 className="text-lg font-bold text-gray-900">Gửi đóng góp thành công!</h4>
            <p className="mt-1 text-sm text-gray-500 max-w-sm">
              Yêu cầu của bạn đã được chuyển tới Ban quản trị khoa. Tài liệu sẽ hiển thị trong kho học liệu sau khi được duyệt.
            </p>
          </div>
        ) : (
          <div className="px-6 py-5">
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-600">
                {error}
              </div>
            )}

            {step === 1 ? (
              <form onSubmit={handleNext} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Tài liệu đóng góp
                  </label>
                  <p className="text-sm font-medium text-gray-900 bg-gray-50 p-2.5 rounded-lg border border-gray-200 truncate">
                    {documentTitle}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                      Khoa <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedFacultyId}
                      onChange={(e) => setSelectedFacultyId(e.target.value ? Number(e.target.value) : "")}
                      disabled={loadingFaculties}
                      className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      required
                    >
                      <option value="">-- Chọn Khoa --</option>
                      {faculties.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                      Môn học <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => setSelectedSubjectId(e.target.value ? Number(e.target.value) : "")}
                      disabled={!selectedFacultyId || loadingSubjects}
                      className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      required
                    >
                      <option value="">
                        {!selectedFacultyId
                          ? "-- Chọn khoa trước --"
                          : subjects.length === 0
                          ? "-- Không có môn học --"
                          : "-- Chọn Môn học --"}
                      </option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                      Loại tài liệu
                    </label>
                    <select
                      value={selectedDocType}
                      onChange={(e) => setSelectedDocType(e.target.value)}
                      className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    >
                      {DOC_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                      Năm học áp dụng
                    </label>
                    <select
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    >
                      {ACADEMIC_YEARS.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Ghi chú cho Quản trị viên (Tùy chọn)
                  </label>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Mô tả thêm về nội dung, giáo trình tương ứng hoặc kỳ học..."
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none"
                  />
                </div>

                <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!selectedFacultyId || !selectedSubjectId}
                    icon={<ArrowRight className="h-4 w-4" />}
                  >
                    Tiếp tục
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 space-y-2.5 text-sm">
                  <div className="flex justify-between py-1 border-b border-gray-200/60">
                    <span className="text-gray-500">Tài liệu:</span>
                    <span className="font-semibold text-gray-900 truncate max-w-[260px]">
                      {documentTitle}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-200/60">
                    <span className="text-gray-500">Khoa:</span>
                    <span className="font-medium text-gray-900">{selectedFaculty?.name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-200/60">
                    <span className="text-gray-500">Môn học:</span>
                    <span className="font-medium text-gray-900">{selectedSubject?.name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-200/60">
                    <span className="text-gray-500">Loại tài liệu:</span>
                    <span className="font-medium text-primary-700">{selectedDocType}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Năm học:</span>
                    <span className="font-medium text-gray-900">{academicYear}</span>
                  </div>
                  {note && (
                    <div className="pt-2 border-t border-gray-200/60">
                      <span className="text-gray-500 block text-xs mb-1">Ghi chú:</span>
                      <p className="text-xs text-gray-700 italic bg-white p-2 rounded border border-gray-200">
                        {note}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    Tài liệu sẽ được quản trị viên khoa kiểm tra và phê duyệt trước khi xuất hiện công khai trên Kho học liệu cộng đồng.
                  </span>
                </div>

                <div className="mt-6 flex justify-between gap-3 pt-3 border-t border-gray-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    icon={<ArrowLeft className="h-4 w-4" />}
                  >
                    Quay lại
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={submitting}
                    onClick={handleSubmit}
                    icon={<Upload className="h-4 w-4" />}
                  >
                    {submitting ? "Đang gửi..." : "Gửi đóng góp"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ContributeModal;
