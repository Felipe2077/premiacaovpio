// apps/web/src/store/auth-store.ts (VERSÃO CORRIGIDA COMPLETA)
import { Permission, Role } from '@sistema-premiacao/shared-types';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface User {
  id: number;
  email: string;
  nome: string;
  roles: Role[];
  permissions: Permission[];
  sectorId?: number;
  sectorName?: string;
  ativo: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthState {
  // Estado
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Ações
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;

  // Verificações de permissão
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasRole: (role: Role) => boolean;

  // Setters internos
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => {
        // Flag para prevenir múltiplas verificações simultâneas
        let isCheckingAuth = false;

        return {
          // Estado inicial
          user: null,
          isAuthenticated: false,
          isLoading: true,

          // Ação de login
          login: async (credentials: LoginCredentials) => {
            set({ isLoading: true });

            try {
              const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include', // Para cookies httpOnly
                body: JSON.stringify(credentials),
              });

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Erro ao fazer login');
              }

              const data = await response.json();

              // Extrair informações do usuário
              const user: User = {
                id: data.user.id,
                email: data.user.email,
                nome: data.user.nome,
                roles: data.user.roles || [],
                permissions: data.user.permissions || [],
                sectorId: data.user.sectorId,
                sectorName: data.user.sectorName,
                ativo: data.user.ativo,
              };

              set({
                user,
                isAuthenticated: true,
                isLoading: false,
              });

              console.log('✅ Login realizado com sucesso:', user.email);
            } catch (error) {
              console.error('❌ Erro no login:', error);
              set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
              });
              throw error;
            }
          },

          // Ação de logout
          logout: () => {
            // Fazer logout no backend
            fetch(`${API_BASE_URL}/api/auth/logout`, {
              method: 'POST',
              credentials: 'include',
            }).catch((error) => {
              console.warn('Erro ao fazer logout no backend:', error);
            });

            // Limpar estado local
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });

            console.log('✅ Logout realizado');
          },

          // Verificar autenticação (ao carregar a página) - COM PROTEÇÃO CONTRA LOOP
          checkAuth: async () => {
            // Prevenir múltiplas verificações simultâneas
            if (isCheckingAuth) {
              console.log(
                '⚠️ Verificação de auth já em andamento, ignorando...'
              );
              return;
            }

            isCheckingAuth = true;
            set({ isLoading: true });

            try {
              const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
                credentials: 'include',
              });

              if (response.ok) {
                const data = await response.json();

                const user: User = {
                  id: data.id,
                  email: data.email,
                  nome: data.nome,
                  roles: data.roles || [],
                  permissions: data.permissions || [],
                  sectorId: data.sectorId,
                  sectorName: data.sectorName,
                  ativo: data.ativo,
                };

                set({
                  user,
                  isAuthenticated: true,
                  isLoading: false,
                });

                console.log('✅ Autenticação verificada:', user.email);
              } else {
                // Token inválido ou expirado
                set({
                  user: null,
                  isAuthenticated: false,
                  isLoading: false,
                });
                console.log('⚠️ Usuário não autenticado');
              }
            } catch (error) {
              console.error('❌ Erro ao verificar autenticação:', error);
              set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
              });
            } finally {
              isCheckingAuth = false;
            }
          },

          // Verificações de permissão
          hasPermission: (permission: Permission): boolean => {
            const { user } = get();
            return user?.permissions?.includes(permission) || false;
          },

          hasAnyPermission: (permissions: Permission[]): boolean => {
            const { user } = get();
            if (!user?.permissions) return false;
            return permissions.some((permission) =>
              user.permissions.includes(permission)
            );
          },

          hasRole: (role: Role): boolean => {
            const { user } = get();
            return user?.roles?.includes(role) || false;
          },

          // Setters internos
          setUser: (user: User | null) =>
            set({ user, isAuthenticated: !!user }),
          setLoading: (loading: boolean) => set({ isLoading: loading }),
        };
      },
      {
        name: 'auth-storage',
        // Persistir apenas informações não sensíveis
        partialize: (state) => ({
          isAuthenticated: state.isAuthenticated,
          user: state.user
            ? {
                id: state.user.id,
                email: state.user.email,
                nome: state.user.nome,
                roles: state.user.roles,
                permissions: state.user.permissions,
                sectorId: state.user.sectorId,
                sectorName: state.user.sectorName,
                ativo: state.user.ativo,
              }
            : null,
        }),
      }
    ),
    {
      name: 'auth-store',
    }
  )
);
