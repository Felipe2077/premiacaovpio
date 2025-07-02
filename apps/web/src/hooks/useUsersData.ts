// apps/web/src/hooks/useUsersData.ts
import {
  AdminResetPasswordDto,
  CreateUserDto,
  CreateUserResponse,
  PaginatedUsersResponse,
  ResetPasswordResponse,
  ToggleUserStatusDto,
  UnlockUserDto,
  UpdateUserDto,
  UserDetail,
  UserFilters,
  UserStatistics,
  UserSummary,
} from '@sistema-premiacao/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ==============================================
// 🎯 FUNÇÕES DE API (baseadas no padrão do projeto)
// ==============================================

// 📋 Listar usuários com filtros e paginação
const fetchUsers = async (
  filters: UserFilters = {}
): Promise<PaginatedUsersResponse> => {
  const searchParams = new URLSearchParams();

  // Adicionar filtros aos parâmetros de busca
  if (filters.page) searchParams.append('page', filters.page.toString());
  if (filters.limit) searchParams.append('limit', filters.limit.toString());
  if (filters.active !== undefined)
    searchParams.append('active', filters.active.toString());
  if (filters.role) searchParams.append('role', filters.role);
  if (filters.sectorId)
    searchParams.append('sectorId', filters.sectorId.toString());
  if (filters.search) searchParams.append('search', filters.search);
  if (filters.sortBy) searchParams.append('sortBy', filters.sortBy);

  const url = `${API_BASE_URL}/api/admin/users?${searchParams.toString()}`;

  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error ||
        errorData.message ||
        `Erro ${response.status} ao buscar usuários`
    );
  }

  return response.json();
};

// 👤 Buscar usuário por ID
const fetchUserById = async (id: number): Promise<UserDetail> => {
  const response = await fetch(`${API_BASE_URL}/api/admin/users/${id}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Erro ${response.status} ao buscar usuário`
    );
  }

  return response.json();
};

// ➕ Criar usuário
const createUser = async (
  userData: CreateUserDto
): Promise<CreateUserResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error ||
        errorData.message ||
        `Erro ${response.status} ao criar usuário`
    );
  }

  return response.json();
};

// ✏️ Atualizar usuário
const updateUser = async (
  id: number,
  userData: UpdateUserDto
): Promise<UserSummary> => {
  const response = await fetch(`${API_BASE_URL}/api/admin/users/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error ||
        errorData.message ||
        `Erro ${response.status} ao atualizar usuário`
    );
  }

  return response.json();
};

// 🔄 Ativar/Desativar usuário
const toggleUserStatus = async (
  id: number,
  data: ToggleUserStatusDto
): Promise<UserSummary> => {
  const response = await fetch(
    `${API_BASE_URL}/api/admin/users/${id}/toggle-status`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error ||
        errorData.message ||
        `Erro ${response.status} ao alterar status do usuário`
    );
  }

  return response.json();
};

// 🔑 Reset de senha pelo admin
const resetUserPassword = async (
  id: number,
  data: AdminResetPasswordDto
): Promise<ResetPasswordResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/api/admin/users/${id}/reset-password`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error ||
        errorData.message ||
        `Erro ${response.status} ao resetar senha`
    );
  }

  return response.json();
};

