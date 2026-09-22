// src/pages/group/hooks/useGroupData.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { groupService } from "@/services/groupService";
import { groupTagService } from "@/services/tagService";
import { documentService } from "@/services/documentService";
import { useAuthStore } from "@/stores/authStore";
import type { GroupListItem, PermissionLevel } from "@/types/group";

export function useGroupData(groupId: number) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);

  const { data: cachedGroups = [] } = useQuery<GroupListItem[]>({
    queryKey: ["groups"],
    queryFn: groupService.getAll,
    enabled: false,
  });

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

  const { data: groupTags = [] } = useQuery({
    queryKey: ["group-tags", groupId],
    queryFn: () => groupTagService.getAll(groupId),
    enabled: !isNaN(groupId),
  });

  const { data: workspace, isLoading: workspaceLoading, isError: workspaceError } = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => groupService.getById(groupId),
    enabled: !isNaN(groupId),
  });

  const { data: members = [] } = useQuery({
    queryKey: ["group-members", groupId],
    queryFn: () => groupService.getMembers(groupId),
    enabled: !!workspace,
  });

  const { data: invitations = [] } = useQuery({
    queryKey: ["my-invitations"],
    queryFn: groupService.getMyInvitations,
  });

  const currentMember = members.find((m) => m.user_id === currentUser?.id);
  const isOwner = currentMember?.is_owner ?? (!!workspace?.owner_id && workspace.owner_id === currentUser?.id);
  const permission: PermissionLevel = currentMember?.permission_level ?? "view";
  const canManageDocuments = isOwner || permission === "full";

  const { data: trash = [] } = useQuery({
    queryKey: ["group-trash", groupId],
    queryFn: () => groupService.getTrash(groupId),
    enabled: isOwner,
  });

  const createTagMutation = useMutation({
    mutationFn: (name: string) => groupTagService.create({ name, color: "#2F6B3C" }, groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-tags", groupId] });
      queryClient.invalidateQueries({ queryKey: ["workspace-tags", groupId] });
    },
  });

  const handleCreateGroupTag = async (name: string) => {
    const res: any = await groupTagService.create({ name, color: "#e5e7eb" }, groupId);
    queryClient.invalidateQueries({ queryKey: ["workspace-tags", groupId] });
    return {
      id: res.tag_id ?? res.tag?.id ?? res.id,
      name: res.tag?.name ?? res.name,
    };
  };

  return {
    workspace, workspaceLoading, workspaceError,
    members, invitations, groups: cachedGroups,
    workspaceTags, fileTypes, groupTags,
    isOwner, permission, canManageDocuments, trash,
    createTagMutation, handleCreateGroupTag,
  };
}