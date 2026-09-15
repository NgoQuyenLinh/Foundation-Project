// frontend/digital-library/src/components/shared/DocumentDetail.tsx

// ==========================================
// 1. IMPORTS
// ==========================================
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Download,
  Share2,
  Star,
  FolderInput,
  Edit2,
  Trash2,
  Plus,
  X,
  Search,
  Check,
  ExternalLink,
} from "lucide-react";

// UI Components
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FileIcon } from "@/components/shared/FileIcon";

// Services & Utils
import { documentService } from "@/services/documentService";
import { tagService } from "@/services/tagService";
import { formatSize } from "@/utils/formatSize";
import { formatRelativeDate } from "@/utils/formatDate";
import { cn } from "@/utils/cn";

// ==========================================
// 2. TYPES & CONSTANTS
// ==========================================
export interface TagType {
  id: number;
  name: string;
  color?: string;
}

type TabKey = "detail" | "content" | "description" | "note" | "activity";

const TABS: { key: TabKey; label: string }[] = [
  { key: "detail", label: "Bản xem trước" },
  { key: "content", label: "Nội dung OCR" },
  { key: "description", label: "Mô tả" },
  { key: "note", label: "Ghi chú" },
  { key: "activity", label: "Hoạt động" },
];

const COLORS = [
  { hex: "#2E7D32", tw: "bg-[#2E7D32]" },
  { hex: "#1976D2", tw: "bg-[#1976D2]" },
  { hex: "#F57C00", tw: "bg-[#F57C00]" },
  { hex: "#7B1FA2", tw: "bg-[#7B1FA2]" },
  { hex: "#D32F2F", tw: "bg-[#D32F2F]" },
  { hex: "#00BCD4", tw: "bg-[#00BCD4]" },
  { hex: "#E64A19", tw: "bg-[#E64A19]" },
  { hex: "#607D8B", tw: "bg-[#607D8B]" },
];

const FILE_TYPE_LABELS: Record<string, string> = {
  "application/pdf": "PDF Document",
  "application/msword": "Word Document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "Word Document",
  "application/vnd.ms-powerpoint": "PowerPoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "PowerPoint",
  "image/jpeg": "Hình ảnh JPEG",
  "image/png": "Hình ảnh PNG",
  "text/plain": "Văn bản thuần",
};

const MIME_TO_ICON_TYPE: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "docx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.ms-powerpoint": "pptx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
  "image/jpeg": "image",
  "image/png": "image",
};

export interface DocumentDetailPermissions {
  canEdit?: boolean;
  canDelete?: boolean;
  canManageTags?: boolean;
}

export interface SharedDocumentDetailProps {
  documentId?: number;
  fetchDocumentFn?: (id: number) => Promise<any>;
  updateDocumentFn?: (id: number, data: { title: string }) => Promise<any>;
  deleteDocumentFn?: (id: number) => Promise<any>;
  updateTagsFn?: (id: number, tagIds: number[]) => Promise<any>;
  removeTagFn?: (id: number, tagId: number) => Promise<any>;
  queryKeyPrefix?: string[];
  permissions?: DocumentDetailPermissions;
  backUrl?: string;
  onBack?: () => void;
  onDeleteSuccess?: () => void;
}

// ==========================================
// 3. SUB-COMPONENTS
// ==========================================
interface InfoRowProps {
  label: string;
  value: string;
}
function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 shrink-0 w-24">{label}</span>
      <span className="text-sm font-semibold text-gray-900 text-right">
        {value}
      </span>
    </div>
  );
}

interface StatItemProps {
  label: string;
  value: number;
}
function StatItem({ label, value }: StatItemProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-lg font-bold text-gray-900">{value}</span>
    </div>
  );
}

