import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({ theme: 'light', isDark: false, setTheme: () => {}, toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    try {
      return localStorage.getItem('theme') || 'light';
    } catch {
      return 'light';
    }
  });

  const isDark = theme === 'dark';

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
    try { localStorage.setItem('theme', theme); } catch {}
  }, [theme, isDark]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  const value = { theme, isDark, setTheme, toggleTheme };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
