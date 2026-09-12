// frontend/digital-library/src/pages/search/SearchPage.tsx

import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, FileText, ChevronLeft, ChevronRight, Folder, Users } from "lucide-react";
import { searchService } from "@/services/searchService";
import { Button } from "@/components/ui/Button";

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const navigate = useNavigate();
  
  // State quản lý trang hiện tại
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Reset về trang 1 nếu từ khóa tìm kiếm (query) thay đổi trên URL
  useEffect(() => {
    setPage(1);
  }, [query]);

  // Fetch dữ liệu Full-Text Search
  const { data, isFetching, isError } = useQuery({
    queryKey: ["full-search", query, page],
    queryFn: () => searchService.fullTextSearch(query, page, pageSize),
    enabled: query.trim().length > 0,
    // Giữ dữ liệu cũ trong lúc fetch trang mới để tránh UI bị giật
    placeholderData: (prev) => prev, 
  });

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newQuery = formData.get("searchInput") as string;
    if (newQuery.trim()) {
      setSearchParams({ q: newQuery.trim() });
    }
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case "group_doc":
        return <Users className="h-5 w-5 text-green-600" />;
      case "folder":
        return <Folder className="h-5 w-5 text-amber-500" />;
      default:
        return <FileText className="h-5 w-5 text-blue-600" />;
    }
  };

  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);
  const items = data?.items || [];

  return (
    <div className="min-h-screen bg-gray-50 pb-12 pt-6">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header & Search Input */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Tìm kiếm toàn văn bản</h1>
          <form onSubmit={handleSearchSubmit} className="relative flex max-w-2xl items-center">
            <Search className="absolute left-4 h-5 w-5 text-gray-400" />
            <input
              name="searchInput"
              type="text"
              defaultValue={query}
              placeholder="Nhập từ khóa nội dung tài liệu..."
              className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-12 pr-24 text-base outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 shadow-sm transition-all"
            />
            <Button 
              type="submit" 
              className="absolute right-1.5 h-9" 
              disabled={isFetching}
            >
              Tìm kiếm
            </Button>
          </form>
        </div>

        {/* Trạng thái chưa nhập từ khóa */}
        {!query && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 rounded-full bg-gray-100 p-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-lg font-medium text-gray-900">Hãy nhập từ khóa để tìm kiếm</h2>
            <p className="mt-1 text-sm text-gray-500">Hệ thống sẽ quét toàn bộ nội dung (OCR) của các tài liệu.</p>
          </div>
        )}

        {/* Kết quả tìm kiếm */}
        {query && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              {isFetching && !items.length ? (
                <span>Đang tìm kiếm...</span>
              ) : (
                <span>
                  Tìm thấy <strong className="text-gray-900">{total}</strong> kết quả cho "{query}"
                </span>
              )}
            </div>

            {/* Skeleton Loading */}
            {isFetching && !items.length && (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex animate-pulse items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="h-10 w-10 rounded-lg bg-gray-200" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-1/3 rounded bg-gray-200" />
                      <div className="h-3 w-1/4 rounded bg-gray-100" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isFetching && items.length === 0 && !isError && (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
                <FileText className="mb-3 h-10 w-10 text-gray-300" />
                <h3 className="text-base font-medium text-gray-900">Không tìm thấy tài liệu nào</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Thử tìm với từ khóa khác ngắn gọn hoặc chung chung hơn.
                </p>
              </div>
            )}

            {/* Danh sách Items */}
            {items.length > 0 && (
              <div className="space-y-3">
                {items.map((item: any) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    onClick={() => navigate(item.url)}
                    className="group flex cursor-pointer items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-50 group-hover:bg-primary-50 transition-colors">
                      {renderIcon(item.type)}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <h4 className="truncate text-base font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                        {item.title}
                      </h4>
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                        <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 font-medium">
                          {item.subtitle}
                        </span>
                        {/* Nếu bạn có thêm field 'snippet' trích xuất từ văn bản, có thể hiển thị ở đây */}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Phân trang */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || isFetching}
                  icon={<ChevronLeft className="h-4 w-4" />}
                >
                  Trước
                </Button>
                <span className="text-sm text-gray-600">
                  Trang <strong className="font-medium text-gray-900">{page}</strong> / {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || isFetching}
                >
                  Sau <ChevronRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}