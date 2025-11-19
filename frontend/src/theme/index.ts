import { createTheme, type ThemeOptions } from '@mui/material/styles';

// Common settings across both themes
const commonSettings: ThemeOptions = {
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #4f46e5 0%, #9333ea 100%)',
          },
        },
        containedSecondary: {
          background: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #ea580c 0%, #db2777 100%)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
};

export const getTheme = (mode: 'light' | 'dark') => {
  return createTheme({
    ...commonSettings,
    palette: {
      mode,
      ...(mode === 'light'
        ? {
            // Light mode palette
            primary: {
              main: '#6366f1', // Indigo 500
              light: '#818cf8',
              dark: '#4f46e5',
            },
            secondary: {
              main: '#ec4899', // Pink 500
              light: '#f472b6',
              dark: '#db2777',
            },
            background: {
              default: '#f8fafc', // Slate 50
              paper: 'rgba(255, 255, 255, 0.8)',
            },
            text: {
              primary: '#0f172a', // Slate 900
              secondary: '#475569', // Slate 600
            },
          }
        : {
            // Dark mode palette
            primary: {
              main: '#818cf8', // Indigo 400
              light: '#a5b4fc',
              dark: '#6366f1',
            },
            secondary: {
              main: '#f472b6', // Pink 400
              light: '#fbcfe8',
              dark: '#ec4899',
            },
            background: {
              default: '#0f172a', // Slate 900
              paper: 'rgba(30, 41, 59, 0.7)', // Slate 800 with opacity
            },
            text: {
              primary: '#f8fafc', // Slate 50
              secondary: '#94a3b8', // Slate 400
            },
          }),
    },
    components: {
      ...commonSettings.components,
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            backdropFilter: 'blur(12px)',
            border: mode === 'light' 
              ? '1px solid rgba(255, 255, 255, 0.5)' 
              : '1px solid rgba(255, 255, 255, 0.1)',
            background: mode === 'light'
              ? 'rgba(255, 255, 255, 0.7)'
              : 'rgba(30, 41, 59, 0.6)',
            boxShadow: mode === 'light' 
              ? '0 4px 20px rgba(0,0,0,0.05)' 
              : '0 4px 20px rgba(0,0,0,0.2)',
            transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: mode === 'light'
                ? '0 12px 30px rgba(0,0,0,0.1)'
                : '0 12px 30px rgba(0,0,0,0.3)',
            },
          },
        },
      },
    },
  });
};

// Default export for backward compatibility if needed, though we should switch to using getTheme
const theme = getTheme('light');
export default theme;