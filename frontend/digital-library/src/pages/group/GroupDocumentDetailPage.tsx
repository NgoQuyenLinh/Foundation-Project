// src/pages/group/GroupDocumentDetailPage.tsx

import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DocumentDetail } from "@/components/shared/documents/DocumentDetail";
import { groupService } from "@/services/groupService";
import { useAuthStore } from "@/stores/authStore";

export default function GroupDocumentDetailPage() {
  // Đường dẫn dạng: /groups/:id/documents/:docId
  const { id, docId } = useParams<{ id: string; docId: string }>();
  const groupId = Number(id);
  const numericDocId = Number(docId);
  const currentUser = useAuthStore((state) => state.user);

  // 1. Fetch thông tin workspace & thành viên để kiểm tra quyền hạn
  const { data: workspace } = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => groupService.getById(groupId),
    enabled: !isNaN(groupId),
  });

  const { data: members = [] } = useQuery({
    queryKey: ["group-members", groupId],
    queryFn: () => groupService.getMembers(groupId),
    enabled: !isNaN(groupId),
  });

  // 2. Tính toán quyền (tương tự như trong useGroupSpace.ts)
  const currentMember = members.find((m) => m.user_id === currentUser?.id);
  const isOwner =
    currentMember?.is_owner ??
    (!!workspace?.owner_id && workspace.owner_id === currentUser?.id);
  const permission = currentMember?.permission_level ?? "view";
  const canManageDocuments = isOwner || permission === "full";

  return (
    <DocumentDetail
      documentId={numericDocId}

      // Đẩy các hàm API của groupService vào
      fetchDocumentFn={(dId) => groupService.getDocumentById(groupId, dId)}
      updateDocumentFn={(dId, data) => groupService.updateDocument(groupId, dId, data)}
      deleteDocumentFn={(dId) => groupService.deleteDocument(groupId, dId)}
      updateTagsFn={(dId, tagIds) => groupService.updateTags(groupId, dId, tagIds)}
      removeTagFn={(dId, tagId) => groupService.removeTag(groupId, dId, tagId)}
      updateThumbnailPageFn={(dId, page) => groupService.updateThumbnailPage(groupId, dId, page)}

      // Prefix cache riêng để không bị đụng độ với tài liệu Cá nhân
      queryKeyPrefix={["group-document", String(groupId)]}

      // Phân quyền xem/sửa dựa theo vai trò trong nhóm
      permissions={{
        canEdit: canManageDocuments,
        canDelete: canManageDocuments,
        canManageTags: canManageDocuments,
      }}

      // Điều hướng quay lại tab Tài liệu của Nhóm
      backUrl={`/groups/${groupId}?tab=documents`}
    />
  );
}