// Sub-component Tab Detail (Bản xem trước)
function TabDetail({ doc, fileUrl }: { doc: any; fileUrl: string }) {
  const isImage = doc.file_type?.startsWith("image/");
  const isPdf = doc.file_type === "application/pdf";
  const canPreview = isImage || isPdf;

  const thumbnailUrl = doc.thumbnail_path
    ? `${import.meta.env.VITE_API_URL}/${doc.thumbnail_path}`
    : null;

  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-gray-100 p-2 min-h-[500px] border border-gray-200">
      {canPreview ? (
        isImage ? (
          <img
            src={fileUrl}
            alt={doc.title}
            className="max-w-full max-h-[700px] rounded object-contain shadow-sm"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <iframe
            src={fileUrl}
            className="w-full h-[700px] rounded shadow-sm bg-white"
            title={doc.title}
          />
        )
      ) : (
        <div className="flex flex-col items-center justify-center space-y-4">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={doc.title}
              className="h-60 rounded object-contain shadow"
            />
          ) : (
            <div className="flex h-40 w-32 flex-col items-center justify-center rounded-xl bg-gradient-to-b from-gray-400 to-gray-500 text-white shadow">
              <span className="text-xs font-bold text-center px-2">
                {doc.title}
              </span>
            </div>
          )}
          <p className="text-sm text-gray-500 max-w-sm text-center">
            Trình duyệt không hỗ trợ xem trước trực tiếp định dạng này. Vui lòng nhấn "Mở trong thẻ mới" hoặc "Tải xuống" để xem.
          </p>
        </div>
      )}
    </div>
  );
}

// Sub-component Tab Content (Nội dung OCR)
function TabContent({ content }: { content: string }) {
  if (!content) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-center">
        <p className="text-sm text-gray-500">Tài liệu này chưa có dữ liệu văn bản (OCR).</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50/80 rounded-xl p-5 border border-gray-100 max-h-[700px] overflow-y-auto custom-scrollbar">
      <p className="text-sm text-gray-700 leading-loose whitespace-pre-wrap font-serif">
        {content}
      </p>
    </div>
  );
}

function TabDescription({ description }: { description: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Mô tả chi tiết
      </h3>
      <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

function TabNote() {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Ghi chú cá nhân
      </h3>
      <textarea
        className="w-full rounded-lg border border-gray-200 p-3 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none"
        rows={6}
        placeholder="Nhập ghi chú của bạn về tài liệu này..."
      />
    </div>
  );
}

function TabActivity() {
  const activities = [
    { action: "Tải lên", time: "10 phút trước", user: "Tôi" },
    { action: "Xem", time: "2 giờ trước", user: "Nguyễn Văn A" },
    { action: "Tải xuống", time: "Hôm qua", user: "Trần Thị B" },
  ];
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Lịch sử hoạt động
      </h3>
      {activities.map((a, i) => (
        <div
          key={i}
          className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0"
        >
          <div>
            <span className="font-medium text-gray-800">{a.user}</span>
            <span className="text-gray-500">
              {" "}
              đã {a.action.toLowerCase()} tài liệu
            </span>
          </div>
          <span className="text-xs text-gray-400">{a.time}</span>
        </div>
      ))}
    </div>
  );
}

