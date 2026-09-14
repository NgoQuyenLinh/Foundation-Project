// frontend/digital-library/src/pages/group/components/MembersTab.tsx

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dropdown } from "@/components/ui/Dropdown";
import { groupService } from "@/services/groupService";
import { formatRelativeDate } from "@/utils/formatDate";
import type { PermissionLevel } from "@/types/group";
import type { MembersTabProps } from "../types/groupSpace.types";

export default function MembersTab({
  members,
  isOwner,
  onInvite,
  groupId,
}: MembersTabProps) {
  const queryClient = useQueryClient();
  const onSuccess = () =>
    queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });

  const updatePermission = useMutation({
    mutationFn: ({
      userId,
      permission,
    }: {
      userId: number;
      permission: PermissionLevel;
    }) => groupService.updateMemberPermission(groupId, userId, permission),
    onSuccess,
  });

  const removeMember = useMutation({
    mutationFn: (userId: number) => groupService.removeMember(groupId, userId),
    onSuccess,
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {isOwner && (
          <Button icon={<UserPlus className="h-4 w-4" />} onClick={onInvite}>
            + Mời thành viên
          </Button>
        )}
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-gray-50 text-xs font-semibold text-gray-500">
            <tr>
              <th className="px-4 py-3">Thành viên</th>
              <th>Vai trò</th>
              <th>Quyền hạn</th>
              <th>Tham gia lúc</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.map((member) => (
              <tr key={member.user_id}>
                <td className="px-4 py-3">
                  <div className="font-semibold text-gray-900">
                    {member.full_name || member.username}
                  </div>
                  <div className="text-xs text-gray-400">
                    {member.student_code}
                  </div>
                </td>
                <td>
                  <Badge
                    variant={
                      member.is_owner
                        ? "primary"
                        : member.permission_level === "full"
                          ? "success"
                          : "default"
                    }
                  >
                    {member.role}
                  </Badge>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        member.permission_level === "full"
                          ? "primary"
                          : "default"
                      }
                    >
                      {member.permission_level === "full"
                        ? "Full (Toàn quyền)"
                        : "View (Chỉ xem)"}
                    </Badge>
                    {isOwner && !member.is_owner && (
                      <Dropdown
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        }
                        items={[
                          {
                            label: "Đổi sang View",
                            onClick: () =>
                              updatePermission.mutate({
                                userId: member.user_id,
                                permission: "view",
                              }),
                          },
                          {
                            label: "Đổi sang Full",
                            onClick: () =>
                              updatePermission.mutate({
                                userId: member.user_id,
                                permission: "full",
                              }),
                          },
                        ]}
                      />
                    )}
                  </div>
                </td>
                <td className="text-gray-500">
                  {formatRelativeDate(member.joined_at)}
                </td>
                <td>
                  {isOwner && !member.is_owner && (
                    <button
                      className="text-sm font-medium text-red-500 hover:text-red-600 disabled:opacity-50"
                      disabled={removeMember.isPending}
                      onClick={() => removeMember.mutate(member.user_id)}
                    >
                      Xóa
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card className="text-xs text-gray-500">
        <p className="font-semibold text-gray-700">Chú thích quyền hạn:</p>
        <p className="mt-1">
          Full: upload, sửa, xóa, chỉnh sửa và chia sẻ tài liệu của nhóm. View:
          chỉ xem, tải và lưu tài liệu về kho cá nhân.
        </p>
      </Card>
    </div>
  );
}
