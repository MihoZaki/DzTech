import React, { createContext, useContext, useEffect, useState } from "react";
import { loginUser, logoutUser, registerUser } from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Initially null (not logged in)
  const [isLoading, setIsLoading] = useState(true); // To handle initial loading state

  // Check for stored session on app start
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Check for stored token in localStorage
        const token = localStorage.getItem("access_token"); // Fixed to match API config
        if (token) {
          // If token exists, we could verify it by making a user profile request
          // For now, we'll just set the user if token exists
          // In a real scenario, you'd want to validate the token with an API call
          const storedUserData = localStorage.getItem("userData");
          if (storedUserData) {
            setUser(JSON.parse(storedUserData));
          }
        }
      } catch (error) {
        console.error("Error checking auth status:", error);
        // Clear any potentially corrupted auth data
        localStorage.removeItem("access_token");
        localStorage.removeItem("userData");
      } finally {
        setIsLoading(false); // Finished checking
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await loginUser(credentials);
      const { user: userData, access_token } = response;

      // Store the access token and user data
      localStorage.setItem("access_token", access_token); // Fixed to match API config
      localStorage.setItem("userData", JSON.stringify(userData));

      // Update the user state
      setUser(userData);
      return response;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await registerUser(userData);
      // Auto-login after successful registration
      const loginResponse = await loginUser({
        email: userData.email,
        password: userData.password,
      });

      const { user: loggedInUser, access_token } = loginResponse;

      // Store the access token and user data
      localStorage.setItem("access_token", access_token); // Fixed to match API config
      localStorage.setItem("userData", JSON.stringify(loggedInUser));

      // Update the user state
      setUser(loggedInUser);
      return response;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Call the API to logout (revokes refresh token)
      await logoutUser();
    } catch (error) {
      console.error("Logout error:", error);
      // Continue with local logout even if API call fails
    } finally {
      // Clear stored tokens and user data
      localStorage.removeItem("access_token"); // Fixed to match API config
      localStorage.removeItem("userData");

      // Update the user state
      setUser(null);
    }
  };

  // Value object passed to consumers
  const value = {
    user,
    login,
    register,
    logout,
    isLoading, // Expose loading state
    isAuthenticated: !!user, // Convenient boolean check
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
