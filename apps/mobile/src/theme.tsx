import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';

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
    primary: '#0057d9',
    primaryHover: '#0f67e8',
    primaryActive: '#0046b3',
    secondary: '#007fa6',
    background: '#f3f7ff',
    surface: '#ffffff',
    surfaceElevated: '#e9f1ff',
    textPrimary: '#0b1d3a',
    textSecondary: '#4a5f84',
    textInverse: '#ffffff',
    border: '#d0ddf5',
    success: '#138657',
    warning: '#c47908',
    error: '#d1315b',
    info: '#0b6ed1',
    focusRing: '#2b79f6',
  },
  false
);

export const darkTheme: Theme = buildTheme(
  {
    primary: '#6ea7ff',
    primaryHover: '#88b8ff',
    primaryActive: '#a6cbff',
    secondary: '#45b0d4',
    background: '#070f1f',
    surface: '#0e1a32',
    surfaceElevated: '#132446',
    textPrimary: '#f3f7ff',
    textSecondary: '#becfea',
    textInverse: '#0f172a',
    border: '#294067',
    success: '#4bd88b',
    warning: '#f2b54a',
    error: '#ff7fa3',
    info: '#63c0ff',
    focusRing: '#95c2ff',
  },
  true
);

export type ThemePreference = 'system' | 'light' | 'dark';
export type ThemeMode = 'light' | 'dark';

type ThemeContextValue = {
  theme: Theme;
  mode: ThemeMode;
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => void;
  toggleTheme: () => void;
};

const THEME_STORAGE_KEY = 'theme_preference_v1';
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [systemScheme, setSystemScheme] = useState<ThemeMode>(
    Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'
  );

  useEffect(() => {
    storage.get<ThemePreference | ThemeMode>(THEME_STORAGE_KEY, 'system').then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setPreferenceState(stored);
      }
    });
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme === 'dark' ? 'dark' : 'light');
    });
    return () => sub.remove();
  }, []);

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next);
    storage.set(THEME_STORAGE_KEY, next);
  };

  const mode: ThemeMode = preference === 'system' ? systemScheme : preference;

  const toggleTheme = () => {
    const next: ThemePreference = mode === 'light' ? 'dark' : 'light';
    setPreference(next);
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: mode === 'light' ? lightTheme : darkTheme,
      mode,
      preference,
      setPreference,
      toggleTheme,
    }),
    [mode, preference]
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
