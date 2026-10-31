import { FileIcon, type FileTypeMap } from "@/components/shared/documents/FileIcon";
import { DocumentContextMenu, type DocumentAction } from "@/components/shared/documents/DocumentContextMenu";

export interface DocumentType {
  id: string;
  name: string;
  type: FileTypeMap | string;
  updatedAt: string;
  size: string;
  owner?: string;
  markdownPath?: string | null;
  markdown_path?: string | null;
}

export interface DocumentRowProps {
  document: DocumentType;
  onAction: (action: DocumentAction | string, documentId: string) => void;
}

export function DocumentRow({ document, onAction }: DocumentRowProps) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors px-2 -mx-2 rounded-lg group">
      {/* Icon */}
      <FileIcon type={document.type} />

      {/* Name + meta */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-gray-900 text-sm">
          {document.name}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">{document.updatedAt}</p>
      </div>

      {/* Owner */}
      {document.owner && (
        <span className="hidden sm:block text-sm text-gray-500 shrink-0 w-16 text-center">
          {document.owner}
        </span>
      )}

      {/* Size */}
      <span className="hidden sm:block text-sm text-gray-500 shrink-0 w-20 text-right">
        {document.size}
      </span>

      {/* Context menu */}
      <div className="shrink-0">
        <DocumentContextMenu
          markdownPath={document.markdownPath || document.markdown_path}
          onAction={(action) => onAction(action, document.id)}
        />
      </div>
    </div>
  );
}
