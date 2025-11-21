import { createTheme, type ThemeOptions } from '@mui/material/styles';

// Common settings across both themes
const commonSettings: ThemeOptions = {
  typography: {
    fontFamily: '"Rajdhani", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontFamily: '"Orbitron", sans-serif',
      fontSize: '2.5rem',
      fontWeight: 700,
      letterSpacing: '0.05em',
    },
    h2: {
      fontFamily: '"Orbitron", sans-serif',
      fontSize: '2rem',
      fontWeight: 700,
      letterSpacing: '0.05em',
    },
    h3: {
      fontFamily: '"Orbitron", sans-serif',
      fontSize: '1.75rem',
      fontWeight: 700,
      letterSpacing: '0.05em',
    },
    h4: {
      fontFamily: '"Orbitron", sans-serif',
      fontSize: '1.5rem',
      fontWeight: 700,
      letterSpacing: '0.05em',
    },
    h5: {
      fontFamily: '"Orbitron", sans-serif',
      fontSize: '1.25rem',
      fontWeight: 700,
      letterSpacing: '0.05em',
    },
    h6: {
      fontFamily: '"Orbitron", sans-serif',
      fontSize: '1rem',
      fontWeight: 700,
      letterSpacing: '0.05em',
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
          background: 'linear-gradient(135deg, #D1478E 0%, #E66A9A 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #C0357D 0%, #D55989 100%)',
          },
        },
        containedSecondary: {
          background: 'linear-gradient(135deg, #FF8C42 0%, #E66A9A 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #EE7B31 0%, #D55989 100%)',
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
              main: '#D1478E', // Mid-tone Magenta
              light: '#DA6C9E',
              dark: '#A73871',
            },
            secondary: {
              main: '#E66A9A',
              light: '#EB88AE',
              dark: '#B8557B',
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
              main: '#E66A9A', // Using lighter secondary as primary for dark mode
              light: '#FBCFE8',
              dark: '#D1478E',
            },
            secondary: {
              main: '#FF8C42', // Accent color for secondary in dark mode
              light: '#FFAD75',
              dark: '#E57026',
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