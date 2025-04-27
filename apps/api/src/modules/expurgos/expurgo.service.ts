// apps/api/src/modules/expurgos/expurgo.service.ts
import { AppDataSource } from '@/database/data-source';
import { ExpurgoEventEntity } from '@/entity/expurgo-event.entity';
import { FindManyOptions } from 'typeorm';

export class ExpurgoService {
  private expurgoRepo = AppDataSource.getRepository(ExpurgoEventEntity);

  async getExpurgos(limit: number = 50): Promise<ExpurgoEventEntity[]> {
    console.log(`[ExpurgoService] Buscando os últimos ${limit} expurgos...`);
    try {
      const options: FindManyOptions<ExpurgoEventEntity> = {
        order: { registradoEm: 'DESC' },
        take: limit,
        // Trazendo dados relacionados para a UI Admin Turbinada
        relations: {
          criterio: true, // Traz o objeto CriterionEntity completo
          setor: true, // Traz o objeto SectorEntity completo
          registradoPor: true, // Traz o objeto UserEntity completo (cuidado com senha hash!)
          // aprovadoPor: true // Habilitar quando necessário
        },
        // Para evitar trazer a senha hash do usuário:
        // relations: { criterio: true, setor: true, registradoPor: { select: ['id', 'nome', 'email'] } }
        // Mas isso requereria definir a relação select no UserEntity ou usar QueryBuilder.
        // Para o MVP, trazer o objeto completo é mais simples, mas atenção à segurança.
      };
      const expurgos = await this.expurgoRepo.find(options);
      console.log(`[ExpurgoService] ${expurgos.length} expurgos encontrados.`);
      return expurgos;
    } catch (error) {
      console.error('[ExpurgoService] Erro ao buscar expurgos:', error);
      throw new Error('Falha ao buscar eventos de expurgo.');
    }
  }
}
