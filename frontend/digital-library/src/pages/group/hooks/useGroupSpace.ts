// frontend/digital-library/src/pages/group/hooks/useGroupSpace.ts

import { useEffect, useState } from "react";
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
import type { PermissionLevel } from "@/types/group";
import type { GroupTab } from "../types/groupSpace.types";
import type { TabKey } from "@/hooks/useDocumentFilters";

export function useGroupSpace() {
  // --------------------------------------------------------------------------
  // 1. ROUTING & NAVIGATION
  // --------------------------------------------------------------------------
  const { id } = useParams<{ id: string }>();
  const groupId = Number(id);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as GroupTab) || "documents";

  // --------------------------------------------------------------------------
  // 2. GLOBAL STORES & QUERY CLIENT
  // --------------------------------------------------------------------------
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);

  // --------------------------------------------------------------------------
  // 3. LOCAL STATES & FILTERS
  // --------------------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<string | null>(null);
  const [activeDocumentTab, setActiveDocumentTab] = useState<TabKey>("all");

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

  // Quản lý Đổi tên tài liệu nhóm (Sử dụng chung RenameDocumentModal)
  const [isGroupRenameModalOpen, setIsGroupRenameModalOpen] = useState(false);
  const [renamingGroupDoc, setRenamingGroupDoc] = useState<{
    id: string | number;
    title: string;
  } | null>(null);

  // --------------------------------------------------------------------------
  // 4. QUERIES (FETCHING DATA - Phần phụ thuộc dữ liệu cơ bản)
  // --------------------------------------------------------------------------
  const { data: workspaceTags = [] } = useQuery({
    queryKey: ["workspace-tags", groupId],
    queryFn: () => groupTagService.getWorkspaceTags(Number(groupId)),
    enabled: !!groupId,
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

  // --------------------------------------------------------------------------
  // 5. DERIVED DATA & PERMISSIONS (Được đưa lên trước Trash Query để xác định isOwner)
  // --------------------------------------------------------------------------
  const documents = documentsData?.items ?? [];
  const folders = foldersData;
  const members = membersData;
  const invitations = invitationsData;
  const groupTags = groupTagsData;

  const currentMember = members.find((m) => m.user_id === currentUser?.id);
  const isOwner =
    currentMember?.is_owner ??
    (!!workspace?.owner_id && workspace.owner_id === currentUser?.id);
  const permission: PermissionLevel = currentMember?.permission_level ?? "view";
  const canManageDocuments = isOwner || permission === "full";

  // --------------------------------------------------------------------------
  // 6. TRASH QUERY (Đặt ở đây vì đã có biến isOwner được khai báo ở trên)
  // --------------------------------------------------------------------------
  const { data: trashData = [] } = useQuery({
    queryKey: ["group-trash", groupId],
    queryFn: () => groupService.getTrash(groupId),
    enabled: isOwner,
  });

  const trash = trashData;

  // Lọc tài liệu tổng hợp theo Search, Tag, FileType, Tab
  const filteredDocuments = (documents || []).filter((doc: any) => {
    const docName = doc.title || doc.name || "";
    if (
      searchQuery &&
      !docName.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    if (selectedTagId !== null) {
      const hasTag = doc.tags?.some(
        (t: any) => t.id === selectedTagId || t.tag_id === selectedTagId,
      );
      if (!hasTag) return false;
    }

    if (selectedFileType !== null) {
      const fileType = doc.file_type || doc.rawType;
      if (fileType !== selectedFileType) return false;
    }

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

    return true;
  });

  // --------------------------------------------------------------------------
  // 7. EFFECTS & NAVIGATION GUARDS
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!id || isNaN(groupId)) {
      navigate("/groups", { replace: true });
    }
  }, [id, groupId, navigate]);

  // --------------------------------------------------------------------------
  // 8. MUTATIONS (ACTIONS: SAVE, DELETE, RENAME)
  // --------------------------------------------------------------------------
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
    onError: (error) => {
      console.error("Lỗi khi đổi tên tài liệu nhóm:", error);
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

  // --------------------------------------------------------------------------
  // 9. EVENT HANDLERS (FOLDERS & DOCUMENTS)
  // --------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------
  // 10. RETURN VALUES (EXPOSED TO GROUP SPACE COMPONENT)
  // --------------------------------------------------------------------------
  return {
    groupId,
    navigate,
    activeTab,
    queryClient,
    searchQuery,
    setSearchQuery,
    selectedTagId,
    setSelectedTagId,
    selectedFileType,
    setSelectedFileType,
    activeDocumentTab,
    setActiveDocumentTab,
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
  };
}
