// src/components/shared/documents/DocumentDetail/viewers/MarkdownViewer.tsx

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2 } from "lucide-react";
import type { MarkdownViewerProps } from "../DocumentDetail.types";

/**
 * MarkdownViewer - Hiển thị nội dung tài liệu định dạng Markdown
 *
 * Tính năng chính:
 * 1. Tải file markdown từ API qua đường dẫn tĩnh
 * 2. Render đẹp mắt bằng ReactMarkdown kèm plugin remarkGfm (hỗ trợ bảng biểu, checklist, gạch ngang...)
 */
export function MarkdownViewer({ markdownPath }: MarkdownViewerProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`${import.meta.env.VITE_API_URL}/${markdownPath}`)
      .then((res) => {
        if (!res.ok) throw new Error("Không thể tải file Markdown");
        return res.text();
      })
      .then((text) => {
        if (isMounted) {
          setContent(text);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [markdownPath]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
        <span className="text-sm">Đang tải nội dung Markdown...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center text-sm text-red-500">{error}</div>
    );
  }

  return (
    <div className="prose prose-sm max-w-none overflow-auto flex-1 h-full p-5 bg-white rounded-xl border border-gray-200 custom-scrollbar">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content ?? ""}</ReactMarkdown>
    </div>
  );
}
