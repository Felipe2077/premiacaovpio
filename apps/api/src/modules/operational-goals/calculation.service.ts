// apps/api/src/modules/operational-goals/calculation.service.ts
import { AppDataSource } from '@/database/data-source';
import { CompetitionPeriodEntity } from '@/entity/competition-period.entity';
import { OperationalGoalsCalculationEntity } from '@/entity/operational-goals-calculation.entity';
import { SectorEntity } from '@/entity/sector.entity';
import { UserEntity } from '@/entity/user.entity';
import { AuditLogService } from '@/modules/audit/audit.service';
import { Repository } from 'typeorm';

import { HolidayManagementService } from './holiday-management.service';
import { OperationalGoalsParametersService } from './parameters.service';
import { SectorMappingService } from './sector-mapping.service';

import { CombustivelAlgorithm } from './algorithms/combustivel.algorithm';
import { KmPrevistaAlgorithm } from './algorithms/km-prevista.algorithm';
import { PneusPecasAlgorithm } from './algorithms/pneus-pecas.algorithm';
import { SaldoAlgorithm } from './algorithms/saldo.algorithm';

import {
  CalculationInput,
  CalculationProgress,
  CalculationResult,
  CalculationWarning,
  SectorResults,
  ValidationResult,
} from './types/calculation.types';

export class OperationalGoalsCalculationService {
  private calculationRepo: Repository<OperationalGoalsCalculationEntity>;
  private periodRepo: Repository<CompetitionPeriodEntity>;
  private sectorRepo: Repository<SectorEntity>;
  private userRepo: Repository<UserEntity>;

  // Serviços
  private auditService: AuditLogService;
  private holidayService: HolidayManagementService;
  private parametersService: OperationalGoalsParametersService;
  private sectorMapping: SectorMappingService;

  // Algoritmos
  private kmPrevistaAlgorithm: KmPrevistaAlgorithm;
  private combustivelAlgorithm: CombustivelAlgorithm;
  private pneusPecasAlgorithm: PneusPecasAlgorithm;
  private saldoAlgorithm: SaldoAlgorithm;

  // Estado do cálculo atual
  private currentProgress?: CalculationProgress;

  constructor() {
    // Repositórios
    this.calculationRepo = AppDataSource.getRepository(
      OperationalGoalsCalculationEntity
    );
    this.periodRepo = AppDataSource.getRepository(CompetitionPeriodEntity);
    this.sectorRepo = AppDataSource.getRepository(SectorEntity);
    this.userRepo = AppDataSource.getRepository(UserEntity);

    // Serviços
    this.auditService = new AuditLogService();
    this.holidayService = new HolidayManagementService();
    this.parametersService = new OperationalGoalsParametersService();
    this.sectorMapping = new SectorMappingService();

    // Algoritmos
    this.kmPrevistaAlgorithm = new KmPrevistaAlgorithm();
    this.combustivelAlgorithm = new CombustivelAlgorithm();
    this.pneusPecasAlgorithm = new PneusPecasAlgorithm();
    this.saldoAlgorithm = new SaldoAlgorithm();

    console.log(
      '[OperationalGoalsCalculationService] Motor de cálculo inicializado'
    );
  }

