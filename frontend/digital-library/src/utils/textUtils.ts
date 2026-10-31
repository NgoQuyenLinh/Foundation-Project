/**
 * Trích xuất đoạn tóm tắt từ nội dung text của tài liệu.
 * Bỏ qua các dòng quá ngắn (thường là tiêu đề, ngày tháng) và lấy đủ số từ yêu cầu.
 */
export function extractSummary(content?: string | null, maxWords: number = 40): string {
  if (!content) return "Tài liệu này chưa có bản trích xuất văn bản (OCR/Text).";
  
  // Tách thành các dòng, bỏ qua dòng rỗng hoặc dòng quá ngắn (dưới 3 từ - thường là ngày tháng/tiêu đề rác)
  const lines = content.split('\n').map(line => line.trim()).filter(line => {
    const wordCount = line.split(/\s+/).length;
    return wordCount > 3; 
  });

  const cleanedText = lines.join(' ');
  const words = cleanedText.split(/\s+/);
  
  if (words.length <= maxWords) return cleanedText;
  return words.slice(0, maxWords).join(' ') + '...';
}