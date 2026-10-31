// src/components/shared/modals/ShareDocumentModal.tsx
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { X, Share2, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { UserSearchPicker } from "./UserSearchPicker";
import { shareService } from "@/services/shareService";
import type { User } from "@/types/user";

export interface ShareDocumentModalProps {
  documentId: number;
  documentTitle: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ShareDocumentModal({
  documentId,
  documentTitle,
  onClose,
  onSuccess,
}: ShareDocumentModalProps) {
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [message, setMessage] = useState("");

  const shareMutation = useMutation({
    mutationFn: () =>
      shareService.shareDocument(documentId, {
        recipient_ids: selectedUsers.map((u) => u.id),
        message: message.trim() || undefined,
      }),
    onSuccess: (data) => {
      alert(data?.message || `Đã chia sẻ thành công cho ${selectedUsers.length} người dùng!`);
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      alert(err?.response?.data?.detail || "Có lỗi xảy ra khi chia sẻ tài liệu.");
    },
  });

  const handleSelect = (user: User) => {
    setSelectedUsers((prev) => [...prev, user]);
  };

  const handleRemove = (userId: number) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-lg overflow-visible flex flex-col max-h-[90vh]">
        {/* HEADER */}
        <div className="border-b border-gray-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Share2 className="h-5 w-5 text-primary-600" />
                Chia sẻ tài liệu
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Chia sẻ tài liệu với người dùng khác trong hệ thống
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-gray-400 hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="px-6 py-5 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          {/* Thông tin tài liệu */}
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <FileText className="h-5 w-5 text-gray-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Tài liệu được chia sẻ
              </p>
              <p className="text-sm font-medium text-gray-900 truncate mt-0.5">
                {documentTitle}
              </p>
            </div>
          </div>

          {/* Chọn người nhận */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Người nhận
            </label>
            <UserSearchPicker
              selectedUsers={selectedUsers}
              onSelect={handleSelect}
              onRemove={handleRemove}
              placeholder="Tìm kiếm người dùng theo tên, email hoặc MSSV..."
            />
            {selectedUsers.length === 0 && (
              <p className="text-xs text-gray-400">
                Chọn ít nhất một người dùng để chia sẻ tài liệu.
              </p>
            )}
          </div>

          {/* Lời nhắn */}
          <div className="space-y-1.5 pt-2 border-t border-gray-100">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Lời nhắn đính kèm (tuỳ chọn)
            </label>
            <textarea
              className="min-h-20 w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none"
              placeholder="Nhập lời nhắn gửi đến người nhận..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 bg-gray-50/50 rounded-b-2xl">
          <span className="text-xs font-medium text-gray-500">
            Đã chọn{" "}
            <strong className="text-primary-600">{selectedUsers.length}</strong>{" "}
            người nhận
          </span>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={shareMutation.isPending}
            >
              Hủy bỏ
            </Button>
            <Button
              disabled={selectedUsers.length === 0 || shareMutation.isPending}
              onClick={() => shareMutation.mutate()}
            >
              {shareMutation.isPending ? "Đang chia sẻ..." : "Chia sẻ"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
