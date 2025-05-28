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
  userId: number;
  userName?: string; // Nome do usuário para denormalização/log rápido
  actionType: string; // Tipo da ação realizada (ex: 'META_CRIADA', 'USUARIO_ATUALIZADO')
  entityType?: string; // Tipo da entidade principal afetada (ex: 'ParameterValueEntity', 'UserEntity')
  entityId?: string; // ID da entidade principal afetada (como string)
  details?: Record<string, any>; // Objeto JSONB para detalhes adicionais sobre a ação
  justification?: string; // Justificativa para a ação, se aplicável
  ipAddress?: string; // Endereço IP de onde a requisição originou
  competitionPeriodId?: number; // ID do período de competição, se relevante para a ação
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
      throw new Error(`Falha ao criar log de auditoria. Causa:`);
    }
  }
}
