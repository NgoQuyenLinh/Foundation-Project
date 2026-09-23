// src/pages/personal/hooks/usePersonalDocuments.ts
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentService } from "@/services/documentService";
import type { DocumentAction } from "@/components/shared/DocumentContextMenu";
import { getFileExtension } from "@/utils/file";
import { formatSize } from "@/utils/formatSize";
import { formatRelativeDate } from "@/utils/formatDate";
import type { FolderType } from "../components/PersonalFoldersSection";
import type { TabKey } from "@/hooks/useDocumentFilters";

// --- HÀM HỖ TRỢ KIỂM TRA THỜI GIAN (ĐẶT BÊN NGOÀI HOOK) ---
const isWithinTimeRange = (dateStr?: string | null, filter?: string | null): boolean => {
  if (!filter || !dateStr) return true;

  const targetDate = new Date(dateStr);
  if (isNaN(targetDate.getTime())) return true;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (filter) {
    case "today":
      return targetDate >= startOfToday;
    case "last_7_days": {
      const sevenDaysAgo = new Date(startOfToday);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return targetDate >= sevenDaysAgo;
    }
    case "last_30_days": {
      const thirtyDaysAgo = new Date(startOfToday);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return targetDate >= thirtyDaysAgo;
    }
    case "this_year":
      return targetDate.getFullYear() === now.getFullYear();
    default:
      return true;
  }
};

