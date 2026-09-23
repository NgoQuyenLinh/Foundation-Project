// src/pages/personal/BundleDetailPage.tsx

import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Package,
  Edit2,
  Trash2,
  Files,
  HardDrive,
  Clock,
  Search,
  FileX,
  Tag as TagIcon,
  Plus,
  Upload,
  Download,
  FolderInput,
  Unlink,
} from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DocumentCard } from "@/components/shared/DocumentCard";
import {
  DocumentListView,
  type DocumentListItem,
} from "@/components/shared/DocumentListView";
import { ViewToggle, type ViewMode } from "@/components/shared/ViewToggle";
import EmptyState from "@/components/shared/EmptyState";
import { RenameDocumentModal } from "@/components/shared/RenameDocumentModal";
import { CardSkeleton } from "@/components/shared/CardSkeleton";
import { EditTagsModal } from "@/components/shared/EditTagsModal";
import { AddToBundleModal } from "@/components/shared/AddToBundleModal";

import { documentService } from "@/services/documentService";
import { groupService } from "@/services/groupService";
import { useAuthStore } from "@/stores/authStore";
import { formatSize } from "@/utils/formatSize";
import { formatRelativeDate } from "@/utils/formatDate";
import { cn } from "@/utils/cn";
import type { Document } from "@/types/document";
import type { DocumentAction } from "@/components/shared/DocumentContextMenu";

