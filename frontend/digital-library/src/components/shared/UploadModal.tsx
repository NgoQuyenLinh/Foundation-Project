// frontend/digital-library/src/components/shared/UploadModal.tsx

import { useState, useRef } from "react";
import { X, Upload, FileText, AlertCircle, Search, Plus, Check, ArrowLeft, Package } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";
import { mergeImagesToPdf } from "@/utils/pdfBuilder";
import { documentService } from "@/services/documentService";
import { groupService } from "@/services/groupService";
import { formatSize } from "@/utils/formatSize";

export interface TagItem {
  id: number;
  name: string;
  color?: string;
}

export interface UploadModalProps {
  onClose: () => void;
  availableTags?: TagItem[];
  onCreateTag?: (name: string, color?: string) => Promise<TagItem>;
  onUpload: (formData: FormData, selectedTagIds: number[]) => Promise<void>;
  onBatchUpload?: (formData: FormData) => Promise<void>;
  isUploading: boolean;
  groupId?: number | string;
}

const COLORS = [
  { hex: "#4CAF50", tw: "bg-green-500" },
  { hex: "#2196F3", tw: "bg-blue-500" },
  { hex: "#F59E0B", tw: "bg-amber-500" },
  { hex: "#9C27B0", tw: "bg-purple-500" },
  { hex: "#EF4444", tw: "bg-red-500" },
  { hex: "#06B6D4", tw: "bg-cyan-500" },
  { hex: "#F97316", tw: "bg-orange-500" },
  { hex: "#64748B", tw: "bg-slate-500" },
];

const ACCEPTED_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
];
const MAX_MB = 50;