export function usePersonalDocuments(
  selectedFolderId: number | null,
  folders: FolderType[] = []
) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // --- 1. STATES BỘ LỌC ---
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<string | null>(null);

  const [selectedUploadTime, setSelectedUploadTime] = useState<string | null>(null);
  const [selectedAccessTime, setSelectedAccessTime] = useState<string | null>(null);

  // --- 2. STATES GIAO DIỆN & MODAL ---
  const [page, setPage] = useState(1);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renamingDoc, setRenamingDoc] = useState<{ id: string; title: string } | null>(null);
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);
  const [contributeDoc, setContributeDoc] = useState<{ id: number; title: string } | null>(null);

  // --- 3. QUERIES ---
  const { data: fileTypes = [] } = useQuery({
    queryKey: ["document-file-types"],
    queryFn: () => documentService.getFileTypes(),
  });

  const { data: docData, isLoading: docsLoading, isFetching } = useQuery({
    queryKey: ["documents"],
    queryFn: () => documentService.getAll({ page: 1, page_size: 100 }),
  });

  // --- 4. MUTATIONS ---
  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentService.delete(Number(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });

  const renameDocumentMutation = useMutation({
    mutationFn: ({ id, title }: { id: number | string; title: string }) =>
      documentService.update(Number(id), { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setIsRenameModalOpen(false);
      setRenamingDoc(null);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (fd: FormData) => documentService.upload(fd),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });

  // --- 5. HANDLERS ---
  const handleDocumentAction = (action: DocumentAction | string, documentId: string) => {
    if (action === "view") {
      navigate(`/ca-nhan/tai-lieu/${documentId}`);
    } else if (action === "download") {
      const targetDoc = docData?.items.find((d) => d.id.toString() === documentId);
      if (targetDoc?.file_path) {
        const fileDownloadUrl = `${import.meta.env.VITE_API_URL}/${targetDoc.file_path}`;
        const link = document.createElement("a");
        link.href = fileDownloadUrl;
        link.download = targetDoc.title;
        link.target = "_blank";
        link.rel = "noreferrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert("Không tìm thấy đường dẫn tệp để tải xuống.");
      }
    } else if (action === "rename") {
      const docToRename = docData?.items.find((d) => d.id.toString() === documentId);
      if (docToRename) {
        setRenamingDoc({ id: docToRename.id.toString(), title: docToRename.title });
        setIsRenameModalOpen(true);
      }
    } else if (action === "contribute") {
      const docToContribute = docData?.items.find((d) => d.id.toString() === documentId);
      if (docToContribute) {
        setContributeDoc({ id: docToContribute.id, title: docToContribute.title });
        setIsContributeModalOpen(true);
      }
    } else if (action === "delete") {
      if (window.confirm("Xóa tài liệu này? Bạn có thể khôi phục trong thùng rác.")) {
        deleteMutation.mutate(documentId);
      }
    }
  };

  // --- 6. CHUẨN HÓA DỮ LIỆU ---
  const allDocCards = useMemo(() => {
    return (docData?.items ?? []).map((doc) => ({
      id: doc.id.toString(),
      name: doc.title,
      type: doc.file_type || "unknown",
      updatedAt: formatRelativeDate(doc.created_at),
      size: formatSize(doc.file_size || 0),
      extension: getFileExtension(doc.file_path, doc.file_type, doc.title),
      thumbnail_path: doc.thumbnail_path ?? null,
      file_path: doc.file_path ?? null,
      owner: { name: "You", avatar: "" },
      rawType: doc.file_type,
      tags: doc.tags || [],
      folder_id: (doc as any).folder_id ?? null,

      // LƯU CÁC MỐC THỜI GIAN ĐỂ PHỤC VỤ BỘ LỌC
      created_at: doc.created_at,
      last_accessed_at: (doc as any).last_accessed_at || (doc as any).updated_at || doc.created_at,
    }));
  }, [docData]);

  // --- 7. LOGIC TÌM KIẾM ĐA TRƯỜNG & BỘ LỌC TỐC ĐỘ CAO ---
  const { filteredFolders, filteredDocuments } = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    // A. Lọc Thư mục (Folders) theo từ khóa tìm kiếm
    const matchedFolders = folders.filter((f) =>
      query ? f.name.toLowerCase().includes(query) : true
    );

    const matchedFolderTagIds = new Set(
      matchedFolders.flatMap((f) => (f.tags || []).map((t: any) => t.id ?? t.tag_id))
    );
    const matchedFolderIds = new Set(matchedFolders.map((f) => f.id));

    // B. Lọc Tài liệu (Documents)
    const matchedDocs = allDocCards.filter((doc) => {
      // 1. Lọc theo Folder đang chọn
      if (selectedFolderId !== null) {
        const activeFolder = folders.find((f) => f.id === selectedFolderId);
        const folderTagIds = activeFolder?.tags?.map((t: any) => t.id ?? t.tag_id) || [];
        const belongsToFolder = doc.tags?.some((docTag: any) =>
          folderTagIds.includes(docTag.id ?? docTag.tag_id)
        );
        if (!belongsToFolder && doc.folder_id !== selectedFolderId) {
          return false;
        }
      }

      // 2. Lọc theo Dropdown "Nhãn dán"
      if (selectedTagId !== null) {
        const hasTag = doc.tags?.some((t: any) => (t.id ?? t.tag_id) === selectedTagId);
        if (!hasTag) return false;
      }

      // 3. Lọc theo Dropdown "Loại tài liệu"
      if (selectedFileType !== null) {
        if (doc.type !== selectedFileType && doc.rawType !== selectedFileType) {
          return false;
        }
      }

      // 4. Lọc theo Tabs loại tệp (PDF, Image, Docs...)
      if (activeTab !== "all") {
        const fileType = (doc.rawType || "").toLowerCase();
        const ext = (doc.extension || "").toLowerCase();

        if (activeTab === "pdf") {
          if (!fileType.includes("pdf") && ext !== "pdf") return false;
        } else if (activeTab === "image") {
          if (!fileType.startsWith("image/") && !["jpg", "jpeg", "png", "webp", "svg"].includes(ext)) return false;
        } else if (activeTab === "document") {
          const isDoc =
            fileType.includes("word") ||
            fileType.includes("presentation") ||
            fileType.includes("spreadsheet") ||
            ["doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt"].includes(ext);
          if (!isDoc) return false;
        } else if (activeTab === "other") {
          const isKnown =
            fileType.includes("pdf") ||
            fileType.startsWith("image/") ||
            fileType.includes("word") ||
            fileType.includes("presentation") ||
            fileType.includes("spreadsheet") ||
            ["pdf", "jpg", "jpeg", "png", "webp", "doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(ext);
          if (isKnown) return false;
        }
      }

      // 5. Lọc theo THỜI GIAN TẢI LÊN (Upload Time)
      if (!isWithinTimeRange(doc.created_at, selectedUploadTime)) {
        return false;
      }

      // 6. Lọc theo THỜI GIAN TRUY CẬP (Access Time)
      if (!isWithinTimeRange(doc.last_accessed_at, selectedAccessTime)) {
        return false;
      }

      // 7. Lọc theo TÌM KIẾM ĐA TRƯỜNG (Instant Search)
      if (query) {
        const matchName = doc.name.toLowerCase().includes(query);
        const matchTag = doc.tags?.some((t: any) => t.name.toLowerCase().includes(query));

        const matchFolder =
          (doc.folder_id && matchedFolderIds.has(doc.folder_id)) ||
          doc.tags?.some((t: any) => matchedFolderTagIds.has(t.id ?? t.tag_id));

        if (!matchName && !matchTag && !matchFolder) return false;
      }

      return true;
    });

    return {
      filteredFolders: matchedFolders,
      filteredDocuments: matchedDocs,
    };
  }, [
    allDocCards,
    folders,
    searchQuery,
    selectedTagId,
    selectedFileType,
    activeTab,
    selectedFolderId,
    selectedUploadTime,
    selectedAccessTime,
  ]);

  return {
    // States
    page, setPage,
    isUploadOpen, setIsUploadOpen,
    isRenameModalOpen, setIsRenameModalOpen,
    renamingDoc, setRenamingDoc,
    isContributeModalOpen, setIsContributeModalOpen,
    contributeDoc, setContributeDoc,
    activeTab, setActiveTab,
    searchQuery, setSearchQuery,
    selectedTagId, setSelectedTagId,
    selectedFileType, setSelectedFileType,

    selectedUploadTime,
    setSelectedUploadTime,
    selectedAccessTime,
    setSelectedAccessTime,

    // Data (Đã lọc)
    fileTypes, docData, docsLoading, isFetching,
    filteredFolders,
    filteredDocuments,

    // Actions
    deleteMutation, renameDocumentMutation, uploadMutation,
    handleDocumentAction,
  };
}