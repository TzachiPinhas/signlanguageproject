import React, { createContext, useState, useContext, useEffect } from 'react';
import { getThemeColors } from '../styles/theme';

// Create the context
const ThemeContext = createContext();

// Custom hook to use the theme context
export const useTheme = () => useContext(ThemeContext);

// Provider component
export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [theme, setTheme] = useState(getThemeColors(false));

  // Toggle dark mode
  const toggleDarkMode = (value) => {
    const darkMode = typeof value === 'boolean' ? value : !isDarkMode;
    setIsDarkMode(darkMode);
    setTheme(getThemeColors(darkMode));
    
    // Save preference to localStorage
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    
    // Update body background and text color for a consistent experience
    document.body.style.backgroundColor = getThemeColors(darkMode).background;
    document.body.style.color = getThemeColors(darkMode).text;
  };

  // Load theme preference on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('darkMode');
      if (savedTheme !== null) {
        toggleDarkMode(JSON.parse(savedTheme));
      } else {
        // Check for system preference
        const prefersDarkMode = window.matchMedia && 
          window.matchMedia('(prefers-color-scheme: dark)').matches;
        toggleDarkMode(prefersDarkMode);
      }
    } catch (error) {
      console.error("Error loading theme preference:", error);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;