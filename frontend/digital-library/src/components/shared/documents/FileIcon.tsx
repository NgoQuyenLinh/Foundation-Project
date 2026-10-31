// frontend/digital-library/src/components/shared/documents/FileIcon.tsx

import { FileText, FileCode, FileArchive, File, FileType, FileImage, FileSpreadsheet } from "lucide-react";
import { cn } from "@/utils/cn";

export type FileTypeMap =
  | "pdf"
  | "docx"
  | "doc"
  | "pptx"
  | "ppt"
  | "xlsx"
  | "xls"
  | "zip"
  | "rar"
  | "drawio"
  | "png"
  | "jpg"
  | "jpeg"
  | "code"
  | "default";

export interface FileIconProps {
  type: FileTypeMap | string;
  className?: string;
  iconClassName?: string;
}

export function FileIcon({ type, className, iconClassName }: FileIconProps) {
  const normalizedType = type.toLowerCase();

  let bgColor = "bg-gray-100";
  let textColor = "text-gray-500";
  let Icon = File;

  if (normalizedType === "pdf") {
    bgColor = "bg-red-50";
    textColor = "text-red-500";
    Icon = FileText;
  } else if (normalizedType === "docx" || normalizedType === "doc") {
    bgColor = "bg-blue-50";
    textColor = "text-blue-500";
    Icon = FileText;
  } else if (normalizedType === "pptx" || normalizedType === "ppt") {
    bgColor = "bg-orange-50";
    textColor = "text-orange-500";
    Icon = FileType;
  } else if (normalizedType === "xlsx" || normalizedType === "xls") {
    bgColor = "bg-primary-50";
    textColor = "text-primary-600";
    Icon = FileSpreadsheet;
  } else if (normalizedType === "zip" || normalizedType === "rar") {
    bgColor = "bg-yellow-50";
    textColor = "text-yellow-600";
    Icon = FileArchive;
  } else if (normalizedType === "png" || normalizedType === "jpg" || normalizedType === "jpeg") {
    bgColor = "bg-blue-50";
    textColor = "text-blue-500";
    Icon = FileImage;
  } else if (normalizedType === "code" || normalizedType === "drawio") {
    bgColor = "bg-cyan-50";
    textColor = "text-cyan-600";
    Icon = FileCode;
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg h-10 w-10",
        bgColor,
        textColor,
        className
      )}
    >
      <Icon className={cn("h-5 w-5", iconClassName)} />
    </div>
  );
}
