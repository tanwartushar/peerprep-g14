import React, { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import AppShell from "../components/AppShell";
import Sidebar from "../components/Sidebar";
import { Header } from "../components/Header";
import { useAuth } from "../context/AuthContext";

const UserLayout: React.FC = () => {
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
      key: "home",
      label: "Home",
      active: location.pathname === "/user/dashboard",
      onClick: () => navigate("/user/dashboard"),
    },
    {
      key: "questions",
      label: "Questions",
      active: location.pathname.startsWith("/user/questions"),
      onClick: () => navigate("/user/questions"),
    },
  ];

  const pageNameMap: Record<string, string> = {
    "/user/dashboard": "Home",
    "/user/questions": "Questions",
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
      theme="user"
      isSidebarOpen={isSidebarOpen}
      onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
      sidebar={
        <Sidebar
          theme="user"
          isOpen={isSidebarOpen}
          topItems={topItems}
          bottomItems={bottomItems}
        />
      }
      header={
        <Header
          theme="user"
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

export default UserLayout;
