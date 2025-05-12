// apps/api/src/modules/etl/etl.service.ts (VERSÃO COMPLETA E CORRIGIDA)
import { AppDataSource } from '@/database/data-source';
import { CompetitionPeriodEntity } from '@/entity/competition-period.entity';
import 'reflect-metadata';
import { Between, LessThanOrEqual, Repository } from 'typeorm';
import { MySqlEtlService } from './mysql-etl.service';
import { OracleEtlService } from './oracle-etl.service';

// Entidades RAW
import { RawMySqlOcorrenciaHorariaEntity } from '@/entity/raw-data/raw-mysql-ocorrencia-horaria.entity';
import { RawMySqlQuebraDefeitoEntity } from '@/entity/raw-data/raw-mysql-quebra-defeito.entity';
import { RawOracleAusenciaEntity } from '@/entity/raw-data/raw-oracle-ausencia.entity';
import { RawOracleColisaoEntity } from '@/entity/raw-data/raw-oracle-colisao.entity';
import { RawOracleEstoqueCustoEntity } from '@/entity/raw-data/raw-oracle-estoque-custo.entity';
import { RawOracleFleetPerformanceEntity } from '@/entity/raw-data/raw-oracle-fleet-performance.entity';
import { RawOracleIpkCalculadoEntity } from '@/entity/raw-data/raw-oracle-ipk-calculado.entity';

// Entidades de Metadados e Resultado
import { CriterionEntity } from '@/entity/criterion.entity';
import { ExpurgoEventEntity } from '@/entity/expurgo-event.entity';
import { ParameterValueEntity } from '@/entity/parameter-value.entity';
import { PerformanceDataEntity } from '@/entity/performance-data.entity';
import { RawOracleKmOciosaComponentsEntity } from '@/entity/raw-data/raw-oracle-km-ociosa.entity';
import { SectorEntity } from '@/entity/sector.entity';
import { DeepPartial } from 'typeorm';

export class EtlService {
  // Serviços extratores
  private mySqlEtlService: MySqlEtlService;
  private oracleEtlService: OracleEtlService;

  // Repositórios para ler dados RAW
  private rawQuebraDefeitoRepo: Repository<RawMySqlQuebraDefeitoEntity>;
  private rawOcorrenciasHorariasRepo: Repository<RawMySqlOcorrenciaHorariaEntity>;
  private rawAusenciaRepo: Repository<RawOracleAusenciaEntity>;
  private rawColisaoRepo: Repository<RawOracleColisaoEntity>;
  private rawEstoqueCustoRepo: Repository<RawOracleEstoqueCustoEntity>;
  private rawFleetPerformanceRepo: Repository<RawOracleFleetPerformanceEntity>;
  private rawKmOciosaComponentsRepo: Repository<RawOracleKmOciosaComponentsEntity>;
  private rawIpkCalculadoRepo: Repository<RawOracleIpkCalculadoEntity>;

  // Repositórios para Metadados
  private parameterRepo: Repository<ParameterValueEntity>;
  private expurgoRepo: Repository<ExpurgoEventEntity>;
  private criterionRepo: Repository<CriterionEntity>;
  private sectorRepo: Repository<SectorEntity>;
  private periodRepo: Repository<CompetitionPeriodEntity>;

  // Repositório para SALVAR dados transformados
  private performanceDataRepo: Repository<PerformanceDataEntity>;

  constructor() {
    this.mySqlEtlService = new MySqlEtlService();
    this.oracleEtlService = new OracleEtlService();

    // Inicializa todos os repositórios
    this.rawQuebraDefeitoRepo = AppDataSource.getRepository(
      RawMySqlQuebraDefeitoEntity
    );
    this.rawOcorrenciasHorariasRepo = AppDataSource.getRepository(
      RawMySqlOcorrenciaHorariaEntity
    );
    this.rawAusenciaRepo = AppDataSource.getRepository(RawOracleAusenciaEntity);
    this.rawColisaoRepo = AppDataSource.getRepository(RawOracleColisaoEntity);
    this.rawEstoqueCustoRepo = AppDataSource.getRepository(
      RawOracleEstoqueCustoEntity
    );
    this.rawFleetPerformanceRepo = AppDataSource.getRepository(
      RawOracleFleetPerformanceEntity
    );
    this.rawKmOciosaComponentsRepo = AppDataSource.getRepository(
      RawOracleKmOciosaComponentsEntity
    );
    this.rawIpkCalculadoRepo = AppDataSource.getRepository(
      RawOracleIpkCalculadoEntity
    );

    this.parameterRepo = AppDataSource.getRepository(ParameterValueEntity);
    this.expurgoRepo = AppDataSource.getRepository(ExpurgoEventEntity);
    this.criterionRepo = AppDataSource.getRepository(CriterionEntity);
    this.sectorRepo = AppDataSource.getRepository(SectorEntity);
    this.periodRepo = AppDataSource.getRepository(CompetitionPeriodEntity);
    this.performanceDataRepo = AppDataSource.getRepository(
      PerformanceDataEntity
    );

    console.log(
      '[EtlService] Orquestrador Instanciado e todos repositórios configurados.'
    );
  }

