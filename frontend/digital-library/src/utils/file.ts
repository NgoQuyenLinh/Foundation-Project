// src/utils/file.ts

export const getFileExtension = (
  filePath?: string,
  fileType?: string,
  title?: string
): string => {
  if (filePath && filePath.includes("."))
    return filePath.split(".").pop()?.toLowerCase() || "";
  if (title && title.includes("."))
    return title.split(".").pop()?.toLowerCase() || "";
  return fileType || "";
};