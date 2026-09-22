// frontend/digital-library/src/pages/group/hooks/useGroupSpace.ts

import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FolderAction } from "@/components/shared/FolderContextMenu";
import { groupService } from "@/services/groupService";
import { groupTagService } from "@/services/tagService";
import { groupFolderService } from "@/services/folderService";
import {
  documentService,
  groupDocumentService,
} from "@/services/documentService";
import { useAuthStore } from "@/stores/authStore";
import type { GroupListItem, PermissionLevel } from "@/types/group";
import type { GroupTab } from "../types/groupSpace.types";
import type { TabKey } from "@/hooks/useDocumentFilters";

// HÀM BỔ TRỢ KIỂM TRA MỐC THỜI GIAN
const isWithinTimeRange = (
  dateStr?: string | null,
  filter?: string | null,
): boolean => {
  if (!filter || !dateStr) return true;

  const targetDate = new Date(dateStr);
  if (isNaN(targetDate.getTime())) return true;

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

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

export function useGroupSpace() {
  // 1. ROUTING & NAVIGATION
  const { id } = useParams<{ id: string }>();
  const groupId = Number(id);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as GroupTab) || "documents";

  // 2. GLOBAL STORES & QUERY CLIENT
  const queryClient = useQueryClient();
  const { data: cachedGroups = [] } = useQuery<GroupListItem[]>({
    queryKey: ["groups"],
    queryFn: groupService.getAll,
    enabled: false,
  });
  const currentUser = useAuthStore((state) => state.user);

  // 3. LOCAL STATES & FILTERS
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<string | null>(
    null,
  );
  const [activeDocumentTab, setActiveDocumentTab] = useState<TabKey>("all");

  // KHAI BÁO THÊM STATE BỘ LỌC THỜI GIAN & NGƯỜI TẢI LÊN
  const [selectedUploadTime, setSelectedUploadTime] = useState<string | null>(
    null,
  );
  const [selectedAccessTime, setSelectedAccessTime] = useState<string | null>(
    null,
  );
  const [selectedUploaderId, setSelectedUploaderId] = useState<number | null>(
    null,
  );

  // Modals
  const [shareModal, setShareModal] = useState<
    "documents" | "folder" | "invite" | null
  >(null);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Quản lý Thư mục (Sửa & Xóa)
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

  // Quản lý Đổi tên tài liệu nhóm
  const [isGroupRenameModalOpen, setIsGroupRenameModalOpen] = useState(false);
  const [renamingGroupDoc, setRenamingGroupDoc] = useState<{
    id: string | number;
    title: string;
  } | null>(null);

  // 4. QUERIES
  const { data: workspaceTags = [] } = useQuery({
    queryKey: ["workspace-tags", groupId],
    queryFn: () => groupTagService.getWorkspaceTags(Number(groupId)),
    enabled: !!groupId,
    select: (data) =>
      data.map((item: any) => ({
        id: item.tag_id ?? item.tag?.id ?? item.id,
        name: item.tag?.name ?? item.name,
        color: item.tag?.color ?? item.color ?? "#e5e7eb",
      })),
  });

  const { data: fileTypes = [] } = useQuery({
    queryKey: ["document-file-types", groupId],
    queryFn: () => documentService.getFileTypes(),
  });

  const { data: groupTagsData = [] } = useQuery({
    queryKey: ["group-tags", groupId],
    queryFn: () => groupTagService.getAll(groupId),
    enabled: !isNaN(groupId),
  });

  const {
    data: workspace,
    isLoading: workspaceLoading,
    isError: workspaceError,
  } = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => groupService.getById(groupId),
    enabled: !isNaN(groupId),
  });

  const { data: documentsData, isLoading: docsLoading } = useQuery({
    queryKey: ["group-documents", groupId],
    queryFn: () => groupService.getDocuments(groupId),
    enabled: !!workspace,
  });

  const { data: foldersData = [], isLoading: foldersLoading } = useQuery({
    queryKey: ["group-folders", groupId],
    queryFn: () => groupService.getFolders(groupId),
    enabled: !!workspace,
  });

  const { data: membersData = [] } = useQuery({
    queryKey: ["group-members", groupId],
    queryFn: () => groupService.getMembers(groupId),
    enabled: !!workspace,
  });

  const { data: invitationsData = [] } = useQuery({
    queryKey: ["my-invitations"],
    queryFn: groupService.getMyInvitations,
  });

  // 5. DERIVED DATA & PERMISSIONS
  const documents = documentsData?.items ?? [];
  const folders = foldersData;
  const members = membersData;
  const invitations = invitationsData;
  const groupTags = groupTagsData;

  const groups = cachedGroups;

  const currentMember = members.find((m) => m.user_id === currentUser?.id);
  const isOwner =
    currentMember?.is_owner ??
    (!!workspace?.owner_id && workspace.owner_id === currentUser?.id);
  const permission: PermissionLevel =
    currentMember?.permission_level ?? "view";
  const canManageDocuments = isOwner || permission === "full";

  // 6. TRASH QUERY
  const { data: trashData = [] } = useQuery({
    queryKey: ["group-trash", groupId],
    queryFn: () => groupService.getTrash(groupId),
    enabled: isOwner,
  });

  const trash = trashData;

  // TOGGLE FUNCTION CHỌN / BỎ CHỌN THƯ MỤC
  const handleSelectFolder = (id: number | null) => {
    setSelectedFolderId((prevId) => (prevId === id ? null : id));
  };

  // TỰ ĐỘNG BỎ LỌC NẾU THƯ MỤC ĐANG CHỌN BỊ XÓA
  useEffect(() => {
    if (
      selectedFolderId !== null &&
      folders &&
      !folders.some((f: any) => f.id === selectedFolderId)
    ) {
      setSelectedFolderId(null);
    }
  }, [folders, selectedFolderId]);

  // LỌC TÀI LIỆU CLIENT-SIDE
  const filteredDocuments = useMemo(() => {
    let list = documents || [];

    // A. Lọc theo Folder được chọn
    if (selectedFolderId !== null) {
      const activeFolder = folders.find((f: any) => f.id === selectedFolderId);
      const folderTagIds =
        activeFolder?.tags?.map((t: any) => t.id ?? t.tag_id) ||
        (activeFolder as any)?.tag_ids ||
        [];

      if (folderTagIds.length > 0) {
        // Lọc tài liệu chứa tag thuộc folder
        list = list.filter((doc: any) =>
          doc.tags?.some((docTag: any) =>
            folderTagIds.includes(docTag.id ?? docTag.tag_id),
          ),
        );
      } else {
        // Lọc tài liệu theo folder_id trực tiếp
        list = list.filter((doc: any) => {
          const docFolderId = doc.folder_id ?? doc.folderId ?? doc.folder?.id;
          return Number(docFolderId) === Number(selectedFolderId);
        });
      }
    }

    // B. Lọc tiếp theo các điều kiện
    return list.filter((doc: any) => {
      // 1. Tìm kiếm theo tên
      const docName = doc.title || doc.name || "";
      if (
        searchQuery &&
        !docName.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // 2. Lọc theo Nhãn dán (Tag)
      if (selectedTagId !== null) {
        const hasTag = doc.tags?.some(
          (t: any) => t.id === selectedTagId || t.tag_id === selectedTagId,
        );
        if (!hasTag) return false;
      }

      // 3. Lọc theo Loại File Dropdown
      if (selectedFileType !== null) {
        const fileType = doc.file_type || doc.rawType;
        if (fileType !== selectedFileType) return false;
      }

      // 4. Lọc theo Tab định dạng (PDF, Images, Docs...)
      if (activeDocumentTab !== "all") {
        const fileType = (doc.file_type || doc.rawType || "").toLowerCase();
        const ext = (doc.extension || "").toLowerCase();

        if (activeDocumentTab === "pdf") {
          if (!fileType.includes("pdf") && ext !== "pdf") return false;
        } else if (activeDocumentTab === "image") {
          if (
            !fileType.startsWith("image/") &&
            !["jpg", "jpeg", "png", "webp", "svg"].includes(ext)
          )
            return false;
        } else if (activeDocumentTab === "document") {
          const isDoc =
            fileType.includes("word") ||
            fileType.includes("presentation") ||
            fileType.includes("spreadsheet") ||
            ["doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt"].includes(ext);
          if (!isDoc) return false;
        } else if (activeDocumentTab === "other") {
          const isKnown =
            fileType.includes("pdf") ||
            fileType.startsWith("image/") ||
            fileType.includes("word") ||
            fileType.includes("presentation") ||
            fileType.includes("spreadsheet") ||
            [
              "pdf",
              "jpg",
              "jpeg",
              "png",
              "webp",
              "doc",
              "docx",
              "ppt",
              "pptx",
              "xls",
              "xlsx",
            ].includes(ext);
          if (isKnown) return false;
        }
      }

      // 5. Lọc theo Thời gian tải lên
      const uploadDate = doc.created_at || doc.uploaded_at;
      if (!isWithinTimeRange(uploadDate, selectedUploadTime)) {
        return false;
      }

      // 6. Lọc theo Thời gian truy cập / cập nhật gần nhất
      const accessDate = doc.last_accessed_at || doc.updated_at || doc.created_at;
      if (!isWithinTimeRange(accessDate, selectedAccessTime)) {
        return false;
      }

      // 7. Lọc theo Người tải lên
      if (selectedUploaderId !== null) {
        const uploaderId =
          doc.uploader_id ??
          doc.user_id ??
          doc.created_by ??
          doc.uploaded_by ??
          doc.owner?.id ??
          doc.owner_id;
        if (Number(uploaderId) !== Number(selectedUploaderId)) {
          return false;
        }
      }

      return true;
    });
  }, [
    documents,
    folders,
    selectedFolderId,
    searchQuery,
    selectedTagId,
    selectedFileType,
    activeDocumentTab,
    selectedUploadTime,
    selectedAccessTime,
    selectedUploaderId,
  ]);

  // 7. EFFECTS & NAVIGATION GUARDS
  useEffect(() => {
    if (!id || isNaN(groupId)) {
      navigate("/groups", { replace: true });
    }
  }, [id, groupId, navigate]);

  // 8. MUTATIONS
  const documentMutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-documents", groupId] });
      queryClient.invalidateQueries({ queryKey: ["group-trash", groupId] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  };

  const saveDocument = useMutation({
    mutationFn: (docId: number) => groupService.saveToPersonal(groupId, docId),
    ...documentMutationOptions,
  });

  const deleteDocument = useMutation({
    mutationFn: (docId: number) => groupService.deleteDocument(groupId, docId),
    ...documentMutationOptions,
  });

  const renameGroupDocumentMutation = useMutation({
    mutationFn: ({ id, title }: { id: string | number; title: string }) =>
      groupService.updateDocument(groupId, Number(id), { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-documents", groupId] });
      setIsGroupRenameModalOpen(false);
      setRenamingGroupDoc(null);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (fd: FormData) => groupDocumentService.upload(fd, groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-documents", groupId] });
    },
  });

  const createTagMutation = useMutation({
    mutationFn: (name: string) =>
      groupTagService.create({ name, color: "#2F6B3C" }, groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-tags", groupId] });
      queryClient.invalidateQueries({ queryKey: ["workspace-tags", groupId] });
    },
  });

  // 9. EVENT HANDLERS
  const setTab = (tab: GroupTab) =>
    setSearchParams(tab === "documents" ? {} : { tab });

  const handleFolderAction = async (action: FolderAction, folderId: number) => {
    if (action === "edit") {
      const targetFolder = folders.find((f) => f.id === folderId);
      if (targetFolder) {
        setEditingFolder({
          id: targetFolder.id,
          name: targetFolder.name,
          color: targetFolder.color || "#4CAF50",
          tagIds: (targetFolder as any).tags?.map((t: any) => t.id) || [],
        });
        setIsFolderModalOpen(true);
      }
      return;
    }

    if (action === "share") {
      setShareModal("folder");
      return;
    }

    if (action === "delete") {
      const targetFolder = folders.find((f) => f.id === folderId);
      if (targetFolder) {
        setDeletingFolder({ id: targetFolder.id, name: targetFolder.name });
        setIsDeleteFolderOpen(true);
      }
    }
  };

  const handleCancelDeleteFolder = () => {
    if (isDeletingFolder) return;
    setIsDeleteFolderOpen(false);
    setDeletingFolder(null);
  };

  const handleConfirmDeleteFolder = async () => {
    if (!deletingFolder) return;

    try {
      setIsDeletingFolder(true);
      if (deletingFolder.id === selectedFolderId) {
        setSelectedFolderId(null);
      }
      await groupFolderService.delete(deletingFolder.id, groupId);

      queryClient.invalidateQueries({
        queryKey: ["group-folders", groupId],
      });

      setIsDeleteFolderOpen(false);
      setDeletingFolder(null);
    } catch (error) {
      console.error("Lỗi khi xóa thư mục nhóm:", error);
    } finally {
      setIsDeletingFolder(false);
    }
  };

  const handleRenameDocument = (
    docId: string | number,
    currentTitle: string,
  ) => {
    setRenamingGroupDoc({ id: docId, title: currentTitle });
    setIsGroupRenameModalOpen(true);
  };

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

  const handleFolderSubmit = async (data: {
    id?: number;
    name: string;
    color: string;
    tagIds: number[];
  }) => {
    await saveFolderMutation.mutateAsync(data);
  };

  const handleCreateGroupTag = async (name: string) => {
    try {
      const res: any = await groupTagService.create(
        { name, color: "#e5e7eb" },
        groupId,
      );

      queryClient.invalidateQueries({ queryKey: ["workspace-tags", groupId] });

      const realTagId = res.tag_id ?? res.tag?.id ?? res.id;
      const realTagName = res.tag?.name ?? res.name;

      return { id: realTagId, name: realTagName };
    } catch (error) {
      console.error("Lỗi tạo tag nhóm:", error);
      throw error;
    }
  };

  const createFolderMutation = useMutation({
    mutationFn: async (data: { name: string; color?: string; tagIds?: number[] }) => {
      return groupFolderService.create(
        {
          name: data.name,
          color: data.color,
          tag_ids: data.tagIds,
        },
        groupId,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-folders", groupId] });
    },
  });

  const updateFolderMutation = useMutation({
    mutationFn: async (data: { id: number; name: string; color?: string; tagIds?: number[] }) => {
      return groupFolderService.update(
        data.id,
        {
          name: data.name,
          color: data.color,
          tag_ids: data.tagIds,
        },
        groupId,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-folders", groupId] });
    },
  });

  return {
    groupId,
    navigate,
    activeTab,
    queryClient,
    selectedFolderId,
    setSelectedFolderId,
    handleSelectFolder,
    searchQuery,
    setSearchQuery,
    selectedTagId,
    setSelectedTagId,
    selectedFileType,
    setSelectedFileType,
    activeDocumentTab,
    setActiveDocumentTab,

    // TRẢ VỀ CÁC STATE VÀ SETTER MỚI
    selectedUploadTime,
    setSelectedUploadTime,
    selectedAccessTime,
    setSelectedAccessTime,
    selectedUploaderId,
    setSelectedUploaderId,

    shareModal,
    setShareModal,
    isFolderModalOpen,
    setIsFolderModalOpen,
    isUploadModalOpen,
    setIsUploadModalOpen,
    editingFolder,
    setEditingFolder,
    deletingFolder,
    isDeleteFolderOpen,
    isDeletingFolder,
    workspaceTags,
    fileTypes,
    groupTags,
    workspace,
    workspaceLoading,
    workspaceError,
    docsLoading,
    foldersData,
    foldersLoading,
    documents,
    folders,
    members,
    invitations,
    isOwner,
    permission,
    canManageDocuments,
    trash,
    filteredDocuments,
    saveDocument,
    deleteDocument,
    setTab,
    handleFolderAction,
    handleCancelDeleteFolder,
    handleConfirmDeleteFolder,
    isGroupRenameModalOpen,
    setIsGroupRenameModalOpen,
    renamingGroupDoc,
    setRenamingGroupDoc,
    renameGroupDocumentMutation,
    handleRenameDocument,
    uploadMutation,
    createTagMutation,
    handleFolderSubmit,
    handleCreateGroupTag,
    isSubmittingFolder: saveFolderMutation.isPending,
    createFolderMutation,
    updateFolderMutation,
    groups,
  };
}