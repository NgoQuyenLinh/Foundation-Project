// src/pages/personal/hooks/usePersonalDocuments.ts
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentService } from "@/services/documentService";
import type { DocumentAction } from "@/components/shared/DocumentContextMenu";
import { useDocumentFilters } from "@/hooks/useDocumentFilters";
import { getFileExtension } from "@/utils/file";
import { formatSize } from "@/utils/formatSize";
import { formatRelativeDate } from "@/utils/formatDate";

export function usePersonalDocuments(selectedFolderId: number | null) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // --- STATE ---
  const [page, setPage] = useState(1);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renamingDoc, setRenamingDoc] = useState<{ id: string; title: string; } | null>(null);

  // --- QUERIES ---
  const { data: fileTypes = [] } = useQuery({
    queryKey: ["document-file-types"],
    queryFn: () => documentService.getFileTypes(),
  });

  const { data: docData, isLoading: docsLoading, isFetching } = useQuery({
    queryKey: ["documents", selectedFolderId, page],
    queryFn: () => documentService.getAll({ folder_id: selectedFolderId ?? undefined, page, page_size: 20 }),
    placeholderData: (prev) => prev,
  });

  // --- MUTATIONS ---
  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentService.delete(Number(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });

  const renameDocumentMutation = useMutation({
    mutationFn: ({ id, title }: { id: number | string; title: string }) => documentService.update(Number(id), { title }),
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
      // Tìm tài liệu theo ID
      const targetDoc = docData?.items.find((d) => d.id.toString() === documentId);
      if (targetDoc?.file_path) {
        // Tạo link tải xuống tương tự DocumentDetail.tsx
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

  // --- DATA MAPPING & FILTERS ---
  const allDocCards = (docData?.items ?? []).map((doc) => ({
    id: doc.id.toString(),
    name: doc.title,
    type: doc.file_type || "unknown",
    updatedAt: formatRelativeDate(doc.created_at),
    size: formatSize(doc.file_size || 0),
    extension: getFileExtension(doc.file_path, doc.file_type, doc.title),
    thumbnail_path: doc.thumbnail_path ?? null,
    file_path: doc.file_path ?? null, // BỔ SUNG THUỘC TÍNH NÀY
    owner: { name: "You", avatar: "" },
    rawType: doc.file_type,
    tags: doc.tags || [],
  }));

  const filters = useDocumentFilters(allDocCards);

  return {
    page, setPage,
    isUploadOpen, setIsUploadOpen,
    isRenameModalOpen, setIsRenameModalOpen,
    renamingDoc, setRenamingDoc,
    fileTypes, docData, docsLoading, isFetching,
    deleteMutation, renameDocumentMutation, uploadMutation,
    handleDocumentAction,
    ...filters
  };
}