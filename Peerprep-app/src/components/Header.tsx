import React from "react";
import "./Header.css";
import { Menu, UserIcon } from "lucide-react";
import { useCurrentUserProfile } from "../hooks/useCurrentUserProfile";
import { Spinner } from "./Spinner";
import { Button } from "./Button";

type HeaderTheme = "user" | "admin";

interface AppShellHeaderProps {
  theme?: HeaderTheme;
  showToggle?: boolean;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  showProfile?: boolean;
  showProfileName?: boolean;
  showProfilePicture?: boolean;
  className?: string;
}

export const Header: React.FC<AppShellHeaderProps> = ({
  theme = "user",
  showToggle = false,
  isSidebarOpen = false,
  onToggleSidebar,
  showProfile = true,
  showProfileName = true,
  showProfilePicture = true,
  className = "",
}) => {
  const { data: user, isLoading: profileLoading } = useCurrentUserProfile();

  const displayName = theme === "admin" ? "Admin" : (user?.name ?? "User Name");

  return (
    <div
      className={["app-shell-header", `app-shell-header--${theme}`, className]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="app-shell-header__left">
        {showToggle && (
          <Button
            type="button"
            theme={theme}
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
            aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
            className="app-shell-header__toggle"
          >
            <Menu size={18} />
          </Button>
        )}
      </div>

      <div className="app-shell-header__right">
        {showProfile && (
          <div className="app-shell-header__profile">
            {profileLoading && theme !== "admin" ? (
              <div className="app-shell-header__loading">
                <span className="app-shell-header__loading-text">
                  Retrieving your name...
                </span>
                <Spinner size="lg" />
              </div>
            ) : (
              <>
                {showProfileName && (
                  <div className="app-shell-header__user-name">
                    {displayName}
                  </div>
                )}

                {showProfilePicture && (
                  <div className="app-shell-header__profile-picture">
                    <UserIcon className="h-5 w-5" />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;
