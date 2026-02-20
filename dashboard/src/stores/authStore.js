import { create } from "zustand";

export const useAuthStore = create((set) => ({
  user: (() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null; // Load user from localStorage on initialization
  })(),
  token: (() => {
    const storedToken = localStorage.getItem("access_token");
    return storedToken; // Load token from localStorage on initialization
  })(), // Initialize from storage

  login: (userData, accessToken) => {
    // Update Zustand state
    set({ user: userData, token: accessToken });
    // Persist to localStorage
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("access_token", accessToken);
  },

  logout: () => {
    set({ user: null, token: null });
    localStorage.removeItem("user");
    localStorage.removeItem("access_token");
  },
}));
