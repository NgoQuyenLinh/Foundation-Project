// src/pages/group/hooks/useGroupFolders.ts
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { groupService } from "@/services/groupService";
import { groupFolderService } from "@/services/folderService";
import type { FolderAction } from "@/components/shared/FolderContextMenu";

export function useGroupFolders(
  groupId: number,
  hasWorkspace: boolean,
  onFolderDeleted?: (folderId: number) => void
) {
  const queryClient = useQueryClient();

  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<{
    id: number;
    name: string;
    color: string;
    tagIds: number[];
  } | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [isDeleteFolderOpen, setIsDeleteFolderOpen] = useState(false);
  const [isDeletingFolder, setIsDeletingFolder] = useState(false);

  // 1. Fetch danh sách thư mục
  const { data: folders = [], isLoading: foldersLoading } = useQuery({
    queryKey: ["group-folders", groupId],
    queryFn: () => groupService.getFolders(groupId),
    enabled: hasWorkspace,
  });

  // 2. BỔ SUNG: Create Folder Mutation
  const createFolderMutation = useMutation({
    mutationFn: async (data: { name: string; color?: string; tagIds?: number[] }) => {
      return groupFolderService.create(
        {
          name: data.name,
          color: data.color,
          tag_ids: data.tagIds,
        },
        groupId
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-folders", groupId] });
    },
  });

  // 3. BỔ SUNG: Update Folder Mutation
  const updateFolderMutation = useMutation({
    mutationFn: async (data: { id: number; name: string; color?: string; tagIds?: number[] }) => {
      return groupFolderService.update(
        data.id,
        {
          name: data.name,
          color: data.color,
          tag_ids: data.tagIds,
        },
        groupId
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-folders", groupId] });
    },
  });

  // 4. Mutation tổng hợp dùng cho Folder Modal
  const saveFolderMutation = useMutation({
    mutationFn: async (data: { id?: number; name: string; color: string; tagIds: number[] }) => {
      let folderId = data.id;

      if (folderId) {
        await groupFolderService.update(folderId, { name: data.name, color: data.color } as any, groupId);
      } else {
        const newFolder = await groupFolderService.create({ name: data.name, color: data.color }, groupId);
        folderId = newFolder.id;
      }

      if (folderId && data.tagIds) {
        await groupFolderService.addTags(folderId, data.tagIds, groupId);
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-folders", groupId] });
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      setIsFolderModalOpen(false);
      setEditingFolder(null);
    },
  });

  // Action Handlers
  const handleFolderAction = async (
    action: FolderAction,
    folderId: number,
    setShareModal?: (modal: any) => void
  ) => {
    if (action === "edit") {
      const targetFolder = folders.find((f: any) => f.id === folderId);
      if (targetFolder) {
        setEditingFolder({
          id: targetFolder.id,
          name: targetFolder.name,
          color: targetFolder.color || "#4CAF50",
          tagIds: (targetFolder as any).tags?.map((t: any) => t.id) || [],
        });
        setIsFolderModalOpen(true);
      }
    } else if (action === "share" && setShareModal) {
      setShareModal("folder");
    } else if (action === "delete") {
      const targetFolder = folders.find((f: any) => f.id === folderId);
      if (targetFolder) {
        setDeletingFolder({ id: targetFolder.id, name: targetFolder.name });
        setIsDeleteFolderOpen(true);
      }
    }
  };

  const handleConfirmDeleteFolder = async () => {
    if (!deletingFolder) return;
    try {
      setIsDeletingFolder(true);
      if (onFolderDeleted) onFolderDeleted(deletingFolder.id);
      await groupFolderService.delete(deletingFolder.id, groupId);
      queryClient.invalidateQueries({ queryKey: ["group-folders", groupId] });
      setIsDeleteFolderOpen(false);
      setDeletingFolder(null);
    } finally {
      setIsDeletingFolder(false);
    }
  };

  return {
    folders,
    foldersLoading,
    isFolderModalOpen,
    setIsFolderModalOpen,
    editingFolder,
    setEditingFolder,
    deletingFolder,
    isDeleteFolderOpen,
    isDeletingFolder,
    
    // RETURN 2 MUTATION BỊ THIẾU
    createFolderMutation,
    updateFolderMutation,

    handleFolderAction,
    handleCancelDeleteFolder: () => {
      if (!isDeletingFolder) {
        setIsDeleteFolderOpen(false);
        setDeletingFolder(null);
      }
    },
    handleConfirmDeleteFolder,
    handleFolderSubmit: (data: any) => saveFolderMutation.mutateAsync(data),
    isSubmittingFolder: saveFolderMutation.isPending,
  };
}