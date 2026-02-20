import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { storage } from './services/storage';

type DesignTokens = {
  color: {
    primary: string;
    primaryHover: string;
    primaryActive: string;
    secondary: string;
    background: string;
    surface: string;
    surfaceElevated: string;
    textPrimary: string;
    textSecondary: string;
    textInverse: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    focusRing: string;
  };
  typography: {
    fontFamily: {
      sans: string;
      display: string;
    };
    fontWeight: {
      regular: '400';
      medium: '500';
      semibold: '600';
      bold: '700';
    };
    fontSize: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
      '2xl': number;
      '3xl': number;
    };
    lineHeight: {
      tight: number;
      normal: number;
      relaxed: number;
    };
  };
  spacing: {
    0: number;
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
    6: number;
    8: number;
    10: number;
    12: number;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
  elevation: {
    none: {
      shadowColor: string;
      shadowOpacity: number;
      shadowRadius: number;
      shadowOffset: { width: number; height: number };
      elevation: number;
    };
    sm: {
      shadowColor: string;
      shadowOpacity: number;
      shadowRadius: number;
      shadowOffset: { width: number; height: number };
      elevation: number;
    };
    md: {
      shadowColor: string;
      shadowOpacity: number;
      shadowRadius: number;
      shadowOffset: { width: number; height: number };
      elevation: number;
    };
    lg: {
      shadowColor: string;
      shadowOpacity: number;
      shadowRadius: number;
      shadowOffset: { width: number; height: number };
      elevation: number;
    };
    overlay: {
      shadowColor: string;
      shadowOpacity: number;
      shadowRadius: number;
      shadowOffset: { width: number; height: number };
      elevation: number;
    };
  };
  motion: {
    fast: number;
    normal: number;
    slow: number;
    easing: {
      standard: [number, number, number, number];
      emphasized: [number, number, number, number];
    };
  };
  layout: {
    breakpoints: {
      mobile: number;
      tablet: number;
      desktop: number;
      wide: number;
    };
    containerPadding: {
      mobile: number;
      tablet: number;
    };
    maxContentWidth: number;
    maxReadingWidth: number;
    gridColumns: {
      mobile: number;
      tablet: number;
      desktop: number;
    };
  };
};

export type Theme = {
  tokens: DesignTokens;
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
  gradients: {
    hero: [string, string, ...string[]];
    card: [string, string, ...string[]];
    accent: [string, string, ...string[]];
    micro: [string, string, ...string[]];
    success: [string, string, ...string[]];
    warning: [string, string, ...string[]];
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

const baseTokens: Omit<DesignTokens, 'color'> = {
  typography: {
    fontFamily: {
      sans: 'System',
      display: 'System',
    },
    fontWeight: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    fontSize: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 30,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.4,
      relaxed: 1.6,
    },
  },
  spacing: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  elevation: {
    none: {
      shadowColor: '#000000',
      shadowOpacity: 0,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: 0 },
      elevation: 0,
    },
    sm: {
      shadowColor: '#0f172a',
      shadowOpacity: 0.08,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    md: {
      shadowColor: '#0f172a',
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    lg: {
      shadowColor: '#0f172a',
      shadowOpacity: 0.16,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 7,
    },
    overlay: {
      shadowColor: '#000000',
      shadowOpacity: 0.22,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 10,
    },
  },
  motion: {
    fast: 120,
    normal: 220,
    slow: 320,
    easing: {
      standard: [0.2, 0, 0, 1],
      emphasized: [0.2, 0, 0, 1.2],
    },
  },
  layout: {
    breakpoints: {
      mobile: 0,
      tablet: 600,
      desktop: 1024,
      wide: 1440,
    },
    containerPadding: {
      mobile: 16,
      tablet: 24,
    },
    maxContentWidth: 1200,
    maxReadingWidth: 720,
    gridColumns: {
      mobile: 4,
      tablet: 8,
      desktop: 12,
    },
  },
};

const buildTheme = (color: DesignTokens['color'], isDark: boolean): Theme => {
  const tokens: DesignTokens = {
    ...baseTokens,
    color,
  };

  return {
    tokens,
    colors: {
      bg: color.background,
      surface: color.surface,
      surfaceAlt: color.surfaceElevated,
      text: color.textPrimary,
      textMuted: color.textSecondary,
      textSoft: color.textSecondary,
      border: color.border,
      accent: color.primary,
      accentDark: color.primaryActive,
      accentStart: color.primary,
      accentEnd: color.secondary,
      danger: color.error,
      warning: color.warning,
      success: color.success,
      info: color.info,
    },
    gradients: {
      hero: isDark
        ? ['#05235f', '#0840a5', '#045f8a']
        : ['#0a47bf', '#0f5bdd', '#1a7cff'],
      card: isDark ? ['#0f172a', '#131f34'] : ['#ffffff', '#f8fbff'],
      accent: [color.primary, color.secondary],
      micro: isDark ? ['#1b2a45', '#183357'] : ['#eaf2ff', '#f4f9ff'],
      success: [color.success, isDark ? '#16a34a' : '#22c55e'],
      warning: [color.warning, isDark ? '#ea580c' : '#f97316'],
    },
    radius: {
      sm: tokens.radius.sm,
      md: tokens.radius.md,
      lg: tokens.radius.lg,
      xl: tokens.radius.xl,
    },
    shadow: {
      color: tokens.elevation.md.shadowColor,
      opacity: tokens.elevation.md.shadowOpacity,
      radius: tokens.elevation.md.shadowRadius,
      offset: tokens.elevation.md.shadowOffset,
      elevation: tokens.elevation.md.elevation,
    },
    spacing: {
      xs: tokens.spacing[2],
      sm: tokens.spacing[3],
      md: tokens.spacing[4],
      lg: tokens.spacing[6],
      xl: tokens.spacing[8],
    },
    font: {
      title: tokens.typography.fontSize['2xl'],
      subtitle: tokens.typography.fontSize.sm,
      body: tokens.typography.fontSize.sm,
      small: 11,
    },
  };
};

export const lightTheme: Theme = buildTheme(
  {
    primary: '#0a47bf',
    primaryHover: '#0d56d8',
    primaryActive: '#083794',
    secondary: '#0f7cc6',
    background: '#f4f8ff',
    surface: '#ffffff',
    surfaceElevated: '#edf3ff',
    textPrimary: '#0f1b33',
    textSecondary: '#4e5d79',
    textInverse: '#ffffff',
    border: '#d7e2f4',
    success: '#128454',
    warning: '#b96800',
    error: '#c6284a',
    info: '#0a66b3',
    focusRing: '#0f5bdd',
  },
  false
);

export const darkTheme: Theme = buildTheme(
  {
    primary: '#5da0ff',
    primaryHover: '#82b7ff',
    primaryActive: '#b2d1ff',
    secondary: '#38a3ff',
    background: '#070f1f',
    surface: '#0f1a2e',
    surfaceElevated: '#15233b',
    textPrimary: '#f4f8ff',
    textSecondary: '#c6d4ed',
    textInverse: '#0f172a',
    border: '#2a3b59',
    success: '#47d686',
    warning: '#f7b63c',
    error: '#fb7390',
    info: '#5bc6ff',
    focusRing: '#82b7ff',
  },
  true
);

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
