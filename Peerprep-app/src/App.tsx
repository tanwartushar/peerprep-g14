import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Matching } from "./pages/Matching";
import { Workspace } from "./pages/Workspace";
import { AdminDashboard } from "./pages/AdminDashboard";
import { ProfileSetup } from "./pages/ProfileSetup";
import "./App.css";

const App: React.FC = () => {
  // Adding a simple effect to log that the app initialized successfully
  useEffect(() => {
    console.log("PeerPrep Frontend Initialized - Powered by React & Vite");
  }, []);

  return (
    <Router>
      <div className="app-wrapper">
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/matching" element={<Matching />} />
            <Route path="/workspace" element={<Workspace />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/profile-setup" element={<ProfileSetup />} />
            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
