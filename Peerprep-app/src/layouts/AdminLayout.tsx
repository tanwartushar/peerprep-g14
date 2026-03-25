import React, { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import AppShell from "../components/AppShell";
import Sidebar from "../components/Sidebar";
import { Header } from "../components/Header";
import { useAuth } from "../context/AuthContext";

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      navigate("/");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const topItems = [
    {
      key: "dashboard",
      label: "Dashboard",
      active: location.pathname === "/admin/dashboard",
      onClick: () => navigate("/admin/dashboard"),
    },
    {
      key: "questions",
      label: "Questions",
      active: location.pathname.startsWith("/admin/questions"),
      onClick: () => navigate("/admin/questions"),
    },
    {
      key: "users",
      label: "Users",
      active: location.pathname.startsWith("/admin/users"),
      onClick: () => navigate("/admin/users"),
    },
  ];

  const pageNameMap: Record<string, string> = {
    "/admin/dashboard": "Dashboard",
    "/admin/questions": "Questions",
    "/admin/users": "Users",
  };

  const pageName = pageNameMap[location.pathname] ?? "";

  const bottomItems = [
    {
      key: "logout",
      label: "Logout",
      onClick: handleLogout,
      isLoading: isLoggingOut,
    },
  ];

  return (
    <AppShell
      theme="admin"
      isSidebarOpen={isSidebarOpen}
      onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
      sidebar={
        <Sidebar
          theme="admin"
          isOpen={isSidebarOpen}
          topItems={topItems}
          bottomItems={bottomItems}
        />
      }
      header={
        <Header
          theme="admin"
          showToggle
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          showProfile
          showProfileName
          showProfilePicture
          pageName={pageName}
        />
      }
    >
      <Outlet />
    </AppShell>
  );
};

export default AdminLayout;
