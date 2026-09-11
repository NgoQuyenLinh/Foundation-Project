import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthLayout } from "@/layouts/AuthLayout";
import { MainLayout } from "@/layouts/MainLayout";
import { LoginPage } from "@/pages/auth/LoginPage";
import { PersonalDashboard } from "@/pages/personal/PersonalDashboard";
import { PersonalDocuments } from "@/pages/personal/PersonalDocuments";
import { DocumentDetail } from "@/components/shared/DocumentDetail";
import SharedWithMe from "@/pages/personal/SharedWithMe";
import FavoritesPage from "@/pages/personal/FavoritesPage";
import TrashPage from "@/pages/trash/TrashPage";
import GroupList from "@/pages/group/GroupList";
import GroupSpace from "@/pages/group/GroupSpace";
import ClassSpace from "@/pages/class/ClassSpace";
import FacultySpace from "@/pages/faculty/FacultySpace";
import SchoolSpace from "@/pages/school/SchoolSpace";
import StatsPage from "@/pages/stats/StatsPage";
import SettingsPage from "@/pages/settings/SettingsPage";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import { useRestoreSession } from "@/hooks/useRestoreSession";
import GroupDocumentDetailPage from "@/pages/group/GroupDocumentDetailPage";
import { PersonalHome } from "./pages/personal/PersonalHome";

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
      {/* Public routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Protected routes — phải đăng nhập */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          {/* Personal section */}
          <Route path="/personal" element={<PersonalHome />} />
          <Route path="/personal/dashboard" element={<PersonalDashboard />} />
          <Route path="/personal/documents" element={<PersonalDocuments />} />
          <Route path="/personal/documents/:id" element={<DocumentDetail />} />
          <Route path="/personal/shared" element={<SharedWithMe />} />
          <Route path="/personal/favorites" element={<FavoritesPage />} />
          <Route path="/personal/trash" element={<TrashPage />} />
          <Route path="/groups" element={<GroupList />} />
          <Route path="/groups/:id" element={<GroupSpace />} />
          <Route path="/class" element={<ClassSpace />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          <Route
            path="/groups/:id/documents/:docId"
            element={<GroupDocumentDetailPage />}
          />

          <Route path="/class" element={<ClassSpace />} />
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
          </Route>
        </Route>
      </Route>
      <Route
        path="/groups/:id/documents/:docId"
        element={<GroupDocumentDetailPage />}
      />

      {/* Fallback */}
      <Route path="/" element={<Navigate to="/personal" replace />} />
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
