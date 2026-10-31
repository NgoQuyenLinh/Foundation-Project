// src/components/shared/documents/DocumentDetail/DocumentDetail.types.ts

import type { Document } from "@/types/document";

// ==========================================
// 1. TAG & TAB TYPES
// ==========================================

export interface TagType {
  id: number;
  name: string;
  color?: string;
}

export type TabKey = "detail" | "content" | "description" | "note" | "activity";

export interface DetailTabItem {
  key: TabKey;
  label: string;
}

export const TABS: DetailTabItem[] = [
  { key: "detail", label: "Bản xem trước" },
  { key: "content", label: "Nội dung OCR" },
  { key: "description", label: "Mô tả" },
  { key: "note", label: "Ghi chú" },
  { key: "activity", label: "Hoạt động" },
];

export const COLORS = [
  { hex: "#2E7D32", tw: "bg-[#2E7D32]" },
  { hex: "#1976D2", tw: "bg-[#1976D2]" },
  { hex: "#F57C00", tw: "bg-[#F57C00]" },
  { hex: "#7B1FA2", tw: "bg-[#7B1FA2]" },
  { hex: "#D32F2F", tw: "bg-[#D32F2F]" },
  { hex: "#00BCD4", tw: "bg-[#00BCD4]" },
  { hex: "#E64A19", tw: "bg-[#E64A19]" },
  { hex: "#607D8B", tw: "bg-[#607D8B]" },
];

// ==========================================
// 2. MIME & EXTENSION MAPPINGS
// ==========================================

export const FILE_TYPE_LABELS: Record<string, string> = {
  "application/pdf": "PDF Document",
  "application/msword": "Word Document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "Word Document",
  "application/vnd.ms-excel": "Excel Document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    "Excel Document",
  "application/vnd.ms-powerpoint": "PowerPoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "PowerPoint",
  "image/jpeg": "Hình ảnh JPEG",
  "image/png": "Hình ảnh PNG",
  "text/plain": "Văn bản thuần",
};

export const MIME_TO_ICON_TYPE: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "docx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.ms-excel": "xlsx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    "xlsx",
  "application/vnd.ms-powerpoint": "pptx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
  "image/jpeg": "image",
  "image/png": "image",
};

export const CODE_EXTENSIONS = [
  ".py", ".js", ".ts", ".jsx", ".tsx", ".cpp", ".c", ".h", ".java", ".cs",
  ".go", ".rs", ".php", ".rb", ".swift", ".kt", ".scala", ".r", ".m",
  ".sql", ".json", ".yaml", ".yml", ".toml", ".xml", ".csv",
  ".html", ".css", ".scss", ".sass", ".less", ".svelte", ".vue",
  ".sh", ".bash", ".zsh", ".fish", ".ps1", ".bat", ".cmd",
  ".md", ".mdx", ".rst", ".tex",
  ".env", ".gitignore", ".dockerignore", ".makefile", ".mk", "dockerfile",
];

// ==========================================
// 3. PERMISSIONS & PROPS
// ==========================================

export interface DocumentDetailPermissions {
  canEdit?: boolean;
  canDelete?: boolean;
  canManageTags?: boolean;
}

export interface SharedDocumentDetailProps {
  documentId?: number;
  fetchDocumentFn?: (id: number) => Promise<any>;
  updateDocumentFn?: (id: number, data: Partial<Document>) => Promise<any>;
  deleteDocumentFn?: (id: number) => Promise<any>;
  updateTagsFn?: (id: number, tagIds: number[]) => Promise<any>;
  removeTagFn?: (id: number, tagId: number) => Promise<any>;
  updateThumbnailPageFn?: (id: number, page: number) => Promise<any>;
  queryKeyPrefix?: string[];
  permissions?: DocumentDetailPermissions;
  backUrl?: string;
  onBack?: () => void;
  onDeleteSuccess?: () => void;
}

// ==========================================
// 4. VIEWER PROPS
// ==========================================

export interface DocxViewerProps {
  fileUrl: string;
  hasThumbnail: boolean;
  onUpdateThumbnail?: (base64Thumbnail: string) => void;
  isUpdatingThumbnail?: boolean;
  onUpdateCover?: (page: number) => void;
  isUpdatingCover?: boolean;
  onUpdateThumbnailPage?: (page: number) => void;
  isUpdatingThumbnailPage?: boolean;
}

export interface OfficeViewerProps {
  doc: any;
  fileUrl: string;
  onUpdateThumbnail?: (base64Thumbnail: string) => void;
  isUpdatingThumbnail?: boolean;
}

export interface PdfViewerProps {
  doc: any;
  fileUrl: string;
  onUpdateCover?: (page: number) => void;
  isUpdatingCover?: boolean;
  onUpdateThumbnailPage?: (page: number) => void;
  isUpdatingThumbnailPage?: boolean;
}

export interface CodeViewerProps {
  documentId: number;
  filePath?: string;
  title?: string;
}

export interface MarkdownViewerProps {
  markdownPath: string;
}

export interface TabPreviewProps {
  doc: any;
  fileUrl: string;
  onUpdateThumbnail?: (base64: string) => void;
  isUpdatingThumbnail?: boolean;
  onUpdateThumbnailPage?: (page: number) => void;
  isUpdatingThumbnailPage?: boolean;
  viewMode?: "original" | "markdown";
  showPageSelector?: boolean;
}
