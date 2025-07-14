// apps/api/src/modules/audit/audit.service.ts

import { AppDataSource } from '@/database/data-source'; // Verifique este caminho
import { AuditLogEntity } from '@/entity/audit-log.entity'; // Verifique este caminho
// Se você for buscar UserEntity aqui, descomente e verifique o caminho:
// import { UserEntity } from '@/entity/user.entity';
import { FindManyOptions } from 'typeorm';

/**
 * DTO (Data Transfer Object) para a criação de um novo registro de auditoria.
 * Define a estrutura dos dados esperados pelo método createLog.
 */
export interface CreateAuditLogDto {
  userId: number | null;
  userName?: string; // Nome do usuário para denormalização/log rápido
  actionType: string; // Tipo da ação realizada (ex: 'META_CRIADA', 'USUARIO_ATUALIZADO')
  entityType?: string; // Tipo da entidade principal afetada (ex: 'ParameterValueEntity', 'UserEntity')
  entityId?: string; // ID da entidade principal afetada (como string)
  details?: Record<string, any>; // Objeto JSONB para detalhes adicionais sobre a ação
  justification?: string; // Justificativa para a ação, se aplicável
  ipAddress?: string; // Endereço IP de onde a requisição originou
  competitionPeriodId?: number; // ID do período de competição, se relevante para a ação
}

export interface TriggerAuditLogData {
  userId: number;
  userName: string;
  triggerType:
    | 'EXPURGO_APROVADO'
    | 'META_ALTERADA'
    | 'PERIODO_MUDANCA_STATUS'
    | 'RECALCULO_MANUAL'
    | 'SISTEMA_AUTOMACAO';
  actionType: string;
  entityType: string;
  entityId: string;
  details: {
    [key: string]: any;
    triggerSource?: 'automatic' | 'manual' | 'system';
    executionTimeMs?: number;
    success?: boolean;
    error?: string;
  };
  justification: string;
  competitionPeriodId?: number;
}

export class AuditLogService {
  private logRepo = AppDataSource.getRepository(AuditLogEntity);
  // Se você precisar buscar UserEntity pelo ID dentro do createLog:
  // private userRepo = AppDataSource.getRepository(UserEntity);

  /**
   * Busca os últimos logs de auditoria do sistema.
   * @param limit O número máximo de logs a serem retornados. Padrão é 50.
   * @returns Uma Promise que resolve para um array de AuditLogEntity.
   */
  async getAuditLogs(limit: number = 50): Promise<AuditLogEntity[]> {
    console.log(
      `[AuditLogService] Buscando os últimos ${limit} logs de auditoria...`
    );
    try {
      const options: FindManyOptions<AuditLogEntity> = {
        order: { timestamp: 'DESC' }, // Ordena pelos mais recentes primeiro
        take: limit,
        relations: {
          user: true, // Inclui a entidade User relacionada (cuidado com dados sensíveis como hash de senha)
          competitionPeriod: true, // Inclui a entidade CompetitionPeriod relacionada
        },
      };
      const logs = await this.logRepo.find(options);
      console.log(
        `[AuditLogService] ${logs.length} logs de auditoria encontrados.`
      );
      return logs;
    } catch (error) {
      console.error(
        '[AuditLogService] Erro ao buscar logs de auditoria:',
        error
      );
      throw new Error('Falha ao buscar logs de auditoria.');
    }
  }

