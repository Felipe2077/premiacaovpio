// apps/api/src/modules/operational-goals/types/calculation.types.ts
import { HolidayClassificationType } from '@/entity/holiday-classification.entity';

// ============================================================================
// INTERFACES BASE
// ============================================================================

export interface CalculationInput {
  competitionPeriodId: number;
  userId: number;
  fuelPriceOverride?: number; // Preço combustível opcional
}

export interface CalculationResult {
  id: number;
  competitionPeriodId: number;
  status: 'COMPLETED' | 'COMPLETED_WITH_WARNINGS' | 'ERROR';
  results: Record<string, SectorResults>; // sectorId -> resultados
  calculatedAt: Date;
  calculatedBy: number;
  executionTimeMs: number;
  warnings?: CalculationWarning[];
  parametersUsed: any; // Snapshot dos parâmetros
}

export interface SectorResults {
  sectorId: number;
  sectorName: string;
  kmPrevista: KmPrevistaResult;
  combustivel: CombustivelResult;
  pneus: PneusPecasResult;
  pecas: PneusPecasResult;
}

export interface CalculationWarning {
  type: 'DATA_QUALITY' | 'ANOMALY' | 'VALIDATION';
  sectorId?: number;
  message: string;
  details?: any;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

// ============================================================================
// KM PREVISTA
// ============================================================================

export interface KmPrevistaInput {
  sectorId: number;
  competitionPeriodId: number;
  holidayClassifications: Array<{
    date: string;
    classification: HolidayClassificationType;
  }>;
}

export interface KmPrevistaResult {
  sectorId: number;
  sectorName: string;
  projectedKm: number;
  confidence: number; // 0-1 (confiança da projeção)
  calculationDetails: {
    referenceMonth: string; // YYYY-MM
    historicalData: DailyKmData[];
    dailyAverages: DailyAverages;
    futureCalendar: MonthCalendar;
    dataQuality: DataQualityMetrics;
  };
  warnings?: string[];
}

export interface DailyKmData {
  date: string; // YYYY-MM-DD
  dayType: 'UTIL' | 'SABADO' | 'DOMINGO_FERIADO';
  totalKm: number;
  vehicleCount: number;
  avgKmPerVehicle: number;
}

export interface DailyAverages {
  util: { avgKm: number; count: number; stdDev: number };
  sabado: { avgKm: number; count: number; stdDev: number };
  domingoFeriado: { avgKm: number; count: number; stdDev: number };
}

export interface MonthCalendar {
  year: number;
  month: number;
  totalDays: number;
  utilDays: number;
  sabadoDays: number;
  domingoFeriadoDays: number;
  projectedByType: {
    util: number;
    sabado: number;
    domingoFeriado: number;
  };
}

export interface DataQualityMetrics {
  completeness: number; // 0-1 (% dias com dados)
  consistency: number; // 0-1 (consistência dos dados)
  anomaliesDetected: number;
  recommendedConfidence: number;
}

// ============================================================================
// COMBUSTÍVEL
// ============================================================================

export interface CombustivelInput {
  sectorId: number;
  kmPrevista: number;
  referenceMonths: number; // Padrão: 3
}

export interface CombustivelResult {
  sectorId: number;
  sectorName: string;
  kmPrevista: number;
  historical3Months: HistoricalEfficiency;
  fatorReducao: number;
  metaLitros: number;
  projecaoFinanceira?: number; // Se preço fornecido
  calculationDetails: {
    litrosPrevistoBruto: number;
    reductionApplied: number;
    avgEfficiency: number;
    efficiencyTrend: 'IMPROVING' | 'STABLE' | 'DEGRADING';
  };
  dataQuality: FuelDataQuality;
  warnings?: string[];
}

export interface HistoricalEfficiency {
  totalKm: number;
  totalLiters: number;
  avgKmPerLiter: number;
  monthlyData: Array<{
    month: string; // YYYY-MM
    km: number;
    liters: number;
    efficiency: number;
  }>;
  trend: {
    slope: number; // Tendência da eficiência
    correlation: number; // Correlação temporal
  };
}

export interface FuelDataQuality {
  completeness: number; // % dados disponíveis
  reliability: number; // Consistência dos dados
  anomalousMonths: string[]; // Meses com dados anômalos
}

// ============================================================================
// PNEUS E PEÇAS
// ============================================================================

export interface PneusPecasInput {
  sectorId: number;
  kmPrevista: number;
  criterionType: 'PNEUS' | 'PEÇAS';
  referenceMonths: number; // Padrão: 12
  currentPeriodId: number;
}

export interface PneusPecasResult {
  sectorId: number;
  sectorName: string;
  criterionType: 'PNEUS' | 'PEÇAS';
  kmPrevista: number;
  annualCostData: AnnualCostData;
  metaBase: number;
  saldoDevedor: number;
  metaFinal: number;
  metaPorVeiculo?: number;
  calculationDetails: {
    custoPrevisto: number;
    percentualPremiacao: number;
    reductionApplied: number;
    vehicleCount: number;
  };
  saldoDetails: SaldoDevedorResult;
  dataQuality: CostDataQuality;
  warnings?: string[];
}

export interface AnnualCostData {
  totalKm12Months: number;
  totalCost12Months: number;
  avgCostPerKm: number;
  monthlyData: Array<{
    month: string; // YYYY-MM
    km: number;
    cost: number;
    costPerKm: number;
  }>;
  trend: {
    slope: number; // Tendência do custo
    seasonality: number; // Sazonalidade detectada
  };
}

export interface CostDataQuality {
  completeness: number; // % meses com dados
  reliability: number; // Consistência dos custos
  outlierMonths: string[]; // Meses com custos anômalos
  kmCorrelation: number; // Correlação custo vs KM
}

// ============================================================================
// SISTEMA DE SALDO
// ============================================================================

export interface SaldoDevedorInput {
  sectorId: number;
  criterionType: 'PNEUS' | 'PEÇAS';
  currentPeriodId: number;
}

export interface SaldoDevedorResult {
  sectorId: number;
  criterionType: 'PNEUS' | 'PEÇAS';
  saldoDevedor: number;
  tetoGasto: number;
  excedente: number;
  previousPeriodData: {
    metaAprovada: number;
    gastoReal: number;
    periodMesAno: string;
  } | null;
  detalhes: {
    toleranciaAplicada: number;
    percentualExcedente: number;
    hadPreviousPeriod: boolean;
  };
  recommendations?: string[];
}

// ============================================================================
// VALIDAÇÃO E PRÉ-REQUISITOS
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  details?: any;
}

