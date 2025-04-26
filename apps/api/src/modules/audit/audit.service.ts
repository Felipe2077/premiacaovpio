// apps/api/src/modules/audit/audit.service.ts
import { AppDataSource } from '@/database/data-source';
import { AuditLogEntity } from '@/entity/audit-log.entity';

export class AuditLogService {
  private logRepo = AppDataSource.getRepository(AuditLogEntity);

  // Busca os logs mais recentes (mockados pelo seed por enquanto)
  async getAuditLogs(limit: number = 50): Promise<AuditLogEntity[]> {
    console.log(`[AuditLogService] Buscando os últimos ${limit} logs...`);
    try {
      const logs = await this.logRepo.find({
        order: { timestamp: 'DESC' }, // Mais recentes primeiro
        take: limit, // Limita a quantidade
      });
      console.log(`[AuditLogService] ${logs.length} logs encontrados.`);
      return logs;
    } catch (error) {
      console.error('[AuditLogService] Erro ao buscar logs:', error);
      throw new Error('Falha ao buscar logs de auditoria.');
    }
  }
  // No futuro: método para criar logs -> this.logRepo.save(...)
}
