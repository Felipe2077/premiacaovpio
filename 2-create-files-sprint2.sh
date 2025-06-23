#!/bin/bash

echo "📄 PARTE 2 - CRIAÇÃO DE ARQUIVOS - SPRINT 2 FASE 3"
echo "=================================================="

# Verificar se está no diretório correto
if [ ! -f "package.json" ] || [ ! -d "apps/api" ]; then
  echo "❌ Execute este script na raiz do projeto (onde está o package.json)"
  exit 1
fi

echo ""
echo "📋 INSTRUÇÕES MANUAIS IMPORTANTES"
echo "================================="
echo ""
echo "⚠️  ANTES de executar os scripts de teste, você precisa:"
echo ""
echo "1️⃣ ATUALIZAR data-source.ts:"
echo "   📁 Arquivo: apps/api/src/database/data-source.ts"
echo "   ➕ Adicionar import:"
echo "      import { ScheduleConfigEntity } from '../entity/schedule-config.entity';"
echo "   ➕ Adicionar ao array entities:"
echo "      ScheduleConfigEntity,"
echo ""
echo "2️⃣ ATUALIZAR server.ts:"
echo "   📁 Arquivo: apps/api/src/server.ts"
echo "   ➕ Adicionar import:"
echo "      import schedulingRoutes from './routes/scheduling.routes';"
echo "   ➕ Adicionar ao registro de rotas:"
echo "      await fastify.register(schedulingRoutes);"
echo ""
echo "3️⃣ ATUALIZAR package.json da API:"
echo "   📁 Arquivo: apps/api/package.json"
echo "   ➕ Adicionar scripts:"
echo '      "test:scheduling": "ts-node -r tsconfig-paths/register ../../test-scheduling-system.ts",'
echo '      "init:scheduling": "ts-node -r tsconfig-paths/register src/scripts/init-scheduling.ts"'
echo ""

read -p "🤔 Pressione ENTER para continuar criando os arquivos..."

echo ""
echo "📄 1. Criando ScheduleConfigEntity..."
echo "------------------------------------"

# Criar a entidade
cat > apps/api/src/entity/schedule-config.entity.ts << 'EOF'
// apps/api/src/entity/schedule-config.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

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
export type ScheduleJobType = 'FULL_ETL' | 'PARTIAL_RECALCULATION' | 'DATA_VALIDATION';

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
 * Entidade para configuração de agendamentos automáticos
 * Permite configurar execuções ETL automáticas com flexibilidade total
 */
