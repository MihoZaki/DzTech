import React, { useEffect, useState } from "react";

const ThemeSwitcher = () => {
  // Determine initial theme based on localStorage or default to light ('fantasy')
  const getInitialTheme = () => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      // Validate saved theme exists in our list (optional but good practice)
      const availableThemes = ["fantasy", "night"];
      if (availableThemes.includes(savedTheme)) {
        return savedTheme;
      }
    }
    // Default to light theme ('fantasy')
    return "fantasy";
  };

  const [currentTheme, setCurrentTheme] = useState(getInitialTheme);

  // Apply theme on component mount and when currentTheme changes
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", currentTheme);
    // Save the theme to localStorage whenever it changes
    localStorage.setItem("theme", currentTheme);
  }, [currentTheme]);

  const toggleTheme = () => {
    const newTheme = currentTheme === "fantasy" ? "night" : "fantasy";
    setCurrentTheme(newTheme);
    // The useEffect will handle saving to localStorage and applying the attribute
  };

  return (
    <button
      onClick={toggleTheme}
      className="btn btn-sm btn-ghost bg-base-100" // Keeping your original classes
      aria-label={`Toggle to ${
        currentTheme === "fantasy" ? "dark" : "light"
      } mode`}
    >
      {currentTheme === "fantasy" ? "🌙 Dark Mode" : "☀️ Light Mode"}{" "}
      {/* Using text labels */}
    </button>
  );
};

export default ThemeSwitcher;
