// apps/api/src/modules/operational-goals/validators/pre-calculation.validator.ts
import { AppDataSource } from '@/database/data-source';
import { CompetitionPeriodEntity } from '@/entity/competition-period.entity';
import { Repository } from 'typeorm';
import { HolidayManagementService } from '../holiday-management.service';
import { OperationalGoalsOracleService } from '../oracle-data.service';
import { OperationalGoalsParametersService } from '../parameters.service';
import { SectorMappingService } from '../sector-mapping.service';
import {
  PreCalculationChecks,
  ValidationResult,
} from '../types/calculation.types';

export class PreCalculationValidator {
  private periodRepo: Repository<CompetitionPeriodEntity>;
  private holidayService: HolidayManagementService;
  private parametersService: OperationalGoalsParametersService;
  private sectorMapping: SectorMappingService;
  private oracleService: OperationalGoalsOracleService;

  constructor() {
    this.periodRepo = AppDataSource.getRepository(CompetitionPeriodEntity);
    this.holidayService = new HolidayManagementService();
    this.parametersService = new OperationalGoalsParametersService();
    this.sectorMapping = new SectorMappingService();
    this.oracleService = new OperationalGoalsOracleService();

    console.log(
      '[PreCalculationValidator] Validador de pré-cálculo inicializado'
    );
  }

