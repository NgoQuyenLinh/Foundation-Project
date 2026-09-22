// src/pages/group/hooks/useGroupFilters.ts
import { useState, useMemo, useEffect } from "react";
import type { TabKey } from "@/hooks/useDocumentFilters";
import type { Document, Folder } from "@/types/document";

const isWithinTimeRange = (dateStr?: string | null, filter?: string | null): boolean => {
  if (!filter || !dateStr) return true;
  const targetDate = new Date(dateStr);
  if (isNaN(targetDate.getTime())) return true;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (filter) {
    case "today":
      return targetDate >= startOfToday;
    case "last_7_days": {
      const sevenDaysAgo = new Date(startOfToday);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return targetDate >= sevenDaysAgo;
    }
    case "last_30_days": {
      const thirtyDaysAgo = new Date(startOfToday);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return targetDate >= thirtyDaysAgo;
    }
    case "this_year":
      return targetDate.getFullYear() === now.getFullYear();
    default:
      return true;
  }
};

export function useGroupFilters(documents: Document[] = [], folders: Folder[] = []) {
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<string | null>(null);
  const [activeDocumentTab, setActiveDocumentTab] = useState<TabKey>("all");

  const [selectedUploadTime, setSelectedUploadTime] = useState<string | null>(null);
  const [selectedAccessTime, setSelectedAccessTime] = useState<string | null>(null);
  const [selectedUploaderId, setSelectedUploaderId] = useState<number | null>(null);

  const handleSelectFolder = (id: number | null) => {
    setSelectedFolderId((prevId) => (prevId === id ? null : id));
  };

  useEffect(() => {
    if (
      selectedFolderId !== null &&
      folders &&
      !folders.some((f: any) => f.id === selectedFolderId)
    ) {
      setSelectedFolderId(null);
    }
  }, [folders, selectedFolderId]);

  const filteredDocuments = useMemo(() => {
    let list = documents || [];

    if (selectedFolderId !== null) {
      const activeFolder = folders.find((f: any) => f.id === selectedFolderId);
      const folderTagIds =
        activeFolder?.tags?.map((t: any) => t.id ?? t.tag_id) ||
        (activeFolder as any)?.tag_ids ||
        [];

      if (folderTagIds.length > 0) {
        list = list.filter((doc: any) =>
          doc.tags?.some((docTag: any) =>
            folderTagIds.includes(docTag.id ?? docTag.tag_id)
          )
        );
      } else {
        list = list.filter((doc: any) => {
          const docFolderId = doc.folder_id ?? doc.folderId ?? doc.folder?.id;
          return Number(docFolderId) === Number(selectedFolderId);
        });
      }
    }

    return list.filter((doc: any) => {
      const docName = doc.title || doc.name || "";
      if (searchQuery && !docName.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      if (selectedTagId !== null) {
        const hasTag = doc.tags?.some(
          (t: any) => t.id === selectedTagId || t.tag_id === selectedTagId
        );
        if (!hasTag) return false;
      }

      if (selectedFileType !== null) {
        const fileType = doc.file_type || doc.rawType;
        if (fileType !== selectedFileType) return false;
      }

      if (activeDocumentTab !== "all") {
        const fileType = (doc.file_type || doc.rawType || "").toLowerCase();
        const ext = (doc.extension || "").toLowerCase();

        if (activeDocumentTab === "pdf") {
          if (!fileType.includes("pdf") && ext !== "pdf") return false;
        } else if (activeDocumentTab === "image") {
          if (!fileType.startsWith("image/") && !["jpg", "jpeg", "png", "webp", "svg"].includes(ext))
            return false;
        } else if (activeDocumentTab === "document") {
          const isDoc =
            fileType.includes("word") ||
            fileType.includes("presentation") ||
            fileType.includes("spreadsheet") ||
            ["doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt"].includes(ext);
          if (!isDoc) return false;
        } else if (activeDocumentTab === "other") {
          const isKnown =
            fileType.includes("pdf") ||
            fileType.startsWith("image/") ||
            fileType.includes("word") ||
            fileType.includes("presentation") ||
            fileType.includes("spreadsheet") ||
            ["pdf", "jpg", "jpeg", "png", "webp", "doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(ext);
          if (isKnown) return false;
        }
      }

      if (!isWithinTimeRange(doc.created_at || doc.uploaded_at, selectedUploadTime)) return false;
      if (!isWithinTimeRange(doc.last_accessed_at || doc.updated_at || doc.created_at, selectedAccessTime)) return false;

      if (selectedUploaderId !== null) {
        const uploaderId = doc.uploader_id ?? doc.user_id ?? doc.created_by ?? doc.uploaded_by ?? doc.owner?.id ?? doc.owner_id;
        if (Number(uploaderId) !== Number(selectedUploaderId)) return false;
      }

      return true;
    });
  }, [
    documents,
    folders,
    selectedFolderId,
    searchQuery,
    selectedTagId,
    selectedFileType,
    activeDocumentTab,
    selectedUploadTime,
    selectedAccessTime,
    selectedUploaderId,
  ]);

  return {
    selectedFolderId, setSelectedFolderId, handleSelectFolder,
    searchQuery, setSearchQuery,
    selectedTagId, setSelectedTagId,
    selectedFileType, setSelectedFileType,
    activeDocumentTab, setActiveDocumentTab,
    selectedUploadTime, setSelectedUploadTime,
    selectedAccessTime, setSelectedAccessTime,
    selectedUploaderId, setSelectedUploaderId,
    filteredDocuments,
  };
}