import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, User } from "lucide-react";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import "./Login_pristine.css";

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // --- ADD THESE STATES ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  // This is for user login with github
  const handleLogin = () => {
    window.location.href = "http://localhost/user/auth/github";
  };

  // This is for admin login only. The code is WRONG.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Determine which endpoint to call
    const endpoint = "http://localhost/user/admin/login";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      console.log("API Response:", data); // Debugging log
      if (!response.ok) {
        throw new Error(data.message || "Authentication failed");
      }

      // PeerPrep logic: Redirect based on admin status
      if (data.isAdmin || isAdminMode) {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container animate-fade-in">
      <div className="login-content">
        <div className="login-header">
          <div className="brand flex-center">
            <div className="brand-icon">
              <User className="h-8 w-8 text-white" />
            </div>
            <h1 className="brand-text text-gradient pixel-regular">PeerPrep</h1>
          </div>
          <p className="login-subtitle">
            {isAdminMode
              ? "Sign in to manage the platform."
              : isLogin
                ? "Welcome back to your interview preparation."
                : "Start your journey to interview success."}
          </p>
        </div>

        <Card glow className="mt-8">
          {/* Admin Toggle */}
          <div className="mode-toggle mb-6">
            <div
              className={`toggle-track ${isAdminMode ? "admin-active" : ""}`}
            >
              <button
                type="button"
                className={`toggle-option ${!isAdminMode ? "active" : ""}`}
                onClick={() => setIsAdminMode(false)}
              >
                Student
              </button>
              <button
                type="button"
                className={`toggle-option ${isAdminMode ? "active" : ""}`}
                onClick={() => {
                  setIsAdminMode(true);
                  setIsLogin(true); // Admins can only login, not create accounts here
                }}
              >
                Admin
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {isAdminMode && (
              <>
                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    isAdminMode ? "admin@peerprep.com" : "you@example.com"
                  }
                  leftIcon={<Mail className="h-5 w-5" />}
                  required
                />
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  leftIcon={<Lock className="h-5 w-5" />}
                  required
                />
                <Button
                  type="submit"
                  size="lg"
                  className="w-full mt-4"
                  isLoading={isLoading}
                  variant={isAdminMode ? "secondary" : "primary"}
                >
                  {isLogin
                    ? isAdminMode
                      ? "Admin Sign In"
                      : "Sign In"
                    : "Create Account"}
                </Button>
              </>
            )}

            {!isAdminMode && (
              <div className="github-login-container animate-fade-in">
                <Button
                  type="button" // Important: prevents handleSubmit from firing
                  onClick={handleLogin} // Your window.location.href function
                  size="lg"
                  className="w-full flex items-center justify-center gap-2"
                  variant="primary"
                >
                  {/* If you have a Github icon from lucide-react, add it here */}
                  <span>Sign in with GitHub</span>
                </Button>
                <p className="mt-4 text-xs text-center text-secondary">
                  Secure login provided by GitHub OAuth
                </p>
              </div>
            )}
          </form>

          {!isAdminMode && (
            <div className="login-footer">
              <p className="text-sm text-secondary">
                {isLogin
                  ? "Don't have an account? "
                  : "Already have an account? "}
                <button
                  type="button"
                  className="toggle-btn"
                  onClick={() => setIsLogin(!isLogin)}
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
