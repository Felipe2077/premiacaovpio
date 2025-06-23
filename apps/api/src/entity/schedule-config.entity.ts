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

export type ScheduleJobType =
  | 'FULL_ETL'
  | 'PARTIAL_RECALCULATION'
  | 'DATA_VALIDATION';

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

  @Column({
    type: 'varchar',

    length: 100,

    comment: 'Nome descritivo do agendamento',
  })
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

  @Column({
    type: 'varchar',

    length: 5,

    comment: 'Horário de execução (HH:MM)',
  })
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

  @Column({
    type: 'boolean',

    default: true,

    comment: 'Se o agendamento está ativo',
  })
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

  calculateNextRun(): Date | undefined {
    if (!this.isActive || this.frequency === 'MANUAL') {
      return undefined;
    }

    const now = new Date();

    const [hours, minutes] = this.timeOfDay.split(':').map(Number);

    const next = new Date(now);

    next.setHours(hours!, minutes, 0, 0);

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

    const dayNames = [
      'sunday',

      'monday',

      'tuesday',

      'wednesday',

      'thursday',

      'friday',

      'saturday',
    ] as const;

    const currentDay = date.getDay();

    // Procurar próximo dia habilitado

    for (let i = 1; i <= 7; i++) {
      const nextDay = (currentDay + i) % 7;

      const dayName = dayNames[nextDay];

      if (this.weekDays[dayName!]) {
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

    this.lastRunMessage =
      message ||
      (success ? 'Execução concluída com sucesso' : 'Execução falhou');

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
              const dayMap = {
                sunday: 0,

                monday: 1,

                tuesday: 2,

                wednesday: 3,

                thursday: 4,

                friday: 5,

                saturday: 6,
              };

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
