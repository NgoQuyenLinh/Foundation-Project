import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FileIcon } from "@/components/shared/documents/FileIcon";
import type { SimpleShareModalProps } from "../../types/groupSpace.types";

export default function SimpleShareModal({
  title,
  documents,
  onClose,
}: SimpleShareModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
      <Card className="w-full max-w-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 space-y-3">
          {documents.slice(0, 3).map((doc) => (
            <label
              key={doc.id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 p-3"
            >
              <input type="checkbox" className="h-4 w-4" />
              <FileIcon type={doc.file_type} />
              <span className="text-sm font-medium text-gray-900">
                {doc.title}
              </span>
            </label>
          ))}
          {documents.length === 0 && (
            <p className="text-sm text-gray-500">
              Bạn chưa có tài liệu nào để chia sẻ.
            </p>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Quay lại
          </Button>
          <Button onClick={onClose}>Chia sẻ</Button>
        </div>
      </Card>
    </div>
  );
}
