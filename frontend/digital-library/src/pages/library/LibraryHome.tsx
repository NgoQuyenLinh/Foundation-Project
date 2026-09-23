// frontend/digital-library/src/pages/library/LibraryHome.tsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, GraduationCap, BookOpen, Layers } from "lucide-react";
import { PublicLayout } from "@/components/library/PublicLayout";
import { FacultyCard } from "@/components/library/FacultyCard";
import { libraryService } from "@/services/libraryService";
import { CardSkeleton } from "@/components/shared/CardSkeleton";

export function LibraryHome() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: faculties = [], isLoading } = useQuery({
    queryKey: ["library-faculties"],
    queryFn: libraryService.getFaculties,
  });

  const filteredFaculties = faculties.filter((f) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return f.name.toLowerCase().includes(q) || f.code.toLowerCase().includes(q);
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      // If user typed a search term, let's keep filtering or navigate if needed
    }
  };

  const totalSubjects = faculties.reduce((acc, f) => acc + (f.subject_count || 0), 0);
  const totalDocuments = faculties.reduce((acc, f) => acc + (f.document_count || 0), 0);

  return (
    <PublicLayout>
      <div className="flex flex-col gap-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 to-primary-700 p-8 sm:p-12 text-white shadow-md">
          <div className="relative z-10 max-w-3xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm mb-3">
              <BookOpen className="h-3.5 w-3.5" />
              Nền tảng chia sẻ học liệu mở
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Kho Học Liệu Cộng Đồng
            </h1>
            <p className="mt-2 text-sm sm:text-base text-primary-50 max-w-2xl">
              Nguồn tài liệu học tập, giáo trình, bài giảng và đề thi do sinh viên & giảng viên Đại học Đà Lạt đóng góp và kiểm duyệt.
            </p>

            {/* Quick stats in hero */}
            <div className="mt-6 flex flex-wrap items-center gap-6 text-xs sm:text-sm font-medium text-white/90">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary-100" />
                <span>{faculties.length} Khoa đào tạo</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary-100" />
                <span>{totalSubjects} Môn học</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary-100" />
                <span>{totalDocuments} Tài liệu công khai</span>
              </div>
            </div>

            {/* Big Search Bar */}
            <form onSubmit={handleSearchSubmit} className="mt-7">
              <div className="relative flex items-center max-w-2xl">
                <Search className="absolute left-4 h-5 w-5 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm kiếm khoa hoặc môn học..."
                  className="w-full h-12 rounded-xl bg-white pl-11 pr-4 text-sm text-gray-900 placeholder-gray-400 shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </form>
          </div>

          {/* Decorative background circle */}
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -right-8 -bottom-8 h-48 w-48 rounded-full bg-primary-500/20 blur-xl pointer-events-none" />
        </div>

        {/* Faculties Section */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Khám phá theo Khoa</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Chọn khoa để xem danh sách môn học và tài liệu tương ứng
              </p>
            </div>
            <span className="text-xs text-gray-500 font-medium">
              {filteredFaculties.length} khoa
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} variant="folder" />
              ))}
            </div>
          ) : filteredFaculties.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFaculties.map((faculty, index) => (
                <FacultyCard
                  key={faculty.id}
                  faculty={faculty}
                  index={index}
                  onClick={() => navigate(`/library/faculty/${faculty.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center bg-white">
              <GraduationCap className="mx-auto h-12 w-12 text-gray-400 mb-2" />
              <h3 className="text-base font-semibold text-gray-900">Không tìm thấy khoa nào</h3>
              <p className="text-sm text-gray-500 mt-1">
                Không có khoa nào phù hợp với từ khóa &ldquo;{searchTerm}&rdquo;.
              </p>
            </div>
          )}
        </section>
      </div>
    </PublicLayout>
  );
}

export default LibraryHome;
