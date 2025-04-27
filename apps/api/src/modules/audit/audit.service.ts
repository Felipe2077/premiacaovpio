// apps/api/src/modules/audit/audit.service.ts (ATUALIZADO COM RELATIONS)
import { AppDataSource } from '@/database/data-source';
import { AuditLogEntity } from '@/entity/audit-log.entity';
import { FindManyOptions } from 'typeorm';

export class AuditLogService {
  private logRepo = AppDataSource.getRepository(AuditLogEntity);

  async getAuditLogs(limit: number = 50): Promise<AuditLogEntity[]> {
    console.log(`[AuditLogService] Buscando os últimos ${limit} logs...`);
    try {
      const options: FindManyOptions<AuditLogEntity> = {
        order: { timestamp: 'DESC' },
        take: limit,
        // --- ADICIONADO RELATIONS ---
        relations: {
          user: true, // Traz UserEntity aninhado (cuidado com senha hash!)
        },
        // --------------------------
      };
      const logs = await this.logRepo.find(options);
      console.log(`[AuditLogService] ${logs.length} logs encontrados.`);
      return logs;
    } catch (error) {
      console.error('[AuditLogService] Erro ao buscar logs:', error);
      throw new Error('Falha ao buscar logs de auditoria.');
    }
  }
}
