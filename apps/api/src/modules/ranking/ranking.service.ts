// apps/api/src/modules/ranking/ranking.service.ts
import { AppDataSource } from '@/database/data-source';
import { CompetitionPeriodEntity } from '@/entity/competition-period.entity';
import { CriterionEntity } from '@/entity/criterion.entity';
import { ParameterValueEntity } from '@/entity/parameter-value.entity';
import { PerformanceDataEntity } from '@/entity/performance-data.entity';
import { SectorEntity } from '@/entity/sector.entity';
import {
  EntradaRanking,
  EntradaResultadoDetalhado,
  RegrasAplicadasPadrao,
} from '@sistema-premiacao/shared-types';
import {
  FindOptionsWhere,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { CriterionCalculationSettingsService } from '../parameters/criterion-calculation-settings.service'; // Pode ser necessário pelo PlanningCellDataService
import {
  PlanningCellDataService,
  PlanningCellOutput,
} from '../planning/planning-cell-data.service';

// Interface auxiliar interna - NOMES EM PORTUGUÊS
interface ResultadoPorCriterio {
  setorId: number;
  setorNome: string;
  criterioId: number;
  criterioNome: string;
  valorRealizado: number | null;
  valorMeta: number | null;
  razaoCalculada: number | null;
  rank?: number;
  pontos: number | null;
  percentualAtingimento?: number | null;
  periodo?: string | null;
  // Novos campos opcionais para compatibilidade
  metaPropostaPadrao?: number | null;
  metaAnteriorValor?: number | null;
  metaAnteriorPeriodo?: string | null;
  regrasAplicadasPadrao?: RegrasAplicadasPadrao | null;
  metaDefinidaValor?: number | null;
  isMetaDefinida?: boolean;
}
interface AcumuladorScoreSetor {
  setorId: number; // Adicionado para desempate consistente
  nome: string;
  totalScore: number;
}

export class RankingService {
  private sectorRepo: Repository<SectorEntity>;
  private criterionRepo: Repository<CriterionEntity>;
  private parameterRepo: Repository<ParameterValueEntity>;
  private performanceRepo: Repository<PerformanceDataEntity>;
  private periodRepo: Repository<CompetitionPeriodEntity>;
  private planningCellDataService: PlanningCellDataService;
  private criterionSettingsService: CriterionCalculationSettingsService;

  constructor() {
    this.sectorRepo = AppDataSource.getRepository(SectorEntity);
    this.criterionRepo = AppDataSource.getRepository(CriterionEntity);
    this.parameterRepo = AppDataSource.getRepository(ParameterValueEntity);
    this.performanceRepo = AppDataSource.getRepository(PerformanceDataEntity);
    this.periodRepo = AppDataSource.getRepository(CompetitionPeriodEntity);
    this.planningCellDataService = new PlanningCellDataService();
    console.log(
      '[RankingService] Instanciado e repositórios configurados, incluindo PlanningCellDataService.'
    );
  }

  // Método auxiliar para obter o período de competição válido
  private async getValidCompetitionPeriod(
    periodMesAno?: string
  ): Promise<CompetitionPeriodEntity> {
    let competitionPeriod;
    if (periodMesAno) {
      competitionPeriod = await this.periodRepo.findOne({
        where: { mesAno: periodMesAno },
      });
      if (!competitionPeriod) {
        console.error(
          `[RankingService] ERRO: Vigência não encontrada para o período ${periodMesAno}`
        );
        throw new Error(
          `Vigência não encontrada para o período ${periodMesAno}`
        );
      }
    } else {
      competitionPeriod =
        (await this.periodRepo.findOne({ where: { status: 'ATIVA' } })) ||
        (await this.periodRepo.findOne({
          where: { status: 'PLANEJAMENTO' },
          order: { dataInicio: 'DESC' },
        })) ||
        (await this.periodRepo.findOne({ order: { dataInicio: 'DESC' } }));
      if (!competitionPeriod) {
        console.error(
          `[RankingService] ERRO: Nenhuma vigência encontrada no sistema`
        );
        throw new Error('Nenhuma vigência encontrada no sistema');
      }
    }
    console.log(
      `[RankingService] Vigência selecionada: ID ${competitionPeriod.id}, Mês/Ano ${competitionPeriod.mesAno}, Status ${competitionPeriod.status}`
    );
    return competitionPeriod;
  }

  // --- MÉTODO PRIVADO: Lógica Central de Cálculo ---
  private async calculateAllResults(period?: string): Promise<{
    ranking: EntradaRanking[];
    details: EntradaResultadoDetalhado[];
  }> {
    console.log(
      `[RankingService] INÍCIO calculateAllResults - período: ${period || 'não especificado'}`
    );

    // Usar o método auxiliar para obter o período de competição
    const competitionPeriod = await this.getValidCompetitionPeriod(period);

    // Usar a data fim da vigência como data alvo para buscar parâmetros e dados de desempenho
    const targetDate = '2025-05-30';
    console.log(
      `[RankingService] ATENÇÃO: Usando data fixa para cálculos: ${targetDate} (em vez da data fim da vigência)`
    );
    console.log(`[RankingService] Data alvo para cálculos: ${targetDate}`);

    // 1. Buscar Dados Base
    console.log(`[RankingService] Buscando setores ativos...`);
    const activeSectors = await this.sectorRepo.find({
      where: { ativo: true },
      order: { nome: 'ASC' },
    });
    console.log(
      `[RankingService] Setores ativos encontrados: ${activeSectors.length}`
    );
    if (activeSectors.length > 0) {
      console.log(
        `[RankingService] Amostra de setores:`,
        activeSectors.slice(0, 2)
      );
    }

    console.log(`[RankingService] Buscando critérios ativos...`);
    const activeCriteria = await this.criterionRepo.find({
      where: { ativo: true },
      order: { index: 'ASC', id: 'ASC' },
    });
    console.log(
      `[RankingService] Critérios ativos encontrados: ${activeCriteria.length}`
    );
    if (activeCriteria.length > 0) {
      console.log(
        `[RankingService] Amostra de critérios:`,
        activeCriteria.slice(0, 2)
      );
    }

    if (!activeSectors.length || !activeCriteria.length) {
      console.warn(
        `[RankingService] AVISO: Nenhum setor ativo ou critério ativo encontrado`
      );
      return { ranking: [], details: [] };
    }

    // 3. Preparar Acumuladores
    console.log(
      `[RankingService] Preparando acumuladores de score por setor...`
    );
    const sectorScores: { [id: number]: AcumuladorScoreSetor } = {};
    const allDetailedResults: EntradaResultadoDetalhado[] = []; // CORREÇÃO: Mudando para EntradaResultadoDetalhado[]

    // Inicializa sectorScores APENAS se não for planejamento, pois ranking não se aplica
    if (competitionPeriod.status !== 'PLANEJAMENTO') {
      activeSectors.forEach((s) => {
        sectorScores[s.id] = { nome: s.nome, totalScore: 0, setorId: s.id };
      });
    }

    // --- LÓGICA CONDICIONAL BASEADA NO STATUS DO PERÍODO ---
    if (competitionPeriod.status === 'PLANEJAMENTO') {
      console.log(
        `[RankingService] Período ${competitionPeriod.mesAno} está em PLANEJAMENTO.`
      );
      for (const criterion of activeCriteria) {
        for (const sector of activeSectors) {
          // O criterion já deve ter casasDecimaisPadrao e sentido_melhor carregados
          const planningData: PlanningCellOutput =
            await this.planningCellDataService.getPrecalculatedDataForCell(
              criterion.id,
              sector.id,
              competitionPeriod
            );

          allDetailedResults.push({
            setorId: sector.id,
            setorNome: sector.nome,
            criterioId: criterion.id,
            criterioNome: criterion.nome,
            periodo: competitionPeriod.mesAno,
            valorRealizado: null,
            valorMeta: null,
            percentualAtingimento: null,
            pontos: null,
            metaPropostaPadrao: planningData.metaPropostaPadrao,
            metaAnteriorValor: planningData.metaAnteriorValor,
            metaAnteriorPeriodo: planningData.metaAnteriorPeriodo,
            regrasAplicadasPadrao: planningData.regrasAplicadasPadrao,
            metaDefinidaValor: planningData.metaDefinidaValor,
            isMetaDefinida: planningData.isMetaDefinida,
          });
        }
      }
    } else {
      // --- LÓGICA EXISTENTE PARA PERÍODOS 'ATIVA' E 'FECHADA' ---
      console.log(
        `[RankingService] Período ${competitionPeriod.mesAno} (${competitionPeriod.status}). Calculando performance e ranking.`
      );

      // 2. Buscar Dados do Período
      console.log(
        `[RankingService] Buscando dados de desempenho para data: ${targetDate}`
      );
      const performanceData = await this.performanceRepo.find({
        where: { metricDate: targetDate },
      });
      console.log(
        `[RankingService] Dados de desempenho encontrados: ${performanceData.length}`
      );

      // Verificar se há dados de desempenho
      if (performanceData.length === 0) {
        console.warn(
          `[RankingService] AVISO: Nenhum dado de desempenho encontrado para a data ${targetDate}`
        );

        // Buscar alguns dados de desempenho para diagnóstico
        console.log(
          `[RankingService] Buscando amostras de dados de desempenho para diagnóstico...`
        );
        const sampleData = await this.performanceRepo.find({
          take: 5,
          order: { metricDate: 'DESC' },
        });

        if (sampleData.length > 0) {
          console.log(
            `[RankingService] Amostras de dados de desempenho disponíveis:`
          );
          sampleData.forEach((perf) => {
            console.log(
              `  - Data: ${perf.metricDate}, Setor: ${perf.sectorId}, Critério: ${perf.criterionId}, Valor: ${perf.valor}`
            );
          });

          // IMPORTANTE: Verificar se existem dados para a data fixa que funcionava antes
          console.log(
            `[RankingService] Verificando se existem dados para a data fixa 2025-05-30...`
          );
          const fixedDateData = await this.performanceRepo.find({
            where: { metricDate: '2025-05-30' },
            take: 5,
          });

          if (fixedDateData.length > 0) {
            console.log(
              `[RankingService] Dados encontrados para a data fixa 2025-05-30: ${fixedDateData.length}`
            );
            console.log(
              `[RankingService] Amostra de dados para 2025-05-30:`,
              fixedDateData.slice(0, 2)
            );
          } else {
            console.log(
              `[RankingService] Nenhum dado encontrado para a data fixa 2025-05-30`
            );
          }
        } else {
          console.error(
            `[RankingService] ERRO: Nenhum dado de desempenho encontrado na tabela!`
          );
        }
      } else {
        console.log(
          `[RankingService] Amostra de dados de desempenho:`,
          performanceData.slice(0, 2)
        );
      }

      // Buscar parâmetros vigentes na data alvo
      console.log(
        `[RankingService] Buscando parâmetros para data: ${targetDate} e período ID: ${competitionPeriod.id}`
      );
      const whereParams: FindOptionsWhere<ParameterValueEntity> = {
        dataInicioEfetivo: LessThanOrEqual(targetDate),
        dataFimEfetivo: IsNull(),
        competitionPeriodId: competitionPeriod.id, // Importante: filtrar por período de competição
      };
      const whereParamsExpired: FindOptionsWhere<ParameterValueEntity> = {
        dataInicioEfetivo: LessThanOrEqual(targetDate),
        dataFimEfetivo: MoreThanOrEqual(targetDate),
        competitionPeriodId: competitionPeriod.id, // Importante: filtrar por período de competição
      };

      console.log(`[RankingService] Condições de busca para parâmetros:`, {
        whereParams,
        whereParamsExpired,
      });

      const currentParameters = await this.parameterRepo.find({
        where: [whereParams, whereParamsExpired],
        cache: false, // Desativar cache
      });

      console.log(
        `[RankingService] Parâmetros encontrados: ${currentParameters.length}`
      );

      if (currentParameters.length === 0) {
        console.warn(
          `[RankingService] AVISO: Nenhum parâmetro encontrado para a data ${targetDate} e período ID ${competitionPeriod.id}`
        );

        // Buscar alguns parâmetros para diagnóstico
        console.log(
          `[RankingService] Buscando amostras de parâmetros para diagnóstico...`
        );
        const sampleParams = await this.parameterRepo.find({
          take: 5,
          order: { createdAt: 'DESC' },
        });

        if (sampleParams.length > 0) {
          console.log(`[RankingService] Amostras de parâmetros disponíveis:`);
          sampleParams.forEach((param) => {
            console.log(
              `  - ID: ${param.id}, Nome: ${param.nomeParametro}, Período: ${param.competitionPeriodId}, Critério: ${param.criterionId}, Setor: ${param.sectorId}, Valor: ${param.valor}`
            );
            console.log(
              `    Vigência: ${param.dataInicioEfetivo} até ${param.dataFimEfetivo || 'em aberto'}`
            );
          });

          // Verificar se existem parâmetros sem filtro de período
          console.log(
            `[RankingService] Verificando parâmetros sem filtro de período...`
          );
          const paramsWithoutPeriodFilter = await this.parameterRepo.find({
            where: [
              {
                dataInicioEfetivo: LessThanOrEqual(targetDate),
                dataFimEfetivo: IsNull(),
              },
              {
                dataInicioEfetivo: LessThanOrEqual(targetDate),
                dataFimEfetivo: MoreThanOrEqual(targetDate),
              },
            ],
            take: 5,
          });

          if (paramsWithoutPeriodFilter.length > 0) {
            console.log(
              `[RankingService] Parâmetros encontrados sem filtro de período: ${paramsWithoutPeriodFilter.length}`
            );
            console.log(
              `[RankingService] Amostra de parâmetros sem filtro de período:`,
              paramsWithoutPeriodFilter.slice(0, 2)
            );
          } else {
            console.log(
              `[RankingService] Nenhum parâmetro encontrado mesmo sem filtro de período`
            );
          }
        } else {
          console.error(
            `[RankingService] ERRO: Nenhum parâmetro encontrado na tabela!`
          );
        }
      } else {
        console.log(
          `[RankingService] Amostra de parâmetros:`,
          currentParameters.slice(0, 2)
        );
      }

      // Ordenar parâmetros por dataInicioEfetivo (decrescente) e createdAt (decrescente)
      console.log(`[RankingService] Ordenando parâmetros...`);
      const sortedParameters = [...currentParameters].sort((a, b) => {
        const dateA = new Date(a.dataInicioEfetivo);
        const dateB = new Date(b.dataInicioEfetivo);

        if (dateA.getTime() !== dateB.getTime()) {
          return dateB.getTime() - dateA.getTime(); // Ordem decrescente por data
        }

        // Se as datas forem iguais, ordenar por createdAt
        const createdAtA = new Date(a.createdAt);
        const createdAtB = new Date(b.createdAt);

        return createdAtB.getTime() - createdAtA.getTime(); // Ordem decrescente por createdAt
      });

      // 4. Calcular por Critério
      console.log(`[RankingService] Iniciando cálculo por critério...`);
      for (const criterion of activeCriteria) {
        console.log(
          `[RankingService] Calculando para critério: ${criterion.nome} (ID: ${criterion.id})`
        );
        const resultsForCriterion: ResultadoPorCriterio[] = []; // CORREÇÃO: Usando ResultadoPorCriterio para cálculos internos

        // Filtrar dados de desempenho para este critério
        const criterionPerformanceData = performanceData.filter(
          (p) => p.criterionId === criterion.id
        );
        console.log(
          `[RankingService] Dados de desempenho para critério ${criterion.nome}: ${criterionPerformanceData.length}`
        );

        criterionPerformanceData.forEach((p) => {
          console.log(
            ` - setorId: ${p.sectorId}, criterioId: ${p.criterionId}, valor: ${p.valor}`
          );
        });

        for (const sector of activeSectors) {
          console.log(
            `[RankingService] Processando setor: ${sector.nome} (ID: ${sector.id}) para critério: ${criterion.nome}`
          );

          const perf = performanceData.find(
            (p) => p.sectorId === sector.id && p.criterionId === criterion.id
          );

          console.log(
            `[RankingService] Dado de desempenho encontrado para setor ${sector.nome}:`,
            perf || 'Nenhum'
          );

          //! arredondando valor realizado para duas casas decimais antes do calculo
          const valorRealizadoA =
            perf?.valor != null ? parseFloat(String(perf.valor)) : null;
          console.log(
            `[RankingService] valor perf original: ${perf?.valor}, convertido: ${valorRealizadoA}`
          );

          const valorRealizado =
            valorRealizadoA != null
              ? Number(
                  valorRealizadoA.toFixed(criterion.casasDecimaisPadrao ?? 2)
                )
              : null;
          console.log(
            `[RankingService] valor realizado final (arredondado): ${valorRealizado}`
          );

          // Buscar a meta mais recente, com fallback para meta genérica (sem setor)
          console.log(
            `[RankingService] Buscando meta para critério ${criterion.nome}, setor ${sector.nome}...`
          );

          let targetParam = sortedParameters.find(
            (p) =>
              p.criterionId === criterion.id &&
              p.sectorId === sector.id &&
              p.nomeParametro.startsWith('META_')
          );

          if (!targetParam) {
            console.log(
              `[RankingService] Meta específica não encontrada, buscando meta genérica...`
            );
            targetParam = sortedParameters.find(
              (p) =>
                p.criterionId === criterion.id &&
                (p.sectorId === null || p.sectorId === undefined) &&
                p.nomeParametro.startsWith('META_')
            );
          }

          // Adicionar log para verificar qual meta está sendo usada
          console.log(
            `[RankingService] Meta usada para critério ${criterion.nome}, setor ${sector.nome}:`,
            targetParam
              ? {
                  id: targetParam.id,
                  nome: targetParam.nomeParametro,
                  valor: targetParam.valor,
                  dataInicioEfetivo: targetParam.dataInicioEfetivo,
                  dataFimEfetivo: targetParam.dataFimEfetivo || 'em aberto',
                  createdAt: targetParam.createdAt,
                }
              : 'Nenhuma meta encontrada'
          );

          const valorMeta =
            targetParam?.valor != null
              ? parseFloat(String(targetParam.valor))
              : null;
          console.log(`[RankingService] Valor da meta: ${valorMeta}`);

          // Cálculo da razão (usando a lógica melhorada do arquivo menor)
          console.log(
            `[RankingService] Calculando razão para critério ${criterion.nome}, setor ${sector.nome}...`
          );
          let razaoCalculada: number | null = null;

          if (valorRealizado === 0 && valorMeta === 0) {
            razaoCalculada = 1; // Caso especial: meta 0 e realizado 0 = OK
            console.log(
              `[RankingService] Caso especial: meta 0 e realizado 0, razão = 1`
            );
          } else if (
            valorRealizado != null &&
            valorMeta != null &&
            valorMeta !== 0
          ) {
            razaoCalculada = valorRealizado / valorMeta;
            console.log(
              `[RankingService] Razão calculada: ${valorRealizado} / ${valorMeta} = ${razaoCalculada}`
            );
          } else if (
            valorRealizado != null &&
            (valorMeta === 0 || valorMeta === null)
          ) {
            if (valorRealizado === 0) {
              razaoCalculada = 1;
            } else {
              razaoCalculada =
                criterion.sentido_melhor === 'MAIOR'
                  ? Infinity
                  : valorRealizado > 0
                    ? Infinity
                    : -Infinity;
            }
            console.log(
              `[RankingService] Meta é zero ou nula, razão = ${razaoCalculada}`
            );
          } else {
            razaoCalculada = null;
            console.log(
              `[RankingService] Não foi possível calcular razão (valores nulos)`
            );
          }

          resultsForCriterion.push({
            setorId: sector.id,
            setorNome: sector.nome,
            criterioId: criterion.id,
            criterioNome: criterion.nome,
            valorRealizado,
            valorMeta,
            razaoCalculada,
            pontos: null,
            periodo: competitionPeriod.mesAno, // CORREÇÃO: Adicionando periodo
          });
        }

        console.log(
          `[RankingService] Resultados calculados para critério ${criterion.nome}: ${resultsForCriterion.length}`
        );
        console.log(
          `[RankingService] Ordenando resultados para critério ${criterion.nome}...`
        );

        // Ordenação (usando a lógica melhorada do arquivo menor)
        if (criterion.sentido_melhor === 'MENOR') {
          resultsForCriterion.sort(
            (a, b) =>
              (a.razaoCalculada ?? Infinity) - (b.razaoCalculada ?? Infinity)
          );
        } else {
          resultsForCriterion.sort(
            (a, b) =>
              (b.razaoCalculada ?? -Infinity) - (a.razaoCalculada ?? -Infinity)
          );
        }

        // 4.2a Atribuir Rank considerando empates na razaoCalculada
        console.log(
          `[RankingService] Atribuindo ranks para critério ${criterion.nome}...`
        );
        let currentRank = 0;
        let lastRazaoValue: number | null | undefined = undefined; // Renomeado para evitar conflito
        let tieCount = 0; // Para ajustar o próximo rank após um empate

        resultsForCriterion.forEach((result, index) => {
          if (
            result.razaoCalculada === null ||
            result.razaoCalculada === undefined
          ) {
            result.rank = undefined; // Ou um rank de "não classificado", ex: 5 ou null
            console.log(
              `[RankingService] Setor ${result.setorNome}: razão nula, rank indefinido`
            );
          } else {
            if (result.razaoCalculada !== lastRazaoValue) {
              currentRank = index + 1 - tieCount; // Ajusta o rank se houve empates anteriores
              tieCount = 0; // Reseta contador de empates
              console.log(
                `[RankingService] Setor ${result.setorNome}: nova razão ${result.razaoCalculada}, rank ${currentRank}`
              );
            } else {
              tieCount++; // Incrementa contador de empates
              console.log(
                `[RankingService] Setor ${result.setorNome}: razão empatada ${result.razaoCalculada}, rank ${currentRank} (empate)`
              );
            }
            result.rank = currentRank;
            lastRazaoValue = result.razaoCalculada;
          }
        });

        console.log(
          `[RankingService] Calculando pontos para critério ${criterion.nome}...`
        );
        const useInvertedScale = criterion.index === 0;
        console.log(
          `[RankingService] Usando escala invertida: ${useInvertedScale}`
        );

        resultsForCriterion.forEach((result) => {
          let pontos: number | null = null;

          if (criterion.id === 5) {
            // Regra especial para critério FALTA FUNC
            console.log(
              `[RankingService] Aplicando regra especial para critério FALTA FUNC`
            );
            if (result.valorRealizado !== null && result.valorRealizado <= 10) {
              pontos = 1;
              console.log(
                `[RankingService] Setor ${result.setorNome}: FALTA FUNC <= 10, pontos = 1`
              );
            } else {
              // Aplica a regra normal só se valorRealizado > 10
              console.log(
                `[RankingService] Setor ${result.setorNome}: FALTA FUNC > 10, aplicando regra normal`
              );
              switch (result.rank) {
                case 1:
                  pontos = 1.0;
                  break;
                case 2:
                  pontos = 1.5;
                  break;
                case 3:
                  pontos = 2.0;
                  break;
                case 4:
                  pontos = 2.5;
                  break;
                default:
                  pontos = 2.5;
              }
              console.log(
                `[RankingService] Setor ${result.setorNome}: rank ${result.rank}, pontos = ${pontos}`
              );
            }
          } else {
            const todosMesmaRazao = resultsForCriterion.every(
              (r) => r.razaoCalculada === 1
            );

            console.log(
              `[RankingService] Todos setores com mesma razão (1): ${todosMesmaRazao}`
            );

            if (todosMesmaRazao && result.razaoCalculada === 1) {
              pontos = 1.0; // Pontuação padrão (verde)
              console.log(
                `[RankingService] Setor ${result.setorNome}: todos mesma razão, pontos = 1`
              );
            } else {
              switch (result.rank) {
                case 1:
                  pontos = useInvertedScale ? 2.5 : 1.0;
                  break;
                case 2:
                  pontos = useInvertedScale ? 2.0 : 1.5;
                  break;
                case 3:
                  pontos = useInvertedScale ? 1.5 : 2.0;
                  break;
                case 4:
                  pontos = useInvertedScale ? 1.0 : 2.5;
                  break;
                default:
                  pontos = 2.5;
              }
              console.log(
                `[RankingService] Setor ${result.setorNome}: rank ${result.rank}, escala ${useInvertedScale ? 'invertida' : 'normal'}, pontos = ${pontos}`
              );
            }
          }
          result.pontos = pontos;

          const currentSectorScore = sectorScores[result.setorId];
          if (currentSectorScore && pontos !== null) {
            const oldScore = currentSectorScore.totalScore;
            currentSectorScore.totalScore += pontos;
            console.log(
              `[RankingService] Setor ${result.setorNome}: pontuação atualizada ${oldScore} + ${pontos} = ${currentSectorScore.totalScore}`
            );

            allDetailedResults.push({
              setorId: result.setorId,
              setorNome: result.setorNome,
              criterioId: result.criterioId,
              criterioNome: result.criterioNome,
              periodo: competitionPeriod.mesAno,
              valorRealizado: result.valorRealizado,
              valorMeta: result.valorMeta,
              percentualAtingimento: result.razaoCalculada,
              pontos: result.pontos,
              metaPropostaPadrao: null,
              metaAnteriorValor: null,
              metaAnteriorPeriodo: null,
              regrasAplicadasPadrao: null,
              metaDefinidaValor: null,
              isMetaDefinida: false,
            });
          } else if (!currentSectorScore) {
            console.error(
              `[RankingService] ERRO: Score não encontrado para setor ID ${result.setorId}`
            );
          } else {
            console.log(
              `[RankingService] Setor ${result.setorNome}: pontos nulos, não somados ao total`
            );
          }
        });

        console.log(
          `[RankingService] Cálculo concluído para critério ${criterion.nome}`
        );
      } // ----- FIM CÁLCULO POR CRITÉRIO -----
    } // Fim do else (ATIVA/FECHADA)

    // 5. Calcular Ranking Final
    console.log('[RankingService] Calculando ranking final...');
    console.log('[RankingService] Pontuações finais por setor:', sectorScores);

    let finalRankingArray: EntradaRanking[] = [];
    if (
      competitionPeriod.status !== 'PLANEJAMENTO' &&
      Object.keys(sectorScores).length > 0
    ) {
      const scoresArray = Object.values(sectorScores);
      if (scoresArray.length > 0) {
        finalRankingArray = scoresArray
          .map((s) => ({
            sectorId: activeSectors.find((as) => as.nome === s.nome)?.id || 0,
            ...s,
          }))
          .sort((a, b) => {
            if (a.totalScore === b.totalScore) {
              return a.sectorId - b.sectorId;
            }
            return a.totalScore - b.totalScore;
          })
          .map((score, index, arr) => {
            let rank = index + 1;
            // Lógica de desempate correta: se pontuação igual ao anterior, rank é o mesmo
            if (index > 0 && score.totalScore === arr[index - 1]!.totalScore) {
              rank = arr[index - 1]!.totalScore!; // CORREÇÃO: Pegando o RANK e não totalScore
            }
            return {
              RANK: rank,
              SETOR: score.nome,
              PONTUACAO: parseFloat(score.totalScore.toFixed(2)),
            };
          });

        // Reajuste de rank para garantir que não haja pulos após empates
        if (finalRankingArray.length > 0) {
          let currentActualRank = 1;
          finalRankingArray[0]!.RANK = currentActualRank;
          for (let i = 1; i < finalRankingArray.length; i++) {
            if (
              finalRankingArray[i]!.PONTUACAO >
              finalRankingArray[i - 1]!.PONTUACAO
            ) {
              currentActualRank = i + 1;
            }
            finalRankingArray[i]!.RANK = currentActualRank;
          }
        }
        console.log(
          '[RankingService] Ranking final calculado:',
          finalRankingArray
        );
      } else {
        console.log(
          '[RankingService] Nenhum score de setor para calcular ranking final.'
        );
      }
    } else if (competitionPeriod.status === 'PLANEJAMENTO') {
      console.log(
        '[RankingService] Período em PLANEJAMENTO, ranking final não aplicável.'
      );
    }

    console.log(
      `[RankingService] Detalhes calculados: ${allDetailedResults.length} entradas`
    );

    // Verificar se há resultados
    if (
      finalRankingArray.length === 0 &&
      competitionPeriod.status !== 'PLANEJAMENTO'
    ) {
      console.warn('[RankingService] AVISO: Nenhum ranking calculado!');
    }

    if (allDetailedResults.length === 0) {
      console.warn('[RankingService] AVISO: Nenhum detalhe calculado!');
    }

    console.log(`[RankingService] FIM calculateAllResults`);
    return { ranking: finalRankingArray, details: allDetailedResults };
  } // Fim calculateAllResults

  // No RankingService - adicione estes métodos à classe
  async getDetailedResultsByDate(
    period?: string,
    targetDate?: string
  ): Promise<EntradaResultadoDetalhado[]> {
    console.log(
      `[RankingService] getDetailedResultsByDate - Período: ${period || 'não especificado'}, Data alvo: ${targetDate || 'não especificada'}`
    );
    try {
      // Usar a data fixa se não for especificada
      const effectiveTargetDate = targetDate || '2025-05-30';

      // Chamar método interno com a data alvo específica
      const { details } = await this.calculateAllResultsByDate(
        period,
        effectiveTargetDate
      );

      console.log(
        `[RankingService] getDetailedResultsByDate - Resultados encontrados: ${details.length}`
      );
      return details;
    } catch (error) {
      console.error(
        `[RankingService] ERRO em getDetailedResultsByDate:`,
        error
      );
      throw error;
    }
  }

  // --- MÉTODO PRIVADO: Lógica Central de Cálculo ---
  // No seu código original, este era `calculateAllResults`. Renomeei para `calculateAllResultsByDate`
  // na minha sugestão anterior e a rota o chamava. Vou manter `calculateAllResultsByDate`
  // como o método principal aqui para consistência com as discussões.
  // Se o seu `calculateAllResults` chama o `calculateAllResultsByDate`, a lógica principal está aqui.
  private async calculateAllResultsByDate(
    periodMesAno?: string,
    targetDateForData?: string
  ): Promise<{
    ranking: EntradaRanking[];
    details: EntradaResultadoDetalhado[];
  }> {
    console.log(
      `[RankingService] INÍCIO calculateAllResultsByDate - período: ${periodMesAno || 'não especificado'}, data alvo: ${targetDateForData}`
    );

    const competitionPeriod =
      await this.getValidCompetitionPeriod(periodMesAno);
    const effectiveTargetDate = targetDateForData || competitionPeriod.dataFim;

    const activeSectors = await this.sectorRepo.find({
      where: { ativo: true },
      order: { nome: 'ASC' },
    });
    const activeCriteria = await this.criterionRepo.find({
      where: { ativo: true },
      order: { index: 'ASC', id: 'ASC' },
    });

    if (!activeSectors.length || !activeCriteria.length) {
      console.warn(
        `[RankingService] AVISO: Nenhum setor ativo ou critério ativo encontrado`
      );
      return { ranking: [], details: [] };
    }

    const allDetailedResults: EntradaResultadoDetalhado[] = [];
    const sectorScores: { [id: number]: AcumuladorScoreSetor } = {};

    if (competitionPeriod.status !== 'PLANEJAMENTO') {
      activeSectors.forEach((s) => {
        sectorScores[s.id] = { setorId: s.id, nome: s.nome, totalScore: 0 };
      });
    }

    if (competitionPeriod.status === 'PLANEJAMENTO') {
      console.log(
        `[RankingService] Período ${competitionPeriod.mesAno} está em PLANEJAMENTO.`
      );
      for (const criterion of activeCriteria) {
        for (const sector of activeSectors) {
          const planningData: PlanningCellOutput =
            await this.planningCellDataService.getPrecalculatedDataForCell(
              criterion.id,
              sector.id,
              competitionPeriod
            );
          allDetailedResults.push({
            setorId: sector.id,
            setorNome: sector.nome,
            criterioId: criterion.id,
            criterioNome: criterion.nome,
            periodo: competitionPeriod.mesAno,
            valorRealizado: null,
            valorMeta: null,
            percentualAtingimento: null,
            pontos: null,
            metaPropostaPadrao: planningData.metaPropostaPadrao,
            metaAnteriorValor: planningData.metaAnteriorValor,
            metaAnteriorPeriodo: planningData.metaAnteriorPeriodo,
            regrasAplicadasPadrao: planningData.regrasAplicadasPadrao,
            metaDefinidaValor: planningData.metaDefinidaValor,
            isMetaDefinida: planningData.isMetaDefinida,
          });
        }
      }
    } else {
      // Lógica para 'ATIVA' ou 'FECHADA'
      console.log(
        `[RankingService] Período ${competitionPeriod.mesAno} (${competitionPeriod.status}). Calculando performance e ranking.`
      );

      const performanceData = await this.performanceRepo.find({
        where: { competitionPeriodId: competitionPeriod.id },
      });
      console.log(
        `[RankingService] Dados de desempenho para ${competitionPeriod.mesAno} (ID:${competitionPeriod.id}): ${performanceData.length}`
      );

      const whereParamsMetas: FindOptionsWhere<ParameterValueEntity> = {
        competitionPeriodId: competitionPeriod.id,
        dataInicioEfetivo: LessThanOrEqual(effectiveTargetDate),
        dataFimEfetivo: IsNull(),
      };
      const whereParamsMetasExpiradasValidas: FindOptionsWhere<ParameterValueEntity> =
        {
          competitionPeriodId: competitionPeriod.id,
          dataInicioEfetivo: LessThanOrEqual(effectiveTargetDate),
          dataFimEfetivo: MoreThanOrEqual(effectiveTargetDate),
        };
      const currentParameters = await this.parameterRepo.find({
        where: [whereParamsMetas, whereParamsMetasExpiradasValidas],
        order: { dataInicioEfetivo: 'DESC', createdAt: 'DESC' },
      });
      console.log(
        `[RankingService] Parâmetros (metas) vigentes em ${effectiveTargetDate} para período ${competitionPeriod.mesAno}: ${currentParameters.length}`
      );

      for (const criterion of activeCriteria) {
        const resultsForCriterion: ResultadoPorCriterio[] = [];
        for (const sector of activeSectors) {
          const perf = performanceData.find(
            (p) => p.sectorId === sector.id && p.criterionId === criterion.id
          );

          let targetParam = currentParameters.find(
            (p) =>
              p.criterionId === criterion.id &&
              p.sectorId === sector.id &&
              p.nomeParametro.startsWith('META_')
          );
          if (!targetParam) {
            targetParam = currentParameters.find(
              (p) =>
                p.criterionId === criterion.id &&
                (p.sectorId === null || p.sectorId === undefined) &&
                p.nomeParametro.startsWith('META_')
            );
          }

          const valorRealizadoOriginal =
            perf?.valor != null ? parseFloat(String(perf.valor)) : null;
          const casasDecimaisRealizado = criterion.casasDecimaisPadrao ?? 2;
          const valorRealizado =
            valorRealizadoOriginal != null
              ? Number(valorRealizadoOriginal.toFixed(casasDecimaisRealizado))
              : null;

          const valorMeta =
            targetParam?.valor != null
              ? parseFloat(String(targetParam.valor))
              : null;

          let razaoCalculada: number | null = null;
          if (valorRealizado === 0 && valorMeta === 0) {
            razaoCalculada = 1;
          } else if (
            valorRealizado != null &&
            valorMeta != null &&
            valorMeta !== 0
          ) {
            razaoCalculada = valorRealizado / valorMeta;
          } else if (
            valorRealizado != null &&
            (valorMeta === 0 || valorMeta === null)
          ) {
            if (valorRealizado === 0) {
              razaoCalculada = 1;
            } else {
              const sentido = criterion.sentido_melhor || 'MENOR';
              razaoCalculada =
                sentido === 'MAIOR'
                  ? Infinity
                  : valorRealizado > 0
                    ? Infinity
                    : -Infinity;
            }
          }

          resultsForCriterion.push({
            setorId: sector.id,
            setorNome: sector.nome,
            criterioId: criterion.id,
            criterioNome: criterion.nome,
            valorRealizado,
            valorMeta,
            razaoCalculada,
            pontos: null,
          });
        }

        const sentidoCrit = criterion.sentido_melhor || 'MENOR';
        if (sentidoCrit === 'MENOR') {
          resultsForCriterion.sort(
            (a, b) =>
              (a.razaoCalculada ?? Infinity) - (b.razaoCalculada ?? Infinity)
          );
        } else {
          resultsForCriterion.sort(
            (a, b) =>
              (b.razaoCalculada ?? -Infinity) - (a.razaoCalculada ?? -Infinity)
          );
        }

        let currentRank = 0;
        let lastRazaoValue: number | null | undefined = undefined;
        let tieCount = 0;

        resultsForCriterion.forEach((result, index) => {
          if (
            result.razaoCalculada === null ||
            result.razaoCalculada === undefined ||
            !isFinite(result.razaoCalculada)
          ) {
            result.rank = undefined;
          } else {
            if (result.razaoCalculada !== lastRazaoValue) {
              currentRank = index + 1 - tieCount;
              tieCount = 0;
            } else {
              tieCount++;
            }
            result.rank = currentRank;
            lastRazaoValue = result.razaoCalculada;
          }
        });

        resultsForCriterion.forEach((result) => {
          let pontos: number | null = null;
          const useInvertedScale = criterion.index === 0;

          if (
            criterion.id === 5 &&
            result.valorRealizado !== null &&
            result.valorRealizado <= 10
          ) {
            pontos = 1.0;
          } else {
            const validResultsForRank = resultsForCriterion.filter(
              (r) => r.razaoCalculada !== null && isFinite(r.razaoCalculada)
            );
            const todosMesmaRazaoUm =
              validResultsForRank.length > 0 &&
              validResultsForRank.every((r) => r.razaoCalculada === 1);

            if (todosMesmaRazaoUm && result.razaoCalculada === 1) {
              pontos = 1.0;
            } else if (result.rank !== undefined) {
              switch (result.rank) {
                case 1:
                  pontos = useInvertedScale ? 2.5 : 1.0;
                  break;
                case 2:
                  pontos = useInvertedScale ? 2.0 : 1.5;
                  break;
                case 3:
                  pontos = useInvertedScale ? 1.5 : 2.0;
                  break;
                case 4:
                  pontos = useInvertedScale ? 1.0 : 2.5;
                  break;
                default:
                  pontos = 2.5;
              }
            } else {
              pontos = 2.5;
            }
          }
          result.pontos = pontos;

          allDetailedResults.push({
            setorId: result.setorId,
            setorNome: result.setorNome,
            criterioId: result.criterioId,
            criterioNome: result.criterioNome,
            periodo: competitionPeriod.mesAno,
            valorRealizado: result.valorRealizado,
            valorMeta:
              typeof result.valorMeta === 'string'
                ? parseFloat(result.valorMeta)
                : result.valorMeta,
            percentualAtingimento: result.razaoCalculada,
            pontos: result.pontos,
            metaPropostaPadrao: null,
            metaAnteriorValor: null,
            metaAnteriorPeriodo: null,
            regrasAplicadasPadrao: null,
            metaDefinidaValor: null,
            isMetaDefinida: false,
          });

          if (sectorScores[result.setorId] && result.pontos !== null) {
            sectorScores[result.setorId]!.totalScore += result.pontos;
          }
        });
      }
    }

    let finalRankingArray: EntradaRanking[] = [];
    if (
      competitionPeriod.status !== 'PLANEJAMENTO' &&
      Object.keys(sectorScores).length > 0
    ) {
      const scoresArray = Object.values(sectorScores);
      if (scoresArray.length > 0) {
        const rankedItems = scoresArray
          .sort((a, b) => {
            if (a.totalScore === b.totalScore) {
              return a.setorId - b.setorId;
            }
            return a.totalScore - b.totalScore;
          })
          .map((score) => ({
            SETOR: score.nome,
            PONTUACAO: parseFloat(score.totalScore.toFixed(2)),
          }));

        if (rankedItems.length > 0) {
          finalRankingArray = rankedItems.map((item, index, all) => {
            let rank = 1;
            if (index > 0) {
              if (item.PONTUACAO === all[index - 1]!.PONTUACAO) {
                rank = index + 1;
              } else {
                rank = index + 1;
              }
            }
            return { ...item, RANK: rank };
          });

          for (let i = 1; i < finalRankingArray.length; i++) {
            if (
              finalRankingArray[i]!.PONTUACAO ===
              finalRankingArray[i - 1]!.PONTUACAO
            ) {
              finalRankingArray[i]!.RANK = finalRankingArray[i - 1]!.RANK;
            }
          }

          if (finalRankingArray.length > 0) {
            let currentRankValue = 1;
            finalRankingArray[0]!.RANK = currentRankValue;
            for (let i = 1; i < finalRankingArray.length; i++) {
              if (
                finalRankingArray[i]!.PONTUACAO >
                finalRankingArray[i - 1]!.PONTUACAO
              ) {
                currentRankValue = i + 1;
              }
              finalRankingArray[i]!.RANK = currentRankValue;
            }
          }
        }
        console.log(
          '[RankingService] Ranking final calculado:',
          finalRankingArray
        );
      } else {
        console.log(
          '[RankingService] Nenhum score de setor para calcular ranking final.'
        );
      }
    } else if (competitionPeriod.status === 'PLANEJAMENTO') {
      console.log(
        '[RankingService] Período em PLANEJAMENTO, ranking final não aplicável.'
      );
    }

    console.log(
      `[RankingService] FIM calculateAllResultsByDate. Total de details: ${allDetailedResults.length}`
    );
    return { ranking: finalRankingArray, details: allDetailedResults };
  }
  // --- MÉTODOS PÚBLICOS ---
  async getCurrentRanking(period?: string): Promise<EntradaRanking[]> {
    console.log(
      `[RankingService] GET CURRENT RANKING para período: ${period || 'Default'}`
    );
    try {
      const { ranking } = await this.calculateAllResults(period);
      return ranking;
    } catch (error) {
      console.error('[RankingService] Erro em getCurrentRanking:', error);
      throw new Error('Falha ao calcular ranking.');
    }
  }

  async getDetailedResults(
    period?: string
  ): Promise<EntradaResultadoDetalhado[]> {
    console.log(
      `[RankingService] getDetailedResults - Período: ${period || 'não especificado'}`
    );
    try {
      // Se 'period' não for fornecido, this.getValidCompetitionPeriod() em calculateAllResultsByDate
      // buscará o período ATIVO, depois PLANEJAMENTO, depois o mais recente.
      // A targetDateForData será então o dataFim desse período encontrado.
      const { details } = await this.calculateAllResultsByDate(
        period,
        undefined
      );
      console.log(
        `[RankingService] getDetailedResults - Resultados encontrados: ${details.length}`
      );
      return details;
    } catch (error) {
      console.error(`[RankingService] ERRO em getDetailedResults:`, error);
      throw error; // Propagar o erro para que o endpoint possa tratá-lo
    }
  }

  // Em ranking.service.ts
  /**
   * Busca resultados detalhados para um intervalo de datas dentro de um período específico
   * @param period O período no formato YYYY-MM
   * @param startDate A data inicial do intervalo
   * @param endDate A data final do intervalo
   * @returns Array de resultados detalhados
   */
  async getDetailedResultsByDateRange(
    period: string,
    startDate: string,
    endDate: string
  ): Promise<EntradaResultadoDetalhado[]> {
    if (!period || !startDate || !endDate) {
      throw new Error('Período, data inicial e data final são obrigatórios');
    }

    console.log(
      `[RankingService] getDetailedResultsByDateRange - Período: ${period}, Intervalo: ${startDate} a ${endDate}`
    );

    // Buscar a vigência correspondente ao período
    const competitionPeriod = await this.periodRepo.findOne({
      where: { mesAno: period },
    });

    if (!competitionPeriod) {
      console.error(
        `[RankingService] Vigência não encontrada para o período ${period}`
      );
      throw new Error(`Vigência não encontrada para o período ${period}`);
    }

    console.log(
      `[RankingService] Vigência encontrada: ID ${competitionPeriod.id}, Status: ${competitionPeriod.status}`
    );

    // Determinar a data correta a usar com base no período
    let effectiveDate: string;

    if (period === '2025-04') {
      effectiveDate = '2025-04-30'; // Sabemos que abril usa o último dia
      console.log(
        `[RankingService] Usando data específica para abril: ${effectiveDate}`
      );
    } else if (period === '2025-05') {
      effectiveDate = '2025-05-01'; // Sabemos que maio usa o primeiro dia
      console.log(
        `[RankingService] Usando data específica para maio: ${effectiveDate}`
      );
    } else {
      // Para outros períodos, verificar se há dados no primeiro dia
      const firstDayData = await this.performanceRepo.findOne({
        where: {
          metricDate: startDate,
          competitionPeriodId: competitionPeriod.id,
        },
      });

      if (firstDayData) {
        effectiveDate = startDate;
        console.log(
          `[RankingService] Usando primeiro dia do mês: ${effectiveDate}`
        );
      } else {
        // Se não houver dados no primeiro dia, tentar o último dia
        const lastDayData = await this.performanceRepo.findOne({
          where: {
            metricDate: endDate,
            competitionPeriodId: competitionPeriod.id,
          },
        });

        if (lastDayData) {
          effectiveDate = endDate;
          console.log(
            `[RankingService] Usando último dia do mês: ${effectiveDate}`
          );
        } else {
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
            effectiveDate = anyData.metricDate;
            console.log(
              `[RankingService] Usando data disponível: ${effectiveDate}`
            );
          } else {
            // Se não houver nenhum dado, usar o primeiro dia como fallback
            effectiveDate = startDate;
            console.log(
              `[RankingService] Nenhum dado encontrado, usando primeiro dia como fallback: ${effectiveDate}`
            );
          }
        }
      }
    }

    console.log(
      `[RankingService] Data efetiva final: ${effectiveDate} para período ${period}`
    );

    // Verificar se há dados para a data efetiva
    const dataCount = await this.performanceRepo.count({
      where: {
        metricDate: effectiveDate,
        competitionPeriodId: competitionPeriod.id,
      },
    });

    console.log(
      `[RankingService] Quantidade de dados para ${effectiveDate}: ${dataCount}`
    );

    // Usar o método existente com a data correta
    try {
      // O 'targetDateForData' é a data de referência para buscar os dados consolidados do mês.
      // Seus dados de performance são por 'metricDate'. Se o ETL consolida para o último dia do mês, use 'endDate'.
      // Se for para o primeiro, use 'startDate'. Vou manter 'endDate' como na sua rota.
      const { details } = await this.calculateAllResultsByDate(period, endDate);

      console.log(`[RankingService] Resultados calculados: ${details.length}`);
      return details;
    } catch (error: any) {
      console.error(
        `[RankingService] Erro ao calcular resultados: ${error.message}`,
        error
      );

      // Se falhar, tentar uma abordagem alternativa
      console.log(`[RankingService] Tentando abordagem alternativa...`);

      // Buscar todos os dados para este período
      const allData = await this.performanceRepo.find({
        where: {
          competitionPeriodId: competitionPeriod.id,
        },
      });

      if (allData.length === 0) {
        console.warn(
          `[RankingService] Nenhum dado encontrado para o período ${period}`
        );
        return [];
      }

      // Agrupar por data para encontrar a data com mais dados
      const dataByDate = allData.reduce(
        (acc, curr) => {
          const date = curr.metricDate;
          if (!acc[date]) {
            acc[date] = [];
          }
          acc[date].push(curr);
          return acc;
        },
        {} as Record<string, PerformanceDataEntity[]>
      );

      // Encontrar a data com mais dados
      let bestDate = '';
      let maxCount = 0;

      for (const [date, data] of Object.entries(dataByDate)) {
        if (data.length > maxCount) {
          maxCount = data.length;
          bestDate = date;
        }
      }

      if (bestDate) {
        console.log(
          `[RankingService] Tentando com a data que tem mais dados: ${bestDate}`
        );
        try {
          const { details } = await this.calculateAllResultsByDate(
            period,
            bestDate
          );

          console.log(
            `[RankingService] Resultados calculados (alternativa): ${details.length}`
          );
          return details;
        } catch (secondError: any) {
          console.error(
            `[RankingService] Erro na segunda tentativa: ${secondError.message}`,
            secondError
          );
        }
      }

      // Se todas as tentativas falharem
      console.error(
        `[RankingService] Todas as tentativas falharam para o período ${period}`
      );
      return [];
    }
  }
}