  /**
   * Cria um novo registro de log de auditoria.
   * @param data Os dados para o novo log, conforme definido em CreateAuditLogDto.
   * @returns Uma Promise que resolve para a AuditLogEntity criada.
   */
  async createLog(data: CreateAuditLogDto): Promise<AuditLogEntity> {
    console.log(
      `[AuditLogService] Criando log para ação: ${data.actionType}, User ID: ${data.userId}`
    );
    try {
      // Mapeia o DTO para os campos da AuditLogEntity.
      // A entidade AuditLogEntity já tem 'timestamp' como CreateDateColumn, então ele será preenchido automaticamente.
      // As relações 'user' e 'competitionPeriod' serão gerenciadas pelo TypeORM
      // se os respectivos IDs (userId, competitionPeriodId) forem fornecidos e existirem no banco.
      const newLogEntryData: Partial<AuditLogEntity> = {
        userId: data.userId,
        userName: data.userName,
        actionType: data.actionType,
        entityType: data.entityType,
        entityId: data.entityId,
        details: data.details,
        justification: data.justification,
        ipAddress: data.ipAddress,
        competitionPeriodId: data.competitionPeriodId,
      };

      const newLog = this.logRepo.create(newLogEntryData);
      await this.logRepo.save(newLog);

      console.log(
        `[AuditLogService] Log de auditoria criado com ID: ${newLog.id}`
      );
      return newLog;
    } catch (error) {
      console.error(
        '[AuditLogService] Erro detalhado ao criar log de auditoria:',
        error
      );
      // É crucial decidir a política de tratamento de erro aqui.
      // Se a auditoria é mandatória, o erro deve propagar para potencialmente
      // reverter a transação principal (se houver uma).
      const causeMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `Falha ao criar log de auditoria. Causa: ${causeMessage}`
      );
    }
  }

  /**
   * 🆕 Log especializado para triggers (usa seu createLog() internamente)
   */
  async createTriggerLog(data: TriggerAuditLogData): Promise<AuditLogEntity> {
    console.log(
      `[AuditLogService] 📝 Criando log de trigger - Tipo: ${data.triggerType}`
    );

    // Usar seu método createLog() existente com dados enriquecidos
    const enrichedData: CreateAuditLogDto = {
      userId: data.userId,
      userName: data.userName,
      actionType: data.actionType,
      entityType: data.entityType,
      entityId: data.entityId,
      justification: data.justification,
      competitionPeriodId: data.competitionPeriodId,
      details: {
        ...data.details,
        triggerType: data.triggerType,
        timestamp: new Date().toISOString(),
        version: '3.1.0',
        phase: 'FASE_3_SPRINT_1',
      },
    };

    return this.createLog(enrichedData); // Reutiliza seu método original!
  }

  /**
   * 🆕 Buscar logs de triggers por período
   */
  async findTriggerLogsByPeriod(
    periodMesAno: string,
    limit: number = 100
  ): Promise<AuditLogEntity[]> {
    console.log(
      `[AuditLogService] 🔍 Buscando logs de triggers - Período: ${periodMesAno}`
    );

    try {
      const logs = await this.logRepo
        .createQueryBuilder('audit')
        .leftJoinAndSelect('audit.competitionPeriod', 'period')
        .where('period.mesAno = :periodMesAno', { periodMesAno })
        .andWhere(`audit.details->>'triggerType' IS NOT NULL`)
        .orderBy('audit.timestamp', 'DESC')
        .limit(limit)
        .getMany();

      console.log(
        `[AuditLogService] ✅ Encontrados ${logs.length} logs de triggers`
      );
      return logs;
    } catch (error) {
      console.error(
        `[AuditLogService] ❌ Erro ao buscar logs de triggers:`,
        error
      );
      throw new Error('Falha ao buscar logs de triggers.');
    }
  }

  /**
   * 🆕 Estatísticas básicas de triggers
   */
  async getTriggerStatistics(periodMesAno: string): Promise<{
    totalTriggers: number;
    triggersByType: Record<string, number>;
    successRate: number;
    errorCount: number;
  }> {
    console.log(
      `[AuditLogService] 📊 Calculando estatísticas - Período: ${periodMesAno}`
    );

    try {
      const triggerLogs = await this.findTriggerLogsByPeriod(periodMesAno);

      if (triggerLogs.length === 0) {
        return {
          totalTriggers: 0,
          triggersByType: {},
          successRate: 0,
          errorCount: 0,
        };
      }

      const totalTriggers = triggerLogs.length;
      const triggersByType: Record<string, number> = {};
      let successfulTriggers = 0;
      let errorCount = 0;

      triggerLogs.forEach((log) => {
        // Contar por tipo
        const triggerType = log.details?.triggerType || 'UNKNOWN';
        triggersByType[triggerType] = (triggersByType[triggerType] || 0) + 1;

        // Contar sucessos e erros
        if (log.details?.error) {
          errorCount++;
        } else {
          successfulTriggers++;
        }
      });

      const successRate = (successfulTriggers / totalTriggers) * 100;

      return {
        totalTriggers,
        triggersByType,
        successRate: Math.round(successRate * 100) / 100,
        errorCount,
      };
    } catch (error) {
      console.error(
        `[AuditLogService] ❌ Erro ao calcular estatísticas:`,
        error
      );
      throw new Error('Falha ao calcular estatísticas de triggers.');
    }
  }

  /**
   * 🆕 Buscar erros críticos de triggers
   */
  async findCriticalTriggerErrors(
    periodMesAno?: string,
    limit: number = 50
  ): Promise<AuditLogEntity[]> {
    console.log(
      `[AuditLogService] 🚨 Buscando erros críticos - Período: ${periodMesAno || 'todos'}`
    );

    try {
      const queryBuilder = this.logRepo
        .createQueryBuilder('audit')
        .leftJoinAndSelect('audit.competitionPeriod', 'period')
        .where(`audit.details->>'error' IS NOT NULL`)
        .andWhere(`audit.details->>'triggerType' IS NOT NULL`)
        .andWhere(
          `(audit.actionType LIKE '%ERRO_CRITICO%' OR 
            audit.actionType LIKE '%FALHOU%')`
        );

      if (periodMesAno) {
        queryBuilder.andWhere('period.mesAno = :periodMesAno', {
          periodMesAno,
        });
      }

      const criticalErrors = await queryBuilder
        .orderBy('audit.timestamp', 'DESC')
        .limit(limit)
        .getMany();

      console.log(
        `[AuditLogService] ✅ Encontrados ${criticalErrors.length} erros críticos`
      );
      return criticalErrors;
    } catch (error) {
      console.error(
        `[AuditLogService] ❌ Erro ao buscar erros críticos:`,
        error
      );
      throw new Error('Falha ao buscar erros críticos.');
    }
  }

  /**
   * Busca a última execução bem-sucedida do ETL
   * @returns Promise<object | null> Dados da última execução ou null se não encontrar
   */
  async getLastSuccessfulETLExecution(): Promise<{
    executedAt: Date;
    status: string;
    durationMs?: number;
    recordsProcessed?: number;
    triggeredBy?: string;
    userId?: number | null;
    periodProcessed?: string;
  } | null> {
    try {
      console.log(
        '[AuditLogService] Buscando última execução ETL bem-sucedida...'
      );

      // CORREÇÃO: Buscar pelos actionType reais que o AutomationService usa
      const auditLog = await this.logRepo.findOne({
        where: [
          { actionType: 'ETL_CONCLUIDO' }, // ✅ Usado pelo AutomationService
          { actionType: 'RECALCULO_CONCLUIDO' }, // ✅ Usado pelo AutomationService
          { actionType: 'ETL_INICIADO' }, // Como fallback
          { actionType: 'RECALCULO_INICIADO' }, // Como fallback
        ],
        order: { timestamp: 'DESC' },
        relations: { user: true, competitionPeriod: true },
      });

      if (!auditLog) {
        console.log(
          '[AuditLogService] Nenhuma execução ETL encontrada nos logs'
        );
        return null;
      }

      // Parse seguro dos details (JSON)
      let details: any = {};
      if (auditLog.details) {
        try {
          details =
            typeof auditLog.details === 'string'
              ? JSON.parse(auditLog.details)
              : auditLog.details;
        } catch (error) {
          console.warn(
            '[AuditLogService] Erro ao fazer parse dos details:',
            error
          );
          details = {};
        }
      }

      // Determinar status baseado no actionType
      const isSuccess =
        auditLog.actionType === 'ETL_CONCLUIDO' ||
        auditLog.actionType === 'RECALCULO_CONCLUIDO';

      // Extrair informações relevantes
      const result = {
        executedAt: auditLog.timestamp,
        status: isSuccess ? 'success' : 'completed',
        durationMs: details.executionTimeMs || details.durationMs || null,
        recordsProcessed:
          details.rawRecords ||
          details.recordsProcessed?.rawRecords ||
          details.recordsProcessed?.total ||
          details.totalRecords ||
          null,
        triggeredBy: details.triggeredBy || 'unknown',
        userId: auditLog.userId,
        periodProcessed: details.periodMesAno || details.period || null,
      };

      console.log('[AuditLogService] Última execução ETL encontrada:', {
        actionType: auditLog.actionType,
        executedAt: result.executedAt,
        status: result.status,
        triggeredBy: result.triggeredBy,
      });

      return result;
    } catch (error) {
      console.error(
        '[AuditLogService] Erro ao buscar última execução ETL:',
        error
      );
      throw new Error(
        `Erro ao consultar última execução: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }

  /**
   * Busca histórico de execuções ETL
   * @param limit Número máximo de registros (padrão: 10)
   * @returns Promise<Array> Lista das últimas execuções
   */
  async getETLExecutionHistory(limit: number = 10): Promise<
    Array<{
      executedAt: Date;
      status: string;
      durationMs?: number;
      recordsProcessed?: number;
      triggeredBy?: string;
      userId?: number | null;
      periodProcessed?: string;
    }>
  > {
    try {
      console.log(
        `[AuditLogService] Buscando histórico de ${limit} execuções ETL...`
      );

      // CORREÇÃO: Buscar pelos actionType reais
      const auditLogs = await this.logRepo.find({
        where: [
          { actionType: 'ETL_CONCLUIDO' },
          { actionType: 'RECALCULO_CONCLUIDO' },
          { actionType: 'ETL_INICIADO' },
          { actionType: 'RECALCULO_INICIADO' },
        ],
        order: { timestamp: 'DESC' },
        take: limit,
        relations: { user: true, competitionPeriod: true },
      });

      const history = auditLogs.map((log) => {
        let details: any = {};
        if (log.details) {
          try {
            details =
              typeof log.details === 'string'
                ? JSON.parse(log.details)
                : log.details;
          } catch (error) {
            console.warn(
              '[AuditLogService] Erro ao fazer parse dos details no histórico:',
              error
            );
          }
        }

        const isSuccess =
          log.actionType === 'ETL_CONCLUIDO' ||
          log.actionType === 'RECALCULO_CONCLUIDO';

        return {
          executedAt: log.timestamp,
          status: isSuccess ? 'success' : 'completed',
          durationMs: details.executionTimeMs || details.durationMs || null,
          recordsProcessed:
            details.rawRecords ||
            details.recordsProcessed?.rawRecords ||
            details.recordsProcessed?.total ||
            details.totalRecords ||
            null,
          triggeredBy: details.triggeredBy || 'unknown',
          userId: log.userId,
          periodProcessed: details.periodMesAno || details.period || null,
        };
      });

      console.log(
        `[AuditLogService] Encontradas ${history.length} execuções no histórico`
      );
      return history;
    } catch (error) {
      console.error('[AuditLogService] Erro ao buscar histórico ETL:', error);
      throw new Error(
        `Erro ao consultar histórico: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }
}
