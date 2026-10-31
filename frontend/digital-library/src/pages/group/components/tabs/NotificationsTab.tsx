// frontend/digital-library/src/pages/group/components/NotificationsTab.tsx

import { useState } from "react";
import { Check, X, Users, BellOff, ChevronDown, ChevronUp, Clock, User, Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { groupService } from "@/services/groupService";
import type { WorkspaceInvitation } from "@/types/group";
import { cn } from "@/utils/cn";
import { formatRelativeDate } from "@/utils/formatDate";

interface NotificationsTabProps {
  invitations?: WorkspaceInvitation[];
  onActionSuccess?: () => void;
}

export function NotificationsTab({ invitations = [], onActionSuccess }: NotificationsTabProps) {
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [localReadIds, setLocalReadIds] = useState<number[]>([]);
  // Lưu danh sách ID đã ấn chấp nhận/từ chối để ẩn ngay lập tức khỏi UI
  const [processedIds, setProcessedIds] = useState<number[]>([]);

  const handleCardClick = (id: number) => {
    if (!localReadIds.includes(id)) {
      setLocalReadIds((prev) => [...prev, id]);
    }
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleAccept = async (e: React.MouseEvent, invitationId: number) => {
    e.stopPropagation();
    try {
      setLoadingId(invitationId);
      await groupService.acceptInvitation(invitationId);
      setProcessedIds((prev) => [...prev, invitationId]); // Ẩn ngay lập tức
      onActionSuccess?.();
    } catch (error) {
      console.error("Lỗi khi chấp nhận lời mời:", error);
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (e: React.MouseEvent, invitationId: number) => {
    e.stopPropagation();
    try {
      setLoadingId(invitationId);
      await groupService.rejectInvitation(invitationId);
      setProcessedIds((prev) => [...prev, invitationId]); // Ẩn ngay lập tức
      onActionSuccess?.();
    } catch (error) {
      console.error("Lỗi khi từ chối lời mời:", error);
    } finally {
      setLoadingId(null);
    }
  };

  // Lọc bỏ những thông báo đã được xử lý (chấp nhận/từ chối)
  const visibleInvitations = invitations.filter((inv) => !processedIds.includes(inv.id));

  if (!visibleInvitations || visibleInvitations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
          <BellOff className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-gray-900">Không có thông báo mới</h3>
        <p className="mt-1 text-sm text-gray-500">Bạn chưa có lời mời tham gia nhóm nào.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {visibleInvitations.map((inv) => {
        const isLoading = loadingId === inv.id;
        const groupName = inv.workspace_name || "Nhóm không tên";
        const isRead = localReadIds.includes(inv.id);
        const isExpanded = expandedId === inv.id;

        return (
          <Card 
            key={inv.id} 
            className={cn(
              "p-4 transition-all duration-200 cursor-pointer overflow-hidden",
              !isRead 
                ? "border-primary-500 bg-primary-50/30 shadow-sm" 
                : "border-gray-200 bg-white hover:border-gray-300",
              isExpanded && "border-primary-500 ring-1 ring-primary-500"
            )}
            onClick={() => handleCardClick(inv.id)}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  !isRead ? "bg-primary-100 text-primary-700" : "bg-gray-100 text-gray-600"
                )}>
                  <Users className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className={cn("text-sm truncate", !isRead ? "font-bold text-gray-900" : "font-medium text-gray-700")}>
                    Bạn nhận được lời mời tham gia nhóm{" "}
                    <span className="font-semibold text-primary-600">
                      {groupName}
                    </span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Quyền hạn: {inv.permission_level === "full" ? "Toàn quyền" : "Chỉ xem"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="primary"
                  disabled={isLoading}
                  onClick={(e) => handleAccept(e, inv.id)}
                  icon={<Check className="h-4 w-4" />}
                >
                  Chấp nhận
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isLoading}
                  onClick={(e) => handleReject(e, inv.id)}
                  icon={<X className="h-4 w-4" />}
                >
                  Từ chối
                </Button>
                <div className="ml-2 text-gray-400">
                  {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="font-medium text-gray-900 w-24">Người gửi:</span>
                  <span className="truncate">{inv.invited_by_name || "Không xác định"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 opacity-60">
                  <Shield className="h-4 w-4 text-gray-400" />
                  <span className="font-medium text-gray-900 w-24">Trưởng nhóm:</span>
                  <span className="truncate italic">Đang cập nhật...</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 opacity-60">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="font-medium text-gray-900 w-24">Thành viên:</span>
                  <span className="italic">Đang cập nhật...</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="font-medium text-gray-900 w-24">Thời gian:</span>
                  <span>{inv.created_at ? formatRelativeDate(inv.created_at) : "Vừa xong"}</span>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}