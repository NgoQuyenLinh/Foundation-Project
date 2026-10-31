import { useState, useMemo } from 'react';

export type TabKey = "all" | "document" | "image" | "pdf" | "code" | "other";

export const CODE_EXTENSIONS = [
  "py", "js", "ts", "jsx", "tsx", "cpp", "c", "h", "java", "cs", 
  "go", "rs", "php", "rb", "swift", "kt", "scala", "r", "m",
  "sql", "json", "yaml", "yml", "toml", "xml", "csv",
  "html", "css", "scss", "sass", "less", "svelte", "vue",
  "sh", "bash", "zsh", "fish", "ps1", "bat", "cmd",
  "md", "mdx", "rst", "tex",
  "env", "gitignore", "dockerignore", "makefile", "mk", "dockerfile"
];

export const getNormalizedExtension = (type?: string | null) => {
  if (!type) return ""
  let cleanType = type.toLowerCase().trim()
  if (cleanType.startsWith(".")) cleanType = cleanType.substring(1)
  
  const mimeMap: Record<string, string> = {
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "image/jpeg": "jpg",
    "image/png": "png",
    "application/zip": "zip",
    "application/x-zip-compressed": "zip",
  }
  return mimeMap[cleanType] || cleanType.split("/").pop() || cleanType
}

export function useDocumentFilters<T extends { 
  name: string; 
  tags?: any[]; 
  rawType?: string | null; 
  extension?: string | null; 
  type?: string | null;
}>(documents: T[]) {
  const [activeTab, setActiveTab] = useState<TabKey>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null)
  const [selectedFileType, setSelectedFileType] = useState<string | null>(null)

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      if (
        searchQuery &&
        !doc.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false
      }
      if (selectedTagId !== null) {
        const docTags = doc.tags || [];
        const hasTag = docTags.some((t: any) => t.id === selectedTagId)
        if (!hasTag) return false
      }
      if (selectedFileType !== null) {
        if (doc.rawType !== selectedFileType) return false
      }
      if (activeTab !== "all") {
        const ext = getNormalizedExtension(doc.extension || doc.type)
        const isDoc = [
          "doc",
          "docx",
          "xls",
          "xlsx",
          "ppt",
          "pptx",
          "txt",
        ].includes(ext)
        const isImg = ["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)
        const isPdf = ext === "pdf"
        const isCode = CODE_EXTENSIONS.includes(ext) || ext.includes("dockerfile");

        if (activeTab === "document" && !isDoc) return false
        if (activeTab === "image" && !isImg) return false
        if (activeTab === "pdf" && !isPdf) return false
        if (activeTab === "code" && !isCode) return false
        if (activeTab === "other" && (isDoc || isImg || isPdf || isCode)) return false
      }
      return true
    })
  }, [documents, searchQuery, selectedTagId, selectedFileType, activeTab])

  return {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    selectedTagId,
    setSelectedTagId,
    selectedFileType,
    setSelectedFileType,
    filteredDocuments
  }
}
