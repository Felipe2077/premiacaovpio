// apps/api/src/modules/parameters/parameter.service.ts
import { AppDataSource } from '@/database/data-source';
import { ParameterValueEntity } from '@/entity/parameter-value.entity';
// Não precisamos mais dos FindOperators aqui para esta query

export class ParameterService {
  private parameterRepo = AppDataSource.getRepository(ParameterValueEntity);

  // --- MÉTODO REFEITO COM QUERY BUILDER ---
  async getCurrentParameters(date?: string): Promise<ParameterValueEntity[]> {
    const targetDate = date || new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
    console.log(
      `[ParameterService] Buscando parâmetros vigentes para ${targetDate} usando QueryBuilder...`
    );

    try {
      // Cria a query builder começando pela entidade principal ('param' é um alias)
      const query = this.parameterRepo
        .createQueryBuilder('param')
        // Faz LEFT JOIN para trazer dados relacionados (para nomes, etc.)
        // Use os nomes das PROPRIEDADES da relação na entidade, não das colunas do DB
        .leftJoinAndSelect('param.criterio', 'criterio') // Alias "criterio" para a tabela joinada
        .leftJoinAndSelect('param.setor', 'setor') // Alias "setor"
        .leftJoinAndSelect('param.criadoPor', 'user') // Alias "user"

        // Cláusula WHERE principal
        .where('param.dataInicioEfetivo <= :targetDate', { targetDate }) // Condição 1: Início é menor ou igual à data alvo

        // Cláusula WHERE adicional com parênteses (condição 2 OU condição 3)
        .andWhere(
          '(param.dataFimEfetivo IS NULL OR param.dataFimEfetivo >= :targetDate)',
          { targetDate }
        )
        // Condição 2: Data fim é NULA (vigente indefinidamente)
        // Condição 3: OU Data fim é maior ou igual à data alvo (estava vigente na data)

        // Ordenação
        .orderBy('param.nomeParametro', 'ASC')
        .addOrderBy('param.criterionId', 'ASC')
        .addOrderBy('param.sectorId', 'ASC');

      // Loga o SQL gerado (opcional, para debug)
      // console.log("[ParameterService] SQL Gerado:", query.getSql());

      // Executa a query e pega muitos resultados
      const parameters = await query.getMany();

      console.log(
        `[ParameterService] ${parameters.length} parâmetros vigentes encontrados.`
      );
      // Retorna as entidades completas com os objetos relacionados aninhados
      return parameters;
    } catch (error) {
      console.error(
        '[ParameterService] Erro ao buscar parâmetros com QueryBuilder:',
        error
      );
      throw new Error('Falha ao buscar parâmetros.');
    }
  }
}
