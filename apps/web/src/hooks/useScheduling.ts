// hooks/useScheduling.ts
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

// Tipos baseados no seu backend

export enum JobType {
  FULL_ETL = 'FULL_ETL',
  PARTIAL_RECALCULATION = 'PARTIAL_RECALCULATION',
}
export interface ScheduleConfig {
  id: number;
  name: string;
  description?: string;
  frequency: 'MANUAL' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  timeOfDay: string;
  weekDays?: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };

  dayOfMonth?: number;
  jobType: 'FULL_ETL' | 'PARTIAL_RECALCULATION' | 'DATA_VALIDATION';
  status: 'ACTIVE' | 'INACTIVE' | 'PAUSED' | 'ERROR';
  isActive: boolean;
  nextRunAt?: string;
  lastRunAt?: string;
  lastRunStatus?: 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'TIMEOUT';
  executionCount: number;
  consecutiveFailures: number;
  cronExpression: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: number;
    nome: string;
  };
}

export interface SystemStatus {
  isEnabled: boolean;
  activeSchedules: number;
  runningJobs: number;
  nextExecution?: string;
  lastExecution?: string;
  totalExecutions: number;
  failedExecutions: number;
  uptime: number;
}

export interface CreateScheduleDto {
  name: string;
  description?: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  timeOfDay: string;
  weekDays?: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  dayOfMonth?: number;
  jobType: 'FULL_ETL' | 'PARTIAL_RECALCULATION' | 'DATA_VALIDATION';
  advancedConfig?: {
    timezone?: string;
    retryAttempts?: number;
    retryDelay?: number;
    timeoutMinutes?: number;
    onlyIfActiveePeriod?: boolean;
    emailNotifications?: boolean;
    slackNotifications?: boolean;
    skipIfPreviousRunning?: boolean;
  };
}

export interface UpdateScheduleDto {
  name?: string;
  description?: string;
  frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  timeOfDay?: string;
  weekDays?: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  dayOfMonth?: number;
  jobType?: 'FULL_ETL' | 'PARTIAL_RECALCULATION' | 'DATA_VALIDATION';
  isActive?: boolean;
  status?: 'ACTIVE' | 'INACTIVE' | 'PAUSED' | 'ERROR';
}

interface SchedulingState {
  schedules: ScheduleConfig[];
  systemStatus: SystemStatus | null;
  loading: boolean;
  error: string | null;
}

export interface UseSchedulingReturn {
  // Estado
  schedules: ScheduleConfig[];
  systemStatus: SystemStatus | null;
  loading: boolean;
  error: string | null;

  // Ações
  loadSchedules: () => Promise<void>;
  loadSystemStatus: () => Promise<void>;
  createSchedule: (data: CreateScheduleDto) => Promise<ScheduleConfig>;
  updateSchedule: (
    id: number,
    data: UpdateScheduleDto
  ) => Promise<ScheduleConfig>;
  deleteSchedule: (id: number) => Promise<void>;
  triggerJobByType: (jobType: JobType) => Promise<void>;

  // Utilitários
  getScheduleById: (id: number) => ScheduleConfig | undefined;
  getActiveSchedules: () => ScheduleConfig[];
  getSchedulesByType: (jobType: string) => ScheduleConfig[];
  getNextExecution: () => string | null;

  // Auto-refresh
  startAutoRefresh: (intervalMs?: number) => void;
  stopAutoRefresh: () => void;
}

const API_BASE = '/api/scheduling';

