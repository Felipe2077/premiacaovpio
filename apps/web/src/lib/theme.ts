// apps/web/src/lib/theme.ts - CORRIGIDO SEM AZUL
export const companyTheme = {
  // Cores principais da empresa (baseado no amarelo da logo)
  primary: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24', // Amarelo principal da logo
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  // Cores secundárias (tons de cinza moderno)
  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },

  // Status colors - SEM AZUL!
  success: {
    light: '#d1fae5',
    main: '#10b981',
    dark: '#065f46',
  },

  warning: {
    light: '#fef3c7',
    main: '#f59e0b',
    dark: '#92400e',
  },

  error: {
    light: '#fee2e2',
    main: '#ef4444',
    dark: '#991b1b',
  },

  // INFO AGORA É AMARELO/LARANJA em vez de azul
  info: {
    light: '#fef3c7', // Amarelo claro
    main: '#f59e0b', // Amarelo/laranja - SEM AZUL!
    dark: '#92400e', // Laranja escuro
  },

  // Gradientes da empresa
  gradients: {
    primary: 'bg-gradient-to-r from-yellow-400 to-amber-500',
    primarySubtle: 'bg-gradient-to-r from-yellow-50 to-amber-50',
    dark: 'bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900',
    light: 'bg-gradient-to-br from-slate-50 to-slate-100',
    sidebar: 'bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900',
  },

  // Sombras customizadas
  shadows: {
    primary: 'shadow-yellow-500/25',
    card: 'shadow-lg shadow-slate-200/50',
    modal: 'shadow-2xl shadow-slate-900/25',
  },

  // Bordas
  borders: {
    primary: 'border-yellow-500/30',
    light: 'border-slate-200/50',
    dark: 'border-slate-700/50',
  },
} as const;

// Classes de utilidade para Tailwind
export const companyClasses = {
  // Botões
  button: {
    primary:
      'bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-slate-900 font-semibold shadow-lg shadow-yellow-500/25',
    secondary:
      'bg-slate-800 hover:bg-slate-700 text-white border border-slate-600',
    ghost: 'hover:bg-yellow-50 hover:text-yellow-700',
  },

  // Cards
  card: {
    default:
      'bg-white border border-slate-200/50 shadow-lg shadow-slate-200/50',
    primary:
      'bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200/50',
    dark: 'bg-slate-800 border border-slate-700/50',
  },

  // Estados ativos
  active: {
    sidebar:
      'bg-gradient-to-r from-yellow-500/20 to-amber-500/10 text-yellow-400 shadow-lg border border-yellow-500/30',
    tab: 'border-yellow-400 text-yellow-600',
    badge: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  },

  // Texto
  text: {
    primary: 'text-slate-900',
    secondary: 'text-slate-600',
    muted: 'text-slate-500',
    accent: 'text-yellow-600',
    inverse: 'text-white',
  },

  // Backgrounds
  background: {
    main: 'bg-gradient-to-br from-slate-50 to-slate-100',
    sidebar: 'bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900',
    card: 'bg-white',
    muted: 'bg-slate-50',
  },
} as const;

// Variáveis CSS customizadas para override do Tailwind - SEM AZUL
export const cssVariables = {
  '--color-primary': '251 191 36', // yellow-400 em RGB
  '--color-primary-foreground': '15 23 42', // slate-900 em RGB
  '--color-secondary': '71 85 105', // slate-600 em RGB
  '--color-accent': '251 191 36', // yellow-400 em RGB
  '--color-accent-foreground': '15 23 42', // slate-900 em RGB
  '--color-border': '226 232 240', // slate-200 em RGB
  '--color-ring': '251 191 36', // yellow-400 em RGB
} as const;
