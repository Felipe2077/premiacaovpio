// src/modules/historical/historical-results.service.ts

import { AppDataSource } from '@/database/data-source';
import { Repository } from 'typeorm';
import { CompetitionPeriodEntity } from '../../entity/competition-period.entity';
import { CriterionEntity } from '../../entity/criterion.entity';

import { PerformanceDataEntity } from '../../entity/performance-data.entity';
import { SectorEntity } from '../../entity/sector.entity';

export class HistoricalResultsService {
  private performanceRepo: Repository<PerformanceDataEntity>;
  private periodRepo: Repository<CompetitionPeriodEntity>;
  private criterionRepo: Repository<CriterionEntity>;
  private sectorRepo: Repository<SectorEntity>;

  constructor() {
    this.performanceRepo = AppDataSource.getRepository(PerformanceDataEntity);
    this.periodRepo = AppDataSource.getRepository(CompetitionPeriodEntity);
    this.criterionRepo = AppDataSource.getRepository(CriterionEntity);
    this.sectorRepo = AppDataSource.getRepository(SectorEntity);
  }

  /**
   * Gera uma lista de períodos anteriores a partir de um período atual
   * @param currentPeriod Período atual no formato YYYY-MM
   * @param count Número de períodos anteriores a serem gerados
   * @returns Array de períodos no formato YYYY-MM
   */
  private generatePreviousPeriods(
    currentPeriod: string,
    count: number
  ): string[] {
    const parts = currentPeriod.split('-');
    if (parts.length !== 2) {
      throw new Error('Formato de período inválido. Use YYYY-MM');
    }

    const yearStr = parts[0];
    const monthStr = parts[1];

    if (!yearStr || !monthStr) {
      throw new Error('Formato de período inválido. Use YYYY-MM');
    }

    const yearNum = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      throw new Error('Valores de ano ou mês inválidos');
    }

    let year = yearNum;
    let month = monthNum;

    const periods: string[] = [];

    for (let i = 0; i < count; i++) {
      // Decrementar o mês
      month--;

      // Se o mês for menor que 1, voltar para dezembro do ano anterior
      if (month < 1) {
        month = 12;
        year--;
      }

      // Formatar o mês com zero à esquerda se necessário
      const formattedMonth = month.toString().padStart(2, '0');

      // Adicionar o período à lista
      periods.push(`${year}-${formattedMonth}`);
    }

