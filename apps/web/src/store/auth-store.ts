// apps/web/src/store/auth-store.ts (CORRIGIDO - BASEADO NO SEU ORIGINAL)
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
  // 🎯 CORREÇÃO: Remover sectorName - não existe na entidade
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

          // 🎯 CORREÇÃO: Ação de login com verificação de success
          login: async (credentials: LoginCredentials) => {
            console.log('🔐 Iniciando login...', credentials.email);
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

              console.log('📡 Resposta do servidor:', response.status);

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Erro na resposta:', errorData);
                throw new Error(
                  errorData.error || errorData.message || 'Erro ao fazer login'
                );
              }

              const data = await response.json();
              console.log('📦 Dados recebidos:', data);

              // 🎯 CORREÇÃO: Verificar se o login foi bem-sucedido
              if (!data.success) {
                throw new Error('Login não foi bem-sucedido');
              }

              // Extrair informações do usuário - COMPATIBILIDADE com seu backend
              const user: User = {
                id: data.user.id,
                email: data.user.email,
                nome: data.user.nome,
                roles: data.user.roles || [data.user.role], // 🎯 COMPATIBILIDADE: role único -> array
                permissions: data.user.permissions || [],
                sectorId: data.user.sectorId,
                // 🎯 CORREÇÃO: Remover sectorName que pode não existir
                ativo: data.user.ativo !== false, // Default true se não informado
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
            console.log('👋 Iniciando logout...');

            // Fazer logout no backend
            fetch(`${API_BASE_URL}/api/auth/logout`, {
              method: 'POST',
              credentials: 'include',
            }).catch((error) => {
              console.warn('⚠️ Erro ao fazer logout no backend:', error);
            });

            // Limpar estado local
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });

            console.log('✅ Logout realizado');
          },

          // 🎯 CORREÇÃO: Verificar autenticação com proteção contra loop
          checkAuth: async () => {
            // Prevenir múltiplas verificações simultâneas
            if (isCheckingAuth) {
              console.log(
                '⚠️ Verificação de auth já em andamento, ignorando...'
              );
              return;
            }

            isCheckingAuth = true;
            console.log('🔍 Verificando autenticação...');

            set({ isLoading: true });

            try {
              const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
                method: 'GET',
                credentials: 'include', // Para cookies httpOnly
                cache: 'no-cache',
              });

              console.log('📡 Status da verificação:', response.status);

              if (response.ok) {
                const data = await response.json();
                console.log('📦 Dados do usuário verificados:', data);

                const user: User = {
                  id: data.id,
                  email: data.email,
                  nome: data.nome,
                  roles: data.roles || [],
                  permissions: data.permissions || [],
                  sectorId: data.sectorId,
                  // 🎯 CORREÇÃO: Remover sectorName que pode não existir
                  ativo: data.ativo !== false,
                };

                set({
                  user,
                  isAuthenticated: true,
                  isLoading: false,
                });

                console.log('✅ Autenticação verificada:', user.email);
              } else {
                console.log(
                  '⚠️ Usuário não autenticado (status:',
                  response.status,
                  ')'
                );

                // Token inválido ou expirado
                set({
                  user: null,
                  isAuthenticated: false,
                  isLoading: false,
                });
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
            const hasPermission =
              user?.permissions?.includes(permission) || false;
            console.log(
              `🔐 Verificando permissão ${permission}:`,
              hasPermission
            );
            return hasPermission;
          },

          hasAnyPermission: (permissions: Permission[]): boolean => {
            const { user } = get();
            if (!user?.permissions) return false;
            const hasAny = permissions.some((permission) =>
              user.permissions.includes(permission)
            );
            console.log(
              `🔐 Verificando qualquer permissão de [${permissions.join(', ')}]:`,
              hasAny
            );
            return hasAny;
          },

          hasRole: (role: Role): boolean => {
            const { user } = get();
            const hasRole = user?.roles?.includes(role) || false;
            console.log(`👤 Verificando role ${role}:`, hasRole);
            return hasRole;
          },

          // Setters internos
          setUser: (user: User | null) => {
            console.log('🔄 Atualizando usuário:', user?.email || 'null');
            set({ user, isAuthenticated: !!user });
          },

          setLoading: (loading: boolean) => {
            console.log('⏳ Atualizando loading:', loading);
            set({ isLoading: loading });
          },
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
                // 🎯 CORREÇÃO: Remover sectorName que pode não existir
                ativo: state.user.ativo,
              }
            : null,
        }),
        // 🎯 CORREÇÃO: Revalidar estado ao hidratar
        onRehydrateStorage: () => (state) => {
          console.log(
            '💧 Estado hidratado do localStorage:',
            state?.isAuthenticated
          );

          // Se estado diz que está autenticado, verificar no servidor
          if (state?.isAuthenticated) {
            console.log('🔄 Revalidando autenticação após hidratação...');
            // Aguardar um tick para evitar conflitos de hidratação
            setTimeout(() => {
              state.checkAuth();
            }, 100);
          } else {
            // Se não está autenticado localmente, definir loading como false
            state?.setLoading(false);
          }
        },
      }
    ),
    {
      name: 'auth-store',
    }
  )
);
