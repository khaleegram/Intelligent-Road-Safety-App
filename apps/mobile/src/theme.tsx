import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { storage } from './services/storage';

export type Theme = {
  colors: {
    bg: string;
    surface: string;
    surfaceAlt: string;
    text: string;
    textMuted: string;
    textSoft: string;
    border: string;
    accent: string;
    accentDark: string;
    accentStart: string;
    accentEnd: string;
    danger: string;
    warning: string;
    success: string;
    info: string;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  shadow: {
    color: string;
    opacity: number;
    radius: number;
    offset: { width: number; height: number };
    elevation: number;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  font: {
    title: number;
    subtitle: number;
    body: number;
    small: number;
  };
};

const baseTheme = {
  radius: { sm: 8, md: 12, lg: 16, xl: 20 },
  shadow: {
    color: '#0f172a',
    opacity: 0.12,
    radius: 12,
    offset: { width: 0, height: 6 },
    elevation: 4,
  },
  spacing: { xs: 6, sm: 10, md: 14, lg: 18, xl: 24 },
  font: { title: 24, subtitle: 13, body: 13, small: 11 },
};

export const lightTheme: Theme = {
  ...baseTheme,
  colors: {
    bg: '#f8fafc',
    surface: '#ffffff',
    surfaceAlt: '#f1f5f9',
    text: '#0f172a',
    textMuted: '#475569',
    textSoft: '#64748b',
    border: '#e2e8f0',
    accent: '#1e3a8a',
    accentDark: '#172554',
    accentStart: '#2563eb',
    accentEnd: '#7c3aed',
    danger: '#ef4444',
    warning: '#f59e0b',
    success: '#16a34a',
    info: '#1d4ed8',
  },
};

export const darkTheme: Theme = {
  ...baseTheme,
  colors: {
    bg: '#0b1220',
    surface: '#0f172a',
    surfaceAlt: '#111827',
    text: '#f8fafc',
    textMuted: '#cbd5f5',
    textSoft: '#94a3b8',
    border: '#1f2937',
    accent: '#93c5fd',
    accentDark: '#60a5fa',
    accentStart: '#4f46e5',
    accentEnd: '#9333ea',
    danger: '#f87171',
    warning: '#fbbf24',
    success: '#4ade80',
    info: '#93c5fd',
  },
};

type ThemeMode = 'light' | 'dark';
type ThemeContextValue = {
  theme: Theme;
  mode: ThemeMode;
  toggleTheme: () => void;
};

const THEME_STORAGE_KEY = 'theme_mode_v1';
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('light');

  useEffect(() => {
    storage.get<ThemeMode>(THEME_STORAGE_KEY, 'light').then(setMode);
  }, []);

  const toggleTheme = () => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      storage.set(THEME_STORAGE_KEY, next);
      return next;
    });
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: mode === 'light' ? lightTheme : darkTheme,
      mode,
      toggleTheme,
    }),
    [mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
