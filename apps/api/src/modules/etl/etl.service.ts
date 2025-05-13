// apps/api/src/modules/etl/etl.service.ts (EXPANDIDO)
import { AppDataSource } from '@/database/data-source';
import 'reflect-metadata';
import { Between, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm'; // Adicionado MoreThanOrEqual
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
import { CompetitionPeriodEntity } from '@/entity/competition-period.entity';
import { CriterionEntity } from '@/entity/criterion.entity';
import { ExpurgoEventEntity } from '@/entity/expurgo-event.entity';
import { ParameterValueEntity } from '@/entity/parameter-value.entity';
import { PerformanceDataEntity } from '@/entity/performance-data.entity';
import { RawOracleKmOciosaComponentsEntity } from '@/entity/raw-data/raw-oracle-km-ociosa.entity';
import { SectorEntity } from '@/entity/sector.entity';
import { DeepPartial } from 'typeorm';

export class EtlService {
  private mySqlEtlService: MySqlEtlService;
  private oracleEtlService: OracleEtlService;

  // Repositórios RAW
  private rawQuebraDefeitoRepo: Repository<RawMySqlQuebraDefeitoEntity>;
  private rawOcorrenciasHorariasRepo: Repository<RawMySqlOcorrenciaHorariaEntity>;
  private rawAusenciaRepo: Repository<RawOracleAusenciaEntity>;
  private rawColisaoRepo: Repository<RawOracleColisaoEntity>;
  private rawEstoqueCustoRepo: Repository<RawOracleEstoqueCustoEntity>;
  private rawFleetPerformanceRepo: Repository<RawOracleFleetPerformanceEntity>;
  private rawKmOciosaComponentsRepo: Repository<RawOracleKmOciosaComponentsEntity>;
  private rawIpkCalculadoRepo: Repository<RawOracleIpkCalculadoEntity>;

  // Metadados
  private parameterRepo: Repository<ParameterValueEntity>;
  private expurgoRepo: Repository<ExpurgoEventEntity>;
  private criterionRepo: Repository<CriterionEntity>;
  private sectorRepo: Repository<SectorEntity>;
  private periodRepo: Repository<CompetitionPeriodEntity>;

  // Resultado
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

  async runRawExtractionsForPeriod(
    startDate: string,
    endDate: string
  ): Promise<void> {
    console.log(
      `[EtlService] Iniciando extração de todos os dados RAW para o período: ${startDate} a ${endDate}`
    );
    // MySQL
    await this.mySqlEtlService.extractAndLoadQuebraDefeito(startDate, endDate);
    await this.mySqlEtlService.extractAndLoadAtraso(startDate, endDate);
    await this.mySqlEtlService.extractAndLoadFuroPorAtraso(startDate, endDate);
    await this.mySqlEtlService.extractAndLoadFuroDeViagem(startDate, endDate);
    console.log('[EtlService] Extrações MySQL para RAW concluídas.');
    // Oracle
    await this.oracleEtlService.extractAndLoadAusencia(startDate, endDate);
    await this.oracleEtlService.extractAndLoadColisao(startDate, endDate);
    await this.oracleEtlService.extractAndLoadPecas(startDate, endDate);
    await this.oracleEtlService.extractAndLoadPneus(startDate, endDate);
    await this.oracleEtlService.extractAndLoadFleetPerformance(
      startDate,
      endDate
    );
    await this.oracleEtlService.extractAndLoadKmOciosa(startDate, endDate);
    await this.oracleEtlService.extractAndLoadIpkCalculado(startDate, endDate);
    console.log('[EtlService] Extrações Oracle para RAW concluídas.');
    console.log(
      `[EtlService] Todas as extrações RAW para o período ${startDate}-${endDate} finalizadas.`
    );
  }

  async processAndLoadPerformanceDataForPeriod(periodMesAno: string) {
    console.log(
      `[EtlService] Iniciando processamento RAW para PERFORMANCE_DATA para o período: ${periodMesAno}`
    );
    let processedEntriesCount = 0;
    const performanceEntriesToSave: DeepPartial<PerformanceDataEntity>[] = [];

    try {
      const competitionPeriod = await this.periodRepo.findOneBy({
        mesAno: periodMesAno,
      });
      if (!competitionPeriod) {
        console.error(`[EtlService] Período ${periodMesAno} não encontrado.`);
        return;
      }
      console.log(
        `[EtlService] Processando para periodId: ${competitionPeriod.id} (${competitionPeriod.mesAno})`
      );
      const { dataInicio, dataFim } = competitionPeriod;

      // PASSO 1:  Garantir que os dados RAW estão atualizados para este período
      // Descomente se quiser que este método também dispare a extração RAW.
      // Por agora, assumimos que o script run-full-raw-etl-april-2025.ts já rodou.
      // console.log(`[EtlService] Atualizando dados RAW para o período ${dataInicio} a ${dataFim}...`);
      // await this.runRawExtractionsForPeriod(dataInicio, dataFim);
      // console.log(`[EtlService] Dados RAW atualizados.`);

      const activeCriteria = await this.criterionRepo.find({
        where: { ativo: true },
        order: { id: 'ASC' },
      });
      const activeSectors = await this.sectorRepo.find({
        where: { ativo: true },
        order: { id: 'ASC' },
      });

      console.log(
        `[EtlService] Limpando performance_data para o período ${periodMesAno} (ID: ${competitionPeriod.id})...`
      );
      await this.performanceDataRepo.delete({
        competitionPeriodId: competitionPeriod.id,
      });

      for (const sector of activeSectors) {
        for (const criterion of activeCriteria) {
          console.log(
            `\n[EtlService] Processando: Setor=${sector.nome}, Critério=${criterion.nome}`
          );

          let totalRealizadoBruto: number | null = null;
          let valorMeta: number | null = null;
          let totalExpurgado = 0;
          const criterionNameUpper = criterion.nome.toUpperCase();

          // Lógica para buscar dados RAW e calcular o total bruto mensal
          switch (criterionNameUpper) {
            case 'QUEBRA':
            case 'DEFEITO':
              const rawQDData = await this.rawQuebraDefeitoRepo.find({
                where: {
                  sectorName: sector.nome,
                  occurrenceType: criterionNameUpper,
                  metricDate: Between(dataInicio, dataFim),
                },
              });
              totalRealizadoBruto = rawQDData.reduce(
                (sum, item) => sum + item.totalCount,
                0
              );
              break;
            // Lógica para buscar dados RAW de OCORRENCIAS HORÁRIAS
            case 'ATRASO':
            case 'FURO POR ATRASO':
            case 'FURO DE VIAGEM':
              const rawOHData = await this.rawOcorrenciasHorariasRepo.find({
                where: {
                  sectorName: sector.nome,
                  criterionName: criterionNameUpper as any,
                  metricDate: Between(dataInicio, dataFim),
                },
              });
              totalRealizadoBruto = rawOHData.reduce(
                (sum, item) => sum + item.totalCount,
                0
              );
              break;
            // Lógica para buscar dados RAW de FALTA FUNCIONÁRIO / ATESTADO
            // Estes dois vêm da mesma tabela raw e são diferenciados pelo occurrenceType
            case 'FALTA FUNC': // Use o nome EXATO do seu critério
            case 'ATESTADO FUNC': // Use o nome EXATO do seu critério (ex: ATESTADO ou ATESTADO FUNC)
              const rawAusenciaData = await this.rawAusenciaRepo.find({
                where: {
                  sectorName: sector.nome,
                  // O occurrenceType na raw_oracle_ausencias já deve ser 'FALTA FUNC' ou 'ATESTADO FUNC'
                  // Portanto, o criterionNameUpper deve bater EXATAMENTE com um desses.
                  occurrenceType: criterionNameUpper as
                    | 'FALTA FUNC'
                    | 'ATESTADO FUNC',
                  metricDate: Between(dataInicio, dataFim),
                },
              });
              totalRealizadoBruto = rawAusenciaData.reduce(
                (sum, item) => sum + (Number(item.employeeCount) || 0),
                0
              );
              // TODO: Definir se há expurgos para Falta Funcionario / Atestado
              // Por enquanto, totalExpurgado permanece 0 para eles.
              break;
            // Lógica para buscar dados RAW de COLISÃO
            case 'COLISÃO':
              const rawColisaoData = await this.rawColisaoRepo.find({
                where: {
                  sectorName: sector.nome,
                  metricDate: Between(dataInicio, dataFim),
                },
              });
              totalRealizadoBruto = rawColisaoData.reduce(
                (sum, item) => sum + item.totalCount,
                0
              );
              break;
            // Lógica para buscar dados RAW PEÇAS E PNEUS
            case 'PEÇAS':
            case 'PNEUS':
              const rawEstoqueData = await this.rawEstoqueCustoRepo.find({
                where: {
                  sectorName: sector.nome,
                  criterionName: criterionNameUpper as 'PEÇAS' | 'PNEUS',
                  metricDate: Between(dataInicio, dataFim),
                },
              });
              totalRealizadoBruto = rawEstoqueData.reduce((sum, item) => {
                const value = Number(item.totalValue); // Converte para número
                console.log(
                  `[ETL DEBUG] Peças/Pneus - Setor: ${sector.nome}, Data: ${item.metricDate}, totalValue (original): ${item.totalValue}, totalValue (Number): ${value}`
                );
                return sum + (isNaN(value) ? 0 : value); // Soma, tratando NaN como 0
              }, 0);
              break;
            case 'COMBUSTIVEL':
              const rawFleet_Comb =
                await this.rawFleetPerformanceRepo.findOneBy({
                  sectorName: sector.nome,
                  metricMonth: periodMesAno,
                });
              totalRealizadoBruto = rawFleet_Comb
                ? rawFleet_Comb.totalFuelLiters
                : null;
              break;
            case 'MEDIA KM/L':
              const rawFleet_KML = await this.rawFleetPerformanceRepo.findOneBy(
                { sectorName: sector.nome, metricMonth: periodMesAno }
              );
              totalRealizadoBruto = rawFleet_KML ? rawFleet_KML.avgKmL : null;
              break;
            case 'IPK':
              const rawIpkData = await this.rawIpkCalculadoRepo.findOneBy({
                sectorName: sector.nome,
                metricMonth: periodMesAno,
              });
              totalRealizadoBruto = rawIpkData ? rawIpkData.ipkValue : null;
              break;
            case 'KM OCIOSA':
              const rawKmOciosaComp =
                await this.rawKmOciosaComponentsRepo.findOneBy({
                  sectorName: sector.nome,
                  metricMonth: periodMesAno,
                });

              if (rawKmOciosaComp) {
                let kmHodometroAjustadoOriginal =
                  Number(rawKmOciosaComp.kmHodometroAjustado) || 0;
                const kmOperacionalOriginal =
                  Number(rawKmOciosaComp.kmOperacional) || 0;

                console.log(
                  `  -> Componentes KM Ociosa (Raw) - HOD2: ${kmHodometroAjustadoOriginal}, OPER: ${kmOperacionalOriginal}`
                );

                // Buscar Expurgos para KM OCIOSA
                const expurgosKmOciosa = await this.expurgoRepo.find({
                  where: {
                    criterionId: criterion.id, // ID do critério "KM OCIOSA"
                    sectorId: sector.id,
                    status: 'APROVADO',
                    dataEvento: Between(dataInicio, dataFim), // Expurgos do período
                  },
                });

                // Assume que valorAjusteNumerico no expurgo de KM Ociosa é o KM a ser subtraído
                const kmTotalExpurgado = expurgosKmOciosa.reduce(
                  (sum, exp) => sum + (Number(exp.valorAjusteNumerico) || 0),
                  0
                );
                console.log(
                  `  -> KM Total Expurgado para KM Ociosa: ${kmTotalExpurgado}`
                );

                // Aplica o expurgo ao componente (hodômetro ajustado, por exemplo)
                const kmHodometroAjustadoFinal =
                  kmHodometroAjustadoOriginal - kmTotalExpurgado;
                console.log(
                  `  -> KM Hodômetro Ajustado (Pós-Expurgo): ${kmHodometroAjustadoFinal}`
                );

                if (kmOperacionalOriginal > 0) {
                  totalRealizadoBruto =
                    ((kmHodometroAjustadoFinal - kmOperacionalOriginal) /
                      kmOperacionalOriginal) *
                    100;
                  totalRealizadoBruto = Number(totalRealizadoBruto.toFixed(4)); // Arredonda para 4 casas decimais
                } else {
                  // Se KM Operacional é 0, o que fazer?
                  // Se KM_HOD2 também for 0 (ou negativo após expurgo), % ociosa é 0.
                  // Se KM_HOD2 for positivo, % ociosa é "infinito" (ruim). Definir como um valor alto ou null?
                  // Por ora, se KM Operacional é 0, vamos definir % como 0 para evitar divisão por zero,
                  // mas isso pode precisar de revisão pela regra de negócio.
                  totalRealizadoBruto = kmHodometroAjustadoFinal > 0 ? null : 0; // Ou um valor alto como 9999 se for positivo
                  console.warn(
                    `  -> KM Operacional é 0 para ${sector.nome}, KM Ociosa % tratado como ${totalRealizadoBruto}.`
                  );
                }
              } else {
                console.log(
                  `  -> Componentes RAW para KM Ociosa não encontrados para ${sector.nome} no período ${periodMesAno}.`
                );
                totalRealizadoBruto = null;
              }
              break;
            // TODO: Case para FALTA FROTA quando a extração raw estiver pronta
            default:
              console.warn(
                `[EtlService] Lógica de busca de dados RAW para critério ${criterion.nome} não implementada ou nome não reconhecido.`
              );
              continue;
          }
          console.log(
            `  -> Total Realizado Bruto (Raw Agregado): ${totalRealizadoBruto}`
          );

          // Buscar Meta
          const meta = await this.parameterRepo.findOne({
            where: {
              criterionId: criterion.id,
              sectorId: sector.id,
              dataInicioEfetivo: LessThanOrEqual(dataFim),
              dataFimEfetivo: MoreThanOrEqual(dataInicio),
            },
            order: { dataInicioEfetivo: 'DESC' },
          });
          if (
            !meta &&
            criterionNameUpper !== 'KM OCIOSA' &&
            criterionNameUpper !== 'IPK' &&
            criterionNameUpper !== 'MEDIA KM/L'
          ) {
            // Alguns critérios podem não ter metas diretas
            console.warn(
              `  -> Meta NÃO Encontrada para ${criterion.nome} / ${sector.nome}. Pulando.`
            );
            // continue; // Ou define meta como 0/null e continua?
          }
          valorMeta =
            meta && meta.valor !== null && meta.valor !== undefined
              ? Number(meta.valor)
              : null;
          console.log(
            `  -> Meta Encontrada: ${valorMeta !== null ? valorMeta : 'NENHUMA'}`
          );

          // Buscar e Aplicar Expurgos
          // Aplicável apenas para Quebra, Defeito (KM Ociosa já foi tratada acima)
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
            ); // Default 1 se valorAjuste não definido
          } else {
            totalExpurgado = 0;
          }
          console.log(`  -> Total Expurgado: ${totalExpurgado}`);

          const valorRealizadoFinal =
            (totalRealizadoBruto !== null ? totalRealizadoBruto : 0) -
            totalExpurgado;
          console.log(
            `  -> Valor Realizado Final (Pós-Expurgo): ${valorRealizadoFinal}`
          );

          if (totalRealizadoBruto !== null) {
            const performanceEntry: DeepPartial<PerformanceDataEntity> = {
              competitionPeriodId: competitionPeriod.id,
              sectorId: sector.id,
              criterionId: criterion.id,
              metricDate: competitionPeriod.dataInicio,
              valor: valorRealizadoFinal,
              targetValue: valorMeta,
            };
            performanceEntriesToSave.push(performanceEntry);
          }
        }
      }

      if (performanceEntriesToSave.length > 0) {
        console.log(
          `[EtlService] Salvando ${performanceEntriesToSave.length} registros em performance_data...`
        );
        // Descomentar para salvar de verdade!
        await this.performanceDataRepo.save(performanceEntriesToSave, {
          chunk: 200,
        });
        console.log(`[EtlService] Registros salvos em performance_data.`);
        processedEntriesCount = performanceEntriesToSave.length;
      } else {
        console.log(
          `[EtlService] Nenhum registro de performance para salvar para o período ${periodMesAno}.`
        );
      }

      console.log(
        `\n[EtlService] Processamento para ${periodMesAno} concluído. ${processedEntriesCount} entradas de performance geradas.`
      );
    } catch (error: unknown) {
      let errorMessage = `[EtlService] ERRO INESPERADO durante processamento para ${periodMesAno}:`;
      if (error instanceof Error) {
        errorMessage = `[EtlService] ERRO para ${periodMesAno} (${error.name}): ${error.message}`;
      }
      console.error(errorMessage, error);
    }
  }
}
