import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

// Simple mock user data for demonstration
const MOCK_USER = {
  id: 1,
  name: "John Doe",
  email: "john.doe@example.com",
  joinDate: "2024-01-01",
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Initially null (not logged in)
  const [isLoading, setIsLoading] = useState(true); // To handle initial loading state

  // Simulate checking for a stored session/token on app start
  useEffect(() => {
    const checkAuthStatus = async () => {
      // Simulate an API call delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check for a mock token in localStorage (or any other condition)
      const token = localStorage.getItem("authToken");
      if (token) {
        // If token exists, assume user is logged in and set user data
        setUser(MOCK_USER);
      } else {
        // Otherwise, user is not logged in
        setUser(null);
      }
      setIsLoading(false); // Finished checking
    };

    checkAuthStatus();
  }, []);

  const login = (credentials) => {
    // Simulate login process
    console.log("Login attempt with:", credentials);
    // For demo, just set the user and save a mock token
    setUser(MOCK_USER);
    localStorage.setItem("authToken", "mock-token-for-demo");
  };

  const logout = () => {
    // Simulate logout process
    setUser(null);
    localStorage.removeItem("authToken");
  };

  // Value object passed to consumers
  const value = {
    user,
    login,
    logout,
    isLoading, // Expose loading state
    isAuthenticated: !!user, // Convenient boolean check
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
