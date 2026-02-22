import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore"; // Adjust the path to your store

const ProtectedRoute = ({ children, adminOnly = false }) => {
  // Use the Zustand store to get user and token
  const { user, token } = useAuthStore();

  // Check if user is authenticated based on the presence of token and user data
  const isAuthenticated = !!user && !!token; // Both user and token should exist

  // Check if user is admin (if adminOnly is required)
  const isAdmin = user?.is_admin; // Assuming your user object has an 'is_admin' field

  // Redirect if not authenticated, or if adminOnly is required and user is not admin
  if (!isAuthenticated || (adminOnly && !isAdmin)) {
    console.log(
      "ProtectedRoute: Redirecting to login. Authenticated?",
      isAuthenticated,
      "Is Admin?",
      isAdmin,
    );
    return <Navigate to="/auth/login" replace />;
  }

  // Render the child component if authenticated and authorized
  return children;
};

export default ProtectedRoute;
