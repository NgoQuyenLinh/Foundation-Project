// src/pages/personal/hooks/usePersonalDocuments.ts
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentService } from "@/services/documentService";
import type { DocumentAction } from "@/components/shared/DocumentContextMenu";
import { useDocumentFilters } from "@/hooks/useDocumentFilters";
import { getFileExtension } from "@/utils/file";
import { formatSize } from "@/utils/formatSize";
import { formatRelativeDate } from "@/utils/formatDate";
import type { FolderType } from "../components/PersonalFoldersSection";

export function usePersonalDocuments(
  selectedFolderId: number | null,
  folders: FolderType[] = [] // Bổ sung nhận tham số folders từ PersonalFoldersSection
) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // --- STATE ---
  const [page, setPage] = useState(1);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renamingDoc, setRenamingDoc] = useState<{ id: string; title: string } | null>(null);

  // --- QUERIES ---
  const { data: fileTypes = [] } = useQuery({
    queryKey: ["document-file-types"],
    queryFn: () => documentService.getFileTypes(),
  });

// 1. TẢI TOÀN BỘ TÀI LIỆU CÁ NHÂN (Truyền page: 1 và page_size: 100 để không vượt giới hạn FastAPI)
const { data: docData, isLoading: docsLoading, isFetching } = useQuery({
  queryKey: ["documents"],
  queryFn: () => documentService.getAll({ page: 1, page_size: 100 }),
});

  // --- MUTATIONS --- (Tự động invalidate cache khi có thay đổi dữ liệu)
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

  // --- HANDLERS ---
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
    } else if (action === "delete") {
      if (window.confirm("Xóa tài liệu này? Bạn có thể khôi phục trong thùng rác.")) {
        deleteMutation.mutate(documentId);
      }
    }
  };

  // --- DATA MAPPING ---
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
    }));
  }, [docData]);

  // 2. LỌC TÀI LIỆU THEO THƯ MỤC NGAY TRÊN FRONTEND
  const folderFilteredCards = useMemo(() => {
    if (selectedFolderId === null) return allDocCards;

    const activeFolder = folders.find((f) => f.id === selectedFolderId);
    const folderTagIds = activeFolder?.tags?.map((t: any) => t.id) || [];

    if (folderTagIds.length > 0) {
      // Ẩn những file không chứa bất kỳ tag nào trùng với tag của Folder
      return allDocCards.filter((doc) =>
        doc.tags.some((docTag: any) => folderTagIds.includes(docTag.id))
      );
    }

    // Trường hợp thư mục không gắn tag: Lọc theo folder_id trực tiếp
    return allDocCards.filter((doc) => doc.folder_id === selectedFolderId);
  }, [allDocCards, selectedFolderId, folders]);

  // 3. TRUYỀN DANH SÁCH ĐÃ LỌC THEO FOLDER VÀO BỘ LỌC TÌM KIẾM/LOẠI FILE/TAG
  const filters = useDocumentFilters(folderFilteredCards);

  return {
    page, setPage,
    isUploadOpen, setIsUploadOpen,
    isRenameModalOpen, setIsRenameModalOpen,
    renamingDoc, setRenamingDoc,
    fileTypes, docData, docsLoading, isFetching,
    deleteMutation, renameDocumentMutation, uploadMutation,
    handleDocumentAction,
    ...filters,
  };
}