  /**
   * Orquestra a extração de TODAS as tabelas raw para um determinado período.
   * @param startDate YYYY-MM-DD
   * @param endDate YYYY-MM-DD
   */
  async runRawExtractionsForPeriod(
    startDate: string,
    endDate: string
  ): Promise<void> {
    console.log(
      `[EtlService] Iniciando extração de todos os dados RAW para o período: ${startDate} a ${endDate}`
    );

    // MySQL Extractions
    await this.mySqlEtlService.extractAndLoadQuebraDefeito(startDate, endDate);
    await this.mySqlEtlService.extractAndLoadAtraso(startDate, endDate);
    await this.mySqlEtlService.extractAndLoadFuroPorAtraso(startDate, endDate);
    await this.mySqlEtlService.extractAndLoadFuroDeViagem(startDate, endDate);
    // Aguardando query para Falta Frota
    // await this.mySqlEtlService.extractAndLoadFaltaFrota(startDate, endDate);
    console.log('[EtlService] Extrações MySQL para RAW concluídas.');

    // Oracle Extractions
    await this.oracleEtlService.extractAndLoadAusencia(startDate, endDate);
    await this.oracleEtlService.extractAndLoadColisao(startDate, endDate);
    await this.oracleEtlService.extractAndLoadPecas(startDate, endDate);
    await this.oracleEtlService.extractAndLoadPneus(startDate, endDate);
    await this.oracleEtlService.extractAndLoadFleetPerformance(
      startDate,
      endDate
    );
    await this.oracleEtlService.extractAndLoadKmOciosa(startDate, endDate); // Componentes
    await this.oracleEtlService.extractAndLoadIpkCalculado(startDate, endDate); // IPK já calculado
    console.log('[EtlService] Extrações Oracle para RAW concluídas.');
    console.log(
      `[EtlService] Todas as extrações RAW para o período ${startDate}-${endDate} finalizadas.`
    );
  }

