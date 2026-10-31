// src/components/shared/documents/DocumentDetail/viewers/CodeViewer.tsx

import { useState, useEffect } from "react";
import { Loader2, Copy, Check } from "lucide-react";
import api from "@/services/api";
import { cn } from "@/utils/cn";
import type { CodeViewerProps } from "../DocumentDetail.types";

/**
 * Bản đồ mở rộng đuôi file sang ngôn ngữ định danh của Shiki
 */
const EXTENSION_TO_LANG_MAP: Record<string, string> = {
  py: "python",
  js: "javascript",
  ts: "typescript",
  jsx: "jsx",
  tsx: "tsx",
  cpp: "cpp",
  c: "c",
  h: "c",
  java: "java",
  cs: "csharp",
  go: "go",
  rs: "rust",
  php: "php",
  rb: "ruby",
  swift: "swift",
  kt: "kotlin",
  scala: "scala",
  r: "r",
  m: "objective-c",
  sql: "sql",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  xml: "xml",
  csv: "csv",
  html: "html",
  css: "css",
  scss: "scss",
  sass: "sass",
  less: "less",
  svelte: "svelte",
  vue: "vue",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  fish: "fish",
  ps1: "powershell",
  bat: "bat",
  cmd: "bat",
  md: "markdown",
  mdx: "mdx",
  rst: "rst",
  tex: "tex",
  env: "ini",
  gitignore: "ignore",
  dockerignore: "ignore",
  makefile: "makefile",
  mk: "makefile",
};

/**
 * CodeViewer - Hiển thị và làm nổi bật cú pháp file mã nguồn
 *
 * Tính năng chính:
 * 1. Tải nội dung text thô từ API /documents/:id/raw
 * 2. Tự động nhận diện ngôn ngữ lập trình dựa vào tên hoặc đường dẫn file
 * 3. Lazy import thư viện Shiki để highlight cú pháp tối ưu bundle size
 * 4. Hỗ trợ chuyển đổi linh hoạt giữa chế độ xem Code (đã tô màu) và Raw (chữ thuần)
 * 5. Nút sao chép mã nguồn nhanh vào bộ nhớ tạm
 */
export function CodeViewer({ documentId, filePath, title }: CodeViewerProps) {
  const [rawCode, setRawCode] = useState<string>("");
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"code" | "raw">("code");
  const [copied, setCopied] = useState(false);

  /**
   * Sao chép toàn bộ mã nguồn thô vào clipboard
   */
  const handleCopy = () => {
    if (!rawCode) return;
    navigator.clipboard.writeText(rawCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * Tải nội dung file và tô màu cú pháp bằng Shiki
   */
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchAndHighlight = async () => {
      try {
        const res = await api.get<string>(`/documents/${documentId}/raw`, {
          responseType: "text",
        });

        const text =
          typeof res.data === "string" ? res.data : String(res.data || "");
        if (!isMounted) return;

        setRawCode(text);

        // Suy đoán ngôn ngữ từ filePath hoặc title
        let lang = "text";
        const candidateName = filePath || title || "";
        if (candidateName) {
          const ext = candidateName.split(".").pop()?.toLowerCase() || "";
          if (EXTENSION_TO_LANG_MAP[ext]) {
            lang = EXTENSION_TO_LANG_MAP[ext];
          } else if (candidateName.toLowerCase().includes("dockerfile")) {
            lang = "dockerfile";
          }
        }

        // Tải động Shiki để giảm bundle size ban đầu
        const { codeToHtml } = await import("shiki");
        const highlightedHtml = await codeToHtml(text, {
          lang,
          theme: "github-light",
        }).catch(() => {
          // Fallback nếu ngôn ngữ chưa hỗ trợ
          return codeToHtml(text, { lang: "text", theme: "github-light" }).catch(
            () =>
              `<pre><code>${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`,
          );
        });

        if (isMounted) {
          setHtmlContent(highlightedHtml);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(
            err?.response?.data?.detail ||
              err.message ||
              "Không thể tải nội dung file code",
          );
          setLoading(false);
        }
      }
    };

    fetchAndHighlight();

    return () => {
      isMounted = false;
    };
  }, [documentId, filePath, title]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
        <span className="text-sm">Đang tải và làm nổi bật cú pháp mã nguồn...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center text-sm text-red-500">{error}</div>
    );
  }

  return (
    <div className="w-full max-w-full min-w-0 h-full flex-1  overflow-hidden bg-[#f6f8fa] rounded-xl border border-gray-200 text-sm flex flex-col font-mono">
      {/* Header toolbar: Chuyển đổi Code / Raw & Nút sao chép */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50 text-xs">
        <div className="flex items-center gap-1 bg-gray-200/60 p-0.5 rounded-lg">
          <button
            type="button"
            onClick={() => setViewMode("code")}
            className={cn(
              "px-2.5 py-1 rounded-md font-sans font-medium transition-colors",
              viewMode === "code"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-600 hover:text-gray-900",
            )}
          >
            Code
          </button>
          <button
            type="button"
            onClick={() => setViewMode("raw")}
            className={cn(
              "px-2.5 py-1 rounded-md font-sans font-medium transition-colors",
              viewMode === "raw"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-600 hover:text-gray-900",
            )}
          >
            Raw
          </button>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-700 font-sans text-xs hover:bg-gray-100 transition-colors shadow-xs"
          title="Sao chép nội dung"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-600" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          <span>{copied ? "Đã sao chép" : "Sao chép"}</span>
        </button>
      </div>

      {/* Vùng hiển thị mã nguồn */}
      <div className="w-full max-w-full min-w-0 flex-1 overflow-auto p-5 custom-scrollbar text-[13px]">
        {viewMode === "code" ? (
          <div
            className="w-max min-w-full [&>pre]:!bg-transparent [&>pre]:!m-0 [&>pre]:!p-0 [&>pre]:!leading-relaxed"
            dangerouslySetInnerHTML={{ __html: htmlContent || "" }}
          />
        ) : (
          <pre className="w-max min-w-full whitespace-pre font-mono leading-relaxed text-gray-800 m-0 p-0">
            {rawCode}
          </pre>
        )}
      </div>
    </div>
  );
}