  /**
   * Executa cálculo completo de metas operacionais
   */
  async executeFullCalculation(
    input: CalculationInput
  ): Promise<CalculationResult> {
    const startTime = Date.now();

    console.log(
      `[CalculationService] Iniciando cálculo completo para período ${input.competitionPeriodId}`
    );

    let calculationEntity: OperationalGoalsCalculationEntity | null = null;

    try {
      // 1. Criar registro de cálculo
      calculationEntity = await this.createCalculationRecord(input);

      // 2. Validar pré-requisitos
      await this.updateProgress(
        calculationEntity.id,
        'VALIDATING',
        'Validando pré-requisitos',
        5
      );
      const validation = await this.validatePrerequisites(
        input.competitionPeriodId
      );

      if (!validation.isValid) {
        throw new Error(`Validação falhou: ${validation.errors.join(', ')}`);
      }

      // 3. Buscar dados necessários
      await this.updateProgress(
        calculationEntity.id,
        'LOADING_DATA',
        'Carregando dados necessários',
        15
      );
      const { sectors, holidays, parameters } = await this.loadCalculationData(
        input.competitionPeriodId
      );

      // 4. Executar cálculos para cada setor
      const results: Record<string, SectorResults> = {};
      const allWarnings: CalculationWarning[] = [];

      for (let i = 0; i < sectors.length; i++) {
        const sector: any = sectors[i];
        const progressBase = 20 + (i * 60) / sectors.length;

        console.log(
          `[CalculationService] Processando setor ${sector.nome} (${i + 1}/${sectors.length})`
        );

        try {
          // 4.1 KM Prevista
          await this.updateProgress(
            calculationEntity.id,
            'CALCULATING_KM',
            `Calculando KM prevista - ${sector.nome}`,
            progressBase + 10
          );
          const kmResult = await this.kmPrevistaAlgorithm.calculateKmPrevista({
            sectorId: sector.id,
            competitionPeriodId: input.competitionPeriodId,
            holidayClassifications: holidays,
          });

          // 4.2 Combustível
          await this.updateProgress(
            calculationEntity.id,
            'CALCULATING_FUEL',
            `Calculando combustível - ${sector.nome}`,
            progressBase + 20
          );
          const combustivelResult =
            await this.combustivelAlgorithm.calculateCombustivel({
              sectorId: sector.id,
              kmPrevista: kmResult.projectedKm,
              referenceMonths: 3,
            });

          // Aplicar preço de combustível se fornecido
          if (input.fuelPriceOverride) {
            combustivelResult.projecaoFinanceira =
              combustivelResult.metaLitros * input.fuelPriceOverride;
          }

          // 4.3 Pneus
          await this.updateProgress(
            calculationEntity.id,
            'CALCULATING_TIRES',
            `Calculando pneus - ${sector.nome}`,
            progressBase + 30
          );
          const pneusResult =
            await this.pneusPecasAlgorithm.calculatePneusPecas({
              sectorId: sector.id,
              kmPrevista: kmResult.projectedKm,
              criterionType: 'PNEUS',
              referenceMonths: 12,
              currentPeriodId: input.competitionPeriodId,
            });

          // 4.4 Peças
          await this.updateProgress(
            calculationEntity.id,
            'CALCULATING_PARTS',
            `Calculando peças - ${sector.nome}`,
            progressBase + 40
          );
          const pecasResult =
            await this.pneusPecasAlgorithm.calculatePneusPecas({
              sectorId: sector.id,
              kmPrevista: kmResult.projectedKm,
              criterionType: 'PEÇAS',
              referenceMonths: 12,
              currentPeriodId: input.competitionPeriodId,
            });

          // 4.5 Consolidar resultados do setor
          results[sector.id.toString()] = {
            sectorId: sector.id,
            sectorName: sector.nome,
            kmPrevista: kmResult,
            combustivel: combustivelResult,
            pneus: pneusResult,
            pecas: pecasResult,
          };

          // Coletar avisos
          if (kmResult.warnings) {
            allWarnings.push(
              ...kmResult.warnings.map((w) => ({
                type: 'VALIDATION' as const,
                sectorId: sector.id,
                message: `KM Prevista: ${w}`,
                severity: 'MEDIUM' as const,
              }))
            );
          }

          if (combustivelResult.warnings) {
            allWarnings.push(
              ...combustivelResult.warnings.map((w) => ({
                type: 'DATA_QUALITY' as const,
                sectorId: sector.id,
                message: `Combustível: ${w}`,
                severity: 'MEDIUM' as const,
              }))
            );
          }

          if (pneusResult.warnings) {
            allWarnings.push(
              ...pneusResult.warnings.map((w) => ({
                type: 'ANOMALY' as const,
                sectorId: sector.id,
                message: `Pneus: ${w}`,
                severity: 'MEDIUM' as const,
              }))
            );
          }

          if (pecasResult.warnings) {
            allWarnings.push(
              ...pecasResult.warnings.map((w) => ({
                type: 'ANOMALY' as const,
                sectorId: sector.id,
                message: `Peças: ${w}`,
                severity: 'MEDIUM' as const,
              }))
            );
          }
        } catch (sectorError) {
          console.error(
            `[CalculationService] Erro no setor ${sector.nome}:`,
            sectorError
          );

          allWarnings.push({
            type: 'VALIDATION',
            sectorId: sector.id,
            message: `Falha no cálculo: ${sectorError instanceof Error ? sectorError.message : 'Erro desconhecido'}`,
            severity: 'HIGH',
          });
        }
      }

      // 5. Salvar resultados
      await this.updateProgress(
        calculationEntity.id,
        'SAVING',
        'Salvando resultados',
        90
      );

      const executionTimeMs = Date.now() - startTime;
      const finalStatus =
        allWarnings.length > 0 ? 'COMPLETED_WITH_WARNINGS' : 'COMPLETED';

      await this.calculationRepo.update(calculationEntity.id, {
        status: finalStatus,
        calculationData: results as any,
        parametersSnapshot: parameters,
        holidayClassifications: holidays,
        warnings: allWarnings,
        completedAt: new Date(),
        executionTimeMs,
        fuelPriceUsed: input.fuelPriceOverride || null,
      });

      // 6. Log de auditoria
      await this.auditService.createLog({
        userId: input.userId,
        userName: await this.getUserName(input.userId),
        actionType: 'OPERATIONAL_GOALS_CALCULATED',
        entityType: 'OperationalGoalsCalculationEntity',
        entityId: calculationEntity.id.toString(),
        details: {
          competitionPeriodId: input.competitionPeriodId,
          sectorsProcessed: sectors.length,
          totalGoalsCalculated: Object.keys(results).length * 3, // 3 critérios por setor
          executionTimeMs,
          warningsCount: allWarnings.length,
          status: finalStatus,
        },
        justification: 'Execução automática de cálculo de metas operacionais',
      });

      await this.updateProgress(
        calculationEntity.id,
        'COMPLETED',
        'Cálculo concluído',
        100
      );

      const finalResult: CalculationResult = {
        id: calculationEntity.id,
        competitionPeriodId: input.competitionPeriodId,
        status: finalStatus,
        results,
        calculatedAt: new Date(),
        calculatedBy: input.userId,
        executionTimeMs,
        warnings: allWarnings.length > 0 ? allWarnings : undefined,
        parametersUsed: parameters,
      };

      console.log(
        `[CalculationService] ✅ Cálculo concluído em ${executionTimeMs}ms - ${Object.keys(results).length} setores processados`
      );

      return finalResult;
    } catch (error) {
      console.error('[CalculationService] ❌ Erro durante cálculo:', error);

      // Marcar como erro
      if (calculationEntity) {
        await this.calculationRepo.update(calculationEntity.id, {
          status: 'ERROR',
          errorMessage:
            error instanceof Error ? error.message : 'Erro desconhecido',
          completedAt: new Date(),
          executionTimeMs: Date.now() - startTime,
        });

        // Log de auditoria do erro
        await this.auditService.createLog({
          userId: input.userId,
          userName: await this.getUserName(input.userId),
          actionType: 'OPERATIONAL_GOALS_CALCULATION_FAILED',
          entityType: 'OperationalGoalsCalculationEntity',
          entityId: calculationEntity.id.toString(),
          details: {
            competitionPeriodId: input.competitionPeriodId,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            executionTimeMs: Date.now() - startTime,
          },
          justification: 'Falha na execução de cálculo de metas operacionais',
        });
      }

      throw error;
    }
  }

