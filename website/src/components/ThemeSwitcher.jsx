import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
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
      className={`flex flex-row px-3 items-center gap-2 transition`} // Changed to flex-row, added gap-2 for spacing
    >
      <div>
        {currentTheme === "fantasy"
          ? <MoonIcon className="h-6 w-6" />
          : <SunIcon className="h-6 w-6" />}
      </div>
      <p className="text-sm">
        {currentTheme === "fantasy" ? "Dark Mode" : "Light Mode"}
      </p>
    </button>
  );
};

export default ThemeSwitcher;
