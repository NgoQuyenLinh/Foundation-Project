// frontend/digital-library/src/utils/pdfBuilder.ts
import { jsPDF } from "jspdf";

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

const getImageDimensions = (base64: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => resolve({ width: img.width, height: img.height });
  });
};

export async function mergeImagesToPdf(images: File[], outputName: string): Promise<File> {
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < images.length; i++) {
    const file = images[i];
    const base64 = await fileToBase64(file);
    const { width, height } = await getImageDimensions(base64);

    // Tính toán kích thước để ảnh vừa vặn trang A4
    const ratio = width / height;
    let finalWidth = pageWidth;
    let finalHeight = pageWidth / ratio;

    if (finalHeight > pageHeight) {
      finalHeight = pageHeight;
      finalWidth = pageHeight * ratio;
    }

    const x = (pageWidth - finalWidth) / 2;
    const y = (pageHeight - finalHeight) / 2;

    if (i > 0) pdf.addPage();
    
    const imgType = file.type === "image/png" ? "PNG" : file.type === "image/webp" ? "WEBP" : "JPEG";
    pdf.addImage(base64, imgType, x, y, finalWidth, finalHeight);
  }

  const pdfBlob = pdf.output("blob");
  return new File([pdfBlob], outputName, { type: "application/pdf" });
}