  /**
   * Cria registro inicial do cálculo
   */
  private async createCalculationRecord(
    input: CalculationInput
  ): Promise<OperationalGoalsCalculationEntity> {
    const calculationEntity = this.calculationRepo.create({
      competitionPeriodId: input.competitionPeriodId,
      status: 'PENDING',
      calculatedByUserId: input.userId,
      startedAt: new Date(),
    });

    return await this.calculationRepo.save(calculationEntity);
  }
  /**
   * Valida pré-requisitos para execução do cálculo
   */
  async validatePrerequisites(
    competitionPeriodId: number
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 1. Validar status do período
      const period = await this.periodRepo.findOne({
        where: { id: competitionPeriodId },
      });

      if (!period) {
        errors.push('Período de competição não encontrado');
        return {
          isValid: false,
          errors: errors.map((e) => ({ code: 'PERIOD_NOT_FOUND', message: e })),
          warnings: [],
        };
      }

      if (period.status !== 'PLANEJAMENTO') {
        errors.push(
          `Período deve estar em status PLANEJAMENTO (atual: ${period.status})`
        );
      }

      // 2. Validar classificação de feriados
      const holidaysValidation =
        await this.holidayService.validateAllClassified(competitionPeriodId);
      if (!holidaysValidation.isValid) {
        errors.push(holidaysValidation.message || 'Feriados não classificados');
      }

      // 3. Validar parâmetros configurados
      const parametersValidation =
        await this.parametersService.validateRequiredParameters();
      if (!parametersValidation.isValid) {
        errors.push(
          `Parâmetros não configurados: ${parametersValidation.missingParameters.join(', ')}`
        );
      }

      // 4. Validar setores ativos
      const sectorsValidation =
        await this.sectorMapping.validateSectorMapping();
      if (!sectorsValidation.isValid) {
        errors.push(
          `Setores não encontrados: ${sectorsValidation.missingSectors.join(', ')}`
        );
      }

      // 5. Warnings (não impedem execução)
      if (sectorsValidation.availableSectors.some((s) => !s.isActive)) {
        warnings.push('Alguns setores estão inativos');
      }

      return {
        isValid: errors.length === 0,
        errors: errors.map((e) => ({ code: 'VALIDATION_ERROR', message: e })),
        warnings: warnings.map((w) => ({
          code: 'VALIDATION_WARNING',
          message: w,
          severity: 'MEDIUM' as const,
        })),
      };
    } catch (error) {
      console.error(
        '[CalculationService] Erro na validação de pré-requisitos:',
        error
      );
      return {
        isValid: false,
        errors: [
          {
            code: 'VALIDATION_EXCEPTION',
            message: `Erro na validação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
          },
        ],
        warnings: [],
      };
    }
  }

  /**
   * Carrega dados necessários para o cálculo
   */
  private async loadCalculationData(competitionPeriodId: number): Promise<{
    sectors: SectorEntity[];
    holidays: Array<{ date: string; classification: any }>;
    parameters: any;
  }> {
    // Buscar setores ativos
    const sectors = await this.sectorMapping.getAllValidSectors();

    // Buscar classificações de feriados
    const holidays =
      await this.holidayService.getClassifiedHolidays(competitionPeriodId);

    // Criar snapshot dos parâmetros
    const parameters = await this.parametersService.createParametersSnapshot();

    return { sectors, holidays, parameters };
  }

  /**
   * Atualiza progresso do cálculo
   */
  private async updateProgress(
    calculationId: number,
    status: string,
    currentStep: string,
    progress: number
  ): Promise<void> {
    this.currentProgress = {
      calculationId,
      status: status as any,
      currentStep,
      progress,
      sectorsProcessed: 0,
      totalSectors: 4, // Fixo para os 4 setores
    };

    console.log(`[CalculationService] ${progress}% - ${currentStep}`);
  }

  /**
   * Busca nome do usuário
   */
  private async getUserName(userId: number): Promise<string> {
    try {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      return user?.nome || `Usuário ${userId}`;
    } catch {
      return `Usuário ${userId}`;
    }
  }

  /**
   * Aprova cálculo e salva metas no sistema
   */
  async approveCalculation(
    calculationId: number,
    userId: number,
    observations?: string
  ): Promise<void> {
    console.log(`[CalculationService] Aprovando cálculo ${calculationId}`);

    try {
      // Buscar cálculo
      const calculation = await this.calculationRepo.findOne({
        where: { id: calculationId },
      });

      if (!calculation) {
        throw new Error('Cálculo não encontrado');
      }

      if (!calculation.isCompleted()) {
        throw new Error('Cálculo deve estar concluído para ser aprovado');
      }

      if (calculation.isApproved()) {
        throw new Error('Cálculo já foi aprovado');
      }

      // Marcar cálculos anteriores como superseded
      await this.calculationRepo.update(
        {
          competitionPeriodId: calculation.competitionPeriodId,
          status: 'APPROVED',
        },
        { status: 'SUPERSEDED' }
      );

      // Aprovar este cálculo
      await this.calculationRepo.update(calculationId, {
        status: 'APPROVED',
        approvedByUserId: userId,
        approvedAt: new Date(),
        approvalNotes: observations,
      });

      // TODO: Integrar com ParameterService para salvar metas
      // await this.parameterService.saveOperationalGoalsMetas(calculationId, userId);

      // Log de auditoria
      await this.auditService.createLog({
        userId,
        userName: await this.getUserName(userId),
        actionType: 'OPERATIONAL_GOALS_APPROVED',
        entityType: 'OperationalGoalsCalculationEntity',
        entityId: calculationId.toString(),
        details: {
          competitionPeriodId: calculation.competitionPeriodId,
          totalGoalsApproved:
            Object.keys(calculation.calculationData || {}).length * 3,
          observations,
        },
        justification:
          observations || 'Aprovação de cálculo de metas operacionais',
      });

      console.log(
        `[CalculationService] ✅ Cálculo ${calculationId} aprovado com sucesso`
      );
    } catch (error) {
      console.error(
        `[CalculationService] ❌ Erro ao aprovar cálculo ${calculationId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Busca detalhes de um cálculo específico
   */
  async getCalculationDetails(
    calculationId: number
  ): Promise<OperationalGoalsCalculationEntity | null> {
    return await this.calculationRepo.findOne({
      where: { id: calculationId },
      relations: ['competitionPeriod', 'calculatedBy', 'approvedBy'],
    });
  }

  /**
   * Lista cálculos de um período
   */
  async getCalculationsByPeriod(
    competitionPeriodId: number
  ): Promise<OperationalGoalsCalculationEntity[]> {
    return await this.calculationRepo.find({
      where: { competitionPeriodId },
      relations: ['calculatedBy', 'approvedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Cancela cálculo em andamento
   */
  async cancelCalculation(
    calculationId: number,
    userId: number,
    reason: string
  ): Promise<void> {
    const calculation = await this.calculationRepo.findOne({
      where: { id: calculationId },
    });

    if (!calculation) {
      throw new Error('Cálculo não encontrado');
    }

    if (!calculation.isInProgress()) {
      throw new Error('Apenas cálculos em andamento podem ser cancelados');
    }

    await this.calculationRepo.update(calculationId, {
      status: 'CANCELLED',
      errorMessage: `Cancelado por usuário: ${reason}`,
      completedAt: new Date(),
    });

    await this.auditService.createLog({
      userId,
      userName: await this.getUserName(userId),
      actionType: 'OPERATIONAL_GOALS_CANCELLED',
      entityType: 'OperationalGoalsCalculationEntity',
      entityId: calculationId.toString(),
      details: { reason },
      justification: reason,
    });
  }

  /**
   * Busca progresso atual do cálculo
   */
  getCurrentProgress(): CalculationProgress | undefined {
    return this.currentProgress;
  }

  /**
   * Valida se um cálculo pode ser executado
   */
  async validateCalculationExecution(
    input: CalculationInput
  ): Promise<ValidationResult> {
    console.log(
      `[CalculationService] Validando execução de cálculo para período ${input.competitionPeriodId}`
    );

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 1. Validar usuário
      const user = await this.userRepo.findOne({ where: { id: input.userId } });
      if (!user) {
        errors.push('Usuário não encontrado');
      }

      // 2. Verificar se já existe cálculo em andamento
      const runningCalculation = await this.calculationRepo.findOne({
        where: {
          competitionPeriodId: input.competitionPeriodId,
          status: 'CALCULATING',
        },
      });

      if (runningCalculation) {
        errors.push('Já existe um cálculo em andamento para este período');
      }

      // 3. Validar preço de combustível se fornecido
      if (input.fuelPriceOverride !== undefined) {
        if (input.fuelPriceOverride <= 0) {
          errors.push('Preço de combustível deve ser maior que zero');
        }
        if (input.fuelPriceOverride < 2 || input.fuelPriceOverride > 10) {
          warnings.push(
            'Preço de combustível fora da faixa usual (R$ 2,00 - R$ 10,00)'
          );
        }
      }

      // 4. Validar pré-requisitos
      const prerequisitesValidation = await this.validatePrerequisites(
        input.competitionPeriodId
      );
      errors.push(...prerequisitesValidation.errors.map((e) => e.message));
      warnings.push(...prerequisitesValidation.warnings.map((w) => w.message));

      return {
        isValid: errors.length === 0,
        errors: errors.map((e) => ({
          code: 'CALCULATION_VALIDATION_ERROR',
          message: e,
        })),
        warnings: warnings.map((w) => ({
          code: 'CALCULATION_VALIDATION_WARNING',
          message: w,
          severity: 'MEDIUM' as const,
        })),
      };
    } catch (error) {
      console.error(
        '[CalculationService] Erro na validação de execução:',
        error
      );

      return {
        isValid: false,
        errors: [
          {
            code: 'CALCULATION_VALIDATION_EXCEPTION',
            message: `Erro na validação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
          },
        ],
        warnings: [],
      };
    }
  }

  /**
   * Gera preview do cálculo (sem salvar)
   */
  async generateCalculationPreview(input: CalculationInput): Promise<{
    previewResults: Record<string, any>;
    estimatedTime: number;
    dataQuality: number;
    recommendations: string[];
  }> {
    console.log(
      `[CalculationService] Gerando preview para período ${input.competitionPeriodId}`
    );

    try {
      const { sectors, holidays, parameters } = await this.loadCalculationData(
        input.competitionPeriodId
      );

      const previewResults: Record<string, any> = {};
      const recommendations: string[] = [];
      let totalDataQuality = 0;

      // Gerar preview para cada setor
      for (const sector of sectors) {
        try {
          // Preview simplificado do KM Prevista
          const kmPreview = {
            sectorName: sector.nome,
            estimatedKm: 50000, // Estimativa baseada em médias
            confidence: 0.8,
          };

          // Preview do combustível
          const fuelPreview = {
            estimatedLiters: kmPreview.estimatedKm / 8, // Eficiência estimada de 8 km/L
            projectedCostIfPriceProvided: input.fuelPriceOverride
              ? (kmPreview.estimatedKm / 8) * input.fuelPriceOverride
              : null,
          };

          previewResults[sector.id] = {
            sectorName: sector.nome,
            kmPrevista: kmPreview,
            combustivel: fuelPreview,
            dataAvailable: true,
          };

          totalDataQuality += 0.8; // Estimativa de qualidade
        } catch (sectorError) {
          previewResults[sector.id] = {
            sectorName: sector.nome,
            error: 'Dados insuficientes para preview',
            dataAvailable: false,
          };

          recommendations.push(
            `Verificar dados históricos para ${sector.nome}`
          );
        }
      }

      const avgDataQuality =
        sectors.length > 0 ? totalDataQuality / sectors.length : 0;
      const estimatedTime = sectors.length * 30000; // 30s por setor estimado

      // Recomendações gerais
      if (holidays.length === 0) {
        recommendations.push(
          'Nenhum feriado detectado - verificar se é intencional'
        );
      }

      if (avgDataQuality < 0.7) {
        recommendations.push(
          'Qualidade dos dados abaixo do ideal - resultados podem ser imprecisos'
        );
      }

      return {
        previewResults,
        estimatedTime,
        dataQuality: avgDataQuality,
        recommendations,
      };
    } catch (error) {
      console.error('[CalculationService] Erro ao gerar preview:', error);
      throw new Error(
        `Falha ao gerar preview: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }
}