// 🔓 Desbloquear usuário
const unlockUser = async (
  id: number,
  data: UnlockUserDto
): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/admin/users/${id}/unlock`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error ||
        errorData.message ||
        `Erro ${response.status} ao desbloquear usuário`
    );
  }

  return response.json();
};

// 🔍 Busca textual rápida
const searchUsers = async (
  query: string,
  limit: number = 10
): Promise<{ users: UserSummary[]; total: number; query: string }> => {
  const searchParams = new URLSearchParams({
    q: query,
    limit: limit.toString(),
  });

  const response = await fetch(
    `${API_BASE_URL}/api/admin/users/search?${searchParams.toString()}`,
    {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || errorData.message || `Erro ${response.status} na busca`
    );
  }

  return response.json();
};

// 📊 Estatísticas do sistema
const fetchUserStatistics = async (): Promise<UserStatistics> => {
  const response = await fetch(`${API_BASE_URL}/api/admin/users/statistics`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error ||
        errorData.message ||
        `Erro ${response.status} ao buscar estatísticas`
    );
  }

  return response.json();
};

// ✉️ Validar email único
const validateEmail = async (
  email: string,
  excludeUserId?: number
): Promise<{ email: string; available: boolean; reason: string | null }> => {
  const response = await fetch(
    `${API_BASE_URL}/api/admin/users/validate-email`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, excludeUserId }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error ||
        errorData.message ||
        `Erro ${response.status} ao validar email`
    );
  }

  return response.json();
};

// ==============================================
// 🎯 HOOKS PRINCIPAIS
// ==============================================

/**
 * Hook principal para listagem de usuários com filtros
 */
export function useUsersData(filters: UserFilters = {}) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () => fetchUsers(filters),
    staleTime: 30000, // 30 segundos
    retry: 2,
  });
}

/**
 * Hook para buscar usuário específico por ID
 */
export function useUserById(id: number) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => fetchUserById(id),
    enabled: !!id && id > 0,
    staleTime: 60000, // 1 minuto
  });
}

/**
 * Hook para estatísticas do sistema
 */
export function useUserStatistics() {
  return useQuery({
    queryKey: ['userStatistics'],
    queryFn: fetchUserStatistics,
    staleTime: 300000, // 5 minutos
    refetchInterval: 300000, // Atualizar a cada 5 minutos
  });
}

/**
 * Hook para busca textual rápida
 */
export function useSearchUsers(query: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['searchUsers', query],
    queryFn: () => searchUsers(query),
    enabled: enabled && query.length >= 2, // Mínimo 2 caracteres
    staleTime: 60000, // 1 minuto
  });
}

/**
 * Hook para validação de email
 */
export function useValidateEmail(email: string, excludeUserId?: number) {
  return useQuery({
    queryKey: ['validateEmail', email, excludeUserId],
    queryFn: () => validateEmail(email, excludeUserId),
    enabled: !!email && email.length > 0,
    retry: false, // Não retry em validação
    staleTime: 0, // Sempre atualizar
  });
}

// ==============================================
// 🎯 HOOKS DE MUTAÇÃO (Ações)
// ==============================================

/**
 * Hook para criar usuário
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUser,
    onSuccess: (data) => {
      // Invalidar cache de usuários
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['userStatistics'] });

      toast.success(`Usuário ${data.user.nome} criado com sucesso!`, {
        description: data.temporaryPassword
          ? `Senha temporária: ${data.temporaryPassword}`
          : 'Email de boas-vindas enviado',
      });
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar usuário', {
        description: error.message,
      });
    },
  });
}

/**
 * Hook para atualizar usuário
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserDto }) =>
      updateUser(id, data),
    onSuccess: (data, variables) => {
      // Atualizar cache específico do usuário
      queryClient.setQueryData(['user', variables.id], data);

      // Invalidar lista de usuários
      queryClient.invalidateQueries({ queryKey: ['users'] });

      toast.success(`Usuário ${data.nome} atualizado com sucesso!`);
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar usuário', {
        description: error.message,
      });
    },
  });
}

/**
 * Hook para ativar/desativar usuário
 */
export function useToggleUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ToggleUserStatusDto }) =>
      toggleUserStatus(id, data),
    onSuccess: (data, variables) => {
      // Atualizar cache
      queryClient.setQueryData(['user', variables.id], data);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['userStatistics'] });

      const status = data.ativo ? 'ativado' : 'desativado';
      toast.success(`Usuário ${data.nome} ${status} com sucesso!`);
    },
    onError: (error: Error) => {
      toast.error('Erro ao alterar status do usuário', {
        description: error.message,
      });
    },
  });
}

/**
 * Hook para reset de senha
 */
export function useResetUserPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AdminResetPasswordDto }) =>
      resetUserPassword(id, data),
    onSuccess: (data, variables) => {
      // Atualizar cache do usuário
      queryClient.invalidateQueries({ queryKey: ['user', variables.id] });

      toast.success('Senha resetada com sucesso!', {
        description: data.newPassword
          ? `Nova senha: ${data.newPassword}`
          : 'Email de reset enviado',
      });
    },
    onError: (error: Error) => {
      toast.error('Erro ao resetar senha', {
        description: error.message,
      });
    },
  });
}

/**
 * Hook para desbloquear usuário
 */
export function useUnlockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UnlockUserDto }) =>
      unlockUser(id, data),
    onSuccess: (data, variables) => {
      // Atualizar cache
      queryClient.invalidateQueries({ queryKey: ['user', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['userStatistics'] });

      toast.success('Usuário desbloqueado com sucesso!', {
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast.error('Erro ao desbloquear usuário', {
        description: error.message,
      });
    },
  });
}
