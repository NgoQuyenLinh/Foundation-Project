// src/components/shared/documents/DocumentDetail/hooks/useDocumentDetail.ts

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentService } from "@/services/documentService";
import { tagService } from "@/services/tagService";
import type {
  SharedDocumentDetailProps,
  TabKey,
  TagType,
} from "../DocumentDetail.types";

/**
 * useDocumentDetail - Custom Hook quản lý toàn bộ logic nghiệp vụ cho màn hình chi tiết tài liệu
 *
 * Nhiệm vụ chính:
 * 1. Quản lý truy xuất dữ liệu tài liệu từ server qua React Query
 * 2. Cung cấp các mutation: đổi tên tài liệu, cập nhật ảnh bìa, cập nhật trang bìa PDF, xóa tài liệu
 * 3. Quản lý toàn bộ vòng đời nhãn dán (tags): tải danh mục tags, tạo mới tag, gán tags, gỡ tag
 * 4. Xử lý điều hướng quay lại trang trước đó linh hoạt
 */
export function useDocumentDetail(props: SharedDocumentDetailProps = {}) {
  const {
    documentId: propDocumentId,
    fetchDocumentFn = documentService.getById,
    updateDocumentFn = documentService.update,
    deleteDocumentFn = documentService.delete,
    updateTagsFn = documentService.updateTags,
    removeTagFn = documentService.removeTag,
    updateThumbnailPageFn = documentService.updateThumbnailPage,
    queryKeyPrefix = ["document"],
    permissions = {},
    backUrl = "/personal/documents",
    onBack,
    onDeleteSuccess,
  } = props;

  const canEdit = permissions.canEdit ?? true;
  const canDelete = permissions.canDelete ?? true;
  const canManageTags = permissions.canManageTags ?? true;

  const params = useParams<{ id?: string; docId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const id =
    propDocumentId ??
    (params.docId ? Number(params.docId) : params.id ? Number(params.id) : 0);

  // --- STATE GIAO DIỆN ---
  const [activeTab, setActiveTab] = useState<TabKey>("detail");
  const [isRenaming, setIsRenaming] = useState(false);
  const [tempTitle, setTempTitle] = useState("");

  // --- QUERIES ---
  /**
   * Truy vấn thông tin chi tiết của tài liệu
   */
  const {
    data: doc,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [...queryKeyPrefix, id],
    queryFn: () => fetchDocumentFn(id),
    enabled: !isNaN(id) && id > 0,
  });

  /**
   * Truy vấn danh sách tất cả các nhãn dán trong hệ thống
   */
  const { data: allTags = [], isLoading: isLoadingTags } = useQuery<TagType[]>({
    queryKey: ["all-tags"],
    queryFn: () => tagService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  // --- MUTATIONS ---
  /**
   * Đổi tên tài liệu
   */
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

  /**
   * Lưu ảnh bìa (thumbnail dạng base64) cho tài liệu
   */
  const updateThumbnailMutation = useMutation({
    mutationFn: (base64: string) =>
      updateDocumentFn(id, { thumbnail_path: base64 } as any),
    onSuccess: (updated, base64) => {
      queryClient.setQueryData([...queryKeyPrefix, id], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          thumbnail_path: updated?.thumbnail_path || base64,
        };
      });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (error) => {
      console.error("Không thể lưu ảnh bìa:", error);
    },
  });

  /**
   * Chọn số trang trong tài liệu PDF để làm ảnh bìa
   */
 const updateThumbnailPageMutation = useMutation({
    mutationFn: (pageNumber: number) => {
      if (!updateThumbnailPageFn) {
        throw new Error("Không hỗ trợ tính năng này.");
      }
      return updateThumbnailPageFn(id, pageNumber);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData([...queryKeyPrefix, id], (old: any) => {
        if (!old) return old;

        // Ép đổi đường dẫn thumbnail kèm timestamp để buộc UI re-render ảnh
        const rawPath = updated?.thumbnail_path || old.thumbnail_path;
        const freshThumbnailPath = rawPath
          ? `${rawPath.split("?")[0]}?t=${Date.now()}`
          : rawPath;

        return {
          ...old,
          ...updated,
          thumbnail_path: freshThumbnailPath,
        };
      });

      // Invalidate các query liên quan để đồng bộ danh sách tài liệu
      queryClient.invalidateQueries({ queryKey: [...queryKeyPrefix, id] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (error) => {
      console.error("Không thể lưu ảnh bìa PDF:", error);
      alert("Lỗi khi cập nhật ảnh bìa PDF");
    },
  });

  /**
   * Xóa tài liệu
   */
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

  /**
   * Tạo nhãn dán mới trong hệ thống
   */
  const createTagMutation = useMutation({
    mutationFn: (newTag: { name: string; color: string }) =>
      tagService.create(newTag),
    onSuccess: async (createdTag) => {
      queryClient.setQueryData<TagType[]>(["all-tags"], (currentTags = []) => {
        const exists = currentTags.some((tag) => tag.id === createdTag.id);
        if (exists) return currentTags;
        return [...currentTags, createdTag];
      });
    },
    onError: (error: any) => {
      console.error("Không thể tạo tag:", error);
      alert(error?.message || "Không thể tạo nhãn dán. Vui lòng thử lại.");
    },
  });

  /**
   * Lưu danh sách nhãn dán cho tài liệu
   */
  const saveTagsMutation = useMutation({
    mutationFn: (tagIds: number[]) => {
      if (!id) throw new Error("Không tìm thấy document ID");
      return updateTagsFn(id, tagIds);
    },
    onSuccess: async (updatedDocument) => {
      queryClient.setQueryData([...queryKeyPrefix, id], updatedDocument);
      await queryClient.invalidateQueries({
        queryKey: [...queryKeyPrefix, id],
      });
    },
    onError: (error: any) => {
      console.error("Không thể lưu tags:", error);
      alert(
        error?.response?.data?.detail ||
          "Không thể lưu nhãn dán. Vui lòng thử lại.",
      );
    },
  });

  /**
   * Gỡ nhanh một nhãn dán khỏi tài liệu
   */
  const removeTagMutation = useMutation({
    mutationFn: (tagId: number) => {
      if (!id) throw new Error("Không tìm thấy document ID");
      return removeTagFn(id, tagId);
    },
    onSuccess: async (updatedDocument) => {
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

  // --- ACTIONS & HANDLERS ---
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backUrl) {
      navigate(backUrl);
    } else {
      navigate(-1);
    }
  };

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

  const handleCancelRename = () => {
    setIsRenaming(false);
  };

  const handleCreateTag = (
    newTag: { name: string; color: string },
    onCreated?: (tag: TagType) => void,
  ) => {
    createTagMutation.mutate(newTag, {
      onSuccess: (created) => {
        onCreated?.(created);
      },
    });
  };

  const handleSaveTags = (tagIds: number[]) => {
    saveTagsMutation.mutate(tagIds);
  };

  const handleRemoveTag = (tagId: number) => {
    if (!id || removeTagMutation.isPending) return;
    removeTagMutation.mutate(tagId);
  };

  // Chuẩn hóa tags từ doc
  const currentTags: TagType[] = Array.isArray(doc?.tags)
    ? doc.tags.map((tag: any) => ({
        id: Number(tag.id),
        name: tag.name,
        color: tag.color,
      }))
    : [];


  const handleUpdateThumbnail = async (base64: string) => {
    if (!id || updateThumbnailMutation.isPending) return;
    return updateThumbnailMutation.mutateAsync(base64);
  };

  const handleUpdateThumbnailPage = async (pageNumber: number) => {
    if (!id || updateThumbnailPageMutation.isPending) return;
    return updateThumbnailPageMutation.mutateAsync(pageNumber);
  };

  const handleDelete = () => {
    if (!id || deleteMutation.isPending) return;
    deleteMutation.mutate();
  };


return {
  id,
  doc,
  isLoading,
  isError,
  params,
  permissions: {
    canEdit,
    canDelete,
    canManageTags,
  },
  activeTab,
  setActiveTab,
  isRenaming,
  tempTitle,
  setTempTitle,
  handleStartRename,
  handleConfirmRename,
  handleCancelRename,
  handleBack,
  currentTags,
  allTags,
  isLoadingTags,
  handleCreateTag,
  isCreatingTag: createTagMutation.isPending,
  handleSaveTags,
  isSavingTags: saveTagsMutation.isPending,
  handleRemoveTag,
  isRemovingTag: removeTagMutation.isPending,
  renameMutation,

  // ✅ HANDLER MỚI — dùng cho DocumentDetail.tsx
  handleUpdateThumbnail,
  isUpdatingThumbnail: updateThumbnailMutation.isPending,
  handleUpdateThumbnailPage,
  isUpdatingThumbnailPage: updateThumbnailPageMutation.isPending,
  handleDelete,
  isDeleting: deleteMutation.isPending,

  // ⚠️ GIỮ LẠI để không phá vỡ chỗ khác (nếu có component khác đang dùng)
  // Nếu chắc chắn không ai dùng nữa thì có thể xóa 3 dòng dưới
  updateThumbnailMutation,
  updateThumbnailPageMutation,
  deleteMutation,
};
}
