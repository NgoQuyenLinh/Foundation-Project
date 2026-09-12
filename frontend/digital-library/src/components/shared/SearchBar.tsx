import { useState, useEffect, useRef } from "react";
import { Search, ArrowRight, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { searchService } from "@/services/searchService";
import { useDebounce } from "@/hooks/useDebounce";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data, isFetching } = useQuery({
    queryKey: ["quick-search", debouncedQuery],
    queryFn: () => searchService.quickSearch(debouncedQuery),
    enabled: debouncedQuery.trim().length > 0,
  });

  // Xử lý phím tắt Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (url: string) => {
    setIsOpen(false);
    navigate(url);
  };

  const handleSearchFull = () => {
    if (query.trim()) {
      setIsOpen(false);
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  const suggestions = data?.items || [];

  return (
    <div className="relative w-full max-w-2xl" ref={wrapperRef}>
      <div className="absolute inset-y-0 left-0 flex items-center pl-3">
        <Search className="h-4 w-4 text-gray-400" />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(e) => e.key === "Enter" && handleSearchFull()}
        className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-16 text-sm outline-none placeholder:text-gray-500 focus:border-primary-500 focus:bg-white focus:ring-1 focus:ring-primary-500 transition-colors"
        placeholder="Tìm kiếm tài liệu, tác giả, chuyên mục... (Ctrl + K)"
      />

      {/* Dropdown Gợi ý Tier 1 */}
      {isOpen && query.trim() !== "" && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 rounded-xl border border-gray-100 bg-white shadow-xl overflow-hidden">
          {isFetching ? (
            <div className="p-4 text-center text-sm text-gray-500">Đang tìm kiếm...</div>
          ) : suggestions.length > 0 ? (
            <>
              <div className="max-h-80 overflow-y-auto py-2">
                {suggestions.map((item: any) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item.url)}
                    className="flex cursor-pointer items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div 
                onClick={handleSearchFull}
                className="flex cursor-pointer items-center justify-center gap-2 border-t border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-gray-100"
              >
                Tìm kiếm chi tiết nội dung văn bản (FTS) <ArrowRight className="h-4 w-4" />
              </div>
            </>
          ) : (
            <div className="p-4 text-center text-sm text-gray-500">
              Không tìm thấy kết quả nhanh. Hãy nhấn Enter để tìm trong nội dung tài liệu.
            </div>
          )}
        </div>
      )}
    </div>
  );
}