    return periods;
  }

  /**
   * Determina a data efetiva para um período específico
   * @param period Período no formato YYYY-MM
   * @returns Data efetiva no formato YYYY-MM-DD
   */
  private async determineEffectiveDate(
    period: string,
    competitionPeriod: CompetitionPeriodEntity
  ): Promise<string> {
    // Extrair ano e mês do período
    const parts = period.split('-');
    if (parts.length !== 2) {
      throw new Error('Formato de período inválido. Use YYYY-MM');
    }

    const yearStr = parts[0];
    const monthStr = parts[1];

    if (!yearStr || !monthStr) {
      throw new Error('Formato de período inválido. Use YYYY-MM');
    }

    const yearNum = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      throw new Error('Valores de ano ou mês inválidos');
    }

    // Criar datas de início e fim do mês
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0);

    // Formatar as datas para o formato ISO (YYYY-MM-DD)
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Lógica específica para abril e maio
    if (period === '2025-04') {
      return '2025-04-30'; // Abril usa o último dia
    } else if (period === '2025-05' || monthNum >= 5) {
      return `${yearNum}-${monthNum.toString().padStart(2, '0')}-01`; // Maio em diante usa o primeiro dia
    }

    // Para outros períodos, verificar se há dados no primeiro dia
    const firstDayData = await this.performanceRepo.findOne({
      where: {
        metricDate: startDateStr,
        competitionPeriodId: competitionPeriod.id,
      },
    });

    if (firstDayData) {
      return startDateStr ?? ''; // Correção: garantir que não retorne undefined
    }

    // Se não houver dados no primeiro dia, tentar o último dia
    const lastDayData = await this.performanceRepo.findOne({
      where: {
        metricDate: endDateStr,
        competitionPeriodId: competitionPeriod.id,
      },
    });

    if (lastDayData) {
      return endDateStr ?? ''; // Correção: garantir que não retorne undefined
    }

    // Se não houver dados nem no primeiro nem no último dia, buscar qualquer data disponível
    const anyData = await this.performanceRepo.findOne({
      where: {
        competitionPeriodId: competitionPeriod.id,
      },
      order: {
        metricDate: 'DESC',
      },
    });

    if (anyData && anyData.metricDate) {
      return anyData.metricDate;
    }

    // Se não houver nenhum dado, usar o primeiro dia como fallback
    return startDateStr ?? ''; // Correção: garantir que não retorne undefined
  }

  /**
   * Obtém dados históricos para um critério e setor específicos
   * @param criterionId ID do critério
   * @param sectorId ID do setor
   * @param currentPeriod Período atual no formato YYYY-MM
   * @param count Número de períodos anteriores a serem retornados
   * @returns Dados históricos formatados
   */
  async getHistoricalResults(
    criterionId: number,
    sectorId: number,
    currentPeriod: string,
    count: number = 6
  ): Promise<any> {
    console.log(
      `[HistoricalResultsService] Buscando dados históricos - Critério: ${criterionId}, Setor: ${sectorId}, Período atual: ${currentPeriod}, Count: ${count}`
    );

    // Buscar informações do critério e setor
    const criterion = await this.criterionRepo.findOne({
      where: { id: criterionId },
    });
    const sector = await this.sectorRepo.findOne({ where: { id: sectorId } });

    if (!criterion || !sector) {
      throw new Error('Critério ou setor não encontrado');
    }

    // Gerar lista de períodos anteriores
    const previousPeriods = this.generatePreviousPeriods(currentPeriod, count);
    console.log(
      `[HistoricalResultsService] Períodos anteriores gerados:`,
      previousPeriods
    );

    // Preparar o resultado
    const result = {
      criterionId,
      criterionName: criterion.nome || `Critério ${criterionId}`, // Usando 'nome' em vez de 'name'
      sectorId,
      sectorName: sector.nome || `Setor ${sectorId}`, // Usando 'nome' em vez de 'name'
      currentPeriod,
      history: [] as Array<{
        period: string;
        realizedValue: number | null;
        targetValue: number | null;
      }>,
    };

    // Para cada período, buscar os dados
    for (const period of previousPeriods) {
      try {
        // Buscar a vigência correspondente ao período
        const competitionPeriod = await this.periodRepo.findOne({
          where: { mesAno: period },
        });

        if (!competitionPeriod) {
          console.log(
            `[HistoricalResultsService] Vigência não encontrada para o período ${period}`
          );
          // Adicionar período sem dados
          result.history.push({
            period,
            realizedValue: null,
            targetValue: null,
          });
          continue;
        }

        // Determinar a data efetiva para este período
        const effectiveDate = await this.determineEffectiveDate(
          period,
          competitionPeriod
        );
        console.log(
          `[HistoricalResultsService] Data efetiva para ${period}: ${effectiveDate}`
        );

        // Buscar dados para esta data
        const performanceData = await this.performanceRepo.findOne({
          where: {
            competitionPeriodId: competitionPeriod.id,
            sectorId,
            criterionId,
            metricDate: effectiveDate,
          },
        });

        if (performanceData) {
          result.history.push({
            period,
            realizedValue: performanceData.valor,
            targetValue: performanceData.targetValue ?? null, // Usando o operador de coalescência nula
          });
        } else {
          // Período sem dados
          result.history.push({
            period,
            realizedValue: null,
            targetValue: null,
          });
        }
      } catch (error) {
        console.error(
          `[HistoricalResultsService] Erro ao buscar dados para o período ${period}:`,
          error
        );
        // Adicionar período com erro
        result.history.push({
          period,
          realizedValue: null,
          targetValue: null,
        });
      }
    }

    return result;
  }
}

// Exportar uma instância do serviço para uso em outros arquivos
export const historicalResultsService = new HistoricalResultsService();
