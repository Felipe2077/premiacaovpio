// apps/api/src/modules/periods/period.service.ts (VERSÃO INICIAL COMPLETA)
import { AppDataSource } from '@/database/data-source';
import { CompetitionPeriodEntity } from '@/entity/competition-period.entity';
import 'reflect-metadata';
import { Repository } from 'typeorm'; // Importar operadores

export class CompetitionPeriodService {
  private periodRepo: Repository<CompetitionPeriodEntity>;

  constructor() {
    this.periodRepo = AppDataSource.getRepository(CompetitionPeriodEntity);
    console.log(
      '[CompetitionPeriodService] Instanciado e repositório configurado.'
    );
  }

  /**
   * Encontra o período de competição atualmente 'ATIVA'.
   * @returns Promise<CompetitionPeriodEntity | null> O período ativo ou null.
   */
  async findCurrentActivePeriod(): Promise<CompetitionPeriodEntity | null> {
    console.log('[PeriodService] Buscando período ATIVO...');
    try {
      const activePeriod = await this.periodRepo.findOne({
        where: { status: 'ATIVA' },
        order: { dataInicio: 'DESC' }, // Pega o mais recente se houver mais de um ativo por engano
      });
      if (activePeriod) {
        console.log(
          `[PeriodService] Período ATIVO encontrado: ${activePeriod.mesAno}`
        );
      } else {
        console.log('[PeriodService] Nenhum período ATIVO encontrado.');
      }
      return activePeriod;
    } catch (error) {
      console.error('[PeriodService] Erro ao buscar período ativo:', error);
      // Em um app real, talvez lançar um erro customizado ou logar de forma mais estruturada
      throw new Error('Falha ao buscar período de competição ativo.');
    }
  }

  /**
   * Encontra o último período de competição que foi 'FECHADA'.
   * @returns Promise<CompetitionPeriodEntity | null> O último período fechado ou null.
   */
  async findLatestClosedPeriod(): Promise<CompetitionPeriodEntity | null> {
    console.log('[PeriodService] Buscando último período FECHADO...');
    try {
      const latestClosed = await this.periodRepo.findOne({
        where: { status: 'FECHADA' },
        order: { dataFim: 'DESC' }, // Ordena pela data de fim mais recente
      });
      if (latestClosed) {
        console.log(
          `[PeriodService] Último período FECHADO encontrado: ${latestClosed.mesAno}`
        );
      } else {
        console.log('[PeriodService] Nenhum período FECHADO encontrado.');
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
   * Encontra ou cria o próximo período para 'PLANEJAMENTO'.
   * Se não existir um período 'PLANEJAMENTO', ele tentará criar um para o próximo mês.
   * @returns Promise<CompetitionPeriodEntity> O período em planejamento (existente ou novo).
   * @throws Error se não conseguir determinar ou criar o próximo período.
   */
  async findOrCreatePlanningPeriod(): Promise<CompetitionPeriodEntity> {
    console.log('[PeriodService] Buscando/Criando período em PLANEJAMENTO...');
    try {
      let planningPeriod = await this.periodRepo.findOne({
        where: { status: 'PLANEJAMENTO' },
        order: { dataInicio: 'ASC' }, // Pega o mais antigo em planejamento
      });

      if (planningPeriod) {
        console.log(
          `[PeriodService] Período em PLANEJAMENTO encontrado: ${planningPeriod.mesAno}`
        );
        return planningPeriod;
      } else {
        // Nenhum em planejamento, vamos criar o próximo
        console.log(
          '[PeriodService] Nenhum período em PLANEJAMENTO. Tentando criar o próximo...'
        );
        const lastPeriod = await this.periodRepo.findOne({
          order: { dataFim: 'DESC' }, // Pega o último período existente (qualquer status)
        });

        let nextYear: number;
        let nextMonth: number; // 0 = Janeiro, 11 = Dezembro

        if (lastPeriod) {
          const [year, month] = lastPeriod.mesAno.split('-').map(Number);
          const lastPeriodDate = new Date(year, month - 1); // Mês é 0-indexado no Date
          nextYear = lastPeriodDate.getFullYear();
          nextMonth = lastPeriodDate.getMonth() + 1; // Próximo mês
          if (nextMonth > 11) {
            // Virada de ano
            nextMonth = 0;
            nextYear++;
          }
        } else {
          // Nenhum período existe, criar para o mês atual
          const today = new Date();
          nextYear = today.getFullYear();
          nextMonth = today.getMonth();
        }

        const nextMesAno = `<span class="math-inline">\{nextYear\}\-</span>{String(nextMonth + 1).padStart(2, '0')}`;
        const dataInicio = new Date(nextYear, nextMonth, 1);
        const dataFim = new Date(nextYear, nextMonth + 1, 0); // Pega o último dia do mês

        // Verifica se já existe um para este mesAno (segurança extra)
        const existingForNextMesAno = await this.periodRepo.findOneBy({
          mesAno: nextMesAno,
        });
        if (existingForNextMesAno) {
          console.warn(
            `[PeriodService] Período ${nextMesAno} já existe, retornando ele.`
          );
          // Poderia mudar o status dele para PLANEJAMENTO se estivesse FECHADO? Regra de negócio.
          // Por ora, apenas retornamos o existente.
          return existingForNextMesAno;
        }

        console.log(
          `[PeriodService] Criando novo período em PLANEJAMENTO para: ${nextMesAno}`
        );
        const newPeriod = this.periodRepo.create({
          mesAno: nextMesAno,
          dataInicio: dataInicio.toISOString().split('T')[0], // Formato YYYY-MM-DD
          dataFim: dataFim.toISOString().split('T')[0], // Formato YYYY-MM-DD
          status: 'PLANEJAMENTO',
        });
        await this.periodRepo.save(newPeriod);
        console.log(
          `[PeriodService] Novo período ${newPeriod.mesAno} criado com ID ${newPeriod.id}`
        );
        return newPeriod;
      }
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

  /**
   * Busca todos os períodos, ordenados pelos mais recentes primeiro.
   * @returns Promise<CompetitionPeriodEntity[]>
   */
  async findAllPeriods(limit: number = 12): Promise<CompetitionPeriodEntity[]> {
    console.log(`[PeriodService] Buscando os últimos ${limit} períodos...`);
    try {
      const periods = await this.periodRepo.find({
        order: { dataInicio: 'DESC' },
        take: limit,
      });
      console.log(`[PeriodService] Encontrados ${periods.length} períodos.`);
      return periods;
    } catch (error) {
      console.error('[PeriodService] Erro ao buscar todos os períodos:', error);
      throw new Error('Falha ao buscar períodos de competição.');
    }
  }
}