@Entity({ name: 'schedule_configs' })
@Index(['isActive', 'frequency'])
@Index(['nextRunAt'])
export class ScheduleConfigEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100, comment: 'Nome descritivo do agendamento' })
  name!: string;

  @Column({ type: 'text', nullable: true, comment: 'Descrição detalhada' })
  description?: string;

  // ===== CONFIGURAÇÃO DE FREQUÊNCIA =====

  @Column({
    type: 'varchar',
    length: 20,
    enum: ['MANUAL', 'DAILY', 'WEEKLY', 'MONTHLY'],
    default: 'MANUAL',
  })
  frequency!: ScheduleFrequency;

  @Column({ type: 'varchar', length: 5, comment: 'Horário de execução (HH:MM)' })
  timeOfDay!: string; // Ex: "02:30"

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Configuração de dias da semana para frequência WEEKLY',
  })
  weekDays?: WeekDaysConfig;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Dia do mês para frequência MONTHLY (1-31)',
  })
  dayOfMonth?: number;

  @Column({ type: 'varchar', length: 100, comment: 'Expressão cron gerada' })
  cronExpression!: string; // Ex: "30 2 * * *"

  // ===== CONFIGURAÇÃO DO JOB =====

  @Column({
    type: 'varchar',
    length: 30,
    enum: ['FULL_ETL', 'PARTIAL_RECALCULATION', 'DATA_VALIDATION'],
    default: 'FULL_ETL',
  })
  jobType!: ScheduleJobType;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Opções específicas para o job',
  })
  jobOptions?: Record<string, any>;

  // ===== STATUS E CONTROLE =====

  @Column({ type: 'boolean', default: true, comment: 'Se o agendamento está ativo' })
  isActive!: boolean;

  @Column({
    type: 'varchar',
    length: 20,
    enum: ['ACTIVE', 'INACTIVE', 'PAUSED', 'ERROR'],
    default: 'ACTIVE',
  })
  status!: ScheduleStatus;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Próxima execução programada',
  })
  nextRunAt?: Date;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Última execução realizada',
  })
  lastRunAt?: Date;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: 'Status da última execução',
  })
  lastRunStatus?: 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'TIMEOUT';

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Mensagem da última execução',
  })
  lastRunMessage?: string;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Número de execuções realizadas',
  })
  executionCount!: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Número de falhas consecutivas',
  })
  consecutiveFailures!: number;

  // ===== CONFIGURAÇÕES AVANÇADAS =====

  @Column({
    type: 'jsonb',
    comment: 'Configurações avançadas do agendamento',
  })
  advancedConfig!: AdvancedScheduleConfig;

  // ===== AUDITORIA =====

  @Column({ type: 'int', comment: 'Usuário que criou o agendamento' })
  createdByUserId!: number;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Usuário que fez a última modificação',
  })
  updatedByUserId?: number;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'createdByUserId' })
  createdBy!: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updatedByUserId' })
  updatedBy?: UserEntity;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  // ===== MÉTODOS HELPER =====

  /**
   * Calcula a próxima execução baseada na configuração atual
   */
  calculateNextRun(): Date | null {
    if (!this.isActive || this.frequency === 'MANUAL') {
      return null;
    }

    const now = new Date();
    const [hours, minutes] = this.timeOfDay.split(':').map(Number);
    
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);

    // Se já passou o horário hoje, agendar para o próximo período
    if (next <= now) {
      switch (this.frequency) {
        case 'DAILY':
          next.setDate(next.getDate() + 1);
          break;
        case 'WEEKLY':
          // Implementar lógica para próximo dia da semana configurado
          this.calculateNextWeekDay(next);
          break;
        case 'MONTHLY':
          if (this.dayOfMonth) {
            next.setMonth(next.getMonth() + 1);
            next.setDate(this.dayOfMonth);
          }
          break;
      }
    }

    return next;
  }

  /**
   * Calcula próximo dia da semana para agendamento semanal
   */
  private calculateNextWeekDay(date: Date): void {
    if (!this.weekDays) return;

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    const currentDay = date.getDay();
    
    // Procurar próximo dia habilitado
    for (let i = 1; i <= 7; i++) {
      const nextDay = (currentDay + i) % 7;
      const dayName = dayNames[nextDay];
      
      if (this.weekDays[dayName]) {
        date.setDate(date.getDate() + i);
        break;
      }
    }
  }

  /**
   * Verifica se o agendamento deve ser executado
   */
  shouldRun(): boolean {
    if (!this.isActive || this.status !== 'ACTIVE') {
      return false;
    }

    if (!this.nextRunAt) {
      return false;
    }

    return this.nextRunAt <= new Date();
  }

  /**
   * Marca uma execução como iniciada
   */
  markExecutionStarted(): void {
    this.lastRunAt = new Date();
    this.lastRunStatus = undefined;
    this.lastRunMessage = 'Execução iniciada...';
    this.executionCount++;
  }

  /**
   * Marca uma execução como concluída
   */
  markExecutionCompleted(success: boolean, message?: string): void {
    this.lastRunStatus = success ? 'SUCCESS' : 'FAILED';
    this.lastRunMessage = message || (success ? 'Execução concluída com sucesso' : 'Execução falhou');
    
    if (success) {
      this.consecutiveFailures = 0;
    } else {
      this.consecutiveFailures++;
    }

    // Calcular próxima execução
    this.nextRunAt = this.calculateNextRun();

    // Se muitas falhas consecutivas, pausar o agendamento
    if (this.consecutiveFailures >= (this.advancedConfig.retryAttempts || 3)) {
      this.status = 'ERROR';
      this.isActive = false;
    }
  }

  /**
   * Gera a expressão cron baseada na configuração
   */
  generateCronExpression(): string {
    const [hours, minutes] = this.timeOfDay.split(':').map(Number);

    switch (this.frequency) {
      case 'DAILY':
        return `${minutes} ${hours} * * *`;
      
      case 'WEEKLY':
        if (this.weekDays) {
          const days = Object.entries(this.weekDays)
            .filter(([_, enabled]) => enabled)
            .map(([day, _]) => {
              const dayMap = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
              return dayMap[day as keyof typeof dayMap];
            })
            .join(',');
          return `${minutes} ${hours} * * ${days}`;
        }
        return `${minutes} ${hours} * * 1`; // Default: segunda-feira
      
      case 'MONTHLY':
        const day = this.dayOfMonth || 1;
        return `${minutes} ${hours} ${day} * *`;
      
      default:
        return `${minutes} ${hours} * * *`; // Default: diário
    }
  }
}
EOF

