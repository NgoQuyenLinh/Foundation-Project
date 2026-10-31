// src/components/shared/documents/DocumentDetail/tabs/TabPanels.tsx

import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import EmptyState from "@/components/shared/feedback/EmptyState";
import { activityService } from "@/services/activityService";
import { formatRelativeDate } from "@/utils/formatDate";
import { cn } from "@/utils/cn";

const ACTION_LABELS: Record<string, string> = {
  DOCUMENT_VIEWED: "đã xem tài liệu",
  DOCUMENT_DOWNLOADED: "đã tải xuống tài liệu",
  DOCUMENT_SAVED: "đã lưu về cá nhân",
  DOCUMENT_SHARED: "đã chia sẻ vào nhóm",
  DOCUMENT_CONTRIBUTED: "đã đóng góp vào kho học liệu",
  DOCUMENT_RENAMED: "đã đổi tên",
  DOCUMENT_DELETED: "đã xóa tài liệu",
  DOCUMENT_RESTORED: "đã khôi phục",
  TAG_ADDED: "đã gắn nhãn",
  TAG_REMOVED: "đã gỡ nhãn",
  BUNDLE_CREATED: "đã tạo gói tài liệu",
  DOCUMENT_UPLOADED: "đã tải lên tài liệu",
  view: "đã xem tài liệu",
  download: "đã tải xuống tài liệu",
};

const ACTION_COLORS: Record<string, string> = {
  DOCUMENT_VIEWED: "bg-blue-500",
  DOCUMENT_DOWNLOADED: "bg-purple-500",
  DOCUMENT_UPLOADED: "bg-green-500",
  DOCUMENT_SAVED: "bg-teal-500",
  DOCUMENT_SHARED: "bg-orange-500",
  DOCUMENT_CONTRIBUTED: "bg-amber-500",
  DOCUMENT_DELETED: "bg-red-400",
  DOCUMENT_RESTORED: "bg-emerald-400",
  TAG_ADDED: "bg-gray-400",
  TAG_REMOVED: "bg-gray-300",
  BUNDLE_CREATED: "bg-purple-300",
  view: "bg-blue-500",
  download: "bg-purple-500",
};

/**
 * TabDescription - Hiển thị mô tả chi tiết của tài liệu
 */
export function TabDescription({ description }: { description: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Mô tả chi tiết
      </h3>
      <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

/**
 * TabNote - Ghi chú cá nhân của người dùng về tài liệu
 */
export function TabNote() {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Ghi chú cá nhân
      </h3>
      <textarea
        className="w-full rounded-lg border border-gray-200 p-3 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none"
        rows={6}
        placeholder="Nhập ghi chú của bạn về tài liệu này..."
      />
    </div>
  );
}

/**
 * TabActivity - Lịch sử hoạt động tương tác với tài liệu
 */
export function TabActivity({ documentId }: { documentId?: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["document-activities", documentId],
    queryFn: () =>
      activityService.getDocumentActivities(documentId!, { page_size: 20 }),
    enabled: !!documentId,
  });

  const activities = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          Lịch sử hoạt động
        </h3>
        {activities.length > 0 && (
          <span className="text-xs text-gray-500">
            {data?.total ?? activities.length} lượt ghi nhận
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3 pt-2">
          <div className="h-4 w-3/4 rounded bg-gray-100 animate-pulse" />
          <div className="h-4 w-1/2 rounded bg-gray-100 animate-pulse" />
          <div className="h-4 w-2/3 rounded bg-gray-100 animate-pulse" />
        </div>
      ) : activities.length === 0 ? (
        <EmptyState
          icon={<Activity className="h-6 w-6" />}
          title="Chưa có hoạt động nào"
          description="Tài liệu này chưa có lượt tương tác nào được ghi nhận."
        />
      ) : (
        <div className="divide-y divide-gray-100">
          {activities.map((a) => {
            const actionText =
              ACTION_LABELS[a.action] ||
              a.action.toLowerCase().replace(/_/g, " ");
            const dotColor = ACTION_COLORS[a.action] || "bg-gray-400";
            const actor = a.actor_name || "Người dùng";
            const relativeTime = formatRelativeDate(a.created_at);

            return (
              <div
                key={a.id}
                className="flex items-center justify-between text-sm py-3"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-3">
                  <span
                    className={cn("h-2 w-2 rounded-full shrink-0", dotColor)}
                  />
                  <span className="truncate">
                    <span className="font-medium text-gray-900">{actor}</span>{" "}
                    <span className="text-gray-600">{actionText}</span>
                  </span>
                </div>
                <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap">
                  {relativeTime}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
