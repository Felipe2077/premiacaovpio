// apps/api/src/modules/periods/period.service.ts (VERSÃO INICIAL COMPLETA)
import { AppDataSource } from '@/database/data-source';
import { CompetitionPeriodEntity } from '@/entity/competition-period.entity';
import 'reflect-metadata';
import { Repository } from 'typeorm';

export class CompetitionPeriodService {
  private periodRepo: Repository<CompetitionPeriodEntity>;

  constructor() {
    // Pega o repositório da entidade CompetitionPeriodEntity usando o AppDataSource (Postgres)
    this.periodRepo = AppDataSource.getRepository(CompetitionPeriodEntity);
    console.log('CompetitionPeriodService instanciado.');
  }

  /**
   * Encontra o período de competição atualmente ativo.
   * @returns Promise<CompetitionPeriodEntity | null> O período ativo ou null se nenhum estiver ativo.
   */
  async findCurrentActivePeriod(): Promise<CompetitionPeriodEntity | null> {
    console.log('[PeriodService] Buscando período ativo...');
    try {
      const activePeriod = await this.periodRepo.findOne({
        where: { status: 'ATIVA' },
        order: { dataInicio: 'DESC' }, // Pega o mais recente se houver mais de um por engano
      });
      if (activePeriod) {
        console.log(
          `[PeriodService] Período ativo encontrado: ${activePeriod.mesAno}`
        );
      } else {
        console.log('[PeriodService] Nenhum período ativo encontrado.');
      }
      return activePeriod;
    } catch (error) {
      console.error('[PeriodService] Erro ao buscar período ativo:', error);
      throw new Error('Falha ao buscar período de competição ativo.');
    }
  }

  /**
   * Encontra o último período de competição que foi fechado.
   * @returns Promise<CompetitionPeriodEntity | null> O último período fechado ou null.
   */
  async findLatestClosedPeriod(): Promise<CompetitionPeriodEntity | null> {
    console.log('[PeriodService] Buscando último período fechado...');
    try {
      const latestClosed = await this.periodRepo.findOne({
        where: { status: 'FECHADA' },
        order: { dataFim: 'DESC' }, // Ordena pela data de fim mais recente
      });
      if (latestClosed) {
        console.log(
          `[PeriodService] Último período fechado encontrado: ${latestClosed.mesAno}`
        );
      } else {
        console.log('[PeriodService] Nenhum período fechado encontrado.');
      }
      return latestClosed;
    } catch (error) {
      console.error(
        '[PeriodService] Erro ao buscar último período fechado:',
        error
      );
      throw new Error('Falha ao buscar último período de competição fechado.');
    }
  }

  /**
   * Encontra ou cria o próximo período para planejamento.
   * Se não existir um período 'PLANEJAMENTO' para o próximo mês, ele pode ser criado.
   * (Lógica de criação pode ser mais complexa e vir depois)
   * @returns Promise<CompetitionPeriodEntity | null> O período em planejamento ou null.
   */
  async findOrCreatePlanningPeriod(): Promise<CompetitionPeriodEntity | null> {
    console.log('[PeriodService] Buscando período em planejamento...');
    try {
      let planningPeriod = await this.periodRepo.findOne({
        where: { status: 'PLANEJAMENTO' },
        order: { dataInicio: 'ASC' }, // Pega o mais antigo em planejamento
      });

      if (planningPeriod) {
        console.log(
          `[PeriodService] Período em planejamento encontrado: ${planningPeriod.mesAno}`
        );
      } else {
        // Lógica para criar o próximo período se nenhum 'PLANEJAMENTO' existir
        // Por enquanto, vamos apenas logar que não foi encontrado.
        // A criação real envolveria calcular o próximo mesAno, dataInicio, dataFim.
        console.log(
          '[PeriodService] Nenhum período em planejamento encontrado. (Criação futura aqui)'
        );
        // Exemplo de como poderia ser a criação (simplificado):
        // const lastPeriod = await this.periodRepo.findOne({ order: { dataFim: 'DESC' }});
        // if (lastPeriod) { /* Lógica para calcular próximo mesAno, datas e criar */ }
        // else { /* Lógica para criar o primeiro período */ }
      }
      return planningPeriod;
    } catch (error) {
      console.error(
        '[PeriodService] Erro ao buscar/criar período em planejamento:',
        error
      );
      throw new Error(
        'Falha ao buscar/criar período de competição em planejamento.'
      );
    }
  }

  // --- Futuros Métodos ---
  // async startPeriod(periodId: number, userId: number): Promise<CompetitionPeriodEntity> { /* ... */ }
  // async closePeriod(periodId: number, userId: number): Promise<CompetitionPeriodEntity> { /* ... */ }
  // async createNextPlanningPeriod(): Promise<CompetitionPeriodEntity> { /* ... */ }
}