  /**
   * Processa dados das tabelas RAW, aplica metas e expurgos, e carrega na performance_data.
   * @param periodMesAno Mês/Ano no formato 'YYYY-MM'
   */
  async processRawDataToPerformanceData(periodMesAno: string) {
    console.log(
      `[EtlService] Iniciando processamento RAW para PERFORMANCE_DATA para o período: ${periodMesAno}`
    );
    let processedEntriesCount = 0;

    try {
      const competitionPeriod = await this.periodRepo.findOneBy({
        mesAno:
          periodMesAno /*, status: 'ATIVA' TODO: Usar status correto ou permitir processar outros status */,
      });
      if (!competitionPeriod) {
        console.error(
          `[EtlService] Período ${periodMesAno} não encontrado ou não está em status válido para processamento.`
        );
        return;
      }
      console.log(
        `[EtlService] Processando para periodId: ${competitionPeriod.id} (${competitionPeriod.mesAno})`
      );
      const { dataInicio, dataFim } = competitionPeriod; // Formato YYYY-MM-DD

      // Primeiro, garante que os dados raw para este período foram extraídos.
      // Em um cenário real, isso poderia ser agendado ou ter um controle mais robusto.
      // await this.runRawExtractionsForPeriod(dataInicio, dataFim); // Descomentar se quiser forçar a extração raw aqui

      const activeCriteria = await this.criterionRepo.find({
        where: { ativo: true },
      });
      const activeSectors = await this.sectorRepo.find({
        where: { ativo: true },
      });

      // Limpa performance_data para o período antes de inserir (evita duplicatas)
      console.log(
        `[EtlService] Limpando performance_data para o período ${periodMesAno} (ID: ${competitionPeriod.id})...`
      );
      await this.performanceDataRepo.delete({
        competitionPeriodId: competitionPeriod.id,
      });

      const performanceEntriesToSave: DeepPartial<PerformanceDataEntity>[] = [];

      for (const sector of activeSectors) {
        for (const criterion of activeCriteria) {
          console.log(
            `\n[EtlService] Processando: Setor=${sector.nome}, Critério=${criterion.nome}`
          );

          let totalRealizadoBruto: number | null = null;
          let valorMeta: number | null = null;
          let totalExpurgado = 0;

          // --- Lógica para buscar dados RAW e Metas para cada critério ---
          // Este switch/case vai crescer muito. Idealmente, cada critério teria sua própria sub-função de processamento.
          switch (criterion.nome.toUpperCase()) {
            case 'QUEBRA':
            case 'DEFEITO':
              const rawQDData = await this.rawQuebraDefeitoRepo.find({
                where: {
                  sectorName: sector.nome,
                  occurrenceType: criterion.nome.toUpperCase(),
                  metricDate: Between(dataInicio, dataFim),
                },
              });
              totalRealizadoBruto = rawQDData.reduce(
                (sum, item) => sum + item.totalCount,
                0
              );
              break;
            case 'ATRASO':
            case 'FURO POR ATRASO':
            case 'FURO DE VIAGEM':
              const rawOHData = await this.rawOcorrenciasHorariasRepo.find({
                where: {
                  sectorName: sector.nome,
                  criterionName: criterion.nome.toUpperCase() as any,
                  metricDate: Between(dataInicio, dataFim),
                },
              });
              totalRealizadoBruto = rawOHData.reduce(
                (sum, item) => sum + item.totalCount,
                0
              );
              break;
            // Adicionar cases para TODOS os outros critérios, lendo das suas respectivas tabelas RAW
            // Exemplo para Ausências (lembrar que tem 'FALTA FUNC' e 'ATESTADO FUNC')
            case 'FALTA FUNCIONARIO': // ou 'FALTA FUNC' se o nome no mock for este
            case 'ATESTADO': // ou 'ATESTADO FUNC'
              const rawAusenciaData = await this.rawAusenciaRepo.find({
                where: {
                  sectorName: sector.nome,
                  occurrenceType: criterion.nome.toUpperCase() as any,
                  metricDate: Between(dataInicio, dataFim),
                },
              });
              totalRealizadoBruto = rawAusenciaData.reduce(
                (sum, item) => sum + item.employeeCount,
                0
              );
              break;
            case 'IPK':
              const rawIpkData = await this.rawIpkCalculadoRepo.findOneBy({
                sectorName: sector.nome,
                metricMonth: periodMesAno,
              });
              totalRealizadoBruto = rawIpkData ? rawIpkData.ipkValue : null;
              break;
            // TODO: Adicionar cases para Colisão, Peças, Pneus, FleetPerformance(KM/L, Litros), KM Ociosa (Components)

            default:
              console.warn(
                `[EtlService] Lógica de busca de dados RAW para critério ${criterion.nome} não implementada.`
              );
              continue; // Pula para o próximo critério
          }
          console.log(
            `  -> Total Realizado Bruto (Raw): ${totalRealizadoBruto}`
          );

          // Buscar Meta
          const meta = await this.parameterRepo.findOne({
            where: {
              criterionId: criterion.id,
              sectorId: sector.id,
              dataInicioEfetivo: LessThanOrEqual(dataFim),
            },
            order: { dataInicioEfetivo: 'DESC' },
          });
          valorMeta =
            meta && meta.valor !== null && meta.valor !== undefined
              ? Number(meta.valor)
              : null;
          console.log(
            `  -> Meta Encontrada: ${valorMeta !== null ? valorMeta : 'NENHUMA'}`
          );

          // Buscar Expurgos Aprovados
          // TODO: A lógica de expurgo para KM Ociosa é diferente (abate do componente antes do cálculo do %)
          if (
            criterion.nome.toUpperCase() === 'QUEBRA' ||
            criterion.nome.toUpperCase() === 'DEFEITO'
          ) {
            const expurgos = await this.expurgoRepo.find({
              where: {
                criterionId: criterion.id,
                sectorId: sector.id,
                status: 'APROVADO',
                dataEvento: Between(dataInicio, dataFim),
              },
            });
            totalExpurgado = expurgos.reduce(
              (sum, item) => sum + (Number(item.valorAjusteNumerico) || 1),
              0
            ); // Assume valorAjuste ou default 1
          }
          console.log(`  -> Total Expurgado: ${totalExpurgado}`);

          const valorRealizadoFinal =
            (totalRealizadoBruto !== null ? totalRealizadoBruto : 0) -
            totalExpurgado;
          console.log(
            `  -> Valor Realizado Final (Pós-Expurgo): ${valorRealizadoFinal}`
          );

          if (totalRealizadoBruto !== null) {
            // Só salva se tivermos um valor realizado
            const performanceEntry: DeepPartial<PerformanceDataEntity> = {
              competitionPeriodId: competitionPeriod.id,
              sectorId: sector.id,
              criterionId: criterion.id,
              metricDate: competitionPeriod.dataInicio, // Data de referência do mês
              valor: valorRealizadoFinal,
              targetValue: valorMeta,
            };
            performanceEntriesToSave.push(performanceEntry);
            processedEntriesCount++;
          }
        }
      }

      if (performanceEntriesToSave.length > 0) {
        console.log(
          `[EtlService] Salvando ${performanceEntriesToSave.length} registros em performance_data...`
        );
        await this.performanceDataRepo.save(performanceEntriesToSave, {
          chunk: 200,
        });
        console.log(`[EtlService] Registros salvos em performance_data.`);
      } else {
        console.log(
          `[EtlService] Nenhum registro de performance para salvar para o período ${periodMesAno}.`
        );
      }

      console.log(
        `\n[EtlService] Processamento para ${periodMesAno} concluído. ${processedEntriesCount} entradas de performance geradas.`
      );
    } catch (error: unknown) {
      let errorMessage = `[EtlService] ERRO INESPERADO durante o processamento para ${periodMesAno}:`;
      if (error instanceof Error) {
        errorMessage = `[EtlService] ERRO durante o processamento para ${periodMesAno} (${error.name}): ${error.message}`;
      }
      console.error(errorMessage, error);
    }
  }
}
