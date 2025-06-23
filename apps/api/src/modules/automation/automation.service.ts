// apps/api/src/modules/automation/automation.service.ts
import { AppDataSource } from '@/database/data-source';
import { AuditLogEntity } from '@/entity/audit-log.entity';
import { CompetitionPeriodEntity } from '@/entity/competition-period.entity';
import oracledb from 'oracledb';
import { Repository } from 'typeorm';
import { CalculationService } from '../calculation/calculation.service';
import { EtlService } from '../etl/etl.service';
import { MySqlEtlService } from '../etl/mysql-etl.service';
import { OracleEtlService } from '../etl/oracle-etl.service';

// ========== IMPORTAR TODAS AS ENTIDADES RAW ==========
import { RawMySqlOcorrenciaHorariaEntity } from '@/entity/raw-data/raw-mysql-ocorrencia-horaria.entity';
import { RawMySqlQuebraDefeitoEntity } from '@/entity/raw-data/raw-mysql-quebra-defeito.entity';
import { RawOracleAusenciaEntity } from '@/entity/raw-data/raw-oracle-ausencia.entity';
import { RawOracleColisaoEntity } from '@/entity/raw-data/raw-oracle-colisao.entity';
import { RawOracleEstoqueCustoEntity } from '@/entity/raw-data/raw-oracle-estoque-custo.entity';
import { RawOracleFleetPerformanceEntity } from '@/entity/raw-data/raw-oracle-fleet-performance.entity';
import { RawOracleIpkCalculadoEntity } from '@/entity/raw-data/raw-oracle-ipk-calculado.entity';
import { RawOracleKmOciosaComponentsEntity } from '@/entity/raw-data/raw-oracle-km-ociosa.entity';

/**
 * Opções para customizar a execução da atualização
 */
export interface UpdateOptions {
  triggeredBy: 'manual' | 'automatic' | 'expurgo' | 'meta-change';
  userId?: number;
  skipValidation?: boolean;
  partialUpdate?: boolean;
}

/**
 * Status de uma execução de atualização
 */
export interface UpdateStatus {
  isRunning: boolean;
  currentStep?: string;
  progress?: number; // 0-100
  startedAt?: Date;
  estimatedTimeRemaining?: number; // segundos
  error?: string;
}

/**
 * Resultado de uma execução completa
 */
export interface UpdateResult {
  success: boolean;
  periodId: number;
  periodMesAno: string;
  executionTimeMs: number;
  recordsProcessed: {
    rawRecords: number;
    performanceRecords: number;
    rankingRecords: number;
  };
  error?: string;
  triggeredBy: string;
  userId?: number;
}

/**
 * Serviço central para automação do processo ETL
 * Orquestra os 3 scripts manuais de forma integrada e segura
 */
export class AutomationService {
  private periodRepo: Repository<CompetitionPeriodEntity>;
  private auditRepo: Repository<AuditLogEntity>;
  private etlService: EtlService;
  private calculationService: CalculationService;
  private mySqlEtlService: MySqlEtlService;
  private oracleEtlService: OracleEtlService;

  // ========== REPOSITÓRIOS RAW PARA LIMPEZA ==========
  private rawQuebraDefeitoRepo: Repository<RawMySqlQuebraDefeitoEntity>;
  private rawOcorrenciasHorariasRepo: Repository<RawMySqlOcorrenciaHorariaEntity>;
  private rawAusenciaRepo: Repository<RawOracleAusenciaEntity>;
  private rawColisaoRepo: Repository<RawOracleColisaoEntity>;
  private rawEstoqueCustoRepo: Repository<RawOracleEstoqueCustoEntity>;
  private rawFleetPerformanceRepo: Repository<RawOracleFleetPerformanceEntity>;
  private rawKmOciosaComponentsRepo: Repository<RawOracleKmOciosaComponentsEntity>;
  private rawIpkCalculadoRepo: Repository<RawOracleIpkCalculadoEntity>;

  constructor() {
    this.periodRepo = AppDataSource.getRepository(CompetitionPeriodEntity);
    this.auditRepo = AppDataSource.getRepository(AuditLogEntity);
    this.etlService = new EtlService();
    this.calculationService = new CalculationService();
    this.mySqlEtlService = new MySqlEtlService();
    this.oracleEtlService = new OracleEtlService();

    // ========== INICIALIZAR REPOSITÓRIOS RAW ==========
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

    // 🔧 INICIALIZAÇÃO ORACLE THICK CLIENT (CORREÇÃO)
    this.initializeOracleClient();

    console.log('[AutomationService] Instanciado e repositórios configurados.');
  }

