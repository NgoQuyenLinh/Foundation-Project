import { renderAsync } from "docx-preview";
import html2canvas from "html2canvas";

export function isDocxFile(file: File): boolean {
  const name = file.name?.toLowerCase() || "";
  const type = file.type?.toLowerCase() || "";
  return (
    name.endsWith(".docx") ||
    name.endsWith(".doc") ||
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    type === "application/msword"
  );
}

export async function generateDocxThumbnail(
  fileOrBuffer: File | Blob | ArrayBuffer,
  pageNumber: number = 1
): Promise<string | null> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "800px";
  container.style.background = "#ffffff";
  container.style.zIndex = "-1";
  document.body.appendChild(container);

  try {
    const buffer =
      fileOrBuffer instanceof ArrayBuffer
        ? fileOrBuffer
        : await fileOrBuffer.arrayBuffer();

    await renderAsync(buffer, container, undefined, {
      className: "docx-preview-thumbnail",
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      breakPages: true,
    });

    const pages = container.querySelectorAll("section");
    const targetIndex = Math.max(0, Math.min(pageNumber - 1, (pages.length || 1) - 1));
    const targetElement =
      (pages[targetIndex] as HTMLElement) ||
      (container.firstElementChild as HTMLElement) ||
      container;

    const canvas = await html2canvas(targetElement, {
      scale: 0.6,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    return canvas.toDataURL("image/webp", 0.75);
  } catch (error) {
    console.error("Lỗi khi tạo ảnh thumbnail DOCX:", error);
    return null;
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}
