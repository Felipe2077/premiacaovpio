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

  constructor() {
    this.periodRepo = AppDataSource.getRepository(CompetitionPeriodEntity);
    this.auditRepo = AppDataSource.getRepository(AuditLogEntity);
    this.etlService = new EtlService();
    this.calculationService = new CalculationService();
    this.mySqlEtlService = new MySqlEtlService();
    this.oracleEtlService = new OracleEtlService();

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
        // Força thick mode mesmo sem ORACLE_HOME (como no script original)
        oracledb.initOracleClient();
        console.log(
          '[AutomationService] Oracle Thick Client inicializado (sem libDir).'
        );
      }
    } catch (error: any) {
      // Oracle Client pode já estar inicializado por outro processo
      if (error.message && error.message.includes('DPI-1047')) {
        console.log(
          '[AutomationService] Oracle Client já inicializado anteriormente.'
        );
      } else {
        console.warn(
          '[AutomationService] Aviso ao inicializar Oracle Client:',
          error.message
        );
        // Não falha o constructor por causa do Oracle - sistema deve funcionar sem Oracle
      }
    }
  }

  /**
   * MÉTODO PRINCIPAL: Executa atualização completa para vigência ativa
   */
  async runFullUpdateForActivePeriod(
    options: UpdateOptions = { triggeredBy: 'manual' }
  ): Promise<UpdateResult> {
    const startTime = Date.now();
    console.log(
      `[AutomationService] Iniciando atualização completa. Trigger: ${options.triggeredBy}`
    );

    try {
      // 1. Validar vigência ativa
      const vigenciaAtiva = await this.validateAndGetActivePeriod();
      console.log(
        `[AutomationService] Vigência ativa encontrada: ${vigenciaAtiva.mesAno} (ID: ${vigenciaAtiva.id})`
      );

      // 2. Registrar início da operação
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

      let totalRawRecords = 0;

      // 3. ETAPA 1: ETL Raw Data (equivale ao run-full-raw-etl)
      console.log(`[AutomationService] ETAPA 1/3: Executando ETL Raw Data...`);
      totalRawRecords = await this.runRawETLForPeriod(
        vigenciaAtiva.dataInicio,
        vigenciaAtiva.dataFim
      );

      // 4. ETAPA 2: Processar Performance Data (equivale ao etl-orchestrator)
      console.log(
        `[AutomationService] ETAPA 2/3: Processando Performance Data...`
      );
      await this.etlService.processAndLoadPerformanceDataForPeriod(
        vigenciaAtiva.mesAno
      );

      // 5. ETAPA 3: Calcular Rankings (equivale ao calculation-service)
      console.log(`[AutomationService] ETAPA 3/3: Calculando Rankings...`);
      await this.calculationService.calculateAndSavePeriodRanking(
        vigenciaAtiva.mesAno
      );

      const executionTime = Date.now() - startTime;

      // 6. Registrar sucesso
      await this.createAuditLog({
        actionType: 'ETL_CONCLUIDO',
        details: {
          periodId: vigenciaAtiva.id,
          periodMesAno: vigenciaAtiva.mesAno,
          executionTimeMs: executionTime,
          rawRecords: totalRawRecords,
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

      // Apenas ETAPA 2 e 3 (sem ETL Raw)
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
        details: { error: errorMessage, executionTimeMs: executionTime },
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
   * Busca a vigência ativa e valida se pode ser alterada
   */
  async validateAndGetActivePeriod(): Promise<CompetitionPeriodEntity> {
    const vigenciaAtiva = await this.periodRepo.findOne({
      where: { status: 'ATIVA' },
    });

    if (!vigenciaAtiva) {
      throw new Error(
        'Nenhuma vigência ATIVA encontrada. Não é possível executar atualização.'
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
    } catch (error) {
      console.error(
        '[AutomationService] Erro ao criar log de auditoria:',
        error
      );
      // Não deve quebrar o fluxo principal por erro de log
    }
  }
}