export const useScheduling = (): UseSchedulingReturn => {
  const [state, setState] = useState<SchedulingState>({
    schedules: [],
    systemStatus: null,
    loading: false,
    error: null,
  });

  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(
    null
  );

  // ===============================
  // FUNÇÕES DE API (ESTABILIZADAS)
  // ===============================

  const apiRequest = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      // ✅ CORREÇÃO: Só adicionar Content-Type se houver body
      const headers: Record<string, string> = {
        ...options.headers,
      };

      // Só adicionar Content-Type se houver body
      if (options.body) {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro na operação');
      }

      return data;
    },
    []
  );

  // ===============================
  // AÇÕES PRINCIPAIS (CORRIGIDAS)
  // ===============================

  const loadSchedules = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const data = await apiRequest('/schedules');

      setState((prev) => ({
        ...prev,
        schedules: data.data.schedules || [],
        loading: false,
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Erro ao carregar agendamentos';
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        loading: false,
      }));
      console.error('Erro ao carregar agendamentos:', error);
    }
  }, [apiRequest]); // ✅ apiRequest é estável

  const loadSystemStatus = useCallback(async () => {
    try {
      const data = await apiRequest('/system/status');

      setState((prev) => ({
        ...prev,
        systemStatus: data.data,
      }));
    } catch (error) {
      console.error('Erro ao carregar status do sistema:', error);
      // Não definir erro para status, pois é menos crítico
    }
  }, [apiRequest]); // ✅ apiRequest é estável

  const createSchedule = useCallback(
    async (data: CreateScheduleDto): Promise<ScheduleConfig> => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const response = await apiRequest('/schedules', {
          method: 'POST',
          body: JSON.stringify(data),
        });

        const newSchedule = response.data;

        setState((prev) => ({
          ...prev,
          schedules: [...prev.schedules, newSchedule],
          loading: false,
        }));

        loadSystemStatus();

        toast.success('Agendamento criado com sucesso!');

        return newSchedule;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Erro ao criar agendamento';

        toast.error('Falha ao criar agendamento', {
          description: errorMessage,
        });

        setState((prev) => ({
          ...prev,
          error: errorMessage,
          loading: false,
        }));
        throw error;
      }
    },
    [loadSystemStatus, apiRequest] // Adicionado apiRequest para refletir seu uso
  );

  const updateSchedule = useCallback(
    async (id: number, data: UpdateScheduleDto): Promise<ScheduleConfig> => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const response = await apiRequest(`/schedules/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });

        const updatedSchedule = response.data;

        setState((prev) => ({
          ...prev,
          schedules: prev.schedules.map((schedule) =>
            schedule.id === id ? updatedSchedule : schedule
          ),
          loading: false,
        }));

        loadSystemStatus();

        toast.success(`Agendamento "${updatedSchedule.name}" atualizado!`);

        return updatedSchedule;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Erro ao atualizar agendamento';

        toast.error('Falha ao atualizar agendamento', {
          description: errorMessage,
        });

        setState((prev) => ({
          ...prev,
          error: errorMessage,
          loading: false,
        }));
        throw error;
      }
    },
    [loadSystemStatus, apiRequest] // Adicionado apiRequest para refletir seu uso
  );

  const deleteSchedule = useCallback(
    async (id: number): Promise<void> => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        await apiRequest(`/schedules/${id}`, {
          method: 'DELETE',
        });

        setState((prev) => ({
          ...prev,
          schedules: prev.schedules.filter((schedule) => schedule.id !== id),
          loading: false,
        }));

        // Recarregar status do sistema
        loadSystemStatus();
        toast.success('Agendamento excluído com sucesso!');
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Erro ao excluir agendamento';

        // 👇 ADICIONE ESTA LINHA
        toast.error('Falha ao excluir agendamento', {
          description: errorMessage,
        });

        setState((prev) => ({
          ...prev,
          error: errorMessage, // Pode manter ou remover, mas o toast já faz o trabalho
          loading: false,
        }));
        throw error;
      }
    },
    [loadSystemStatus]
  );

  const triggerJobByType = useCallback(
    async (jobType: JobType): Promise<void> => {
      // Define se a atualização é parcial com base no JobType
      const isPartial = jobType === JobType.PARTIAL_RECALCULATION;

      // Monta o corpo da requisição conforme a documentação da rota
      const body = JSON.stringify({
        partialUpdate: isPartial,
        triggeredBy: 'manual', // Informa que a origem é manual
        useQueue: true, // Usa o sistema de filas, como padrão na rota
      });

      try {
        // Usa 'fetch' diretamente com a URL e o corpo corretos.
        // Desta vez, o Content-Type é necessário porque estamos enviando um corpo.
        const response = await fetch(`/api/automation/trigger-update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: body, // Envia o corpo que montamos
        });

        const data = await response.json();

        // A lógica de tratamento de erro permanece a mesma
        if (!response.ok) {
          // Usa a mensagem de erro da API, se disponível
          throw new Error(
            data.message || data.error || `HTTP ${response.status}`
          );
        }

        if (data.success === false) {
          throw new Error(
            data.message || data.error || 'A API de automação retornou um erro'
          );
        }
        // 👇 ADICIONE O TOAST DE SUCESSO AQUI
        const successMessage = isPartial
          ? 'Recálculo iniciado com sucesso!'
          : 'Atualização completa iniciada com sucesso!';
        toast.success(successMessage, {
          description: 'A tarefa foi adicionada à fila e começará em breve.',
        });
        // Recarrega os dados da página para refletir o novo job na fila
        loadSchedules();
        loadSystemStatus();
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : `Erro ao executar o job '${jobType}'`;
        setState((prev) => ({
          ...prev,
          error: errorMessage,
        }));
        throw error;
      }
    },
    [loadSchedules, loadSystemStatus]
  );

  // ===============================
  // FUNÇÕES UTILITÁRIAS
  // ===============================

  const getScheduleById = useCallback(
    (id: number): ScheduleConfig | undefined => {
      return state.schedules.find((schedule) => schedule.id === id);
    },
    [state.schedules]
  );

  const getActiveSchedules = useCallback((): ScheduleConfig[] => {
    return state.schedules.filter(
      (schedule) => schedule.isActive && schedule.status === 'ACTIVE'
    );
  }, [state.schedules]);

  const getSchedulesByType = useCallback(
    (jobType: string): ScheduleConfig[] => {
      return state.schedules.filter((schedule) => schedule.jobType === jobType);
    },
    [state.schedules]
  );

  const getNextExecution = useCallback((): string | null => {
    if (!state.systemStatus?.nextExecution) return null;

    try {
      return new Date(state.systemStatus.nextExecution).toLocaleString('pt-BR');
    } catch {
      return null;
    }
  }, [state.systemStatus]);

  // ===============================
  // AUTO-REFRESH (CORRIGIDO PARA EVITAR LOOPS)
  // ===============================

  const startAutoRefresh = useCallback(
    (intervalMs = 30000) => {
      // Parar qualquer refresh anterior
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }

      const interval = setInterval(() => {
        loadSchedules();
        loadSystemStatus();
      }, intervalMs);

      setRefreshInterval(interval);
    },
    [loadSchedules, loadSystemStatus]
  ); // ✅ Dependências estáveis

  const stopAutoRefresh = useCallback(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [refreshInterval]);

  // ===============================
  // EFFECTS (CORRIGIDOS)
  // ===============================

  // Carregamento inicial - APENAS UMA VEZ
  useEffect(() => {
    loadSchedules();
    loadSystemStatus();
  }, []); // ✅ Array vazio - sem loop

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, []); // ✅ Array vazio - sem loop

  // ===============================
  // RETURN
  // ===============================

  return {
    // Estado
    schedules: state.schedules,
    systemStatus: state.systemStatus,
    loading: state.loading,
    error: state.error,

    // Ações
    loadSchedules,
    loadSystemStatus,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    triggerJobByType,

    // Utilitários
    getScheduleById,
    getActiveSchedules,
    getSchedulesByType,
    getNextExecution,

    // Auto-refresh
    startAutoRefresh,
    stopAutoRefresh,
  };
};
