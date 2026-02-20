import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./LoginPage"; // Create this
import SignupPage from "./SigupPage"; // Create this

const AuthPage = () => {
  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content flex-col">
        {/* Add your logo or branding here if needed */}
        <Routes>
          <Route path="/" element={<Navigate to="login" replace />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignupPage />} />
        </Routes>
      </div>
    </div>
  );
};

export default AuthPage;
