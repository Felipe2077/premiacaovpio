// packages/shared-types/src/dto/scheduling.dto.ts

/**
 * Tipos de frequência de agendamento
 */
export type ScheduleFrequency = 'MANUAL' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

/**
 * Status do agendamento
 */
export type ScheduleStatus = 'ACTIVE' | 'INACTIVE' | 'PAUSED' | 'ERROR';

/**
 * Tipo de job que pode ser agendado
 */
export type ScheduleJobType =
  | 'FULL_ETL'
  | 'PARTIAL_RECALCULATION'
  | 'DATA_VALIDATION';

/**
 * Status da última execução
 */
export type LastRunStatus = 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'TIMEOUT';

/**
 * Configuração de dias da semana (para frequência WEEKLY)
 */
export interface WeekDaysConfig {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

/**
 * Configuração avançada do agendamento
 */
export interface AdvancedScheduleConfig {
  timezone: string;
  retryAttempts: number;
  retryDelay: number; // em minutos
  timeoutMinutes: number;
  onlyIfActiveePeriod: boolean; // Só executa se há vigência ATIVA
  emailNotifications: boolean;
  slackNotifications: boolean;
  skipIfPreviousRunning: boolean;
}

/**
 * DTO para criação de agendamento
 */
export interface CreateScheduleDto {
  name: string;
  description?: string;
  frequency: ScheduleFrequency;
  timeOfDay: string; // HH:MM
  weekDays?: WeekDaysConfig;
  dayOfMonth?: number;
  jobType: ScheduleJobType;
  jobOptions?: Record<string, any>;
  advancedConfig?: Partial<AdvancedScheduleConfig>;
}

/**
 * DTO para atualização de agendamento
 */
export interface UpdateScheduleDto {
  name?: string;
  description?: string;
  frequency?: ScheduleFrequency;
  timeOfDay?: string;
  weekDays?: WeekDaysConfig;
  dayOfMonth?: number;
  jobType?: ScheduleJobType;
  jobOptions?: Record<string, any>;
  advancedConfig?: Partial<AdvancedScheduleConfig>;
  isActive?: boolean;
  status?: ScheduleStatus;
}

/**
 * DTO de resposta para agendamento
 */
export interface ScheduleResponseDto {
  id: number;
  name: string;
  description?: string;
  frequency: ScheduleFrequency;
  timeOfDay: string;
  weekDays?: WeekDaysConfig;
  dayOfMonth?: number;
  cronExpression: string;
  jobType: ScheduleJobType;
  jobOptions?: Record<string, any>;
  isActive: boolean;
  status: ScheduleStatus;
  nextRunAt?: Date;
  lastRunAt?: Date;
  lastRunStatus?: LastRunStatus;
  lastRunMessage?: string;
  executionCount: number;
  consecutiveFailures: number;
  advancedConfig: AdvancedScheduleConfig;
  createdByUserId: number;
  updatedByUserId?: number;
  createdAt: Date;
  updatedAt: Date;

  // Campos relacionais (quando incluídos)
  createdBy?: {
    id: number;
    nome: string;
  };
  updatedBy?: {
    id: number;
    nome: string;
  };
}

/**
 * Status do sistema de agendamento
 */
export interface SchedulingSystemStatus {
  isEnabled: boolean;
  activeSchedules: number;
  runningJobs: number;
  nextExecution?: Date;
  lastExecution?: Date;
  totalExecutions: number;
  failedExecutions: number;
  uptime: number; // milliseconds
}

/**
 * Template de agendamento predefinido
 */
export interface ScheduleTemplate {
  id: string;
  name: string;
  description: string;
  category: 'ETL' | 'MAINTENANCE' | 'VALIDATION' | 'CUSTOM';
  config: Omit<CreateScheduleDto, 'name' | 'description'>;
  tags: string[];
}

/**
 * Constantes do sistema
 */
export const SchedulingConstants = {
  MAX_CONCURRENT_SCHEDULES: 10,
  DEFAULT_TIMEOUT_MINUTES: 120,
  DEFAULT_RETRY_ATTEMPTS: 3,
  DEFAULT_RETRY_DELAY_MINUTES: 5,
  MAX_EXECUTION_HISTORY_DAYS: 90,
  HEALTH_CHECK_INTERVAL_MINUTES: 30,
  DEFAULT_TIMEZONE: 'America/Sao_Paulo',
} as const;

/**
 * Mensagens de erro padronizadas
 */
export const SchedulingErrorMessages = {
  SCHEDULE_NOT_FOUND: 'Agendamento não encontrado',
  INVALID_TIME_FORMAT: 'Formato de horário inválido. Use HH:MM',
  INVALID_CRON_EXPRESSION: 'Expressão cron inválida',
  NO_WEEKDAYS_SELECTED: 'Para frequência semanal, selecione ao menos um dia',
  INVALID_DAY_OF_MONTH: 'Dia do mês deve estar entre 1 e 31',
  SCHEDULE_ALREADY_RUNNING: 'Agendamento já está em execução',
  SYSTEM_DISABLED: 'Sistema de agendamento está desabilitado',
  INSUFFICIENT_PERMISSIONS: 'Permissões insuficientes para esta operação',
  CONCURRENT_EXECUTION_LIMIT: 'Limite de execuções simultâneas atingido',
} as const;