export interface ValidationWarning {
  code: string;
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  details?: any;
}

export interface PreCalculationChecks {
  periodStatus: boolean; // Status PLANEJAMENTO
  holidaysClassified: boolean; // Todos feriados classificados
  parametersConfigured: boolean; // Parâmetros existem
  oracleConnectivity: boolean; // Conexão Oracle OK
  historicalDataAvailable: boolean; // Dados suficientes
  sectorsValid: boolean; // Setores ativos
}

// ============================================================================
// PARÂMETROS DE CÁLCULO
// ============================================================================

export interface CalculationParameters {
  FATOR_REDUCAO_COMBUSTIVEL: number;
  PERCENTUAL_PREMIACAO_PNEUS: number;
  PERCENTUAL_PREMIACAO_PECAS: number;
  PERCENTUAL_TOLERANCIA_SALDO: number;
  PRECO_COMBUSTIVEL_POR_LITRO?: number;
}

// ============================================================================
// DADOS ORACLE
// ============================================================================

export interface OracleKmFuelDaily {
  sectorName: string;
  date: string; // YYYY-MM-DD
  totalKm: number;
  totalLiters: number;
  efficiency: number; // KM/L
  vehicleCount: number;
}

export interface OracleMonthlyConsolidated {
  sectorName: string;
  yearMonth: string; // YYYY-MM
  totalKm: number;
  totalLiters: number;
  avgEfficiency: number;
  operationalDays: number;
}

export interface OracleCostData {
  sectorName: string;
  yearMonth: string; // YYYY-MM
  criterionType: 'PNEUS' | 'PEÇAS';
  totalCost: number;
  avgCostPerKm: number;
}

// ============================================================================
// STATUS E PROGRESSO
// ============================================================================

export interface CalculationProgress {
  calculationId: number;
  status:
    | 'VALIDATING'
    | 'LOADING_DATA'
    | 'CALCULATING_KM'
    | 'CALCULATING_FUEL'
    | 'CALCULATING_TIRES'
    | 'CALCULATING_PARTS'
    | 'SAVING'
    | 'COMPLETED';
  currentStep: string;
  progress: number; // 0-100
  sectorsProcessed: number;
  totalSectors: number;
  estimatedTimeRemaining?: number; // segundos
  stepDetails?: {
    stepName: string;
    stepProgress: number;
    stepMessage?: string;
  };
}

// ============================================================================
// ANOMALIAS E ALERTAS
// ============================================================================

export interface AnomalyDetection {
  type: 'KM_ANOMALY' | 'FUEL_ANOMALY' | 'COST_ANOMALY' | 'EFFICIENCY_ANOMALY';
  sectorId: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  detectedValue: number;
  expectedRange: { min: number; max: number };
  confidence: number; // 0-1
  recommendation?: string;
  affectedMetrics: string[];
}

export interface CalculationSummary {
  totalSectors: number;
  successfulCalculations: number;
  calculationsWithWarnings: number;
  failedCalculations: number;
  totalGoalsGenerated: number; // Deve ser 12 (3 critérios × 4 setores)
  executionTimeMs: number;
  dataQualityScore: number; // 0-1
  anomaliesDetected: number;
  recommendationsGenerated: number;
}
