// frontend/digital-library/src/pages/library/LibraryFaculty.tsx

import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Search, GraduationCap, ArrowLeft, BookOpen } from "lucide-react";
import { PublicLayout } from "@/components/library/PublicLayout";
import { SubjectCard } from "@/components/library/SubjectCard";
import { libraryService } from "@/services/libraryService";
import { CardSkeleton } from "@/components/shared/CardSkeleton";
import { Button } from "@/components/ui/Button";

export function LibraryFaculty() {
  const { facultyId } = useParams<{ facultyId: string }>();
  const navigate = useNavigate();
  const [searchSubject, setSearchSubject] = useState("");

  const fId = Number(facultyId);

  const { data: faculties = [] } = useQuery({
    queryKey: ["library-faculties"],
    queryFn: libraryService.getFaculties,
  });

  const currentFaculty = faculties.find((f) => f.id === fId);

  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ["library-faculty-subjects", fId],
    queryFn: () => libraryService.getSubjects(fId),
    enabled: Boolean(fId),
  });

  const filteredSubjects = subjects.filter((s) => {
    const q = searchSubject.toLowerCase().trim();
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
  });

  const totalDocsInFaculty = subjects.reduce((acc, s) => acc + (s.document_count || 0), 0);

  return (
    <PublicLayout>
      <div className="flex flex-col gap-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-medium text-gray-500">
          <Link to="/library" className="hover:text-primary-600 transition-colors flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            Kho học liệu
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-gray-900 font-semibold truncate">
            {currentFaculty ? currentFaculty.name : `Khoa #${fId}`}
          </span>
        </nav>

        {/* Header card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                <GraduationCap className="h-7 w-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-primary-100 px-2 py-0.5 text-xs font-bold text-primary-700 uppercase">
                    {currentFaculty?.code || "KHOA"}
                  </span>
                </div>
                <h1 className="mt-1 text-2xl font-bold text-gray-900 leading-tight">
                  {currentFaculty ? currentFaculty.name : "Đang tải thông tin khoa..."}
                </h1>
                <p className="mt-1 text-xs text-gray-500">
                  {subjects.length} môn học · {totalDocsInFaculty} tài liệu đã được kiểm duyệt
                </p>
              </div>
            </div>

            {/* Back button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/library")}
              icon={<ArrowLeft className="h-4 w-4" />}
            >
              Tất cả các khoa
            </Button>
          </div>

          {/* Search bar for subjects */}
          <div className="mt-6 pt-5 border-t border-gray-100 flex items-center max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchSubject}
                onChange={(e) => setSearchSubject(e.target.value)}
                placeholder="Tìm môn học trong khoa (tên môn, mã môn)..."
                className="w-full h-10 rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:bg-white focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Subjects list */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Danh sách môn học</h2>
            <span className="text-xs text-gray-500 font-medium">
              {filteredSubjects.length} môn học
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <CardSkeleton key={i} variant="folder" />
              ))}
            </div>
          ) : filteredSubjects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredSubjects.map((subject) => (
                <SubjectCard
                  key={subject.id}
                  subject={subject}
                  onClick={() => navigate(`/library/subject/${subject.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center bg-white">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-2" />
              <h3 className="text-base font-semibold text-gray-900">Không tìm thấy môn học</h3>
              <p className="text-sm text-gray-500 mt-1">
                {searchSubject
                  ? `Không có môn nào phù hợp với "${searchSubject}".`
                  : "Khoa này hiện chưa có môn học nào trong hệ thống."}
              </p>
            </div>
          )}
        </section>
      </div>
    </PublicLayout>
  );
}

export default LibraryFaculty;
