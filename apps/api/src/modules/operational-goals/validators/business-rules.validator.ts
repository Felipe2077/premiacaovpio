// ============================================================================
// apps/api/src/modules/operational-goals/validators/business-rules.validator.ts
// ============================================================================

import {
  AnomalyDetection,
  CalculationResult,
  SectorResults,
  ValidationResult,
} from '../types/calculation.types';

export class BusinessRulesValidator {
  constructor() {
    console.log(
      '[BusinessRulesValidator] Validador de regras de negócio inicializado'
    );
  }

  /**
   * Valida resultados de cálculo contra regras de negócio
   */
  async validateCalculationResults(
    result: CalculationResult
  ): Promise<ValidationResult> {
    console.log(
      `[BusinessRulesValidator] Validando resultados do cálculo ${result.id}`
    );

    const errors: string[] = [];
    const warnings: string[] = [];
    const anomalies: AnomalyDetection[] = [];

    try {
      for (const [sectorId, sectorResult] of Object.entries(result.results)) {
        // Validar KM Prevista
        const kmValidation = this.validateKmPrevista(sectorResult);
        errors.push(...kmValidation.errors);
        warnings.push(...kmValidation.warnings);
        anomalies.push(...kmValidation.anomalies);

        // Validar Combustível
        const fuelValidation = this.validateCombustivel(sectorResult);
        errors.push(...fuelValidation.errors);
        warnings.push(...fuelValidation.warnings);
        anomalies.push(...fuelValidation.anomalies);

        // Validar Pneus/Peças
        const tiresValidation = this.validatePneusPecas(sectorResult, 'PNEUS');
        errors.push(...tiresValidation.errors);
        warnings.push(...tiresValidation.warnings);
        anomalies.push(...tiresValidation.anomalies);

        const partsValidation = this.validatePneusPecas(sectorResult, 'PEÇAS');
        errors.push(...partsValidation.errors);
        warnings.push(...partsValidation.warnings);
        anomalies.push(...partsValidation.anomalies);
      }

      // Validações gerais
      const generalValidation = this.validateGeneralRules(result);
      errors.push(...generalValidation.errors);
      warnings.push(...generalValidation.warnings);

      console.log(
        `[BusinessRulesValidator] Validação concluída: ${errors.length} erros, ${warnings.length} avisos, ${anomalies.length} anomalias`
      );

      return {
        isValid: errors.length === 0,
        errors: errors.map((e) => ({
          code: 'BUSINESS_RULE_ERROR',
          message: e,
        })),
        warnings: warnings.map((w) => ({
          code: 'BUSINESS_RULE_WARNING',
          message: w,
          severity: 'MEDIUM' as const,
        })),
      };
    } catch (error) {
      console.error('[BusinessRulesValidator] Erro durante validação:', error);

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
   * Valida KM Prevista
   */
  private validateKmPrevista(sectorResult: SectorResults): {
    errors: string[];
    warnings: string[];
    anomalies: AnomalyDetection[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const anomalies: AnomalyDetection[] = [];

    const { kmPrevista } = sectorResult;

    // Validações básicas
    if (kmPrevista.projectedKm <= 0) {
      errors.push(
        `${sectorResult.sectorName}: KM prevista deve ser maior que zero`
      );
    }

    if (kmPrevista.projectedKm > 200000) {
      errors.push(
        `${sectorResult.sectorName}: KM prevista muito alta (${kmPrevista.projectedKm.toFixed(0)} km)`
      );
    }

    // Validar confiança
    if (kmPrevista.confidence < 0.5) {
      warnings.push(
        `${sectorResult.sectorName}: Baixa confiança na projeção de KM (${(kmPrevista.confidence * 100).toFixed(0)}%)`
      );
    }

    // Detectar anomalias
    if (kmPrevista.projectedKm < 10000 || kmPrevista.projectedKm > 150000) {
      anomalies.push({
        type: 'KM_ANOMALY',
        sectorId: sectorResult.sectorId,
        severity: 'MEDIUM',
        description: `KM prevista fora da faixa normal: ${kmPrevista.projectedKm.toFixed(0)} km`,
        detectedValue: kmPrevista.projectedKm,
        expectedRange: { min: 10000, max: 150000 },
        confidence: 1 - kmPrevista.confidence,
        affectedMetrics: ['KM_PREVISTA', 'COMBUSTIVEL', 'PNEUS', 'PECAS'],
      });
    }

    return { errors, warnings, anomalies };
  }

  /**
   * Valida Combustível
   */
  private validateCombustivel(sectorResult: SectorResults): {
    errors: string[];
    warnings: string[];
    anomalies: AnomalyDetection[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const anomalies: AnomalyDetection[] = [];

    const { combustivel } = sectorResult;

    // Validações básicas
    if (combustivel.metaLitros <= 0) {
      errors.push(
        `${sectorResult.sectorName}: Meta de combustível deve ser maior que zero`
      );
    }

    if (combustivel.metaLitros > 50000) {
      warnings.push(
        `${sectorResult.sectorName}: Meta de combustível muito alta (${combustivel.metaLitros.toFixed(0)} L)`
      );
    }

    // Validar eficiência
    const efficiency = combustivel.historical3Months.avgKmPerLiter;
    if (efficiency < 2 || efficiency > 15) {
      errors.push(
        `${sectorResult.sectorName}: Eficiência histórica fora da faixa realista (${efficiency.toFixed(2)} km/L)`
      );
    }

    // Validar tendência
    if (combustivel.calculationDetails.efficiencyTrend === 'DEGRADING') {
      warnings.push(
        `${sectorResult.sectorName}: Tendência de degradação na eficiência detectada`
      );
    }

    // Detectar anomalias na eficiência
    if (efficiency < 3 || efficiency > 12) {
      anomalies.push({
        type: 'EFFICIENCY_ANOMALY',
        sectorId: sectorResult.sectorId,
        severity: efficiency < 3 ? 'HIGH' : 'MEDIUM',
        description: `Eficiência anômala: ${efficiency.toFixed(2)} km/L`,
        detectedValue: efficiency,
        expectedRange: { min: 3, max: 12 },
        confidence: 0.8,
        affectedMetrics: ['COMBUSTIVEL'],
      });
    }

    return { errors, warnings, anomalies };
  }

  /**
   * Valida Pneus/Peças
   */
  private validatePneusPecas(
    sectorResult: SectorResults,
    type: 'PNEUS' | 'PEÇAS'
  ): {
    errors: string[];
    warnings: string[];
    anomalies: AnomalyDetection[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const anomalies: AnomalyDetection[] = [];

    const result = type === 'PNEUS' ? sectorResult.pneus : sectorResult.pecas;

    // Validações básicas
    if (result.metaFinal < 0) {
      warnings.push(
        `${sectorResult.sectorName}: Meta de ${type.toLowerCase()} negativa (R$ ${result.metaFinal.toFixed(2)}) devido ao saldo devedor`
      );
    }

    if (result.metaFinal > 100000) {
      warnings.push(
        `${sectorResult.sectorName}: Meta de ${type.toLowerCase()} muito alta (R$ ${result.metaFinal.toFixed(2)})`
      );
    }

    // Validar custo por KM
    const costPerKm = result.annualCostData.avgCostPerKm;
    const expectedRange =
      type === 'PNEUS' ? { min: 0.1, max: 2.0 } : { min: 0.5, max: 3.0 };

    if (costPerKm < expectedRange.min || costPerKm > expectedRange.max) {
      errors.push(
        `${sectorResult.sectorName}: Custo médio de ${type.toLowerCase()} por KM fora da faixa (R$ ${costPerKm.toFixed(3)}/km)`
      );
    }

    // Validar saldo devedor
    if (result.saldoDevedor > result.metaBase * 0.8) {
      warnings.push(
        `${sectorResult.sectorName}: Saldo devedor de ${type.toLowerCase()} muito alto (${((result.saldoDevedor / result.metaBase) * 100).toFixed(0)}% da meta base)`
      );
    }

    // Detectar anomalias de custo
    if (
      costPerKm < expectedRange.min * 0.5 ||
      costPerKm > expectedRange.max * 1.5
    ) {
      anomalies.push({
        type: 'COST_ANOMALY',
        sectorId: sectorResult.sectorId,
        severity: 'HIGH',
        description: `Custo anômalo de ${type.toLowerCase()}: R$ ${costPerKm.toFixed(3)}/km`,
        detectedValue: costPerKm,
        expectedRange,
        confidence: 0.9,
        affectedMetrics: [type],
      });
    }

    return { errors, warnings, anomalies };
  }

  /**
   * Valida regras gerais do cálculo
   */
  private validateGeneralRules(result: CalculationResult): {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Verificar se todos os setores foram processados
    const expectedSectors = 4;
    const processedSectors = Object.keys(result.results).length;

    if (processedSectors < expectedSectors) {
      errors.push(
        `Apenas ${processedSectors} de ${expectedSectors} setores foram processados`
      );
    }

    // Verificar tempo de execução
    if (result.executionTimeMs > 300000) {
      // 5 minutos
      warnings.push(
        `Tempo de execução muito alto: ${Math.round(result.executionTimeMs / 1000)}s`
      );
    }

    // Verificar consistência entre setores
    const kmValues = Object.values(result.results).map(
      (s) => s.kmPrevista.projectedKm
    );
    const avgKm = kmValues.reduce((a, b) => a + b, 0) / kmValues.length;
    const maxDeviation = Math.max(
      ...kmValues.map((km) => Math.abs(km - avgKm))
    );

    if (maxDeviation > avgKm * 0.5) {
      // Variação maior que 50% da média
      warnings.push('Alta variabilidade nas projeções de KM entre setores');
    }

    // Verificar se há muitos avisos
    if (result.warnings && result.warnings.length > 10) {
      warnings.push(
        `Muitos avisos detectados (${result.warnings.length}) - revisar qualidade dos dados`
      );
    }

    return { errors, warnings };
  }

  /**
   * Detecta anomalias específicas no conjunto de resultados
   */
  async detectAnomalies(
    result: CalculationResult
  ): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];

    try {
      for (const [sectorId, sectorResult] of Object.entries(result.results)) {
        // Anomalias de eficiência de combustível
        const fuelEfficiency =
          sectorResult.combustivel.historical3Months.avgKmPerLiter;
        if (fuelEfficiency > 15) {
          anomalies.push({
            type: 'FUEL_ANOMALY',
            sectorId: parseInt(sectorId),
            severity: 'CRITICAL',
            description: `Eficiência de combustível irrealisticamente alta: ${fuelEfficiency.toFixed(2)} km/L`,
            detectedValue: fuelEfficiency,
            expectedRange: { min: 3, max: 12 },
            confidence: 0.95,
            recommendation: 'Verificar dados de combustível e KM no Oracle',
            affectedMetrics: ['COMBUSTIVEL'],
          });
        }

        // Anomalias de meta negativa
        if (sectorResult.pneus.metaFinal < -10000) {
          anomalies.push({
            type: 'COST_ANOMALY',
            sectorId: parseInt(sectorId),
            severity: 'CRITICAL',
            description: `Meta de pneus extremamente negativa: R$ ${sectorResult.pneus.metaFinal.toFixed(2)}`,
            detectedValue: sectorResult.pneus.metaFinal,
            expectedRange: { min: 0, max: 50000 },
            confidence: 1.0,
            recommendation: 'Revisar sistema de saldo ou aplicar meta mínima',
            affectedMetrics: ['PNEUS'],
          });
        }
      }

      return anomalies;
    } catch (error) {
      console.error(
        '[BusinessRulesValidator] Erro ao detectar anomalias:',
        error
      );
      return [];
    }
  }

  /**
   * Gera recomendações baseadas nas validações
   */
  generateRecommendations(
    validationResult: ValidationResult,
    anomalies: AnomalyDetection[]
  ): string[] {
    const recommendations: string[] = [];

    // Recomendações baseadas em erros
    if (validationResult.errors.length > 0) {
      recommendations.push(
        'Corrigir erros identificados antes de aprovar o cálculo'
      );
    }

    // Recomendações baseadas em anomalias críticas
    const criticalAnomalies = anomalies.filter(
      (a) => a.severity === 'CRITICAL'
    );
    if (criticalAnomalies.length > 0) {
      recommendations.push('Investigar anomalias críticas detectadas');
      recommendations.push(
        'Considerar recalcular após verificar dados de entrada'
      );
    }

    // Recomendações baseadas em avisos
    const highWarnings = validationResult.warnings.filter(
      (w) => w.severity === 'HIGH'
    );
    if (highWarnings.length > 0) {
      recommendations.push('Revisar avisos de alta prioridade');
    }

    // Recomendações gerais
    if (anomalies.length > 5) {
      recommendations.push(
        'Muitas anomalias detectadas - considerar revisar parâmetros de cálculo'
      );
    }

    return recommendations;
  }
}
