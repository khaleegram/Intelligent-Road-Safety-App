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

export type TypeRole = {
  fontSize: number;
  lineHeight: number;
  fontWeight: '400' | '500' | '600' | '700';
  letterSpacing: number;
};

export type Theme = {
  /** Semantic palette — the only source of colour. */
  color: DesignTokens['color'];
  /** 8pt spacing scale. */
  space: DesignTokens['spacing'];
  /** Bundled type roles: size + line height + weight + tracking. */
  type: {
    display: TypeRole;
    title: TypeRole;
    heading: TypeRole;
    body: TypeRole;
    label: TypeRole;
    caption: TypeRole;
  };
  elevation: {
    flat: DesignTokens['elevation']['none'];
    raised: DesignTokens['elevation']['sm'];
    floating: DesignTokens['elevation']['md'];
    overlay: DesignTokens['elevation']['overlay'];
  };
  motion: DesignTokens['motion'];
  layout: DesignTokens['layout'];
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
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

const buildTheme = (color: DesignTokens['color']): Theme => {
  const tokens: DesignTokens = {
    ...baseTokens,
    color,
  };

  const type: Theme['type'] = {
    display: { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.5 },
    title: { fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.3 },
    heading: { fontSize: 18, lineHeight: 24, fontWeight: '600', letterSpacing: 0 },
    body: { fontSize: 15, lineHeight: 22, fontWeight: '400', letterSpacing: 0 },
    label: { fontSize: 13, lineHeight: 18, fontWeight: '600', letterSpacing: 0.1 },
    caption: { fontSize: 12, lineHeight: 16, fontWeight: '500', letterSpacing: 0.1 },
  };

  return {
    color,
    space: tokens.spacing,
    type,
    elevation: {
      flat: tokens.elevation.none,
      raised: tokens.elevation.sm,
      floating: tokens.elevation.md,
      overlay: tokens.elevation.overlay,
    },
    motion: tokens.motion,
    layout: tokens.layout,
    radius: {
      sm: tokens.radius.sm,
      md: tokens.radius.md,
      lg: tokens.radius.lg,
      xl: tokens.radius.xl,
      full: tokens.radius.full,
    },
  };
};

export const lightTheme: Theme = buildTheme(
  {
    primary: '#c2410c',
    primaryHover: '#ea580c',
    primaryActive: '#9a3412',
    secondary: '#175cd3',
    background: '#f6f7f9',
    surface: '#ffffff',
    surfaceElevated: '#f1f3f7',
    textPrimary: '#0b1220',
    textSecondary: '#5b6779',
    textInverse: '#ffffff',
    border: '#dde3ea',
    success: '#067647',
    warning: '#b54708',
    error: '#d92d20',
    info: '#175cd3',
    focusRing: '#c2410c',
  }
);

export const darkTheme: Theme = buildTheme(
  {
    primary: '#f5a524',
    primaryHover: '#ffb84d',
    primaryActive: '#e08e0b',
    secondary: '#4ea8ff',
    background: '#080b10',
    surface: '#10151d',
    surfaceElevated: '#161d28',
    textPrimary: '#f2f5f9',
    textSecondary: '#9aa7ba',
    textInverse: '#0a0e14',
    border: '#232c3a',
    success: '#34d399',
    warning: '#fbbf24',
    error: '#ff5a5f',
    info: '#4ea8ff',
    focusRing: '#ffc14d',
  }
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
  // Night Drive is dark-first; system/light remain available in Settings.
  const [preference, setPreferenceState] = useState<ThemePreference>('dark');
  const [systemScheme, setSystemScheme] = useState<ThemeMode>(
    Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'
  );

  useEffect(() => {
    storage.get<ThemePreference | ThemeMode>(THEME_STORAGE_KEY, 'dark').then((stored) => {
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