echo "✅ ScheduleConfigEntity criada"

echo ""
echo "📄 2. Criando SchedulingDTO (shared-types)..."
echo "---------------------------------------------"

# Criar o DTO no shared-types
cat > packages/shared-types/src/dto/scheduling.dto.ts << 'EOF'
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
export type ScheduleJobType = 'FULL_ETL' | 'PARTIAL_RECALCULATION' | 'DATA_VALIDATION';

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
EOF

echo "✅ SchedulingDTO criada"

echo ""
echo "📄 3. Compilando shared-types..."
echo "-------------------------------"

cd packages/shared-types
pnpm run build

if [ $? -ne 0 ]; then
  echo "❌ Erro ao compilar shared-types"
  echo "💡 Verifique se há erros de sintaxe nos DTOs"
  exit 1
fi

echo "✅ Shared-types compilado com sucesso"

cd ../../

echo ""
echo "📄 4. Criando arquivos restantes..."
echo "----------------------------------"

echo "⏳ Esta parte pode demorar um pouco, criando arquivos grandes..."

# Nota: Os outros arquivos são muito grandes para serem criados via script shell
# Vamos criar apenas os esqueletos e dar instruções

echo ""
echo "📝 CRIANDO ESQUELETOS DOS ARQUIVOS RESTANTES..."
echo ""

# Criar esqueleto do SchedulingService
cat > apps/api/src/modules/scheduling/scheduling.service.ts << 'EOF'
// apps/api/src/modules/scheduling/scheduling.service.ts
import { AppDataSource } from '@/database/data-source';
import { ScheduleConfigEntity } from '@/entity/schedule-config.entity';
import { UserEntity } from '@/entity/user.entity';
import { Repository } from 'typeorm';
import { AuditLogService } from '../audit/audit.service';
import { AutomationService } from '../automation/automation.service';

// TODO: Implementar SchedulingService completo
// Este é apenas um esqueleto para evitar erros de compilação

export interface CreateScheduleDto {
  name: string;
  description?: string;
  frequency: 'MANUAL' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  timeOfDay: string;
  weekDays?: any;
  dayOfMonth?: number;
  jobType: 'FULL_ETL' | 'PARTIAL_RECALCULATION' | 'DATA_VALIDATION';
  jobOptions?: Record<string, any>;
  advancedConfig?: any;
}

export interface UpdateScheduleDto extends Partial<CreateScheduleDto> {
  isActive?: boolean;
  status?: string;
}

export class SchedulingService {
  private readonly scheduleRepo: Repository<ScheduleConfigEntity>;
  private readonly auditLogService: AuditLogService;
  private readonly automationService: AutomationService;

  constructor() {
    this.scheduleRepo = AppDataSource.getRepository(ScheduleConfigEntity);
    this.auditLogService = new AuditLogService();
    this.automationService = new AutomationService();
  }

  async initialize(): Promise<void> {
    console.log('[SchedulingService] Inicializado (versão esqueleto)');
  }

  async createSchedule(data: CreateScheduleDto, user: UserEntity): Promise<ScheduleConfigEntity> {
    throw new Error('SchedulingService não implementado completamente');
  }

