import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Layouts & Auth
import { AuthLayout } from "@/layouts/AuthLayout";
import { MainLayout } from "@/layouts/MainLayout";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import { useRestoreSession } from "@/hooks/useRestoreSession";
import { LoginPage } from "@/pages/auth/LoginPage";

// Pages - Personal
import { PersonalHome } from "@/pages/personal/PersonalHome";
import { PersonalDashboard } from "@/pages/personal/PersonalDashboard";
import { PersonalDocuments } from "@/pages/personal/PersonalDocuments";
import SharedWithMe from "@/pages/personal/SharedWithMe";
import FavoritesPage from "@/pages/personal/FavoritesPage";
import TrashPage from "@/pages/personal/TrashPage";
import BundleDetailPage from "@/pages/personal/BundleDetailPage";

// Pages - Group
import GroupList from "@/pages/group/GroupList";
import GroupSpace from "@/pages/group/GroupSpace";
import GroupDocumentDetailPage from "@/pages/group/GroupDocumentDetailPage";

// Pages - Other Spaces & General
import ClassSpace from "@/pages/class/ClassSpace";
import FacultySpace from "@/pages/faculty/FacultySpace";
import SchoolSpace from "@/pages/school/SchoolSpace";
import StatsPage from "@/pages/stats/StatsPage";
import SettingsPage from "@/pages/settings/SettingsPage";
import { SearchPage } from "@/pages/search/SearchPage";

// Pages - Community Library (Kho học liệu)
import LibraryHome from "@/pages/library/LibraryHome";
import LibraryFaculty from "@/pages/library/LibraryFaculty";
import LibrarySubject from "@/pages/library/LibrarySubject";
import LibraryDocumentDetail from "@/pages/library/LibraryDocumentDetail";
import LibraryAdminSubmissions from "@/pages/library/admin/LibraryAdminSubmissions";

// Shared Components
import { DocumentDetail } from "@/components/shared/DocumentDetail";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppRoutes() {
  const { isRestoring } = useRestoreSession();

  if (isRestoring) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
          <p className="text-sm text-gray-500">Đang khởi động...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes - Auth */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Public routes - Community Library (Kho học liệu mở) */}
      <Route path="/library" element={<LibraryHome />} />
      <Route path="/library/faculty/:facultyId" element={<LibraryFaculty />} />
      <Route path="/library/subject/:subjectId" element={<LibrarySubject />} />
      <Route path="/library/document/:documentId" element={<LibraryDocumentDetail />} />

      {/* Protected routes — Bắt buộc đăng nhập */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          {/* Section: Personal */}
          <Route path="/personal" element={<PersonalHome />} />
          <Route path="/personal/dashboard" element={<PersonalDashboard />} />
          <Route path="/personal/documents" element={<PersonalDocuments />} />
          <Route path="/personal/documents/:id" element={<DocumentDetail />} />
          <Route path="/personal/bundle/:id" element={<BundleDetailPage />} />
          <Route path="/personal/shared" element={<SharedWithMe />} />
          <Route path="/personal/favorites" element={<FavoritesPage />} />
          <Route path="/personal/trash" element={<TrashPage />} />

          {/* Section: Groups */}
          <Route path="/groups" element={<GroupList />} />
          <Route path="/groups/:id" element={<GroupSpace />} />
          <Route
            path="/groups/:id/documents/:docId"
            element={<GroupDocumentDetailPage />}
          />
          <Route
            path="/groups/:groupId/bundle/:id"
            element={<BundleDetailPage />}
          />
          <Route
            path="/groups/:id/bundle/:docId"
            element={<BundleDetailPage />}
          />

          {/* Section: Class & Search */}
          <Route path="/class" element={<ClassSpace />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Admin only routes */}
          <Route
            element={
              <ProtectedRoute
                allowedRoles={["faculty_admin", "school_admin", "system_admin"]}
              />
            }
          >
            <Route path="/faculty" element={<FacultySpace />} />
            <Route path="/school" element={<SchoolSpace />} />
            <Route path="/library/admin/submissions" element={<LibraryAdminSubmissions />} />
          </Route>
        </Route>
      </Route>

      {/* Fallback & Redirects */}
      <Route path="/" element={<Navigate to="/library" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;