import { Outlet } from "react-router-dom";
import { useState } from "react";
import { Sidebar } from "@/components/shared/Sidebar";
import { Header } from "@/components/shared/Header";

export function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50">
      {/* ======================================
          DESKTOP SIDEBAR
      ====================================== */}

      <div className="hidden h-full md:block">
        <Sidebar />
      </div>

      {/* ======================================
          MOBILE SIDEBAR
      ====================================== */}

      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Overlay */}
          <button
            type="button"
            aria-label="Đóng menu"
            className="absolute inset-0 bg-gray-900/40"
            onClick={() => setIsSidebarOpen(false)}
          />

          {/* Sidebar Drawer */}
          <div className="relative h-full w-[260px] bg-white shadow-xl">
            <Sidebar onNavigate={() => setIsSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* ======================================
          MAIN AREA
      ====================================== */}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header
          scopeLabel="Cá nhân"
          notificationCount={2}
          onMenuClick={() => setIsSidebarOpen(true)}
        />

        {/* Page */}
        <main className="min-h-0 flex-1 overflow-y-auto bg-gray-50 p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
