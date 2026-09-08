// src/pages/personal/hooks/usePersonalFolders.ts
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { folderService } from "@/services/folderService";
import { tagService } from "@/services/tagService";
import type { FolderAction } from "@/components/shared/FolderContextMenu";
import type { FolderInitialData } from "../components/CreateFolderModal";

export function usePersonalFolders() {
  const queryClient = useQueryClient();

  // --- STATE ---
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderInitialData | null>(null);
  
  const [deletingFolderId, setDeletingFolderId] = useState<number | null>(null);
  const [isDeleteFolderOpen, setIsDeleteFolderOpen] = useState(false);

  // --- QUERIES ---
  const { data: folders, isLoading: foldersLoading } = useQuery({
    queryKey: ["folders"],
    queryFn: () => folderService.getAll(),
  });

  const { data: tags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: () => tagService.getAll(),
  });

  // --- MUTATIONS ---
const createFolderMutation = useMutation({
    mutationFn: (data: { name: string; color?: string; tagIds?: number[] }) =>
      folderService.create({
        name: data.name,
        color: data.color,
        tag_ids: data.tagIds,
      }),
    onSuccess: () => {
      // Tự động làm mới danh sách folder trên UI mà không cần F5
      queryClient.invalidateQueries({ queryKey: ["folders"] });
    },
  });

const updateFolderMutation = useMutation({
    mutationFn: async (data: { id: number; name: string; color?: string; tagIds?: number[]; initialTagIds?: number[]; }) => {
      await folderService.update(data.id, { name: data.name, color: data.color });
      if (data.tagIds) {
      await folderService.addTags(data.id, data.tagIds);
    }
    },
    onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["folders"] });
    },
  });

  const createTagMutation = useMutation({
    mutationFn: (name: string) => tagService.create({ name, color: "#2F6B3C" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tags"] }),
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id: number) => folderService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      if (selectedFolderId === deletingFolderId) {
        setSelectedFolderId(null);
      }
      setIsDeleteFolderOpen(false);
      setDeletingFolderId(null);
    }
  });

  // --- HANDLERS ---
  const handleFolderAction = async (action: FolderAction, folderId: number) => {
    if (action === "edit") {
      try {
        const folderDetail = await folderService.getById(folderId);
        setEditingFolder({
          id: folderDetail.id,
          name: folderDetail.name,
          color: folderDetail.color || "#4CAF50",
          tagIds: folderDetail.tags?.map((t: any) => t.id) || folderDetail.tag_ids || [],
        });
        setIsModalOpen(true);
      } catch (error) {
        console.error("Lỗi khi lấy chi tiết thư mục:", error);
      }
    } else if (action === "delete") {
      setDeletingFolderId(folderId);
      setIsDeleteFolderOpen(true);
    }
  };

  const deletingFolder = folders?.find((f) => f.id === deletingFolderId);

  return {
    folders, foldersLoading, 
    selectedFolderId, setSelectedFolderId,
    tags, createTagMutation,
    isModalOpen, setIsModalOpen,
    editingFolder, setEditingFolder,
    isDeleteFolderOpen, setIsDeleteFolderOpen,
    deletingFolder, deletingFolderId, setDeletingFolderId,
    createFolderMutation, updateFolderMutation, deleteFolderMutation,
    handleFolderAction
  };
}