export default function BundleDetailPage() {
  const params = useParams<{ id?: string; docId?: string; groupId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const addMenuRef = useRef<HTMLDivElement>(null);

  const bundleId = Number(params.docId ?? params.id);
  const rawGroupId = params.groupId ?? (params.docId ? params.id : undefined);
  const groupId = rawGroupId ? Number(rawGroupId) : undefined;
  const isGroup = !!groupId && !isNaN(groupId);

  // ─── States ─────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRenameBundleOpen, setIsRenameBundleOpen] = useState(false);
  const [isDeleteBundleOpen, setIsDeleteBundleOpen] = useState(false);
  const [renamingChild, setRenamingChild] = useState<Document | null>(null);
  const [deletingChild, setDeletingChild] = useState<Document | null>(null);
  const [isEditTagsOpen, setIsEditTagsOpen] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isAddFromPersonalOpen, setIsAddFromPersonalOpen] = useState(false);
  const [removingChild, setRemovingChild] = useState<Document | null>(null);
  const addFileInputRef = useRef<HTMLInputElement>(null);

  // ─── Group info ─────────────────────────────────────────────────────
  const { data: workspace } = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => groupService.getById(groupId!),
    enabled: isGroup,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["group-members", groupId],
    queryFn: () => groupService.getMembers(groupId!),
    enabled: isGroup,
  });

  const isOwner =
    !isGroup ||
    members.find((m) => m.user_id === currentUser?.id)?.is_owner ||
    workspace?.owner_id === currentUser?.id;
  const permission =
    members.find((m) => m.user_id === currentUser?.id)?.permission_level ??
    "view";
  const canManage = !isGroup || isOwner || permission === "full";

  // ─── Query Keys ─────────────────────────────────────────────────────
  const bundleQueryKey = isGroup
    ? ["group-document", String(groupId), bundleId]
    : ["document", bundleId];

  const childrenQueryKey = isGroup
    ? ["group-bundle-children", String(groupId), bundleId]
    : ["bundle-children", bundleId];

  // ─── Fetch bundle ───────────────────────────────────────────────────
  const {
    data: bundle,
    isLoading: isBundleLoading,
    isError: isBundleError,
  } = useQuery<Document>({
    queryKey: bundleQueryKey,
    queryFn: () =>
      isGroup
        ? groupService.getDocumentById(groupId!, bundleId)
        : documentService.getById(bundleId),
    enabled: !isNaN(bundleId) && bundleId > 0,
  });

  // ─── Fetch children ─────────────────────────────────────────────────
  const {
    data: children = [],
    isLoading: isChildrenLoading,
    isFetching: isChildrenFetching,
  } = useQuery<Document[]>({
    queryKey: childrenQueryKey,
    queryFn: () =>
      isGroup
        ? groupService.getBundleChildren(groupId!, bundleId)
        : documentService.getBundleChildren(bundleId),
    enabled: !isNaN(bundleId) && bundleId > 0 && !!bundle?.is_bundle,
  });

  // ─── Mutations ──────────────────────────────────────────────────────
  const renameBundleMutation = useMutation({
    mutationFn: (newTitle: string) =>
      isGroup
        ? groupService.updateDocument(groupId!, bundleId, { title: newTitle })
        : documentService.update(bundleId, { title: newTitle }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bundleQueryKey });
      queryClient.invalidateQueries({
        queryKey: isGroup ? ["group-documents", groupId] : ["documents"],
      });
      setIsRenameBundleOpen(false);
    },
  });

  const deleteBundleMutation = useMutation({
    mutationFn: () =>
      isGroup
        ? groupService.deleteDocument(groupId!, bundleId)
        : documentService.delete(bundleId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: isGroup ? ["group-documents", groupId] : ["documents"],
      });
      navigate(isGroup ? `/groups/${groupId}?tab=documents` : "/personal/documents");
    },
  });

  const renameChildMutation = useMutation({
    mutationFn: ({ childId, title }: { childId: number; title: string }) =>
      isGroup
        ? groupService.updateDocument(groupId!, childId, { title })
        : documentService.update(childId, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: childrenQueryKey });
      setRenamingChild(null);
    },
  });

  const deleteChildMutation = useMutation({
    mutationFn: (childId: number) =>
      isGroup
        ? groupService.deleteDocument(groupId!, childId)
        : documentService.delete(childId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: childrenQueryKey });
      queryClient.invalidateQueries({ queryKey: bundleQueryKey });
      setDeletingChild(null);
    },
  });

  // Phase 6 — Tách khỏi gói
  const removeFromBundleMutation = useMutation({
    mutationFn: (childId: number) =>
      documentService.removeFromBundle(childId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: childrenQueryKey });
      queryClient.invalidateQueries({ queryKey: bundleQueryKey });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setRemovingChild(null);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Không thể tách tài liệu khỏi gói.";
      alert(msg);
    },
  });

  // Phase 4 — Thêm file mới
  const addFilesMutation = useMutation({
    mutationFn: (formData: FormData) =>
      documentService.addFilesToBundle(bundleId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: childrenQueryKey });
      queryClient.invalidateQueries({ queryKey: bundleQueryKey });

    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Không thể thêm file. Vui lòng thử lại.";
      alert(msg);
    },
  });

  const handleAddFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? []);
    if (selectedFiles.length === 0) return;

    const formData = new FormData();
    selectedFiles.forEach((f) => formData.append("files", f));
    addFilesMutation.mutate(formData);
    e.target.value = "";
  };

  // ─── Handlers ───────────────────────────────────────────────────────
  const handleBack = () => {
    navigate(isGroup ? `/groups/${groupId}?tab=documents` : "/personal/documents");
  };

  const handleChildAction = (action: DocumentAction | string, docId: string | number) => {
    const childId = Number(docId);
    const child = children.find((c) => c.id === childId);
    if (!child) return;

    switch (action) {
      case "view":
        navigate(
          isGroup
            ? `/groups/${groupId}/documents/${childId}`
            : `/personal/documents/${childId}`
        );
        break;
      case "download":
        if (child.file_path) {
          const downloadUrl = `${import.meta.env.VITE_API_URL}/${child.file_path}`;
          window.open(downloadUrl, "_blank");
        }
        break;
      case "rename":
        setRenamingChild(child);
        break;
      case "delete":
        setDeletingChild(child);
        break;
      case "remove-from-bundle":
        setRemovingChild(child);
        break;
      default:
        break;
    }
  };

  // ─── Loading state ──────────────────────────────────────────────────
  if (isBundleLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-6 w-32 rounded bg-gray-200 animate-pulse" />
        <div className="h-44 rounded-2xl bg-purple-50/50 border border-purple-100 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} variant="document" />
          ))}
        </div>
      </div>
    );
  }

  if (isBundleError || !bundle) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="rounded-full bg-red-50 p-3 text-red-500">
          <FileX className="h-8 w-8" />
        </div>
        <p className="text-gray-600 font-medium">Không tìm thấy gói tài liệu.</p>
        <Button variant="outline" size="sm" onClick={handleBack}>
          ← Quay lại danh sách
        </Button>
      </div>
    );
  }

  // ─── Filter & map ───────────────────────────────────────────────────
  const filteredChildren = children.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const basePath = isGroup
    ? `/groups/${groupId}/documents`
    : "/personal/documents";

  const mappedCardItems = filteredChildren.map((child) => ({
    id: String(child.id),
    name: child.title,
    type: child.file_type || "file",
    updatedAt: child.updated_at || child.created_at,
    size: formatSize(child.file_size || 0),
    thumbnail_path: child.thumbnail_path,
    tags: child.tags,
    is_bundle: false,
  }));

  const mappedListItems: DocumentListItem[] = filteredChildren.map((child) => ({
    id: String(child.id),
    title: child.title,
    type: child.file_type || "file",
    updatedAt: child.updated_at || child.created_at,
    size: child.file_size,
    thumbnail_path: child.thumbnail_path,
    owner: child.owner ? { full_name: child.owner.full_name || child.owner.username } : undefined,
    tags: child.tags,
    workspace_type: isGroup ? "group" : "personal",
    is_bundle: false,
  }));

  const extraItems = !isGroup
    ? [
        {
          action: "remove-from-bundle",
          icon: <Unlink className="h-4 w-4" />,
          label: "Tách khỏi gói",
        },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6 pb-20">
      {/* 1. Back button */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="text-gray-600 hover:text-gray-900 gap-1.5 pl-0"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại {isGroup ? "nhóm" : "tài liệu cá nhân"}</span>
        </Button>
      </div>

      {/* 2. Bundle Header Banner */}
      <Card className="p-6 rounded-2xl border border-purple-200/80 bg-gradient-to-br from-purple-50/60 via-white to-purple-50/30 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-600/20">
              <Package className="h-7 w-7" />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wider uppercase bg-purple-100 text-purple-700 border border-purple-200">
                  Gói tài liệu
                </span>
                {bundle.tags && bundle.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {bundle.tags.map((t) => (
                      <span
                        key={t.id}
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium text-white shadow-xs"
                        style={{ backgroundColor: t.color || "#7c3aed" }}
                      >
                        {t.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
                {bundle.title}
              </h1>

              {bundle.description && (
                <p className="text-sm text-gray-600 mt-1">{bundle.description}</p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          {canManage && (
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0 flex-wrap">
              {/* Phase 2 — Edit tags */}
              {!isGroup && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditTagsOpen(true)}
                  className="gap-1.5 text-purple-700 border-purple-200 hover:bg-purple-50"
                >
                  <TagIcon className="h-3.5 w-3.5" />
                  <span>Sửa tags</span>
                </Button>
              )}

              {/* Phase 5 — Download ZIP */}
              {!isGroup && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => documentService.downloadZip(bundleId)}
                  className="gap-1.5 text-blue-700 border-blue-200 hover:bg-blue-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Tải về ZIP</span>
                </Button>
              )}

              {/* Phase 4 — Add documents dropdown */}
              {!isGroup && (
                <div className="relative" ref={addMenuRef}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddMenuOpen((v) => !v)}
                    className="gap-1.5 text-green-700 border-green-200 hover:bg-green-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Thêm tài liệu</span>
                  </Button>

                  {isAddMenuOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-56 rounded-xl bg-white shadow-lg border border-gray-100 z-30 overflow-hidden">
                      {/* Upload new files */}
                      <button
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                        onClick={() => {
                          setIsAddMenuOpen(false);
                          addFileInputRef.current?.click();
                        }}
                      >
                        <Upload className="h-4 w-4 text-gray-400 shrink-0" />
                        <div>
                          <p className="font-medium">Tải file mới lên</p>
                          <p className="text-xs text-gray-400">Upload file vào gói</p>
                        </div>
                      </button>
                      {/* Add from personal */}
                      <button
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left border-t border-gray-50"
                        onClick={() => {
                          setIsAddMenuOpen(false);
                          setIsAddFromPersonalOpen(true);
                        }}
                      >
                        <FolderInput className="h-4 w-4 text-gray-400 shrink-0" />
                        <div>
                          <p className="font-medium">Từ kho cá nhân</p>
                          <p className="text-xs text-gray-400">Chọn tài liệu sẵn có</p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRenameBundleOpen(true)}
                className="gap-1.5 text-gray-700 border-gray-200 hover:bg-gray-50"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Đổi tên</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteBundleOpen(true)}
                className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Xóa gói</span>
              </Button>
            </div>
          )}
        </div>

        {/* Meta stats */}
        <div className="mt-5 pt-4 border-t border-purple-100/80 flex items-center gap-6 flex-wrap text-xs text-gray-500 font-medium">
          <div className="flex items-center gap-1.5">
            <Files className="h-4 w-4 text-purple-600" />
            <span><strong>{children.length}</strong> tài liệu bên trong</span>
          </div>
          <div className="flex items-center gap-1.5">
            <HardDrive className="h-4 w-4 text-purple-600" />
            <span>Tổng dung lượng: <strong>{formatSize(bundle.file_size || 0)}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-purple-600" />
            <span>Tạo lúc: {formatRelativeDate(bundle.created_at)}</span>
          </div>
        </div>
      </Card>

      {/* Hidden file input for adding files */}
      <input
        ref={addFileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleAddFileChange}
      />

      {/* 3. Children Section */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <span>Danh sách tài liệu</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold">
              {filteredChildren.length}
            </span>
          </h2>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm file trong gói..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>
            <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          </div>
        </div>

        {isChildrenLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} variant="document" />
            ))}
          </div>
        ) : filteredChildren.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8">
            <EmptyState
              icon={<FileX className="h-8 w-8 text-gray-400" />}
              title={searchQuery ? "Không tìm thấy tài liệu phù hợp" : "Gói này chưa có tài liệu nào"}
              description={
                searchQuery
                  ? "Vui lòng thử tìm kiếm bằng từ khóa khác."
                  : "Các tài liệu thuộc gói này sẽ hiển thị ở đây."
              }
            />
          </div>
        ) : viewMode === "grid" ? (
          <div className={cn("grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4", isChildrenFetching && "opacity-75")}>
            {mappedCardItems.map((childDoc) => (
              <DocumentCard
                key={childDoc.id}
                document={childDoc}
                basePath={basePath}
                onAction={handleChildAction}
                extraItems={extraItems}
              />
            ))}
          </div>
        ) : (
          <div className={cn(isChildrenFetching && "opacity-75")}>
            <DocumentListView
              documents={mappedListItems}
              onAction={handleChildAction}
              extraItems={extraItems}
            />
          </div>
        )}
      </section>

      {/* ─── Modals ────────────────────────────────────────────────────── */}

      {/* Rename Bundle */}
      <RenameDocumentModal
        isOpen={isRenameBundleOpen}
        initialTitle={bundle.title}
        isPending={renameBundleMutation.isPending}
        onClose={() => setIsRenameBundleOpen(false)}
        onConfirm={(newTitle) => renameBundleMutation.mutate(newTitle)}
      />

      {/* Rename Child */}
      {renamingChild && (
        <RenameDocumentModal
          isOpen={!!renamingChild}
          initialTitle={renamingChild.title}
          isPending={renameChildMutation.isPending}
          onClose={() => setRenamingChild(null)}
          onConfirm={(newTitle) =>
            renameChildMutation.mutate({ childId: renamingChild.id, title: newTitle })
          }
        />
      )}

      {/* Phase 2 — Edit Tags */}
      {isEditTagsOpen && (
        <EditTagsModal
          bundleId={bundleId}
          bundleQueryKey={bundleQueryKey}
          childrenQueryKey={childrenQueryKey}
          currentTags={bundle.tags}
          onClose={() => setIsEditTagsOpen(false)}
        />
      )}

      {/* Phase 4b — Add from personal */}
      {isAddFromPersonalOpen && (
        <AddToBundleModal
          bundleId={bundleId}
          bundleName={bundle.title}
          childrenQueryKey={childrenQueryKey}
          bundleQueryKey={bundleQueryKey}
          onClose={() => setIsAddFromPersonalOpen(false)}
        />
      )}

      {/* Upload indicator */}
      {addFilesMutation.isPending && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-white rounded-xl shadow-xl border border-gray-100 px-4 py-3">
          <div className="h-4 w-4 rounded-full border-2 border-purple-600 border-t-transparent animate-spin" />
          <span className="text-sm font-medium text-gray-700">Đang tải file lên...</span>
        </div>
      )}

      {/* Delete Bundle Confirm */}
      {isDeleteBundleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="p-2 rounded-xl bg-red-50">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Xóa gói tài liệu?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Bạn có chắc chắn muốn xóa gói <strong>"{bundle.title}"</strong> không? Tất cả{" "}
              <strong>{children.length}</strong> tài liệu bên trong gói cũng sẽ được chuyển vào thùng rác.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setIsDeleteBundleOpen(false)}
                disabled={deleteBundleMutation.isPending}
              >
                Hủy
              </Button>
              <Button
                variant="danger"
                disabled={deleteBundleMutation.isPending}
                onClick={() => deleteBundleMutation.mutate()}
              >
                {deleteBundleMutation.isPending ? "Đang xóa..." : "Xóa gói"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Child Confirm */}
      {deletingChild && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="p-2 rounded-xl bg-red-50">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Xóa tài liệu khỏi gói?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Bạn có chắc chắn muốn xóa tài liệu <strong>"{deletingChild.title}"</strong> khỏi gói không?
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setDeletingChild(null)}
                disabled={deleteChildMutation.isPending}
              >
                Hủy
              </Button>
              <Button
                variant="danger"
                disabled={deleteChildMutation.isPending}
                onClick={() => deleteChildMutation.mutate(deletingChild.id)}
              >
                {deleteChildMutation.isPending ? "Đang xóa..." : "Xóa"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 6 — Remove from bundle confirm */}
      {removingChild && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-orange-600 mb-3">
              <div className="p-2 rounded-xl bg-orange-50">
                <Unlink className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Tách khỏi gói?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Tài liệu <strong>"{removingChild.title}"</strong> sẽ được tách ra khỏi gói và trở về kho cá nhân. Tài liệu sẽ không bị xóa.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setRemovingChild(null)}
                disabled={removeFromBundleMutation.isPending}
              >
                Hủy
              </Button>
              <Button
                variant="outline"
                disabled={removeFromBundleMutation.isPending}
                onClick={() => removeFromBundleMutation.mutate(removingChild.id)}
                className="border-orange-200 text-orange-700 hover:bg-orange-50"
              >
                {removeFromBundleMutation.isPending ? "Đang tách..." : "Tách khỏi gói"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close add menu */}
      {isAddMenuOpen && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setIsAddMenuOpen(false)}
        />
      )}
    </div>
  );
}
