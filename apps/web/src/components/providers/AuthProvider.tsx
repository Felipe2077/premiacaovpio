// apps/web/src/components/providers/AuthProvider.tsx (CORRIGIDO)
'use client';

import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';
import { createContext, ReactNode, useContext, useEffect, useRef } from 'react';

interface AuthContextType {
  // Reexportar tudo do store para facilitar o uso
  user: ReturnType<typeof useAuthStore>['user'];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: ReturnType<typeof useAuthStore>['login'];
  logout: ReturnType<typeof useAuthStore>['logout'];
  hasPermission: ReturnType<typeof useAuthStore>['hasPermission'];
  hasAnyPermission: ReturnType<typeof useAuthStore>['hasAnyPermission'];
  hasRole: ReturnType<typeof useAuthStore>['hasRole'];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const authStore = useAuthStore();
  const initializationRef = useRef(false);

  // Verificar autenticação ao carregar a aplicação (APENAS UMA VEZ)
  useEffect(() => {
    if (!initializationRef.current) {
      initializationRef.current = true;
      authStore.checkAuth().catch((error) => {
        console.warn('Erro na verificação inicial de auth:', error);
      });
    }
  }, []); // Dependências vazias - executa apenas uma vez

  // Criar valor do contexto
  const contextValue: AuthContextType = {
    user: authStore.user,
    isAuthenticated: authStore.isAuthenticated,
    isLoading: authStore.isLoading,
    login: authStore.login,
    logout: () => {
      authStore.logout();
      router.push('/'); // Redirecionar para home após logout
    },
    hasPermission: authStore.hasPermission,
    hasAnyPermission: authStore.hasAnyPermission,
    hasRole: authStore.hasRole,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

// Hook personalizado para usar o contexto de auth
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook para verificar se está autenticado (mais simples)
export function useIsAuthenticated() {
  const { isAuthenticated, isLoading } = useAuth();
  return { isAuthenticated, isLoading };
}

// Hook para verificar permissões específicas
export function usePermissions() {
  const { hasPermission, hasAnyPermission, hasRole, user } = useAuth();
  return {
    hasPermission,
    hasAnyPermission,
    hasRole,
    permissions: user?.permissions || [],
    roles: user?.roles || [],
  };
}
