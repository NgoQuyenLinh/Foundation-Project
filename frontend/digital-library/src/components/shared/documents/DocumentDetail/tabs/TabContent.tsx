// src/components/shared/documents/DocumentDetail/tabs/TabContent.tsx

/**
 * TabContent - Hiển thị nội dung văn bản bóc tách qua OCR
 *
 * Tính năng chính:
 * 1. Hiển thị văn bản dạng font serif dễ đọc kèm khoảng cách dòng thoáng (leading-loose)
 * 2. Giữ nguyên định dạng xuống dòng và khoảng trắng từ văn bản gốc (whitespace-pre-wrap)
 * 3. Hiển thị thông báo nếu tài liệu chưa có dữ liệu OCR
 */
export function TabContent({ content }: { content: string }) {
  if (!content) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-center">
        <p className="text-sm text-gray-500">
          Tài liệu này chưa có dữ liệu văn bản (OCR).
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50/80 rounded-xl p-5 border border-gray-100 max-h-[700px] overflow-y-auto custom-scrollbar">
      <p className="text-sm text-gray-700 leading-loose whitespace-pre-wrap font-serif">
        {content}
      </p>
    </div>
  );
}