  async getAllSchedules(): Promise<ScheduleConfigEntity[]> {
    return this.scheduleRepo.find();
  }

  async getScheduleById(id: number): Promise<ScheduleConfigEntity | null> {
    return this.scheduleRepo.findOneBy({ id });
  }

  async updateSchedule(id: number, data: UpdateScheduleDto, user: UserEntity): Promise<ScheduleConfigEntity> {
    throw new Error('SchedulingService não implementado completamente');
  }

  async deleteSchedule(id: number, user: UserEntity): Promise<void> {
    throw new Error('SchedulingService não implementado completamente');
  }

  async getSystemStatus(): Promise<any> {
    return {
      isEnabled: true,
      activeSchedules: 0,
      runningJobs: 0,
      totalExecutions: 0,
      failedExecutions: 0,
      uptime: Date.now(),
    };
  }

  async healthCheck(): Promise<{ fixed: number; errors: string[] }> {
    return { fixed: 0, errors: [] };
  }
}
EOF

echo "✅ Esqueleto do SchedulingService criado"

# Criar esqueleto do Controller
cat > apps/api/src/controllers/scheduling.controller.ts << 'EOF'
// apps/api/src/controllers/scheduling.controller.ts
import { FastifyReply, FastifyRequest } from 'fastify';
import { SchedulingService } from '../modules/scheduling/scheduling.service';

export class SchedulingController {
  private schedulingService: SchedulingService;

  constructor() {
    this.schedulingService = new SchedulingService();
  }

  async createSchedule(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.code(501).send({
      success: false,
      message: 'SchedulingController não implementado completamente',
      note: 'Use os arquivos completos dos artifacts'
    });
  }

