import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  isChristmasMode: boolean;
  toggleChristmasMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeContextProvider');
  }
  return context;
};

interface ThemeContextProviderProps {
  children: React.ReactNode;
}

export const ThemeContextProvider: React.FC<ThemeContextProviderProps> = ({ children }) => {
  // Initialize state from localStorage or system preference
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('themeMode');
      if (savedMode === 'light' || savedMode === 'dark') {
        return savedMode;
      }
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'light';
  });

  // Christmas mode state
  const [isChristmasMode, setIsChristmasMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedChristmasMode = localStorage.getItem('christmasMode');
      // Default to true in December if not set
      if (savedChristmasMode === null) {
        const month = new Date().getMonth();
        return month === 11; // December is 11
      }
      return savedChristmasMode === 'true';
    }
    return false;
  });

  // Update HTML class and localStorage when mode changes
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(mode);
    localStorage.setItem('themeMode', mode);
    
    // Also update style-scheme property for standard form controls
    root.style.colorScheme = mode;
  }, [mode]);

  // Handle Christmas mode effects
  useEffect(() => {
    const root = window.document.documentElement;
    if (isChristmasMode) {
      root.classList.add('theme-christmas');
    } else {
      root.classList.remove('theme-christmas');
    }
    localStorage.setItem('christmasMode', String(isChristmasMode));
  }, [isChristmasMode]);

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const toggleChristmasMode = () => {
    setIsChristmasMode(prev => !prev);
  };

  const value = useMemo(() => ({
    mode,
    toggleTheme,
    isChristmasMode,
    toggleChristmasMode
  }), [mode, isChristmasMode]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};