  /**
   * Executa todas as validações de pré-requisitos
   */
  async validateAllPrerequisites(
    competitionPeriodId: number
  ): Promise<ValidationResult> {
    console.log(
      `[PreCalculationValidator] Validando pré-requisitos para período ${competitionPeriodId}`
    );

    const checks: PreCalculationChecks = {
      periodStatus: false,
      holidaysClassified: false,
      parametersConfigured: false,
      oracleConnectivity: false,
      historicalDataAvailable: false,
      sectorsValid: false,
    };

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 1. Validar status do período
      console.log('[PreCalculationValidator] Verificando status do período...');
      const periodCheck = await this.validatePeriodStatus(competitionPeriodId);
      checks.periodStatus = periodCheck.isValid;
      if (!periodCheck.isValid) {
        errors.push(...periodCheck.errors);
      }
      warnings.push(...periodCheck.warnings);

      // 2. Validar classificação de feriados
      console.log(
        '[PreCalculationValidator] Verificando classificação de feriados...'
      );
      const holidaysCheck =
        await this.validateHolidaysClassified(competitionPeriodId);
      checks.holidaysClassified = holidaysCheck.isValid;
      if (!holidaysCheck.isValid) {
        errors.push(...holidaysCheck.errors);
      }
      warnings.push(...holidaysCheck.warnings);

      // 3. Validar parâmetros configurados
      console.log('[PreCalculationValidator] Verificando parâmetros...');
      const parametersCheck = await this.validateParameters();
      checks.parametersConfigured = parametersCheck.isValid;
      if (!parametersCheck.isValid) {
        errors.push(...parametersCheck.errors);
      }
      warnings.push(...parametersCheck.warnings);

      // 4. Validar conectividade Oracle
      console.log('[PreCalculationValidator] Testando conectividade Oracle...');
      const oracleCheck = await this.validateOracleConnectivity();
      checks.oracleConnectivity = oracleCheck.isValid;
      if (!oracleCheck.isValid) {
        errors.push(...oracleCheck.errors);
      }
      warnings.push(...oracleCheck.warnings);

      // 5. Validar disponibilidade de dados históricos
      console.log('[PreCalculationValidator] Verificando dados históricos...');
      const dataCheck = await this.validateHistoricalData(competitionPeriodId);
      checks.historicalDataAvailable = dataCheck.isValid;
      if (!dataCheck.isValid) {
        errors.push(...dataCheck.errors);
      }
      warnings.push(...dataCheck.warnings);

      // 6. Validar setores
      console.log('[PreCalculationValidator] Verificando setores...');
      const sectorsCheck = await this.validateSectors();
      checks.sectorsValid = sectorsCheck.isValid;
      if (!sectorsCheck.isValid) {
        errors.push(...sectorsCheck.errors);
      }
      warnings.push(...sectorsCheck.warnings);

      const isValid = Object.values(checks).every((check) => check === true);

      console.log(
        `[PreCalculationValidator] Validação concluída: ${isValid ? 'APROVADO' : 'REPROVADO'}`
      );
      console.log(`[PreCalculationValidator] Resumo:`, checks);

      return {
        isValid,
        errors: errors.map((e) => ({ code: 'PREREQUISITE_ERROR', message: e })),
        warnings: warnings.map((w) => ({
          code: 'PREREQUISITE_WARNING',
          message: w,
          severity: 'MEDIUM' as const,
        })),
      };
    } catch (error) {
      console.error('[PreCalculationValidator] Erro durante validação:', error);

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
   * Valida status do período de competição
   */
  private async validatePeriodStatus(competitionPeriodId: number): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const period = await this.periodRepo.findOne({
        where: { id: competitionPeriodId },
      });

      if (!period) {
        errors.push('Período de competição não encontrado');
        return { isValid: false, errors, warnings };
      }

      if (period.status !== 'PLANEJAMENTO') {
        errors.push(
          `Período deve estar em status PLANEJAMENTO (atual: ${period.status})`
        );
      }

      // Verificar se o período é futuro
      const [year, month] = period.mesAno.split('-').map(Number);
      const periodDate = new Date(year, month - 1);
      const currentDate = new Date();
      currentDate.setDate(1); // Primeiro dia do mês atual

      if (periodDate <= currentDate) {
        warnings.push('Período é atual ou passado - confirme se é intencional');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push(
        `Erro ao validar período: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Valida se todos os feriados foram classificados
   */
  private async validateHolidaysClassified(
    competitionPeriodId: number
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const validation =
        await this.holidayService.validateAllClassified(competitionPeriodId);

      if (!validation.isValid) {
        errors.push(validation.message || 'Existem feriados não classificados');
      }

      const holidaysStatus =
        await this.holidayService.getHolidaysStatus(competitionPeriodId);

      if (holidaysStatus.holidays.length === 0) {
        warnings.push('Nenhum feriado detectado para o período');
      } else {
        console.log(
          `[PreCalculationValidator] ${holidaysStatus.holidays.length} feriados encontrados, ${holidaysStatus.holidays.filter((h) => h.isClassified).length} classificados`
        );
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push(
        `Erro ao validar feriados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Valida se todos os parâmetros necessários estão configurados
   */
  private async validateParameters(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const validation =
        await this.parametersService.validateRequiredParameters();

      if (!validation.isValid) {
        errors.push(
          `Parâmetros não configurados: ${validation.missingParameters.join(', ')}`
        );
      }

      // Verificar valores dos parâmetros
      try {
        const parameters =
          await this.parametersService.getCalculationParameters();

        Object.entries(parameters).forEach(([name, value]) => {
          if (value === 0) {
            warnings.push(`Parâmetro ${name} está zerado`);
          }

          // Validações específicas
          if (name === 'FATOR_REDUCAO_COMBUSTIVEL' && value > 0.05) {
            warnings.push('Fator de redução de combustível muito alto (>5%)');
          }

          if (name.includes('PERCENTUAL_TOLERANCIA') && value > 0.15) {
            warnings.push('Percentual de tolerância muito alto (>15%)');
          }
        });
      } catch (paramError) {
        warnings.push('Não foi possível validar valores dos parâmetros');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push(
        `Erro ao validar parâmetros: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Valida conectividade com Oracle
   */
  private async validateOracleConnectivity(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const connectionTest = await this.oracleService.testConnection();

      if (!connectionTest.isConnected) {
        errors.push(`Falha na conexão Oracle: ${connectionTest.message}`);
      } else {
        if (connectionTest.responseTime && connectionTest.responseTime > 5000) {
          warnings.push(
            `Conexão Oracle lenta (${connectionTest.responseTime}ms)`
          );
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push(
        `Erro ao testar Oracle: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Valida disponibilidade de dados históricos
   */
  private async validateHistoricalData(competitionPeriodId: number): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Buscar período para determinar data de referência
      const period = await this.periodRepo.findOne({
        where: { id: competitionPeriodId },
      });

      if (!period) {
        errors.push('Período não encontrado para validar dados históricos');
        return { isValid: false, errors, warnings };
      }

      // Calcular período de referência (mês anterior)
      const [year, month] = period.mesAno.split('-').map(Number);
      let refYear = year;
      let refMonth = month - 1;

      if (refMonth === 0) {
        refMonth = 12;
        refYear = year - 1;
      }

      const startDate = `${refYear}-${refMonth.toString().padStart(2, '0')}-01`;
      const endDate = `${refYear}-${refMonth.toString().padStart(2, '0')}-31`;

      // Validar disponibilidade de dados
      const dataValidation = await this.oracleService.validateDataAvailability(
        startDate,
        endDate
      );

      if (!dataValidation.isValid) {
        errors.push(...dataValidation.issues);
      }

      if (dataValidation.summary) {
        const { totalRecords, garagensFound } = dataValidation.summary;

        if (totalRecords < 50) {
          warnings.push(
            `Poucos registros históricos disponíveis (${totalRecords})`
          );
        }

        if (garagensFound < 4) {
          warnings.push(
            `Dados disponíveis para apenas ${garagensFound} garagens`
          );
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push(
        `Erro ao validar dados históricos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Valida setores ativos
   */
  private async validateSectors(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const validation = await this.sectorMapping.validateSectorMapping();

      if (!validation.isValid) {
        errors.push(
          `Setores não encontrados: ${validation.missingSectors.join(', ')}`
        );
      }

      const inactiveSectors = validation.availableSectors.filter(
        (s) => !s.isActive
      );
      if (inactiveSectors.length > 0) {
        warnings.push(
          `Setores inativos: ${inactiveSectors.map((s) => s.sectorName).join(', ')}`
        );
      }

      if (validation.availableSectors.length < 4) {
        warnings.push(
          `Apenas ${validation.availableSectors.length} setores disponíveis (esperado: 4)`
        );
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push(
        `Erro ao validar setores: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
      return { isValid: false, errors, warnings };
    }
  }
}
