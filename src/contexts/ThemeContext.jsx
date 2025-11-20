import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Default to dark-elegant theme if nothing is saved
    const savedTheme = localStorage.getItem('bonplaninfos_theme');
    // Ensure that only valid themes are loaded from local storage
    if (savedTheme === 'dark-elegant' || savedTheme === 'deep-night') {
      return savedTheme;
    }
    return 'dark-elegant'; 
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove all possible theme classes before adding the current one
    root.classList.remove('dark-elegant', 'deep-night', 'light', 'dark', 'blue');
    root.classList.add(theme);
    
    localStorage.setItem('bonplaninfos_theme', theme);
  }, [theme]);

  const value = { theme, setTheme };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};