// ==========================================
// 4. MAIN COMPONENT
// ==========================================
export function DocumentDetail(props: SharedDocumentDetailProps = {}) {
  const {
    documentId: propDocumentId,
    fetchDocumentFn = documentService.getById,
    updateDocumentFn = documentService.update,
    deleteDocumentFn = documentService.delete,
    updateTagsFn = documentService.updateTags,
    removeTagFn = documentService.removeTag,
    queryKeyPrefix = ["document"],
    permissions = {},
    backUrl = "/personal/documents",
    onBack,
    onDeleteSuccess,
  } = props;

  const canEdit = permissions.canEdit ?? true;
  const canDelete = permissions.canDelete ?? true;
  const canManageTags = permissions.canManageTags ?? true;

  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const id = propDocumentId ?? Number(params.id);

  const [activeTab, setActiveTab] = useState<TabKey>("detail");

  // States cho quản lý Tag
  const [selectedTags, setSelectedTags] = useState<TagType[]>([]);
  const [originalTags, setOriginalTags] = useState<TagType[]>([]);
  const [isTagEditorOpen, setIsTagEditorOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0].hex);

  const [isRenaming, setIsRenaming] = useState(false);
  const [tempTitle, setTempTitle] = useState("");

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backUrl) {
      navigate(backUrl);
    } else {
      navigate(-1);
    }
  };

  // --- QUERIES & MUTATIONS ---
  const {
    data: doc,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [...queryKeyPrefix, id],
    queryFn: () => fetchDocumentFn(id),
    enabled: !isNaN(id) && id > 0,
  });

  // Mutation cập nhật tên tài liệu
  const renameMutation = useMutation({
    mutationFn: (newTitle: string) => updateDocumentFn(id, { title: newTitle }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: [...queryKeyPrefix, id] });
      setIsRenaming(false);
    },
    onError: (error) => {
      console.error("Lỗi khi đổi tên tài liệu:", error);
    },
  });

  const handleStartRename = () => {
    if (!canEdit) return;
    setTempTitle(doc?.title || "");
    setIsRenaming(true);
  };

  const handleConfirmRename = () => {
    const trimmed = tempTitle.trim();
    if (trimmed && trimmed !== doc?.title) {
      renameMutation.mutate(trimmed);
    } else {
      setIsRenaming(false);
    }
  };

  // Lấy danh sách Tag từ DB
  const {
    data: allTags = [],
    isLoading: isLoadingTags,
  } = useQuery<TagType[]>({
    queryKey: ["all-tags"],
    queryFn: () => tagService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!doc) return;

    const tags: TagType[] = Array.isArray(doc.tags)
      ? doc.tags.map((tag: any) => ({
          id: Number(tag.id),
          name: tag.name,
          color: tag.color,
        }))
      : [];

    setSelectedTags(tags);
    setOriginalTags(tags);
  }, [doc]);

  const deleteMutation = useMutation({
    mutationFn: () => deleteDocumentFn(id),
    onSuccess: () => {
      if (onDeleteSuccess) {
        onDeleteSuccess();
      } else {
        navigate(backUrl);
      }
    },
  });

  // API TẠO TAG MỚI
  const createTagMutation = useMutation({
    mutationFn: (newTag: { name: string; color: string }) =>
      tagService.create(newTag),

    onSuccess: async (createdTag) => {
      setSelectedTags((prev) => {
        const exists = prev.some((tag) => tag.id === createdTag.id);
        if (exists) return prev;
        return [...prev, createdTag];
      });

      queryClient.setQueryData<TagType[]>(["all-tags"], (currentTags = []) => {
        const exists = currentTags.some((tag) => tag.id === createdTag.id);
        if (exists) return currentTags;
        return [...currentTags, createdTag];
      });

      setTagSearchQuery("");
      setSelectedColor(COLORS[0].hex);
    },
    onError: (error: any) => {
      console.error("Không thể tạo tag:", error);
      alert(error?.message || "Không thể tạo nhãn dán. Vui lòng thử lại.");
    },
  });

  // API LƯU TAGS CHO DOCUMENT
  const saveTagsMutation = useMutation({
    mutationFn: (tagIds: number[]) => {
      if (!id) {
        throw new Error("Không tìm thấy document ID");
      }
      return updateTagsFn(id, tagIds);
    },

    onSuccess: async (updatedDocument) => {
      const savedTags = updatedDocument?.tags ?? [];

      setSelectedTags(savedTags);
      setOriginalTags(savedTags);

      queryClient.setQueryData([...queryKeyPrefix, id], updatedDocument);

      await queryClient.invalidateQueries({
        queryKey: [...queryKeyPrefix, id],
      });

      setIsTagEditorOpen(false);
      setTagSearchQuery("");
    },

    onError: (error: any) => {
      console.error("Không thể lưu tags:", error);
      alert(
        error?.response?.data?.detail ||
          "Không thể lưu nhãn dán. Vui lòng thử lại.",
      );
    },
  });

  // --- TAG HANDLERS ---
  const removeTagMutation = useMutation({
    mutationFn: (tagId: number) => {
      if (!id) {
        throw new Error("Không tìm thấy document ID");
      }
      return removeTagFn(id, tagId);
    },

    onSuccess: async (updatedDocument) => {
      const updatedTags: TagType[] = Array.isArray(updatedDocument?.tags)
        ? updatedDocument.tags.map((tag: any) => ({
            id: Number(tag.id),
            name: tag.name,
            color: tag.color,
          }))
        : [];

      setSelectedTags(updatedTags);
      setOriginalTags(updatedTags);

      queryClient.setQueryData([...queryKeyPrefix, id], updatedDocument);

      await queryClient.invalidateQueries({
        queryKey: [...queryKeyPrefix, id],
      });
    },

    onError: (error: any) => {
      console.error("Không thể xóa tag:", error);
      alert(
        error?.response?.data?.detail ||
          "Không thể xóa nhãn dán. Vui lòng thử lại.",
      );
    },
  });

  const removeTag = (tagId: number) => {
    if (!id) {
      console.error("Document ID không hợp lệ");
      return;
    }

    if (removeTagMutation.isPending) {
      return;
    }

    removeTagMutation.mutate(tagId);
  };

  const toggleTag = (tag: TagType) => {
    setSelectedTags((prev) => {
      const exists = prev.some((item) => item.id === tag.id);
      if (exists) return prev.filter((item) => item.id !== tag.id);
      return [...prev, tag];
    });
  };

  const handleCreateNewTag = () => {
    if (tagSearchQuery.trim() === "") return;
    createTagMutation.mutate({
      name: tagSearchQuery.trim(),
      color: selectedColor,
    });
  };

  const handleSaveTags = () => {
    if (!id) {
      console.error("Document ID không hợp lệ");
      return;
    }
    const tagIds = selectedTags
      .map((tag) => Number(tag.id))
      .filter((tagId) => Number.isInteger(tagId));

    saveTagsMutation.mutate(tagIds);
  };

  // Derived state cho Tag Popover
  const selectedTagIds = selectedTags.map((t) => t.id);
  const filteredTags = allTags.filter((t) =>
    t.name.toLowerCase().includes(tagSearchQuery.toLowerCase()),
  );
  const isExactMatch = allTags.some(
    (t) => t.name.toLowerCase() === tagSearchQuery.toLowerCase().trim(),
  );

  // --- LOADING / ERROR STATES ---
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-6 w-24 rounded bg-gray-200 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div className="h-96 rounded-xl bg-gray-200 animate-pulse" />
          <div className="h-96 rounded-xl bg-gray-200 animate-pulse" />
        </div>
      </div>
    );
  }

  if (isError || !doc) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-gray-500">Không tìm thấy tài liệu.</p>
        <button
          onClick={handleBack}
          className="text-sm text-primary-600 hover:underline"
        >
          ← Quay lại
        </button>
      </div>
    );
  }

  // --- DATA MAPPING ---
  const fileTypeLabel =
    FILE_TYPE_LABELS[doc.file_type ?? ""] ?? doc.file_type ?? "Không xác định";
  const iconType = MIME_TO_ICON_TYPE[doc.file_type ?? ""] ?? "default";
  const sizeLabel = formatSize(doc.file_size ?? 0);
  const uploadedAt = formatRelativeDate(doc.created_at);
  const fileDownloadUrl = doc.file_path
    ? `${import.meta.env.VITE_API_URL}/${doc.file_path}`
    : "#";

  return (
    <div className="flex flex-col gap-6 pb-10">
      <button
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" /> Quay lại
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        {/* ── Left Column: Preview & Content ── */}
        <Card className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <FileIcon
              type={iconType}
              className="h-12 w-12 shrink-0"
              iconClassName="h-6 w-6"
            />
            <div className="min-w-0 flex-1">
              {isRenaming && canEdit ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleConfirmRename();
                      if (e.key === "Escape") setIsRenaming(false);
                    }}
                    autoFocus
                    className="w-full text-xl font-bold text-gray-900 rounded-lg border border-primary-500 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white shadow-sm"
                  />
                  <button
                    onClick={handleConfirmRename}
                    disabled={renameMutation.isPending}
                    className="p-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors shrink-0"
                    title="Lưu"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setIsRenaming(false)}
                    className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors shrink-0"
                    title="Hủy"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <h1 className="text-2xl font-bold text-gray-900 leading-snug truncate">
                  {doc.title}
                </h1>
              )}
              <p className="text-sm text-gray-400 mt-1">
                Dung lượng: {sizeLabel} &nbsp;•&nbsp; Ngày tải: {uploadedAt}
              </p>
            </div>
          </div>

          <div className="flex items-center border-b border-gray-200 -mx-5 px-5 gap-6">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "pb-3 text-sm font-medium transition-colors focus:outline-none",
                  activeTab === tab.key
                    ? "border-b-2 border-primary-600 text-primary-600"
                    : "text-gray-500 hover:text-gray-900",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="pt-1">
            {activeTab === "detail" && (
              <TabDetail doc={doc} fileUrl={fileDownloadUrl} />
            )}
            {activeTab === "content" && <TabContent content={doc.content} />}
            {activeTab === "description" && (
              <TabDescription
                description={doc.description ?? "Chưa có mô tả."}
              />
            )}
            {activeTab === "note" && <TabNote />}
            {activeTab === "activity" && <TabActivity />}
          </div>
        </Card>

        {/* ── Right Column: Info & Actions ── */}
        <div className="flex flex-col gap-4">
          <Card>
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              Thông tin tệp
            </h2>
            <div>
              <InfoRow
                label="Tên tệp"
                value={
                  doc.title.length > 22
                    ? doc.title.slice(0, 22) + "…"
                    : doc.title
                }
              />
              <InfoRow label="Loại tệp" value={fileTypeLabel} />
              <InfoRow label="Dung lượng" value={sizeLabel} />
              <InfoRow label="Ngày tải lên" value={uploadedAt} />
            </div>

            {/* Tags Section */}
            <div className="mt-5 relative">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Nhãn dán
              </h3>
              <div className="flex flex-wrap items-center gap-1.5">
                {selectedTags.map((tag) => {
                  const baseColor = tag.color || "#2E7D32";
                  return (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border"
                      style={{
                        color: baseColor,
                        backgroundColor: `${baseColor}1A`,
                        borderColor: `${baseColor}40`,
                      }}
                    >
                      {tag.name}
                      {canManageTags && (
                        <button
                          type="button"
                          onClick={() => removeTag(tag.id)}
                          disabled={removeTagMutation.isPending}
                          className="opacity-60 hover:opacity-100 transition-opacity focus:outline-none disabled:opacity-30"
                          title="Xóa tag khỏi tài liệu"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  );
                })}

                {canManageTags && (
                  <button
                    onClick={() => {
                      if (!isTagEditorOpen) {
                        setOriginalTags([...selectedTags]);
                        setTagSearchQuery("");
                        setSelectedColor(COLORS[0].hex);
                      }
                      setIsTagEditorOpen((prev) => !prev);
                    }}
                    className={cn(
                      "inline-flex h-7 w-7 items-center justify-center rounded-full border border-dashed text-gray-400 transition-colors",
                      isTagEditorOpen
                        ? "border-primary-500 text-primary-600 bg-primary-50"
                        : "border-gray-300 hover:border-primary-500 hover:text-primary-600",
                    )}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* POPUP TAG EDITOR */}
              {isTagEditorOpen && canManageTags && (
                <div className="absolute top-full left-0 mt-3 w-80 bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-50 animate-in fade-in zoom-in-95">
                  <div className="mb-4">
                    <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-gray-700">
                      <span>Gắn nhãn dán (Tags)</span>
                      <span className="text-xs font-normal text-gray-400">
                        Đã chọn {selectedTagIds.length}
                      </span>
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

                      <div className="max-h-36 overflow-y-auto pr-1 flex flex-wrap gap-2 custom-scrollbar">
                        {isLoadingTags ? (
                          <div className="w-full text-center text-xs text-gray-500 py-2">
                            Đang tải nhãn dán...
                          </div>
                        ) : tagSearchQuery.trim() !== "" && !isExactMatch ? (
                          <button
                            type="button"
                            onClick={handleCreateNewTag}
                            disabled={createTagMutation.isPending}
                            className="flex items-center gap-1 rounded-full border border-dashed border-primary-500 bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-100 transition-colors disabled:opacity-50"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            {createTagMutation.isPending
                              ? "Đang tạo..."
                              : `Tạo mới "${tagSearchQuery.trim()}"`}
                          </button>
                        ) : null}

                        {filteredTags.length > 0
                          ? filteredTags.map((tag) => {
                              const isSelected = selectedTagIds.includes(
                                tag.id,
                              );
                              return (
                                <button
                                  key={tag.id}
                                  type="button"
                                  onClick={() => toggleTag(tag)}
                                  className={cn(
                                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
                                    isSelected
                                      ? "bg-primary-600 text-white shadow-sm ring-1 ring-primary-600"
                                      : "bg-white text-gray-600 border border-gray-200 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600",
                                  )}
                                >
                                  {tag.name}
                                  {isSelected && <Check className="h-3 w-3" />}
                                </button>
                              );
                            })
                          : (isExactMatch || tagSearchQuery.trim() === "") &&
                            !isLoadingTags && (
                              <div className="w-full text-center text-xs text-gray-500 py-2">
                                Không tìm thấy tag phù hợp.
                              </div>
                            )}
                      </div>
                    </div>
                  </div>

                  {tagSearchQuery.trim() !== "" && !isExactMatch && (
                    <div className="mb-4 pt-2 border-t border-gray-100">
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Màu sắc tag mới
                      </label>
                      <div className="flex flex-wrap items-center gap-3">
                        {COLORS.map((color) => {
                          const isSelected = selectedColor === color.hex;
                          return (
                            <button
                              key={color.hex}
                              type="button"
                              onClick={() => setSelectedColor(color.hex)}
                              className={cn(
                                `flex h-7 w-7 items-center justify-center rounded-full transition-transform hover:scale-110 ${color.tw}`,
                                isSelected
                                  ? "ring-2 ring-gray-900 ring-offset-2"
                                  : "ring-1 ring-black/10",
                              )}
                            >
                              {isSelected && (
                                <Check className="h-3.5 w-3.5 text-white" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                    <button
                      onClick={() => {
                        setSelectedTags([...originalTags]);
                        setTagSearchQuery("");
                        setSelectedColor(COLORS[0].hex);
                        setIsTagEditorOpen(false);
                      }}
                      className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      Huỷ bỏ
                    </button>
                    <Button
                      variant="primary"
                      className="h-8 text-xs px-4"
                      onClick={handleSaveTags}
                      disabled={
                        saveTagsMutation.isPending ||
                        createTagMutation.isPending
                      }
                    >
                      {saveTagsMutation.isPending
                        ? "Đang lưu..."
                        : "Lưu thay đổi"}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="mt-6 flex justify-around border-t border-gray-100 pt-4">
              <StatItem label="Lượt xem" value={0} />
              <div className="w-px bg-gray-100" />
              <StatItem label="Tải xuống" value={0} />
              <div className="w-px bg-gray-100" />
              <StatItem label="Đã chia sẻ" value={0} />
            </div>
          </Card>

          {/* Actions Card */}
          <Card className="flex flex-col gap-3">
            <a
              href={fileDownloadUrl}
              download={doc.title}
              target="_blank"
              rel="noreferrer"
              className="w-full block"
            >
              <Button
                variant="primary"
                className="w-full py-3 h-auto text-base"
                icon={<Download className="h-5 w-5" />}
              >
                Tải xuống tài liệu
              </Button>
            </a>

            <div className="flex flex-col mt-1">
              {[
                {
                  icon: ExternalLink,
                  label: "Mở trong thẻ mới",
                  onClick: () => window.open(fileDownloadUrl, "_blank"),
                  show: true,
                },
                {
                  icon: Share2,
                  label: "Chia sẻ tài liệu",
                  onClick: () => console.log("Chia sẻ"),
                  show: true,
                },
                {
                  icon: Star,
                  label: "Thêm vào yêu thích",
                  onClick: () => console.log("Yêu thích"),
                  show: true,
                },
                {
                  icon: FolderInput,
                  label: "Di chuyển tệp",
                  onClick: () => console.log("Di chuyển"),
                  show: true,
                },
                ...(canEdit
                  ? [
                      {
                        icon: Edit2,
                        label: renameMutation.isPending
                          ? "Đang lưu..."
                          : "Đổi tên tệp",
                        onClick: handleStartRename,
                        disabled: renameMutation.isPending,
                        show: true,
                      },
                    ]
                  : []),
              ]
                .filter((item) => item.show)
                .map(({ icon: Icon, label, onClick, disabled }) => (
                  <button
                    key={label}
                    disabled={disabled}
                    className="flex items-center gap-3 px-1 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                    onClick={onClick}
                  >
                    <Icon className="h-4 w-4 text-gray-500 shrink-0" />
                    {label}
                  </button>
                ))}

              {canDelete && (
                <div className="border-t border-gray-200 mt-1 pt-1">
                  <button
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Xóa tài liệu này? Bạn có thể khôi phục trong thùng rác.",
                        )
                      ) {
                        deleteMutation.mutate();
                      }
                    }}
                    className="flex items-center gap-3 px-1 py-2.5 text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4 shrink-0" />
                    {deleteMutation.isPending ? "Đang xóa..." : "Xóa tài liệu"}
                  </button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}