export function UploadModal({
  onClose,
  availableTags = [],
  onCreateTag,
  onUpload,
  onBatchUpload,
  isUploading,
  groupId,
}: UploadModalProps) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const batchInputRef = useRef<HTMLInputElement>(null);

  // Tab mode
  const [uploadMode, setUploadMode] = useState<"single" | "batch">("single");

  // --- STATE TAB 1: SINGLE UPLOAD ---
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);

  const safeTags = availableTags ?? [];
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [newTagColor, setNewTagColor] = useState(COLORS[0].hex);
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  // --- STATE TAB 2: BATCH UPLOAD ---
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [bundleTitle, setBundleTitle] = useState("");
  const [bundleDescription, setBundleDescription] = useState("");
  const [batchStep, setBatchStep] = useState<"select" | "info">("select");
  const [selectedBatchTagIds, setSelectedBatchTagIds] = useState<number[]>([]);
  const [batchTagSearchQuery, setBatchTagSearchQuery] = useState("");
  const [batchNewTagColor, setBatchNewTagColor] = useState(COLORS[0].hex);
  const [isBatchCreatingTag, setIsBatchCreatingTag] = useState(false);
  const [isBatchUploading, setIsBatchUploading] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);

  // --- LOGIC SINGLE ---
  const processFiles = (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    setError(null);

    const newFiles = Array.from(selectedFiles);

    const invalid = newFiles.find((f) => !ACCEPTED_MIME.includes(f.type));
    if (invalid) return setError("Tồn tại định dạng file không được hỗ trợ.");

    const oversized = newFiles.find((f) => f.size > MAX_MB * 1024 * 1024);
    if (oversized) return setError(`File "${oversized.name}" vượt quá ${MAX_MB}MB.`);

    const allImages = newFiles.every((f) => f.type.startsWith("image/"));

    if (newFiles.length > 1 && !allImages) {
      return setError("Chỉ được tải lên nhiều file cùng lúc nếu tất cả đều là Hình ảnh (để gộp thành 1 PDF).");
    }

    if (newFiles.length === 1 && !newFiles[0].type.startsWith("image/")) {
      setFiles([newFiles[0]]);
      setTitle(newFiles[0].name.replace(/\.[^/.]+$/, ""));
    } else {
      const currentImages = files.filter((f) => f.type.startsWith("image/"));
      const combined = [...currentImages, ...newFiles];
      setFiles(combined);

      if (!title) {
        setTitle(combined.length === 1 ? combined[0].name.replace(/\.[^/.]+$/, "") : "Tai_Lieu_Anh_Gop");
      }
    }
  };

  const removeFile = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newArr = [...files];
    newArr.splice(index, 1);
    setFiles(newArr);
    if (newArr.length === 0) setTitle("");
  };

  const handleUploadSubmit = async () => {
    if (files.length === 0) return;
    try {
      setError(null);
      let fileToUpload: File = files[0];

      if (files[0].type.startsWith("image/") && files.length > 1) {
        setIsProcessingPdf(true);
        const pdfName = (title.trim() || "Tai_Lieu_Anh_Gop").replace(/\s+/g, "_") + ".pdf";
        fileToUpload = await mergeImagesToPdf(files, pdfName);
        setIsProcessingPdf(false);
      }

      const fd = new FormData();
      fd.append("file", fileToUpload);
      fd.append("title", title.trim() || fileToUpload.name);

      if (description.trim()) {
        fd.append("description", description.trim());
      }

      await onUpload(fd, selectedTagIds);
      onClose();
    } catch (err: any) {
      setIsProcessingPdf(false);
      setError(err?.response?.status === 409 ? "Tài liệu này đã tồn tại trong thư viện của bạn" : "Tải lên thất bại, vui lòng thử lại");
    }
  };

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) => prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]);
  };

  const filteredTags = safeTags.filter((tag) => tag.name.toLowerCase().includes(tagSearchQuery.toLowerCase()));
  const isExactMatch = safeTags.some((tag) => tag.name.toLowerCase() === tagSearchQuery.toLowerCase().trim());

  const handleCreateNewTag = async () => {
    const name = tagSearchQuery.trim();
    if (!name || !onCreateTag) return;
    setIsCreatingTag(true);
    try {
      const newTag = await onCreateTag(name, newTagColor);
      setSelectedTagIds((prev) => [...prev, newTag.id]);
      setTagSearchQuery("");
      setNewTagColor(COLORS[0].hex);
    } finally {
      setIsCreatingTag(false);
    }
  };

  // --- LOGIC BATCH ---
  const processBatchFiles = (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    setBatchError(null);

    const newFiles = Array.from(selectedFiles);
    const combined = [...batchFiles, ...newFiles];

    if (combined.length > 10) {
      setBatchError("Số lượng file đã chọn vượt quá tối đa 10 file. Vui lòng xóa bớt.");
    }
    setBatchFiles(combined);
  };

  const removeBatchFile = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newArr = [...batchFiles];
    newArr.splice(index, 1);
    setBatchFiles(newArr);
    if (newArr.length <= 10) {
      setBatchError(null);
    }
  };

  const toggleBatchTag = (tagId: number) => {
    setSelectedBatchTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const filteredBatchTags = safeTags.filter((tag) =>
    tag.name.toLowerCase().includes(batchTagSearchQuery.toLowerCase())
  );
  const isBatchExactMatch = safeTags.some(
    (tag) => tag.name.toLowerCase() === batchTagSearchQuery.toLowerCase().trim()
  );

  const handleCreateBatchNewTag = async () => {
    const name = batchTagSearchQuery.trim();
    if (!name || !onCreateTag) return;
    setIsBatchCreatingTag(true);
    try {
      const newTag = await onCreateTag(name, batchNewTagColor);
      setSelectedBatchTagIds((prev) => [...prev, newTag.id]);
      setBatchTagSearchQuery("");
      setBatchNewTagColor(COLORS[0].hex);
    } finally {
      setIsBatchCreatingTag(false);
    }
  };

  const handleBatchUploadSubmit = async () => {
    if (!bundleTitle.trim() || batchFiles.length === 0 || batchFiles.length > 10) return;
    try {
      setIsBatchUploading(true);
      setBatchError(null);

      const fd = new FormData();
      fd.append("bundle_title", bundleTitle.trim());
      if (bundleDescription.trim()) {
        fd.append("bundle_description", bundleDescription.trim());
      }
      fd.append("tag_ids", selectedBatchTagIds.join(","));
      batchFiles.forEach((file) => fd.append("files", file));

      if (onBatchUpload) {
        await onBatchUpload(fd);
      } else if (groupId) {
        await groupService.uploadBatchDocuments(Number(groupId), fd);
      } else {
        await documentService.uploadBatch(fd);
      }

      await queryClient.invalidateQueries({ queryKey: ["documents"] });
      if (groupId) {
        await queryClient.invalidateQueries({ queryKey: ["group-documents", groupId] });
      }
      onClose();
    } catch (err: any) {
      setIsBatchUploading(false);
      setBatchError(
        err?.response?.data?.detail || "Tải lên gói tài liệu thất bại, vui lòng thử lại."
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">
              {uploadMode === "single" ? "Tải tài liệu lên" : "Tải lên gói tài liệu (Bundle)"}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-gray-100 px-6 pt-3 pb-3 gap-2 shrink-0 bg-gray-50/60">
          <button
            type="button"
            onClick={() => setUploadMode("single")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm transition-all",
              uploadMode === "single"
                ? "bg-primary-50 text-primary-600 font-semibold shadow-xs"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100 font-medium"
            )}
          >
            Tài liệu đơn
          </button>
          <button
            type="button"
            onClick={() => setUploadMode("batch")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm transition-all",
              uploadMode === "batch"
                ? "bg-primary-50 text-primary-600 font-semibold shadow-xs"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100 font-medium"
            )}
          >
            Gói tài liệu
          </button>
        </div>

        {/* --- TAB 1: SINGLE UPLOAD --- */}
        {uploadMode === "single" && (
          <div className="flex flex-col gap-4 px-6 py-5 overflow-y-auto custom-scrollbar">
            {/* Drop zone */}
            <div
              onClick={() => inputRef.current?.click()}
              onDrop={(e) => {
                e.preventDefault();
                processFiles(e.dataTransfer.files);
              }}
              onDragOver={(e) => e.preventDefault()}
              className="cursor-pointer rounded-xl border-2 border-dashed border-gray-300 p-6 text-center hover:border-primary-400 hover:bg-primary-50 transition-colors"
            >
              <input
                ref={inputRef}
                type="file"
                multiple
                className="hidden"
                accept={ACCEPTED_MIME.join(",")}
                onChange={(e) => processFiles(e.target.files)}
              />

              {files.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-4">
                  <Upload className="h-10 w-10 text-gray-400" />
                  <p className="text-sm font-medium text-gray-700">
                    Kéo thả hoặc <span className="text-primary-600">chọn file</span>
                  </p>
                  <p className="text-xs text-gray-400">PDF, DOCX, hoặc NHIỀU ẢNH (để gộp thành PDF)</p>
                </div>
              )}

              {files.length === 1 && !files[0].type.startsWith("image/") && (
                <div className="flex flex-col items-center gap-2 py-4">
                  <FileText className="h-10 w-10 text-primary-600" />
                  <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{files[0].name}</p>
                  <p className="text-xs text-gray-400">{(files[0].size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              )}

              {files.length > 0 && files[0].type.startsWith("image/") && (
                <div className="w-full text-left">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Đã chọn {files.length} ảnh</span>
                    <span className="text-xs text-primary-600 font-semibold hover:underline">+ Thêm ảnh</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto py-2 custom-scrollbar">
                    {files.map((f, idx) => (
                      <div
                        key={idx}
                        className="relative h-20 w-20 shrink-0 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden group"
                      >
                        <img src={URL.createObjectURL(f)} alt="preview" className="h-full w-full object-cover" />
                        <button
                          onClick={(e) => removeFile(idx, e)}
                          className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-500 text-center">Các ảnh sẽ được tự động gộp thành 1 file PDF.</p>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 shrink-0">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tiêu đề</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tên tài liệu..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {/* Phần Tags kèm chọn màu tag mới */}
            <div>
              <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-gray-700">
                <span>Gắn nhãn dán (Tags)</span>
                <span className="text-xs font-normal text-gray-400">Đã chọn {selectedTagIds.length}</span>
              </label>
              <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3">
                <div className="relative mb-3">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={tagSearchQuery}
                    onChange={(e) => setTagSearchQuery(e.target.value)}
                    placeholder="Tìm hoặc tạo tag mới..."
                    className="w-full rounded-md border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                {tagSearchQuery.trim() !== "" && !isExactMatch && onCreateTag && (
                  <div className="mb-3 rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm">
                    <label className="mb-2 block text-xs font-semibold text-gray-700">
                      Màu sắc cho tag mới
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {COLORS.map((color) => {
                        const isSelected = newTagColor === color.hex;
                        return (
                          <button
                            key={color.hex}
                            type="button"
                            onClick={() => setNewTagColor(color.hex)}
                            className={cn(
                              `flex h-6 w-6 items-center justify-center rounded-full transition-transform hover:scale-110 ${color.tw}`,
                              isSelected
                                ? "ring-2 ring-gray-900 ring-offset-1"
                                : "ring-1 ring-black/10"
                            )}
                          >
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="max-h-32 overflow-y-auto pr-1 flex flex-wrap gap-2 custom-scrollbar">
                  {tagSearchQuery.trim() !== "" && !isExactMatch && onCreateTag && (
                    <button
                      type="button"
                      onClick={handleCreateNewTag}
                      disabled={isCreatingTag}
                      className="flex items-center gap-1 rounded-full border border-dashed border-primary-500 bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-100 transition-colors disabled:opacity-50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {isCreatingTag ? "Đang tạo..." : `Tạo mới "${tagSearchQuery.trim()}"`}
                    </button>
                  )}
                  {filteredTags.length > 0 ? (
                    filteredTags.map((tag) => {
                      const isSelected = selectedTagIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleTag(tag.id)}
                          className={cn(
                            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
                            isSelected
                              ? "bg-primary-600 text-white shadow-sm ring-1 ring-primary-600"
                              : "bg-white text-gray-600 border border-gray-200 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600"
                          )}
                        >
                          {tag.name}
                          {isSelected && <Check className="h-3 w-3" />}
                        </button>
                      );
                    })
                  ) : isExactMatch || tagSearchQuery.trim() === "" ? null : (
                    <div className="w-full text-center text-xs text-gray-500 py-2">Không tìm thấy tag phù hợp.</div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Mô tả <span className="font-normal text-gray-400">(tuỳ chọn)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả ngắn..."
                rows={2}
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 shrink-0 border-t border-gray-100 mt-2">
              <Button variant="outline" onClick={onClose} disabled={isUploading || isProcessingPdf}>
                Huỷ
              </Button>
              <Button
                variant="primary"
                disabled={files.length === 0 || isUploading || isProcessingPdf || isCreatingTag}
                onClick={handleUploadSubmit}
              >
                {isProcessingPdf ? "Đang xử lý ảnh..." : isUploading ? "Đang tải lên..." : "Tải lên"}
              </Button>
            </div>
          </div>
        )}

        {/* --- TAB 2: BATCH UPLOAD (BUNDLE) --- */}
        {uploadMode === "batch" && (
          <div className="flex flex-col gap-4 px-6 py-5 overflow-y-auto custom-scrollbar">
            {batchError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-600 shrink-0">
                <AlertCircle className="h-4 w-4 shrink-0" /> {batchError}
              </div>
            )}

            {/* BƯỚC 1: SELECT FILES */}
            {batchStep === "select" && (
              <div className="flex flex-col gap-4">
                <div
                  onClick={() => batchInputRef.current?.click()}
                  onDrop={(e) => {
                    e.preventDefault();
                    processBatchFiles(e.dataTransfer.files);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  className="cursor-pointer rounded-xl border-2 border-dashed border-gray-300 p-6 text-center hover:border-primary-400 hover:bg-primary-50 transition-colors"
                >
                  <input
                    ref={batchInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => processBatchFiles(e.target.files)}
                  />
                  <div className="flex flex-col items-center gap-2 py-4">
                    <div className="h-12 w-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                      <Upload className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold text-gray-800">
                      Chọn nhiều tài liệu <span className="text-primary-600">(tối đa 10 file)</span>
                    </p>
                    <p className="text-xs text-gray-400">Kéo thả vào đây hoặc nhấn để chọn các tài liệu cho gói</p>
                  </div>
                </div>

                {/* Danh sách file đã chọn */}
                {batchFiles.length > 0 && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3">
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold text-gray-700">
                      <span>
                        Danh sách file đã chọn ({batchFiles.length} file)
                      </span>
                      <button
                        type="button"
                        onClick={() => batchInputRef.current?.click()}
                        className="text-primary-600 hover:underline cursor-pointer"
                      >
                        + Thêm file
                      </button>
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {batchFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-gray-200/80 shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                            <span className="text-xs font-medium text-gray-800 truncate" title={file.name}>
                              {file.name}
                            </span>
                            <span className="text-[10px] text-gray-400 shrink-0">
                              ({formatSize(file.size)})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => removeBatchFile(idx, e)}
                            className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors shrink-0"
                            title="Xóa file"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer Bước 1 */}
                <div className="flex justify-end gap-2 pt-2 shrink-0 border-t border-gray-100 mt-2">
                  <Button variant="outline" onClick={onClose}>
                    Huỷ
                  </Button>
                  <Button
                    variant="primary"
                    disabled={batchFiles.length === 0 || batchFiles.length > 10}
                    onClick={() => {
                      if (!bundleTitle && batchFiles.length > 0) {
                        setBundleTitle(batchFiles[0].name.replace(/\.[^/.]+$/, "") + " (Gói)");
                      }
                      setBatchStep("info");
                    }}
                  >
                    Tiếp theo →
                  </Button>
                </div>
              </div>
            )}

            {/* BƯỚC 2: BUNDLE INFO */}
            {batchStep === "info" && (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Tên gói tài liệu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bundleTitle}
                    onChange={(e) => setBundleTitle(e.target.value)}
                    placeholder="Ví dụ: Bộ đề thi giữa kỳ, Tài liệu môn Toán..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Mô tả <span className="font-normal text-gray-400">(tuỳ chọn)</span>
                  </label>
                  <textarea
                    value={bundleDescription}
                    onChange={(e) => setBundleDescription(e.target.value)}
                    placeholder="Mô tả nội dung gói tài liệu..."
                    rows={3}
                    className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                {/* Tags áp dụng cho bundle */}
                <div>
                  <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-gray-700">
                    <span>Tags (áp dụng cho tất cả file trong gói)</span>
                    <span className="text-xs font-normal text-gray-400">Đã chọn {selectedBatchTagIds.length}</span>
                  </label>
                  <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3">
                    <div className="relative mb-3">
                      <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={batchTagSearchQuery}
                        onChange={(e) => setBatchTagSearchQuery(e.target.value)}
                        placeholder="Tìm hoặc tạo tag mới..."
                        className="w-full rounded-md border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </div>

                    {batchTagSearchQuery.trim() !== "" && !isBatchExactMatch && onCreateTag && (
                      <div className="mb-3 rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm">
                        <label className="mb-2 block text-xs font-semibold text-gray-700">
                          Màu sắc cho tag mới
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                          {COLORS.map((color) => {
                            const isSelected = batchNewTagColor === color.hex;
                            return (
                              <button
                                key={color.hex}
                                type="button"
                                onClick={() => setBatchNewTagColor(color.hex)}
                                className={cn(
                                  `flex h-6 w-6 items-center justify-center rounded-full transition-transform hover:scale-110 ${color.tw}`,
                                  isSelected
                                    ? "ring-2 ring-gray-900 ring-offset-1"
                                    : "ring-1 ring-black/10"
                                )}
                              >
                                {isSelected && <Check className="h-3 w-3 text-white" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="max-h-32 overflow-y-auto pr-1 flex flex-wrap gap-2 custom-scrollbar">
                      {batchTagSearchQuery.trim() !== "" && !isBatchExactMatch && onCreateTag && (
                        <button
                          type="button"
                          onClick={handleCreateBatchNewTag}
                          disabled={isBatchCreatingTag}
                          className="flex items-center gap-1 rounded-full border border-dashed border-primary-500 bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-100 transition-colors disabled:opacity-50"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {isBatchCreatingTag ? "Đang tạo..." : `Tạo mới "${batchTagSearchQuery.trim()}"`}
                        </button>
                      )}
                      {filteredBatchTags.length > 0 ? (
                        filteredBatchTags.map((tag) => {
                          const isSelected = selectedBatchTagIds.includes(tag.id);
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => toggleBatchTag(tag.id)}
                              className={cn(
                                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
                                isSelected
                                  ? "bg-primary-600 text-white shadow-sm ring-1 ring-primary-600"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              )}
                            >
                              {tag.name}
                              {isSelected && <Check className="h-3 w-3" />}
                            </button>
                          );
                        })
                      ) : isBatchExactMatch || batchTagSearchQuery.trim() === "" ? null : (
                        <div className="w-full text-center text-xs text-gray-500 py-2">Không tìm thấy tag phù hợp.</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Preview danh sách file sẽ upload */}
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">
                    Các tài liệu trong gói ({batchFiles.length}):
                  </p>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 rounded-xl bg-purple-50/30 border border-purple-100 custom-scrollbar">
                    {batchFiles.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 p-1.5 rounded-md bg-white border border-purple-100 text-xs text-gray-700 truncate shadow-2xs"
                        title={f.name}
                      >
                        <FileText className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                        <span className="truncate">{f.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Bước 2 */}
                <div className="flex justify-between items-center pt-2 shrink-0 border-t border-gray-100 mt-2">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setBatchStep("select")}
                    disabled={isBatchUploading}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" /> Quay lại
                  </Button>
                  <Button
                    variant="primary"
                    type="button"
                    disabled={
                      !bundleTitle.trim() ||
                      batchFiles.length === 0 ||
                      batchFiles.length > 10 ||
                      isBatchUploading ||
                      isBatchCreatingTag
                    }
                    onClick={handleBatchUploadSubmit}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {isBatchUploading ? (
                      "Đang tải lên gói..."
                    ) : (
                      <>
                        <Package className="h-4 w-4 mr-1.5" /> Tải lên gói
                      </>
                    )}
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