import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { groupService } from "@/services/groupService";
import { formatRelativeDate } from "@/utils/formatDate";
import type { RequestsTabProps } from "../../types/groupSpace.types";

export default function RequestsTab({ invitations }: RequestsTabProps) {
  const queryClient = useQueryClient();
  const accept = useMutation({
    mutationFn: groupService.acceptInvitation,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["my-invitations"] }),
  });
  const reject = useMutation({
    mutationFn: groupService.rejectInvitation,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["my-invitations"] }),
  });
  const pending = invitations.filter((item) => item.status === "pending");

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-gray-900">
        Lời mời đang chờ phản hồi
      </h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {pending.map((invitation) => (
          <Card key={invitation.id} className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {invitation.workspace_name}
                </h3>
                <p className="text-xs text-gray-400">
                  Mời bởi {invitation.invited_by_name}
                </p>
              </div>
            </div>
            <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
              {invitation.message}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                Gửi lúc: {formatRelativeDate(invitation.created_at)}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => reject.mutate(invitation.id)}
                >
                  Từ chối
                </Button>
                <Button size="sm" onClick={() => accept.mutate(invitation.id)}>
                  Chấp nhận
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