  async getSchedules(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const schedules = await this.schedulingService.getAllSchedules();
      reply.send({
        success: true,
        message: 'Agendamentos recuperados (versão esqueleto)',
        data: { schedules, total: schedules.length },
      });
    } catch (error) {
      reply.code(500).send({
        success: false,
        message: 'Erro ao buscar agendamentos',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  async getScheduleById(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.code(501).send({
      success: false,
      message: 'Método não implementado no esqueleto',
    });
  }

  async updateSchedule(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.code(501).send({
      success: false,
      message: 'Método não implementado no esqueleto',
    });
  }

  async deleteSchedule(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.code(501).send({
      success: false,
      message: 'Método não implementado no esqueleto',
    });
  }

  async executeScheduleNow(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.code(501).send({
      success: false,
      message: 'Método não implementado no esqueleto',
    });
  }

  async getSystemStatus(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const status = await this.schedulingService.getSystemStatus();
      reply.send({
        success: true,
        message: 'Status do sistema (versão esqueleto)',
        data: status,
      });
    } catch (error) {
      reply.code(500).send({
        success: false,
        message: 'Erro ao buscar status',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  async restartSystem(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.code(501).send({
      success: false,
      message: 'Método não implementado no esqueleto',
    });
  }

  async healthCheck(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const health = await this.schedulingService.healthCheck();
      reply.send({
        success: true,
        message: 'Health check (versão esqueleto)',
        data: health,
      });
    } catch (error) {
      reply.code(500).send({
        success: false,
        message: 'Erro no health check',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  async getScheduleTemplates(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const templates = [
      {
        id: 'daily-etl-2am',
        name: 'ETL Diário às 2:00',
        description: 'Agendamento básico para testes',
        config: {
          frequency: 'DAILY',
          timeOfDay: '02:00',
          jobType: 'FULL_ETL',
        },
      },
    ];

    reply.send({
      success: true,
      message: 'Templates disponíveis (versão esqueleto)',
      data: templates,
    });
  }
}
EOF

echo "✅ Esqueleto do SchedulingController criado"

# Criar esqueleto das rotas
cat > apps/api/src/routes/scheduling.routes.ts << 'EOF'
// apps/api/src/routes/scheduling.routes.ts
import { SchedulingController } from '@/controllers/scheduling.controller';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

const schedulingRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const controller = new SchedulingController();

  // Rotas básicas para teste (esqueleto)
  fastify.get('/api/scheduling/schedules', {
    schema: {
      description: 'Lista agendamentos (versão esqueleto)',
      tags: ['Scheduling'],
    },
  }, controller.getSchedules.bind(controller));

  fastify.get('/api/scheduling/system/status', {
    schema: {
      description: 'Status do sistema (versão esqueleto)',
      tags: ['Scheduling'],
    },
  }, controller.getSystemStatus.bind(controller));

  fastify.get('/api/scheduling/templates', {
    schema: {
      description: 'Templates predefinidos (versão esqueleto)',
      tags: ['Scheduling'],
    },
  }, controller.getScheduleTemplates.bind(controller));

  // Outras rotas retornam 501 (Not Implemented)
  fastify.post('/api/scheduling/schedules', controller.createSchedule.bind(controller));
  fastify.get('/api/scheduling/schedules/:id', controller.getScheduleById.bind(controller));
  fastify.put('/api/scheduling/schedules/:id', controller.updateSchedule.bind(controller));
  fastify.delete('/api/scheduling/schedules/:id', controller.deleteSchedule.bind(controller));
  fastify.post('/api/scheduling/schedules/:id/execute', controller.executeScheduleNow.bind(controller));
  fastify.post('/api/scheduling/system/restart', controller.restartSystem.bind(controller));
  fastify.get('/api/scheduling/system/health', controller.healthCheck.bind(controller));

  fastify.log.info('✅ Rotas de Agendamento (esqueleto) registradas');
};

export default fp(schedulingRoutes, {
  name: 'scheduling-routes',
});
EOF

echo "✅ Esqueleto das rotas criado"

echo ""
echo "✅ PARTE 2 CONCLUÍDA!"
echo "===================="

echo ""
echo "🎯 Arquivos criados:"
echo "  ✅ ScheduleConfigEntity (completa)"
echo "  ✅ SchedulingDTO (completa no shared-types)"
echo "  ✅ SchedulingService (esqueleto básico)"
echo "  ✅ SchedulingController (esqueleto básico)"
echo "  ✅ SchedulingRoutes (esqueleto básico)"

echo ""
echo "⚠️  IMPORTANTE: PRÓXIMOS PASSOS OBRIGATÓRIOS"
echo "==========================================="

echo ""
echo "1️⃣ COPIE OS ARQUIVOS COMPLETOS DOS ARTIFACTS:"
echo ""
echo "   📋 Vá nos artifacts do chat e copie o conteúdo completo de:"
echo "   • SchedulingService (artifact: scheduling_service)"
echo "   • SchedulingController (artifact: scheduling_controller)"  
echo "   • SchedulingRoutes (artifact: scheduling_routes)"
echo ""
echo "   📁 Cole nos respectivos arquivos que foram criados como esqueletos"

echo ""
echo "2️⃣ ATUALIZE OS ARQUIVOS MANUALMENTE:"
echo ""
echo "   📄 apps/api/src/database/data-source.ts:"
echo "      import { ScheduleConfigEntity } from '../entity/schedule-config.entity';"
echo "      // Adicione ScheduleConfigEntity ao array entities"
echo ""
echo "   📄 apps/api/src/server.ts:"
echo "      import schedulingRoutes from './routes/scheduling.routes';"
echo "      // Adicione: await fastify.register(schedulingRoutes);"
echo ""
echo "   📄 apps/api/package.json:"
echo "      // Adicione aos scripts:"
echo '      "test:scheduling": "ts-node -r tsconfig-paths/register ../../test-scheduling-system.ts"'

echo ""
echo "3️⃣ TESTE O SISTEMA:"
echo ""
echo "   cd apps/api"
echo "   pnpm install"
echo "   pnpm test:scheduling"

echo ""
echo "📚 Os esqueletos permitem que o sistema compile sem erros,"
echo "    mas você precisa dos arquivos completos para funcionalidade total!"

echo ""
echo "🎉 SPRINT 2 FASE 3 - ARQUIVOS CRIADOS!"
echo "====================================="