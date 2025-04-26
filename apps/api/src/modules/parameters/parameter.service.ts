// apps/api/src/modules/parameters/parameter.service.ts
import { AppDataSource } from '@/database/data-source';
import { ParameterValueEntity } from '@/entity/parameter-value.entity';
import {
  FindOperator,
  FindOptionsWhere,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
} from 'typeorm';

export class ParameterService {
  private parameterRepo = AppDataSource.getRepository(ParameterValueEntity);

  async getCurrentParameters(date?: string): Promise<ParameterValueEntity[]> {
    const targetDate = date || new Date().toISOString().split('T')[0]; // Usa hoje se não passar data
    console.log(
      `[ParameterService] Buscando parâmetros vigentes para ${targetDate}...`
    );

    try {
      const conditions: FindOptionsWhere<ParameterValueEntity>[] = [
        {
          dataInicioEfetivo: LessThanOrEqual(
            targetDate
          ) as FindOperator<string>,
          dataFimEfetivo: IsNull(),
        },
        {
          dataInicioEfetivo: LessThanOrEqual(
            targetDate
          ) as FindOperator<string>, // Cast aqui
          dataFimEfetivo: MoreThanOrEqual(targetDate) as FindOperator<string>,
        },
      ];

      const parameters = await this.parameterRepo.find({
        where: conditions,
        order: { nomeParametro: 'ASC', criterionId: 'ASC', sectorId: 'ASC' },
      });
      console.log(
        `[ParameterService] ${parameters.length} parâmetros vigentes encontrados.`
      );
      return parameters;
    } catch (error) {
      console.error('[ParameterService] Erro ao buscar parâmetros:', error);
      throw new Error('Falha ao buscar parâmetros.');
    }
  }
}