  /**
   * Inicializa Oracle Client em Thick Mode
   * Copia a mesma lógica do script original que funciona
   */
  private initializeOracleClient(): void {
    try {
      // Mesma lógica do run-full-raw-etl-april-2025.ts
      if (
        process.env.ORACLE_HOME &&
        (process.platform === 'darwin' || process.platform === 'linux')
      ) {
        oracledb.initOracleClient({ libDir: process.env.ORACLE_HOME });
        console.log(
          '[AutomationService] Oracle Thick Client inicializado com libDir.'
        );
      } else {
        oracledb.initOracleClient();
        console.log('[AutomationService] Oracle Thick Client inicializado.');
      }
    } catch (error) {
      console.warn(
        '[AutomationService] Oracle Client já inicializado ou erro:',
        error
      );
    }
  }

  /**
   * ========== NOVO: LIMPEZA POR VIGÊNCIA ==========
   * Remove todos os dados RAW da vigência ativa antes de recarregar
   */
  private async clearRawDataForPeriod(
    startDate: string,
    endDate: string,
    mesAno: string
  ): Promise<number> {
    console.log(
      `[AutomationService] 🧹 LIMPANDO dados RAW para vigência ${mesAno} (${startDate} a ${endDate})`
    );

    let totalDeleted = 0;

    try {
      // ========== LIMPEZA DADOS DIÁRIOS (MySQL) ==========
      console.log(
        '[AutomationService] Limpando tabelas MySQL (dados diários)...'
      );

      // raw_mysql_quebras_defeitos
      const deletedQuebraDefeito = await this.rawQuebraDefeitoRepo
        .createQueryBuilder()
        .delete()
        .where('metricDate >= :startDate AND metricDate <= :endDate', {
          startDate,
          endDate,
        })
        .execute();
      console.log(
        `  ✅ raw_mysql_quebras_defeitos: ${deletedQuebraDefeito.affected} registros removidos`
      );
      totalDeleted += deletedQuebraDefeito.affected || 0;

      // raw_mysql_ocorrencias_horarias
      const deletedOcorrencias = await this.rawOcorrenciasHorariasRepo
        .createQueryBuilder()
        .delete()
        .where('metricDate >= :startDate AND metricDate <= :endDate', {
          startDate,
          endDate,
        })
        .execute();
      console.log(
        `  ✅ raw_mysql_ocorrencias_horarias: ${deletedOcorrencias.affected} registros removidos`
      );
      totalDeleted += deletedOcorrencias.affected || 0;

      // ========== LIMPEZA DADOS DIÁRIOS (Oracle) ==========
      console.log(
        '[AutomationService] Limpando tabelas Oracle (dados diários)...'
      );

      // raw_oracle_ausencias
      const deletedAusencia = await this.rawAusenciaRepo
        .createQueryBuilder()
        .delete()
        .where('metricDate >= :startDate AND metricDate <= :endDate', {
          startDate,
          endDate,
        })
        .execute();
      console.log(
        `  ✅ raw_oracle_ausencias: ${deletedAusencia.affected} registros removidos`
      );
      totalDeleted += deletedAusencia.affected || 0;

      // raw_oracle_colisoes
      const deletedColisao = await this.rawColisaoRepo
        .createQueryBuilder()
        .delete()
        .where('metricDate >= :startDate AND metricDate <= :endDate', {
          startDate,
          endDate,
        })
        .execute();
      console.log(
        `  ✅ raw_oracle_colisoes: ${deletedColisao.affected} registros removidos`
      );
      totalDeleted += deletedColisao.affected || 0;

      // raw_oracle_estoque_custo
      const deletedEstoqueCusto = await this.rawEstoqueCustoRepo
        .createQueryBuilder()
        .delete()
        .where('metricDate >= :startDate AND metricDate <= :endDate', {
          startDate,
          endDate,
        })
        .execute();
      console.log(
        `  ✅ raw_oracle_estoque_custo: ${deletedEstoqueCusto.affected} registros removidos`
      );
      totalDeleted += deletedEstoqueCusto.affected || 0;

      // ========== LIMPEZA DADOS MENSAIS (Oracle) ==========
      console.log(
        '[AutomationService] Limpando tabelas Oracle (dados mensais)...'
      );

      // raw_oracle_fleet_performance
      const deletedFleetPerf = await this.rawFleetPerformanceRepo
        .createQueryBuilder()
        .delete()
        .where('metricMonth = :mesAno', { mesAno })
        .execute();
      console.log(
        `  ✅ raw_oracle_fleet_performance: ${deletedFleetPerf.affected} registros removidos`
      );
      totalDeleted += deletedFleetPerf.affected || 0;

      // raw_oracle_km_ociosa_components
      const deletedKmOciosa = await this.rawKmOciosaComponentsRepo
        .createQueryBuilder()
        .delete()
        .where('metricMonth = :mesAno', { mesAno })
        .execute();
      console.log(
        `  ✅ raw_oracle_km_ociosa_components: ${deletedKmOciosa.affected} registros removidos`
      );
      totalDeleted += deletedKmOciosa.affected || 0;

      // raw_oracle_ipk_calculado
      const deletedIpkCalculado = await this.rawIpkCalculadoRepo
        .createQueryBuilder()
        .delete()
        .where('metricMonth = :mesAno', { mesAno })
        .execute();
      console.log(
        `  ✅ raw_oracle_ipk_calculado: ${deletedIpkCalculado.affected} registros removidos`
      );
      totalDeleted += deletedIpkCalculado.affected || 0;

      console.log(
        `[AutomationService] 🧹 ✅ Limpeza concluída. Total: ${totalDeleted} registros removidos da vigência ${mesAno}`
      );
      return totalDeleted;
    } catch (error) {
      console.error(
        '[AutomationService] ❌ Erro durante limpeza dos dados RAW:',
        error
      );
      throw new Error(
        `Falha na limpeza de dados RAW: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }

  /**
   * Atualização completa para vigência ativa (equivale aos 3 scripts)
   */
  async runFullUpdateForActivePeriod(
    options: UpdateOptions = { triggeredBy: 'manual' }
  ): Promise<UpdateResult> {
    console.log(
      `[AutomationService] Iniciando atualização completa. Trigger: ${options.triggeredBy}`
    );
    const startTime = Date.now();
    let totalRawRecords = 0;

    try {
      // 1. Validar vigência ativa e obter dados
      const vigenciaAtiva = await this.validateAndGetActivePeriod();

      // 2. Registrar início
      await this.createAuditLog({
        actionType: 'ETL_INICIADO',
        details: {
          periodId: vigenciaAtiva.id,
          periodMesAno: vigenciaAtiva.mesAno,
          triggeredBy: options.triggeredBy,
        },
        userId: options.userId,
        competitionPeriodId: vigenciaAtiva.id,
      });

      // 3. ========== NOVA ETAPA 0: LIMPEZA ==========
      console.log(
        `[AutomationService] ETAPA 0/3: Limpando dados RAW da vigência...`
      );
      const deletedRecords = await this.clearRawDataForPeriod(
        vigenciaAtiva.dataInicio,
        vigenciaAtiva.dataFim,
        vigenciaAtiva.mesAno
      );

      // 4. ETAPA 1: ETL Raw Data (equivale ao run-full-raw-etl)
      console.log(`[AutomationService] ETAPA 1/3: Executando ETL Raw Data...`);
      totalRawRecords = await this.runRawETLForPeriod(
        vigenciaAtiva.dataInicio,
        vigenciaAtiva.dataFim
      );

      // 5. ETAPA 2: Processar Performance Data (equivale ao etl-orchestrator)
      console.log(
        `[AutomationService] ETAPA 2/3: Processando Performance Data...`
      );
      await this.etlService.processAndLoadPerformanceDataForPeriod(
        vigenciaAtiva.mesAno
      );

      // 6. ETAPA 3: Calcular Rankings (equivale ao calculation-service)
      console.log(`[AutomationService] ETAPA 3/3: Calculando Rankings...`);
      await this.calculationService.calculateAndSavePeriodRanking(
        vigenciaAtiva.mesAno
      );

      const executionTime = Date.now() - startTime;

      // 7. Registrar sucesso
      await this.createAuditLog({
        actionType: 'ETL_CONCLUIDO',
        details: {
          periodId: vigenciaAtiva.id,
          periodMesAno: vigenciaAtiva.mesAno,
          executionTimeMs: executionTime,
          rawRecords: totalRawRecords,
          deletedRecords, // ✅ NOVO: Registra quantos foram limpos
        },
        userId: options.userId,
        competitionPeriodId: vigenciaAtiva.id,
      });

      const result: UpdateResult = {
        success: true,
        periodId: vigenciaAtiva.id,
        periodMesAno: vigenciaAtiva.mesAno,
        executionTimeMs: executionTime,
        recordsProcessed: {
          rawRecords: totalRawRecords,
          performanceRecords: 0, // TODO: Capturar do EtlService
          rankingRecords: 0, // TODO: Capturar do CalculationService
        },
        triggeredBy: options.triggeredBy,
        userId: options.userId,
      };

      console.log(
        `[AutomationService] ✅ Atualização concluída com sucesso em ${executionTime}ms`
      );
      console.log(
        `[AutomationService] 📊 Resumo: ${deletedRecords} removidos, ${totalRawRecords} inseridos`
      );
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';

      console.error(`[AutomationService] ❌ Erro durante atualização:`, error);

      // Registrar erro
      await this.createAuditLog({
        actionType: 'ETL_ERRO',
        details: {
          error: errorMessage,
          executionTimeMs: executionTime,
          triggeredBy: options.triggeredBy,
        },
        userId: options.userId,
      });

      return {
        success: false,
        periodId: 0,
        periodMesAno: '',
        executionTimeMs: executionTime,
        recordsProcessed: {
          rawRecords: 0,
          performanceRecords: 0,
          rankingRecords: 0,
        },
        error: errorMessage,
        triggeredBy: options.triggeredBy,
        userId: options.userId,
      };
    }
  }

  /**
   * Validação obrigatória: garante que existe vigência ativa e protege dados
   * PÚBLICO: Usado tanto internamente quanto pelo Controller
   */
  async validateAndGetActivePeriod(): Promise<CompetitionPeriodEntity> {
    const vigenciaAtiva = await this.periodRepo.findOne({
      where: { status: 'ATIVA' },
    });

    if (!vigenciaAtiva) {
      throw new Error(
        'Nenhuma vigência ATIVA encontrada. ' +
          'Não é possível executar atualização.'
      );
    }

    // Proteção adicional: garantir que não é FECHADA
    if (vigenciaAtiva.status === 'FECHADA') {
      throw new Error(
        `Vigência ${vigenciaAtiva.mesAno} está FECHADA. Dados são imutáveis.`
      );
    }

    return vigenciaAtiva;
  }

  /**
   * Busca informações da vigência ativa (para API)
   */
  async getActivePeriodInfo(): Promise<CompetitionPeriodEntity | null> {
    return await this.periodRepo.findOne({
      where: { status: 'ATIVA' },
    });
  }

  /**
   * ETAPA 1: ETL Raw Data - Encapsula o script run-full-raw-etl
   * Limpa e recarrega todos os dados RAW para o período especificado
   */
  private async runRawETLForPeriod(
    startDate: string,
    endDate: string
  ): Promise<number> {
    console.log(
      `[AutomationService] Executando ETL Raw para período: ${startDate} a ${endDate}`
    );
    let totalRecords = 0;

    try {
      // --- MySQL Extractions ---
      console.log('[AutomationService] Processando fontes MySQL...');
      totalRecords += await this.mySqlEtlService.extractAndLoadQuebraDefeito(
        startDate,
        endDate
      );
      totalRecords += await this.mySqlEtlService.extractAndLoadAtraso(
        startDate,
        endDate
      );
      totalRecords += await this.mySqlEtlService.extractAndLoadFuroPorAtraso(
        startDate,
        endDate
      );
      totalRecords += await this.mySqlEtlService.extractAndLoadFuroDeViagem(
        startDate,
        endDate
      );

      // --- Oracle Extractions ---
      console.log('[AutomationService] Processando fontes Oracle...');
      totalRecords += await this.oracleEtlService.extractAndLoadAusencia(
        startDate,
        endDate
      );
      totalRecords += await this.oracleEtlService.extractAndLoadColisao(
        startDate,
        endDate
      );
      totalRecords += await this.oracleEtlService.extractAndLoadPecas(
        startDate,
        endDate
      );
      totalRecords += await this.oracleEtlService.extractAndLoadPneus(
        startDate,
        endDate
      );
      totalRecords +=
        await this.oracleEtlService.extractAndLoadFleetPerformance(
          startDate,
          endDate
        );
      totalRecords += await this.oracleEtlService.extractAndLoadKmOciosa(
        startDate,
        endDate
      );
      totalRecords += await this.oracleEtlService.extractAndLoadIpkCalculado(
        startDate,
        endDate
      );

      console.log(
        `[AutomationService] ETL Raw concluído. Total: ${totalRecords} grupos de registros processados.`
      );
      return totalRecords;
    } catch (error) {
      console.error('[AutomationService] Erro durante ETL Raw:', error);
      throw new Error(
        `Falha no ETL Raw: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }

  /**
   * Atualização parcial apenas para recálculo (pós-expurgo)
   */
  async runPartialRecalculation(
    options: UpdateOptions = { triggeredBy: 'expurgo' }
  ): Promise<UpdateResult> {
    console.log(
      `[AutomationService] Iniciando recálculo parcial. Trigger: ${options.triggeredBy}`
    );
    const startTime = Date.now();

    try {
      const vigenciaAtiva = await this.validateAndGetActivePeriod();

      await this.createAuditLog({
        actionType: 'RECALCULO_INICIADO',
        details: {
          periodId: vigenciaAtiva.id,
          triggeredBy: options.triggeredBy,
        },
        userId: options.userId,
        competitionPeriodId: vigenciaAtiva.id,
      });

      // Apenas ETAPA 2 e 3 (sem ETL Raw nem limpeza)
      console.log(`[AutomationService] Reprocessando Performance Data...`);
      await this.etlService.processAndLoadPerformanceDataForPeriod(
        vigenciaAtiva.mesAno
      );

      console.log(`[AutomationService] Recalculando Rankings...`);
      await this.calculationService.calculateAndSavePeriodRanking(
        vigenciaAtiva.mesAno
      );

      const executionTime = Date.now() - startTime;

      await this.createAuditLog({
        actionType: 'RECALCULO_CONCLUIDO',
        details: { periodId: vigenciaAtiva.id, executionTimeMs: executionTime },
        userId: options.userId,
        competitionPeriodId: vigenciaAtiva.id,
      });

      console.log(
        `[AutomationService] ✅ Recálculo concluído em ${executionTime}ms`
      );

      return {
        success: true,
        periodId: vigenciaAtiva.id,
        periodMesAno: vigenciaAtiva.mesAno,
        executionTimeMs: executionTime,
        recordsProcessed: {
          rawRecords: 0,
          performanceRecords: 0,
          rankingRecords: 0,
        },
        triggeredBy: options.triggeredBy,
        userId: options.userId,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';

      console.error(`[AutomationService] ❌ Erro durante recálculo:`, error);

      await this.createAuditLog({
        actionType: 'RECALCULO_ERRO',
        details: {
          error: errorMessage,
          executionTimeMs: executionTime,
          triggeredBy: options.triggeredBy,
        },
        userId: options.userId,
      });

      return {
        success: false,
        periodId: 0,
        periodMesAno: '',
        executionTimeMs: executionTime,
        recordsProcessed: {
          rawRecords: 0,
          performanceRecords: 0,
          rankingRecords: 0,
        },
        error: errorMessage,
        triggeredBy: options.triggeredBy,
        userId: options.userId,
      };
    }
  }

  /**
   * Helper para criar logs de auditoria
   */
  private async createAuditLog(data: {
    actionType: string;
    details?: Record<string, any>;
    userId?: number;
    competitionPeriodId?: number;
  }): Promise<void> {
    try {
      const auditLog = this.auditRepo.create({
        actionType: data.actionType,
        details: data.details,
        userId: data.userId,
        competitionPeriodId: data.competitionPeriodId,
        entityType: 'AutomationService',
        userName: data.userId ? `User_${data.userId}` : 'Sistema',
      });

      await this.auditRepo.save(auditLog);
      console.log(
        `[AutomationService] Log de auditoria criado: ${data.actionType}`
      );
    } catch (error) {
      console.error(
        '[AutomationService] Erro ao criar log de auditoria:',
        error
      );
      // Não propagar erro de auditoria para não quebrar o fluxo principal
    }
  }
}
