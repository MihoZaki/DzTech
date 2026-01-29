// src/components/ThemeSwitcher.jsx
import React, { useEffect, useRef, useState } from "react";

const ThemeSwitcher = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const checkboxRef = useRef(null);

  const setThemeAndBody = (darkMode) => {
    const themeName = darkMode ? "coffee" : "winter";
    setIsDarkMode(darkMode);
    document.documentElement.setAttribute("data-theme", themeName);
  };

  // Initialize theme and set checkbox ref
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      const initialIsDarkMode = savedTheme === "coffee";
      setThemeAndBody(initialIsDarkMode);
      // Ensure the checkbox reflects the loaded state
      if (checkboxRef.current) {
        checkboxRef.current.checked = initialIsDarkMode;
      }
    } else {
      const prefersDark =
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      setThemeAndBody(prefersDark);
      if (checkboxRef.current) {
        checkboxRef.current.checked = prefersDark;
      }
    }
  }, []);

  // Sync checkbox ref with state changes (if needed for daisyUI to pick up)
  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.checked = isDarkMode;
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    const newIsDarkMode = !isDarkMode;
    setThemeAndBody(newIsDarkMode);
    localStorage.setItem("theme", newIsDarkMode ? "coffee" : "winter");
  };

  return (
    <button
      onClick={toggleTheme}
      className="btn btn-sm btn-ghost bg-base-100" // Ensure text is visible on navbar
      aria-label="Toggle theme"
    >
      {isDarkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
    </button>
  );
};

export default ThemeSwitcher;
