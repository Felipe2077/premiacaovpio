## 📋 **DOCUMENTAÇÃO TÉCNICA COMPLETA - AUTOMAÇÃO DE CÁLCULO DE METAS OPERACIONAIS**

---

### **📖 ÍNDICE DA DOCUMENTAÇÃO**

1. **Visão Geral do Sistema**
2. **Arquitetura de Dados e Relacionamentos**
3. **Fluxo Operacional Completo**
4. **Especificação Técnica dos Cálculos**
5. **Estruturas de Dados (Entidades e Tabelas)**
6. **APIs e Serviços**
7. **Regras de Negócio e Validações**
8. **Sistema de Auditoria e Transparência**
9. **Integração com Sistema Existente**
10. **Cenários de Exceção e Tratamentos**
11. **Sequência de Implementação**

---

## **1. VISÃO GERAL DO SISTEMA**

### **1.1 Objetivo**

Automatizar o cálculo de metas operacionais para os critérios **COMBUSTÍVEL**, **PNEUS** e **PEÇAS**, substituindo o processo manual em Excel por um sistema integrado à aplicação de premiação.

### **1.2 Contexto Operacional**

- **Frequência:** Uma vez por mês, durante vigência em status `PLANEJAMENTO`
- **Acionamento:** Manual, via interface administrativa
- **Dependências:** Dados do ERP Oracle + classificação manual de feriados
- **Integração:** Sistema existente de premiação (ParameterValueEntity)

### **1.3 Critérios Automatizados**

```
COMBUSTÍVEL → Meta em Litros + Projeção em R$
PNEUS      → Meta em R$ (com Sistema de Saldo)
PEÇAS      → Meta em R$ (com Sistema de Saldo)
```

### **1.4 Fluxo Sequencial**

```
1. KM PREVISTA (base para todos)
2. COMBUSTÍVEL (usa KM PREVISTA)
3. PNEUS (usa KM PREVISTA + Sistema de Saldo)
4. PEÇAS (usa KM PREVISTA + Sistema de Saldo)
```

---

## **2. ARQUITETURA DE DADOS E RELACIONAMENTOS**

### **2.1 Mapeamento Oracle ↔ Aplicação**

#### **Setores (Relacionamento Crítico)**

```typescript
// Modificação na entidade existente
@Entity('sectors')
export class SectorEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nome: string;

  @Column({ nullable: true })
  erpId: number; // NOVO CAMPO

  @Column({ default: true })
  ativo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// Mapeamento específico:
// ID 1 (GAMA) → erpId: 240
// ID 2 (PARANOÁ) → erpId: 31
// ID 3 (SANTA MARIA) → erpId: 124
// ID 4 (SÃO SEBASTIÃO) → erpId: 239
```

### **2.2 Fontes de Dados por Origem**

#### **A. Dados do ERP Oracle**

```sql
-- Operação Diária (KM PREVISTA)
SELECT data_operacao, codigo_setor, km_rodada
FROM oracle_operacao_diaria
WHERE data_operacao BETWEEN :start_date AND :end_date
  AND codigo_setor IN (124, 239, 240, 31)

-- Consolidados Mensais (Históricos)
SELECT ano_mes, codigo_setor,
       total_km_mes, total_litros_mes,
       custo_pneus_mes, custo_pecas_mes
FROM oracle_consolidado_mensal
WHERE ano_mes IN (:ultimos_3_meses) -- ou :ultimos_12_meses
  AND codigo_setor IN (124, 239, 240, 31)

-- Cadastro da Frota (Contagem de Veículos)
SELECT codigo_setor, COUNT(*) as qtd_veiculos
FROM oracle_cadastro_veiculos
WHERE ativo = 'S'
GROUP BY codigo_setor
```

#### **B. Dados da Aplicação Atual**

```sql
-- Metas Aprovadas Anteriores (Sistema de Saldo)
SELECT valor FROM parameter_values
WHERE criterionId IN (:pneus_id, :pecas_id)
  AND competitionPeriodId = :periodo_anterior
  AND sectorId = :setor_id

-- Gastos Reais Anteriores (Sistema de Saldo)
SELECT realizedValue FROM performance_data
WHERE criterionId IN (:pneus_id, :pecas_id)
  AND competitionPeriodId = :periodo_anterior
  AND sectorId = :setor_id
```

#### **C. Parâmetros Configuráveis**

```typescript
interface CalculationParameters {
  PERCENTUAL_TOLERANCIA_SALDO: number; // 0.08 (8%)
  FATOR_REDUCAO_COMBUSTIVEL: number; // 0.015 (1.5%)
  PERCENTUAL_PREMIACAO_PNEUS: number; // 0.03 (3%)
  PERCENTUAL_PREMIACAO_PECAS: number; // 0.03 (3%)
  PRECO_COMBUSTIVEL_POR_LITRO: number; // Informativo
}
```

---

## **3. FLUXO OPERACIONAL COMPLETO**

### **3.1 Pré-Condições para Execução**

```typescript
interface PreConditions {
  vigenciaStatus: 'PLANEJAMENTO';
  feriadosClassificados: boolean;
  dadosOracleDisponiveis: boolean;
  parametrosConfigurados: boolean;
}
```

### **3.2 Workflow Detalhado**

#### **Fase 1: Preparação**

```
1. Usuário acessa tela de Planejamento de Vigência
2. Sistema verifica status = PLANEJAMENTO
3. Sistema detecta feriados no mês da vigência
4. Se feriados existem:
   ├── Mostrar interface de classificação
   ├── Diretor classifica cada feriado (Útil/Sábado/Domingo)
   └── Sistema salva classificações
5. Botão "Calcular Metas Operacionais" fica disponível
```

#### **Fase 2: Validações Pré-Cálculo**

```
1. Verificar dados Oracle (últimos 3 e 12 meses)
2. Verificar metas anteriores (sistema de saldo)
3. Verificar gastos reais anteriores
4. Verificar parâmetros configurados
5. Verificar cadastro da frota atualizado
6. Se alguma validação falhar → Bloquear e mostrar erro
```

#### **Fase 3: Execução dos Cálculos**

```
1. ETL dos dados Oracle → Tabelas temporárias
2. Cálculo KM PREVISTA (por setor)
3. Cálculo COMBUSTÍVEL (por setor)
4. Cálculo PNEUS (por setor)
5. Cálculo PEÇAS (por setor)
6. Armazenamento completo (dados + metadados)
```

#### **Fase 4: Apresentação e Aprovação**

```
1. Mostrar resultados na tela
2. Interface de transparência ("Como chegamos aqui?")
3. Diretor revisa e aprova cada meta
4. Sistema salva em ParameterValueEntity
5. Metas ficam disponíveis para o sistema de premiação
```

---

## **4. ESPECIFICAÇÃO TÉCNICA DOS CÁLCULOS**

### **4.1 Cálculo KM PREVISTA**

#### **Input de Dados**

```typescript
interface KmPrevistaInput {
  historicoDiario: {
    data: string;
    sectorId: number;
    kmRodada: number;
    tipoDia: 'UTIL' | 'SABADO' | 'DOMINGO_FERIADO';
  }[];
  calendarioMesFuturo: {
    qtdDiasUteis: number;
    qtdSabados: number;
    qtdDomingosFeriados: number;
  };
}
```

#### **Algoritmo de Cálculo**

```typescript
function calcularKmPrevista(input: KmPrevistaInput): number {
  // 1. Calcular médias históricas (últimos 3 meses)
  const mediaKmUtil = calcularMedia(input.historicoDiario, 'UTIL');
  const mediaKmSabado = calcularMedia(input.historicoDiario, 'SABADO');
  const mediaKmDomFer = calcularMedia(input.historicoDiario, 'DOMINGO_FERIADO');

  // 2. Projetar para o mês futuro
  const previstoKmUtil = mediaKmUtil * input.calendarioMesFuturo.qtdDiasUteis;
  const previstoKmSabado = mediaKmSabado * input.calendarioMesFuturo.qtdSabados;
  const previstoKmDomFer =
    mediaKmDomFer * input.calendarioMesFuturo.qtdDomingosFeriados;

  // 3. Total previsto
  return previstoKmUtil + previstoKmSabado + previstoKmDomFer;
}
```

#### **Output Estruturado**

```typescript
interface KmPrevistaOutput {
  sectorId: number;
  kmPrevista: number;
  detalhesCalculo: {
    mediaKmUtil: number;
    mediaKmSabado: number;
    mediaKmDomFer: number;
    projecaoUtil: number;
    projecaoSabado: number;
    projecaoDomFer: number;
    diasConsiderados: {
      uteis: number;
      sabados: number;
      domingosFeriados: number;
    };
  };
  dadosHistoricos: KmPrevistaInput['historicoDiario'];
}
```

### **4.2 Cálculo COMBUSTÍVEL**

#### **Input de Dados**

```typescript
interface CombustivelInput {
  kmPrevista: number;
  historicoConsumo: {
    mesAno: string;
    sectorId: number;
    totalKm: number;
    totalLitros: number;
  }[]; // Últimos 3 meses
  fatorReducao: number; // Ex: 0.015
  precoPorLitro: number; // Informativo
}
```

#### **Algoritmo de Cálculo**

```typescript
function calcularCombustivel(input: CombustivelInput): CombustivelOutput {
  // 1. Eficiência média (3 meses)
  const totalKm3M = input.historicoConsumo.reduce(
    (sum, m) => sum + m.totalKm,
    0
  );
  const totalLitros3M = input.historicoConsumo.reduce(
    (sum, m) => sum + m.totalLitros,
    0
  );
  const mediaKmPorLitro = totalKm3M / totalLitros3M;

  // 2. Previsão bruta
  const litrosPrevistoBruto = input.kmPrevista / mediaKmPorLitro;

  // 3. Meta operacional (com redução)
  const valorReducao = litrosPrevistoBruto * input.fatorReducao;
  const metaConsumoLitros = litrosPrevistoBruto - valorReducao;

  // 4. Projeção financeira (informativo)
  const metaCustoReais = litrosPrevistoBruto * input.precoPorLitro;

  return {
    sectorId: input.sectorId,
    metaConsumoLitros,
    metaCustoReais,
    detalhesCalculo: {
      mediaKmPorLitro,
      litrosPrevistoBruto,
      valorReducao,
      fatorReducaoAplicado: input.fatorReducao,
    },
    dadosHistoricos: input.historicoConsumo,
  };
}
```

### **4.3 Sistema de Saldo (PNEUS e PEÇAS)**

#### **Input de Dados**

```typescript
interface SaldoDevedorInput {
  metaAprovadaAnterior: number;
  gastoRealAnterior: number;
  percentualTolerancia: number; // Ex: 0.08
}
```

#### **Algoritmo do Sistema de Saldo**

```typescript
function calcularSaldoDevedor(input: SaldoDevedorInput): SaldoDevedorOutput {
  // 1. Teto de gasto permitido
  const tetoGasto =
    input.metaAprovadaAnterior * (1 + input.percentualTolerancia);

  // 2. Verificar excedente
  const houveExcedente = input.gastoRealAnterior > tetoGasto;

  // 3. Calcular saldo devedor
  const saldoDevedor = houveExcedente ? input.gastoRealAnterior - tetoGasto : 0;

  return {
    saldoDevedor,
    tetoGasto,
    excedente: houveExcedente ? input.gastoRealAnterior - tetoGasto : 0,
    detalhes: {
      metaAnterior: input.metaAprovadaAnterior,
      gastoReal: input.gastoRealAnterior,
      toleranciaAplicada: input.percentualTolerancia,
    },
  };
}
```

### **4.4 Cálculo PNEUS**

#### **Algoritmo Completo**

```typescript
function calcularPneus(input: PneusInput): PneusOutput {
  // Etapa A: Meta Base
  const custoPrevistoBruto = input.kmPrevista * input.custoKmPneu;
  const valorPremiacao = custoPrevistoBruto * input.percentualPremiacao;
  const metaBase = custoPrevistoBruto - valorPremiacao;

  // Etapa B: Sistema de Saldo
  const saldoDevedor = calcularSaldoDevedor(input.dadosSaldo);
  const metaFinalAjustada = metaBase - saldoDevedor.saldoDevedor;

  // Etapa C: Por Veículo (informativo)
  const metaPorVeiculo = metaFinalAjustada / input.qtdVeiculos;

  return {
    sectorId: input.sectorId,
    metaFinalReais: metaFinalAjustada,
    metaPorVeiculo,
    detalhesCalculo: {
      kmPrevista: input.kmPrevista,
      custoKmPneu: input.custoKmPneu,
      custoPrevistoBruto,
      valorPremiacao,
      metaBase,
      saldoDevedor: saldoDevedor.saldoDevedor,
      qtdVeiculos: input.qtdVeiculos,
    },
    sistemasSaldo: saldoDevedor,
  };
}
```

### **4.5 Cálculo PEÇAS**

```typescript
// Algoritmo idêntico ao PNEUS, apenas com:
// - input.custoKmPecas (ao invés de custoKmPneu)
// - Dados de saldo específicos para PEÇAS
```

---

## **5. ESTRUTURAS DE DADOS (Entidades e Tabelas)**

### **5.1 Nova Entidade: OperationalGoalsCalculation**

```typescript
@Entity('operational_goals_calculations')
export class OperationalGoalsCalculationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  competitionPeriodId: number;

  @Column({ type: 'timestamp' })
  calculationDate: Date;

  @Column()
  calculatedByUserId: number;

  @Column({ type: 'varchar', length: 50 })
  status: 'CALCULATING' | 'COMPLETED' | 'APPROVED' | 'ERROR';

  // Dados KM PREVISTA
  @Column({ type: 'jsonb' })
  kmPrevistaData: {
    [sectorId: string]: KmPrevistaOutput;
  };

  // Dados COMBUSTÍVEL
  @Column({ type: 'jsonb' })
  combustivelData: {
    [sectorId: string]: CombustivelOutput;
  };

  // Dados PNEUS
  @Column({ type: 'jsonb' })
  pneusData: {
    [sectorId: string]: PneusOutput;
  };

  // Dados PEÇAS
  @Column({ type: 'jsonb' })
  pecasData: {
    [sectorId: string]: PecasOutput;
  };

  // Parâmetros utilizados no cálculo
  @Column({ type: 'jsonb' })
  parametersUsed: CalculationParameters;

  // Snapshot dos dados Oracle no momento do cálculo
  @Column({ type: 'jsonb' })
  oracleDataSnapshot: any;

  // Classificação de feriados utilizada
  @Column({ type: 'jsonb' })
  holidayClassifications: {
    [date: string]: 'UTIL' | 'SABADO' | 'DOMINGO_FERIADO';
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relacionamentos
  @ManyToOne(() => CompetitionPeriodEntity)
  @JoinColumn({ name: 'competitionPeriodId' })
  competitionPeriod: CompetitionPeriodEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'calculatedByUserId' })
  calculatedBy: UserEntity;
}
```

### **5.2 Nova Entidade: HolidayClassification**

```typescript
@Entity('holiday_classifications')
export class HolidayClassificationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  competitionPeriodId: number;

  @Column({ type: 'date' })
  holidayDate: string;

  @Column({ type: 'varchar', length: 100 })
  holidayName: string;

  @Column({ type: 'varchar', length: 20 })
  classification: 'UTIL' | 'SABADO' | 'DOMINGO_FERIADO';

  @Column()
  classifiedByUserId: number;

  @CreateDateColumn()
  createdAt: Date;

  // Relacionamentos
  @ManyToOne(() => CompetitionPeriodEntity)
  @JoinColumn({ name: 'competitionPeriodId' })
  competitionPeriod: CompetitionPeriodEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'classifiedByUserId' })
  classifiedBy: UserEntity;
}
```

### **5.3 Nova Entidade: CalculationParameters**

```typescript
@Entity('calculation_parameters')
export class CalculationParametersEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  parameterName: string;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  parameterValue: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @Column()
  updatedByUserId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'updatedByUserId' })
  updatedBy: UserEntity;
}

// Registros padrão:
// PERCENTUAL_TOLERANCIA_SALDO → 0.08
// FATOR_REDUCAO_COMBUSTIVEL → 0.015
// PERCENTUAL_PREMIACAO_PNEUS → 0.03
// PERCENTUAL_PREMIACAO_PECAS → 0.03
// PRECO_COMBUSTIVEL_POR_LITRO → 4.46193
```

### **5.4 Tabelas Temporárias (ETL Oracle)**

```typescript
@Entity('oracle_operational_data_temp')
export class OracleOperationalDataTempEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  calculationId: number; // FK para OperationalGoalsCalculationEntity

  @Column({ type: 'date' })
  dataOperacao: string;

  @Column()
  erpSectorId: number;

  @Column()
  sectorId: number; // FK para SectorEntity

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  kmRodada: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  litrosConsumidos: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  custoPneus: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  custoPecas: number;

  @Column({ type: 'varchar', length: 20 })
  tipoDia: 'UTIL' | 'SABADO' | 'DOMINGO_FERIADO';

  @CreateDateColumn()
  createdAt: Date;
}
```

---

## **6. APIs E SERVIÇOS**

### **6.1 OperationalGoalsService**

```typescript
@Injectable()
export class OperationalGoalsService {
  // Método principal de cálculo
  async calculateOperationalGoals(
    competitionPeriodId: number,
    userId: number,
    holidayClassifications: HolidayClassificationDto[]
  ): Promise<OperationalGoalsCalculationEntity>;

  // Validações pré-cálculo
  async validateCalculationPrerequisites(
    competitionPeriodId: number
  ): Promise<ValidationResult>;

  // ETL de dados Oracle
  async loadOracleData(
    competitionPeriodId: number,
    calculationId: number
  ): Promise<void>;

  // Cálculos específicos
  async calculateKmPrevista(
    sectorId: number,
    calculationData: CalculationData
  ): Promise<KmPrevistaOutput>;

  async calculateCombustivel(
    sectorId: number,
    kmPrevista: number,
    calculationData: CalculationData
  ): Promise<CombustivelOutput>;

  async calculatePneus(
    sectorId: number,
    kmPrevista: number,
    calculationData: CalculationData
  ): Promise<PneusOutput>;

  async calculatePecas(
    sectorId: number,
    kmPrevista: number,
    calculationData: CalculationData
  ): Promise<PecasOutput>;

  // Aprovação e salvamento final
  async approveCalculationResults(
    calculationId: number,
    userId: number
  ): Promise<void>;

  // Interface de transparência
  async getCalculationDetails(
    calculationId: number,
    sectorId?: number,
    criterion?: string
  ): Promise<TransparencyReport>;
}
```

### **6.2 HolidayManagementService**

```typescript
@Injectable()
export class HolidayManagementService {
  // Detectar feriados automaticamente
  async detectHolidays(competitionPeriodId: number): Promise<DetectedHoliday[]>;

  // Salvar classificações do diretor
  async saveHolidayClassifications(
    competitionPeriodId: number,
    classifications: HolidayClassificationDto[],
    userId: number
  ): Promise<void>;

  // Verificar se todos feriados foram classificados
  async areAllHolidaysClassified(competitionPeriodId: number): Promise<boolean>;

  // Gerar calendário com tipos de dia
  async generateCalendarWithDayTypes(
    competitionPeriodId: number
  ): Promise<CalendarDay[]>;
}
```

### **6.3 CalculationParametersService**

```typescript
@Injectable()
export class CalculationParametersService {
  // Buscar todos parâmetros ativos
  async getActiveParameters(): Promise<CalculationParameters>;

  // Atualizar parâmetro específico
  async updateParameter(
    parameterName: string,
    newValue: number,
    userId: number
  ): Promise<CalculationParametersEntity>;

  // Histórico de alterações
  async getParameterHistory(
    parameterName: string
  ): Promise<ParameterHistoryItem[]>;
}
```

### **6.4 OracleDataService**

```typescript
@Injectable()
export class OracleDataService {
  // Buscar dados operacionais diários
  async fetchDailyOperationalData(
    startDate: string,
    endDate: string,
    sectorIds: number[]
  ): Promise<DailyOperationalData[]>;

  // Buscar consolidados mensais
  async fetchMonthlyConsolidatedData(
    months: string[],
    sectorIds: number[]
  ): Promise<MonthlyConsolidatedData[]>;

  // Buscar contagem de veículos por setor
  async fetchVehicleCountBySector(): Promise<VehicleCount[]>;

  // Calcular custos médios anuais (Anexo A)
  async calculateAnnualAverageCosts(
    criterionType: 'PNEUS' | 'PECAS',
    sectorId: number,
    months: string[]
  ): Promise<number>;
}
```

---

## **7. REGRAS DE NEGÓCIO E VALIDAÇÕES**

### **7.1 Validações Pré-Cálculo**

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

class CalculationValidator {
  async validateCompetitionPeriodStatus(
    competitionPeriodId: number
  ): Promise<ValidationResult> {
    // Verificar se status = PLANEJAMENTO
  }

  async validateHolidayClassifications(
    competitionPeriodId: number
  ): Promise<ValidationResult> {
    // Verificar se todos feriados foram classificados
  }

  async validateOracleDataAvailability(
    competitionPeriodId: number
  ): Promise<ValidationResult> {
    // Verificar dados dos últimos 3 e 12 meses
    // Verificar se todos setores têm dados
    // Verificar consistência de dados
  }

  async validateParametersConfiguration(): Promise<ValidationResult> {
    // Verificar se todos parâmetros necessários estão configurados
    // Verificar se valores são válidos (> 0, < 1 para percentuais)
  }

  async validatePreviousGoalsAndSpending(
    competitionPeriodId: number
  ): Promise<ValidationResult> {
    // Verificar se período anterior tem metas aprovadas (para saldo)
    // Verificar se período anterior tem gastos reais
  }

  async validateFleetData(): Promise<ValidationResult> {
    // Verificar se cadastro da frota está atualizado
    // Verificar se todos setores têm pelo menos 1 veículo
  }
}
```

### **7.2 Regras de Negócio Específicas**

```typescript
class BusinessRules {
  static readonly MIN_HISTORICAL_MONTHS = 3;
  static readonly MAX_HISTORICAL_MONTHS = 12;
  static readonly MIN_VEHICLES_PER_SECTOR = 1;
  static readonly MAX_TOLERANCE_PERCENTAGE = 0.5; // 50%

  // Regra: KM PREVISTA não pode ser negativa ou zero
  static validateKmPrevista(value: number): boolean {
    return value > 0;
  }

  // Regra: Meta de combustível não pode exceder 2x a média histórica
  static validateCombustivelMeta(
    metaCalculada: number,
    mediaHistorica: number
  ): boolean {
    return metaCalculada <= mediaHistorica * 2;
  }

  // Regra: Saldo devedor não pode tornar meta negativa
  static validateSaldoDevedor(
    metaBase: number,
    saldoDevedor: number
  ): { isValid: boolean; adjustedValue?: number } {
    const metaAjustada = metaBase - saldoDevedor;

    if (metaAjustada < 0) {
      return {
        isValid: false,
        adjustedValue: metaBase * 0.1, // Meta mínima = 10% da base
      };
    }

    return { isValid: true };
  }

  // Regra: Custos médios devem estar dentro de faixa aceitável
  static validateAverageCosts(
    custoMedio: number,
    criterionType: 'PNEUS' | 'PECAS'
  ): boolean {
    const ranges = {
      PNEUS: { min: 0.1, max: 2.0 }, // R$/km
      PECAS: { min: 0.5, max: 5.0 }, // R$/km
    };

    const range = ranges[criterionType];
    return custoMedio >= range.min && custoMedio <= range.max;
  }
}
```

---

## **8. SISTEMA DE AUDITORIA E TRANSPARÊNCIA**

### **8.1 Logs de Auditoria**

```typescript
interface CalculationAuditLog {
  calculationId: number;
  step: string;
  action: string;
  inputData: any;
  outputData: any;
  executionTime: number; // ms
  timestamp: Date;
  userId: number;
}

// Exemplos de logs:
// "ETL_ORACLE_DATA" → "Carregamento de dados Oracle concluído"
// "CALCULATE_KM_PREVISTA" → "Cálculo KM PREVISTA para setor X"
// "APPLY_SALDO_DEVEDOR" → "Aplicação do sistema de saldo para PNEUS"
// "SAVE_PARAMETER_VALUE" → "Salvamento da meta no sistema principal"
```

### **8.2 Interface de Transparência**

```typescript
interface TransparencyReport {
  calculationId: number;
  competitionPeriod: string;
  sectorName: string;
  criterion: 'COMBUSTIVEL' | 'PNEUS' | 'PECAS';

  // Resultado Final
  finalValue: number;
  unit: 'LITROS' | 'REAIS';

  // Passo-a-passo do Cálculo
  calculationSteps: {
    stepNumber: number;
    stepName: string;
    formula: string;
    inputValues: { [key: string]: number };
    result: number;
    explanation: string;
  }[];

  // Dados Base Utilizados
  baseData: {
    kmPrevista?: number;
    historicoUtilizado: any[];
    parametrosAplicados: { [key: string]: number };
    sistemasSaldo?: SaldoDevedorOutput;
  };

  // Metadados
  calculationDate: Date;
  calculatedBy: string;
  dataSourcesUsed: string[];
  validationsApplied: string[];
}

// Exemplo de Relatório para COMBUSTÍVEL:
const exemploTransparencia: TransparencyReport = {
  calculationId: 123,
  competitionPeriod: '2025-08',
  sectorName: 'SÃO SEBASTIÃO',
  criterion: 'COMBUSTIVEL',
  finalValue: 40501,
  unit: 'LITROS',

  calculationSteps: [
    {
      stepNumber: 1,
      stepName: 'Cálculo da Média de Eficiência',
      formula: 'TotalKM ÷ TotalLitros',
      inputValues: {
        'Total KM (3 meses)': 380000,
        'Total Litros (3 meses)': 125000,
      },
      result: 3.04,
      explanation: 'Média de 3.04 km/L baseada nos últimos 3 meses',
    },
    {
      stepNumber: 2,
      stepName: 'Previsão Bruta de Consumo',
      formula: 'KM_PREVISTA ÷ MediaKmPorLitro',
      inputValues: {
        'KM Prevista': 125000,
        'Média km/L': 3.04,
      },
      result: 41118,
      explanation: 'Consumo previsto sem aplicação de meta de redução',
    },
    {
      stepNumber: 3,
      stepName: 'Aplicação do Fator de Redução',
      formula: 'Previsão Bruta × (1 - FatorRedução)',
      inputValues: {
        'Previsão Bruta': 41118,
        'Fator Redução': 0.015,
      },
      result: 40501,
      explanation: 'Meta operacional com 1,5% de redução aplicada',
    },
  ],

  baseData: {
    kmPrevista: 125000,
    historicoUtilizado: [
      { mes: '2025-05', km: 128000, litros: 42100 },
      { mes: '2025-06', km: 126000, litros: 41500 },
      { mes: '2025-07', km: 126000, litros: 41400 },
    ],
    parametrosAplicados: {
      'Fator Redução Combustível': 0.015,
    },
  },

  calculationDate: new Date('2025-08-02'),
  calculatedBy: 'Diretor Silva',
  dataSourcesUsed: ['Oracle ERP', 'Histórico Interno'],
  validationsApplied: ['Consistência de Dados', 'Faixa Aceitável'],
};
```

---

## **9. INTEGRAÇÃO COM SISTEMA EXISTENTE**

### **9.1 Salvamento Simplificado em ParameterValueEntity**

```typescript
interface ParameterValueIntegration {

  async saveCalculatedGoalsAsParameters(
    calculationId: number,
    userId: number
  ): Promise<ParameterValueEntity[]> {

    const calculation = await this.getCalculation(calculationId);
    const savedParameters: ParameterValueEntity[] = [];

    // Para cada setor
    for (const sectorId of Object.keys(calculation.combustivelData)) {

      // COMBUSTÍVEL
      const combustivelParam = await this.parameterService.calculateParameter({
        criterionId: this.criterionMapping.COMBUSTIVEL,
        sectorId: parseInt(sectorId),
        competitionPeriodId: calculation.competitionPeriodId,
        calculationMethod: 'manual',
        finalValue: calculation.combustivelData[sectorId].metaConsumoLitros,
        justificativa: `Meta automática - Cálculo ID: ${calculationId}`,
        previewOnly: false,
        metadata: {
          calculationId: calculationId,
          calculationMethod: 'automatic_operational_goals',
          wasCalculatedAutomatically: true
        }
      }, { id: userId } as UserEntity);

      savedParameters.push(combustivelParam);

      // PNEUS - mesmo padrão
      const pneusParam = await this.parameterService.calculateParameter({
        criterionId: this.criterionMapping.PNEUS,
        sectorId: parseInt(sectorId),
        competitionPeriodId: calculation.competitionPeriodId,
        calculationMethod: 'manual',
        finalValue: calculation.pneusData[sectorId].metaFinalReais,
        justificativa: `Meta automática - Cálculo ID: ${calculationId}`,
        previewOnly: false,
        metadata: {
          calculationId: calculationId,
          calculationMethod: 'automatic_operational_goals',
          wasCalculatedAutomatically: true
        }
      }, { id: userId } as UserEntity);

      savedParameters.push(pneusParam);

      // PEÇAS - mesmo padrão
      // ... (similar aos anteriores)
    }

    return savedParameters;
  }
}
```

---

## **10. CENÁRIOS DE EXCEÇÃO E TRATAMENTOS**

### **10.1 Tratamento de Dados Faltantes**

```typescript
class DataValidationService {
  async handleMissingOracleData(
    missingData: MissingDataReport
  ): Promise<DataRecoveryStrategy> {
    const strategies = {
      // Falta dados de 1 mês dos últimos 3
      PARTIAL_HISTORICAL_DATA: {
        action: 'USE_AVAILABLE_MONTHS',
        description: 'Calcular média com os meses disponíveis',
        requiresApproval: true,
        warningMessage: 'Meta calculada com dados incompletos',
      },

      // Falta dados de um setor específico
      MISSING_SECTOR_DATA: {
        action: 'EXCLUDE_FROM_CALCULATION',
        description: 'Excluir setor do cálculo automático',
        requiresApproval: true,
        warningMessage: 'Setor deve ter meta definida manualmente',
      },

      // Falta dados de veículos
      MISSING_FLEET_DATA: {
        action: 'USE_LAST_KNOWN_COUNT',
        description: 'Usar última contagem conhecida de veículos',
        requiresApproval: true,
        warningMessage: 'Contagem de veículos pode estar desatualizada',
      },

      // Falta dados críticos (> 50% dos dados necessários)
      CRITICAL_DATA_MISSING: {
        action: 'BLOCK_CALCULATION',
        description: 'Bloquear cálculo até dados serem corrigidos',
        requiresApproval: false,
        errorMessage: 'Dados insuficientes para cálculo confiável',
      },
    };

    return strategies[missingData.severity];
  }
}
```

### **10.2 Tratamento de Valores Anômalos**

```typescript
class AnomalyDetectionService {
  async detectAnomalies(
    calculationResults: CalculationResults
  ): Promise<AnomalyReport[]> {
    const anomalies: AnomalyReport[] = [];

    // Verificar KM PREVISTA muito diferente da média histórica
    for (const sectorId in calculationResults.kmPrevista) {
      const kmPrevista = calculationResults.kmPrevista[sectorId];
      const mediaHistorica = this.getHistoricalAverage(sectorId, 'KM');

      const variance = Math.abs(kmPrevista - mediaHistorica) / mediaHistorica;

      if (variance > 0.3) {
        // 30% de diferença
        anomalies.push({
          type: 'KM_PREVISTA_ANOMALY',
          sectorId: sectorId,
          expectedValue: mediaHistorica,
          calculatedValue: kmPrevista,
          variance: variance,
          severity: variance > 0.5 ? 'HIGH' : 'MEDIUM',
          recommendation:
            'Verificar classificação de feriados e dados de entrada',
        });
      }
    }

    // Verificar meta negativa por saldo devedor
    for (const sectorId in calculationResults.pneus) {
      const pneusMeta = calculationResults.pneus[sectorId];

      if (pneusMeta.metaFinalReais < 0) {
        anomalies.push({
          type: 'NEGATIVE_TARGET_DUE_TO_DEBT',
          sectorId: sectorId,
          calculatedValue: pneusMeta.metaFinalReais,
          saldoDevedor: pneusMeta.detalhesCalculo.saldoDevedor,
          severity: 'HIGH',
          recommendation:
            'Ajustar percentual de tolerância ou usar meta mínima',
        });
      }
    }

    return anomalies;
  }

  async suggestCorrections(
    anomalies: AnomalyReport[]
  ): Promise<CorrectionSuggestion[]> {
    return anomalies
      .map((anomaly) => {
        switch (anomaly.type) {
          case 'KM_PREVISTA_ANOMALY':
            return {
              anomalyId: anomaly.id,
              correctionType: 'MANUAL_REVIEW',
              suggestedActions: [
                'Revisar classificação de feriados',
                'Verificar dados de entrada no Oracle',
                'Considerar eventos especiais no período',
              ],
              alternativeValue: this.calculateAlternativeKmPrevista(
                anomaly.sectorId
              ),
            };

          case 'NEGATIVE_TARGET_DUE_TO_DEBT':
            return {
              anomalyId: anomaly.id,
              correctionType: 'AUTOMATIC_ADJUSTMENT',
              suggestedActions: [
                'Aplicar meta mínima (10% da meta base)',
                'Considerar parcelamento do saldo devedor',
              ],
              alternativeValue: anomaly.baseValue * 0.1,
            };

          default:
            return null;
        }
      })
      .filter(Boolean);
  }
}
```

### **10.3 Rollback e Recuperação**

```typescript
class CalculationRecoveryService {
  async rollbackCalculation(
    calculationId: number,
    userId: number,
    reason: string
  ): Promise<void> {
    await AppDataSource.transaction(async (manager) => {
      // 1. Marcar cálculo como cancelado
      await manager.update(OperationalGoalsCalculationEntity, calculationId, {
        status: 'CANCELLED',
        updatedAt: new Date(),
      });

      // 2. Remover parâmetros criados automaticamente
      const parametersToRemove = await manager.find(ParameterValueEntity, {
        where: {
          metadata: { calculationId: calculationId },
        },
      });

      for (const param of parametersToRemove) {
        await this.parameterService.softDeleteParameter(
          param.id,
          userId,
          manager
        );
      }

      // 3. Reverter atualizações em performance_data
      await manager.query(
        `
        UPDATE performance_data 
        SET targetValue = null, 
            updatedAt = NOW()
        WHERE competitionPeriodId = (
          SELECT competitionPeriodId 
          FROM operational_goals_calculations 
          WHERE id = $1
        )
        AND criterionId IN (
          SELECT id FROM criteria 
          WHERE name IN ('COMBUSTIVEL', 'PNEUS', 'PECAS')
        )
      `,
        [calculationId]
      );

      // 4. Registrar auditoria
      await this.auditService.log({
        actionType: 'CALCULATION_ROLLBACK',
        entityType: 'OperationalGoalsCalculation',
        entityId: calculationId.toString(),
        userId: userId,
        details: { reason: reason },
        justification: reason,
      });
    });
  }

  async recalculateAfterCorrection(
    originalCalculationId: number,
    userId: number,
    correctedData: CorrectedInputData
  ): Promise<OperationalGoalsCalculationEntity> {
    // 1. Fazer rollback do cálculo anterior
    await this.rollbackCalculation(
      originalCalculationId,
      userId,
      'Recálculo com dados corrigidos'
    );

    // 2. Executar novo cálculo com dados corrigidos
    const newCalculation =
      await this.operationalGoalsService.calculateOperationalGoals(
        correctedData.competitionPeriodId,
        userId,
        correctedData.holidayClassifications
      );

    // 3. Registrar relação entre cálculos
    await this.auditService.log({
      actionType: 'CALCULATION_RECALCULATED',
      entityType: 'OperationalGoalsCalculation',
      entityId: newCalculation.id.toString(),
      userId: userId,
      details: {
        originalCalculationId: originalCalculationId,
        correctionReason: correctedData.correctionReason,
      },
    });

    return newCalculation;
  }
}
```

---

## **11. SEQUÊNCIA DE IMPLEMENTAÇÃO**

### **11.1 Fase 1: Fundação (Semanas 1-2)**

#### **Objetivos:**

- Estabelecer estrutura de dados
- Implementar serviços básicos
- Configurar integração Oracle

#### **Entregas:**

```
✅ Entidades do banco de dados criadas:
   - OperationalGoalsCalculationEntity
   - HolidayClassificationEntity
   - CalculationParametersEntity
   - OracleOperationalDataTempEntity

✅ Modificação em SectorEntity (campo erpId)

✅ Serviços base implementados:
   - CalculationParametersService
   - OracleDataService (consultas básicas)
   - HolidayManagementService (detecção de feriados)

✅ Scripts de migração do banco
✅ Testes unitários dos serviços base
```

### **11.2 Fase 2: Motor de Cálculo (Semanas 3-4)**

#### **Objetivos:**

- Implementar algoritmos de cálculo
- Criar validações de negócio
- Desenvolver sistema de auditoria

#### **Entregas:**

```
✅ OperationalGoalsService (métodos de cálculo):
   - calculateKmPrevista()
   - calculateCombustivel()
   - calculatePneus()
   - calculatePecas()

✅ Validações e regras de negócio:
   - CalculationValidator
   - BusinessRules
   - AnomalyDetectionService

✅ Sistema de transparência:
   - Geração de relatórios detalhados
   - Logs de auditoria completos

✅ Testes de cálculo com dados reais
✅ Documentação dos algoritmos
```

### **11.3 Fase 3: Integração e ETL (Semanas 5-6)**

#### **Objetivos:**

- Integrar com sistema existente
- Implementar ETL Oracle robusto
- Criar tratamento de exceções

#### **Entregas:**

```
✅ Integração completa:
   - Salvamento em ParameterValueEntity
   - Atualização de PerformanceDataEntity
   - Sincronização com sistema de premiação

✅ ETL Oracle robusto:
   - Carregamento de dados históricos
   - Validação de integridade
   - Tratamento de erros

✅ Gestão de exceções:
   - DataValidationService
   - CalculationRecoveryService
   - Rollback e recálculo

✅ Testes de integração completos
✅ Performance testing
```

### **11.4 Fase 4: Interface e Workflow (Semanas 7-8)**

#### **Objetivos:**

- Implementar APIs REST
- Criar workflow completo
- Finalizar documentação

#### **Entregas:**

```
✅ APIs REST completas:
   - Endpoints de cálculo
   - Endpoints de parâmetros
   - Endpoints de transparência

✅ Workflow integrado:
   - Detecção de feriados
   - Interface de classificação
   - Aprovação de metas

✅ Documentação final:
   - API documentation (Swagger)
   - Manual de operação
   - Troubleshooting guide

✅ Testes de aceitação
✅ Treinamento da equipe
```

### **11.5 Fase 5: Homologação e Go-Live (Semanas 9-10)**

#### **Objetivos:**

- Testes em ambiente de produção
- Validação com usuários finais
- Deploy seguro

#### **Entregas:**

```
✅ Ambiente de homologação:
   - Deploy completo
   - Dados de teste realistas
   - Validação de cálculos

✅ Testes com usuários:
   - Validação do workflow
   - Comparação com Excel atual
   - Aprovação da diretoria

✅ Deploy de produção:
   - Migração segura
   - Monitoramento ativo
   - Suporte pós-deploy

✅ Documentação de produção
✅ Plano de contingência
```

---

## **12. ENDPOINTS DE API**

### **12.1 Gestão de Parâmetros**

```typescript
// GET /api/operational-goals/parameters
// Buscar todos os parâmetros configuráveis
interface GetParametersResponse {
  parameters: {
    PERCENTUAL_TOLERANCIA_SALDO: number;
    FATOR_REDUCAO_COMBUSTIVEL: number;
    PERCENTUAL_PREMIACAO_PNEUS: number;
    PERCENTUAL_PREMIACAO_PECAS: number;
    PRECO_COMBUSTIVEL_POR_LITRO: number;
  };
  lastUpdated: Date;
  updatedBy: string;
}

// PUT /api/operational-goals/parameters/:parameterName
// Atualizar parâmetro específico
interface UpdateParameterRequest {
  value: number;
  justification: string;
}

interface UpdateParameterResponse {
  parameter: CalculationParametersEntity;
  previousValue: number;
  auditLogId: number;
}
```

### **12.2 Gestão de Feriados**

```typescript
// GET /api/operational-goals/holidays/:competitionPeriodId
// Buscar feriados do período
interface GetHolidaysResponse {
  competitionPeriod: string;
  holidays: {
    date: string;
    name: string;
    classification?: 'UTIL' | 'SABADO' | 'DOMINGO_FERIADO';
    isClassified: boolean;
  }[];
  allClassified: boolean;
}

// POST /api/operational-goals/holidays/:competitionPeriodId/classify
// Classificar feriados
interface ClassifyHolidaysRequest {
  classifications: {
    date: string;
    classification: 'UTIL' | 'SABADO' | 'DOMINGO_FERIADO';
  }[];
}

interface ClassifyHolidaysResponse {
  saved: number;
  classifications: HolidayClassificationEntity[];
}
```

### **12.3 Execução de Cálculos**

```typescript
// POST /api/operational-goals/calculate/:competitionPeriodId
// Executar cálculo das metas
interface CalculateGoalsRequest {
  validateOnly?: boolean; // true = apenas validar, não calcular
  forceRecalculate?: boolean; // true = recalcular mesmo se já existe
}

interface CalculateGoalsResponse {
  calculationId: number;
  status: 'CALCULATING' | 'COMPLETED' | 'ERROR';
  results?: {
    combustivel: { [sectorId: string]: CombustivelOutput };
    pneus: { [sectorId: string]: PneusOutput };
    pecas: { [sectorId: string]: PecasOutput };
  };
  validationErrors?: ValidationError[];
  warnings?: ValidationWarning[];
  anomalies?: AnomalyReport[];
}

// GET /api/operational-goals/calculations/:calculationId/status
// Verificar status do cálculo
interface CalculationStatusResponse {
  calculationId: number;
  status: 'CALCULATING' | 'COMPLETED' | 'ERROR' | 'CANCELLED';
  progress?: number; // 0-100
  currentStep?: string;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}
```

### **12.4 Aprovação e Integração**

```typescript
// POST /api/operational-goals/calculations/:calculationId/approve
// Aprovar e salvar metas no sistema principal
interface ApproveCalculationRequest {
  approvedResults: {
    [criterion: string]: {
      [sectorId: string]: {
        value: number;
        approved: boolean;
        customValue?: number; // Se diretor quer valor diferente
        justification?: string;
      };
    };
  };
}

interface ApproveCalculationResponse {
  savedParameters: ParameterValueEntity[];
  updatedPerformanceData: number; // quantos registros atualizados
  integrationStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  errors?: string[];
}

// POST /api/operational-goals/calculations/:calculationId/rollback
// Reverter cálculo aprovado
interface RollbackCalculationRequest {
  reason: string;
  confirmRollback: boolean;
}

interface RollbackCalculationResponse {
  rollbackId: number;
  parametersRemoved: number;
  performanceDataReverted: number;
  auditLogId: number;
}
```

### **12.5 Transparência e Relatórios**

```typescript
// GET /api/operational-goals/calculations/:calculationId/transparency
// Relatório de transparência detalhado
interface TransparencyQuery {
  sectorId?: number;
  criterion?: 'COMBUSTIVEL' | 'PNEUS' | 'PECAS';
  includeRawData?: boolean;
}

interface TransparencyResponse {
  calculation: OperationalGoalsCalculationEntity;
  reports: TransparencyReport[];
  rawDataUsed?: any;
  parametersSnapshot: CalculationParameters;
}

// GET /api/operational-goals/history/:competitionPeriodId
// Histórico de cálculos para um período
interface CalculationHistoryResponse {
  competitionPeriod: string;
  calculations: {
    id: number;
    calculationDate: Date;
    status: string;
    calculatedBy: string;
    isApproved: boolean;
    isActive: boolean; // true = está sendo usado no sistema
  }[];
  currentActiveCalculation?: number;
}
```

---

## **13. CONSIDERAÇÕES FINAIS E PRÓXIMOS PASSOS**

### **13.1 Resumo Executivo**

Esta documentação técnica detalha a automação completa do cálculo de metas operacionais para **COMBUSTÍVEL**, **PNEUS** e **PEÇAS**, substituindo o processo manual em Excel por um sistema integrado robusto e auditável.

**Características Principais:**

- ✅ **Cálculos automáticos** baseados em dados do ERP Oracle
- ✅ **Sistema de saldo** para ajustes retroativos (PNEUS/PEÇAS)
- ✅ **Transparência total** com auditoria completa
- ✅ **Integração nativa** com sistema de premiação existente
- ✅ **Validações robustas** e tratamento de exceções
- ✅ **Interface administrativa** para configuração de parâmetros

### **13.2 Benefícios Esperados**

```
🎯 OPERACIONAIS:
├── Redução de 95% no tempo de cálculo das metas
├── Eliminação de erros manuais de planilha
├── Transparência total dos cálculos realizados
└── Auditoria completa de todas as operações

📊 TÉCNICOS:
├── Integração nativa com sistema existente
├── Dados históricos preservados permanentemente
├── Validações automáticas de consistência
└── Recuperação automática de erros

🏢 ESTRATÉGICOS:
├── Maior confiabilidade nos dados de premiação
├── Decisões baseadas em cálculos padronizados
├── Facilidade para ajustes de parâmetros
└── Base sólida para futuras expansões
```

### **13.3 Riscos e Mitigações**

```
⚠️ RISCOS IDENTIFICADOS:

1. Dependência do ERP Oracle
   MITIGAÇÃO: Validações robustas + tratamento de falhas

2. Complexidade do Sistema de Saldo
   MITIGAÇÃO: Testes extensivos + interface de transparência

3. Integração com Sistema Existente
   MITIGAÇÃO: Abordagem incremental + rollback automático

4. Mudanças nas Regras de Negócio
   MITIGAÇÃO: Parâmetros configuráveis + versionamento
```

### **13.4 Métricas de Sucesso**

```
📈 METAS DE IMPLEMENTAÇÃO:

✅ Tempo de cálculo: < 5 minutos (vs 2-3 horas manual)
✅ Precisão: 100% de aderência às regras do Excel
✅ Disponibilidade: 99.5% durante horário comercial
✅ Transparência: 100% dos cálculos auditáveis
✅ Integração: 0 regressões no sistema existente
```

### **13.5 Pós-Implementação**

```
🔮 EVOLUÇÕES FUTURAS:

1. Dashboard executivo com análises de tendências
2. Alertas automáticos para anomalias significativas
3. API para integração com outros sistemas
4. Machine learning para otimização de parâmetros
5. Expansão para outros critérios operacionais
```

---

## **📋 CHECKLIST DE IMPLEMENTAÇÃO**

### **Preparação:**

- [ ] Aprovação da documentação técnica
- [ ] Definição da equipe de desenvolvimento
- [ ] Setup do ambiente de desenvolvimento
- [ ] Acesso aos sistemas Oracle de homologação

### **Fase 1 - Fundação:**

- [ ] Criação das entidades de banco
- [ ] Implementação dos serviços base
- [ ] Configuração da integração Oracle
- [ ] Testes unitários da base

### **Fase 2 - Motor de Cálculo:**

- [ ] Implementação dos algoritmos
- [ ] Sistema de validações
- [ ] Framework de auditoria
- [ ] Testes de cálculo

### **Fase 3 - Integração:**

- [ ] ETL Oracle robusto
- [ ] Integração com sistema existente
- [ ] Tratamento de exceções
- [ ] Testes de integração

### **Fase 4 - Interface:**

- [ ] APIs REST completas
- [ ] Workflow de aprovação
- [ ] Interface de transparência
- [ ] Testes de aceitação

### **Fase 5 - Deploy (continuação):**

- [ ] Ambiente de homologação
- [ ] Testes com usuários finais
- [ ] Validação dos cálculos vs Excel
- [ ] Deploy de produção
- [ ] Monitoramento pós-deploy
- [ ] Treinamento da equipe
- [ ] Documentação de produção
- [ ] Plano de contingência ativo

---

## **14. ANEXOS TÉCNICOS**

### **14.1 Estrutura de Dados Oracle (Consultas SQL)**

#### **A. Consulta Base para Operação Diária**

```sql
-- Buscar dados diários para KM PREVISTA
SELECT
    TO_CHAR(data_operacao, 'YYYY-MM-DD') as data_operacao,
    codigo_setor,
    SUM(km_rodada) as km_rodada_dia,
    CASE
        WHEN TO_CHAR(data_operacao, 'D') = '1' THEN 'DOMINGO_FERIADO'  -- Domingo
        WHEN TO_CHAR(data_operacao, 'D') = '7' THEN 'SABADO'           -- Sábado
        ELSE 'UTIL'                                                     -- Dias úteis
    END as tipo_dia_automatico
FROM oracle_operacao_frota
WHERE data_operacao >= :data_inicio
  AND data_operacao <= :data_fim
  AND codigo_setor IN (124, 239, 240, 31)
  AND status_registro = 'ATIVO'
GROUP BY data_operacao, codigo_setor
ORDER BY data_operacao DESC, codigo_setor;
```

#### **B. Consulta para Consolidados Mensais**

```sql
-- Buscar dados mensais para históricos
SELECT
    TO_CHAR(data_operacao, 'YYYY-MM') as ano_mes,
    codigo_setor,
    SUM(km_rodada) as total_km_mes,
    SUM(litros_combustivel) as total_litros_mes,
    SUM(CASE WHEN tipo_custo = 'PNEUS' THEN valor_custo ELSE 0 END) as custo_pneus_mes,
    SUM(CASE WHEN tipo_custo = 'PECAS' THEN valor_custo ELSE 0 END) as custo_pecas_mes,
    COUNT(DISTINCT data_operacao) as dias_operacao
FROM oracle_operacao_frota o
LEFT JOIN oracle_custos_operacionais c ON (
    c.codigo_setor = o.codigo_setor
    AND c.data_custo = o.data_operacao
    AND c.tipo_custo IN ('PNEUS', 'PECAS')
)
WHERE TO_CHAR(data_operacao, 'YYYY-MM') IN (:lista_meses)
  AND o.codigo_setor IN (124, 239, 240, 31)
  AND o.status_registro = 'ATIVO'
GROUP BY TO_CHAR(data_operacao, 'YYYY-MM'), codigo_setor
ORDER BY ano_mes DESC, codigo_setor;
```

#### **C. Consulta para Cadastro da Frota**

```sql
-- Buscar contagem de veículos por setor
SELECT
    codigo_setor,
    COUNT(*) as qtd_veiculos_ativo,
    COUNT(CASE WHEN status_veiculo = 'OPERACIONAL' THEN 1 END) as qtd_operacional,
    MAX(data_ultima_atualizacao) as ultima_atualizacao
FROM oracle_cadastro_veiculos
WHERE status_registro = 'ATIVO'
  AND codigo_setor IN (124, 239, 240, 31)
GROUP BY codigo_setor
ORDER BY codigo_setor;
```

#### **D. Consulta para Custos Médios Anuais (Anexo A)**

```sql
-- Calcular R$/km para PNEUS e PEÇAS (últimos 12 meses)
WITH dados_anuais AS (
    SELECT
        codigo_setor,
        tipo_custo,
        SUM(km_rodada) as total_km_anual,
        SUM(valor_custo) as total_custo_anual
    FROM oracle_operacao_frota o
    INNER JOIN oracle_custos_operacionais c ON (
        c.codigo_setor = o.codigo_setor
        AND c.data_custo = o.data_operacao
    )
    WHERE o.data_operacao >= ADD_MONTHS(SYSDATE, -12)
      AND o.data_operacao < TRUNC(SYSDATE, 'MM')  -- Até mês anterior fechado
      AND c.tipo_custo IN ('PNEUS', 'PECAS')
      AND o.codigo_setor IN (124, 239, 240, 31)
      AND o.status_registro = 'ATIVO'
    GROUP BY codigo_setor, tipo_custo
)
SELECT
    codigo_setor,
    tipo_custo,
    total_km_anual,
    total_custo_anual,
    ROUND(total_custo_anual / NULLIF(total_km_anual, 0), 6) as custo_medio_rs_por_km
FROM dados_anuais
WHERE total_km_anual > 0
ORDER BY codigo_setor, tipo_custo;
```

### **14.2 Mapeamento de Erros e Códigos de Status**

#### **A. Códigos de Erro de Validação**

```typescript
enum ValidationErrorCodes {
  // Dados Oracle
  ORACLE_CONNECTION_FAILED = 'ORG_001',
  ORACLE_INSUFFICIENT_DATA = 'ORG_002',
  ORACLE_DATA_INCONSISTENT = 'ORG_003',

  // Vigência
  COMPETITION_PERIOD_INVALID_STATUS = 'CPE_001',
  COMPETITION_PERIOD_NOT_FOUND = 'CPE_002',
  COMPETITION_PERIOD_ALREADY_CALCULATED = 'CPE_003',

  // Feriados
  HOLIDAYS_NOT_CLASSIFIED = 'HOL_001',
  HOLIDAYS_INVALID_CLASSIFICATION = 'HOL_002',
  HOLIDAYS_MISSING_DATES = 'HOL_003',

  // Parâmetros
  PARAMETERS_MISSING = 'PAR_001',
  PARAMETERS_INVALID_VALUE = 'PAR_002',
  PARAMETERS_OUT_OF_RANGE = 'PAR_003',

  // Cálculos
  CALCULATION_KM_PREVISTA_NEGATIVE = 'CAL_001',
  CALCULATION_DIVISION_BY_ZERO = 'CAL_002',
  CALCULATION_RESULT_ANOMALY = 'CAL_003',
  CALCULATION_SALDO_DEVEDOR_EXCESSIVE = 'CAL_004',

  // Sistema
  SYSTEM_TRANSACTION_FAILED = 'SYS_001',
  SYSTEM_CONCURRENT_CALCULATION = 'SYS_002',
  SYSTEM_STORAGE_FULL = 'SYS_003',
}

interface ValidationError {
  code: ValidationErrorCodes;
  message: string;
  details?: any;
  suggestedAction?: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
}
```

#### **B. Status de Cálculo Detalhados**

```typescript
enum CalculationStatus {
  PENDING = 'PENDING', // Aguardando início
  VALIDATING = 'VALIDATING', // Executando validações
  LOADING_ORACLE_DATA = 'LOADING_ORACLE_DATA', // Carregando dados Oracle
  CALCULATING_KM_PREVISTA = 'CALCULATING_KM_PREVISTA', // Calculando KM PREVISTA
  CALCULATING_COMBUSTIVEL = 'CALCULATING_COMBUSTIVEL', // Calculando COMBUSTÍVEL
  CALCULATING_PNEUS = 'CALCULATING_PNEUS', // Calculando PNEUS
  CALCULATING_PECAS = 'CALCULATING_PECAS', // Calculando PEÇAS
  SAVING_RESULTS = 'SAVING_RESULTS', // Salvando resultados
  COMPLETED = 'COMPLETED', // Concluído com sucesso
  COMPLETED_WITH_WARNINGS = 'COMPLETED_WITH_WARNINGS', // Concluído com avisos
  ERROR = 'ERROR', // Erro durante processamento
  CANCELLED = 'CANCELLED', // Cancelado pelo usuário
  APPROVED = 'APPROVED', // Aprovado e integrado
  ROLLED_BACK = 'ROLLED_BACK', // Revertido
}

interface CalculationProgress {
  calculationId: number;
  status: CalculationStatus;
  currentStep: string;
  progress: number; // 0-100
  startedAt: Date;
  estimatedCompletion?: Date;
  stepDetails?: {
    stepName: string;
    stepProgress: number;
    stepMessage?: string;
  };
  sectorsProcessed: number;
  totalSectors: number;
  error?: ValidationError;
}
```

### **14.3 Configurações de Deploy e Ambiente**

#### **A. Variáveis de Ambiente**

```bash
# Oracle Database
ORACLE_HOST=oracle-prod.empresa.local
ORACLE_PORT=1521
ORACLE_SERVICE_NAME=PROD
ORACLE_USER=sistema_premiacao
ORACLE_PASSWORD=${ORACLE_PASSWORD}

# PostgreSQL (aplicação principal)
POSTGRES_HOST=postgres-prod.empresa.local
POSTGRES_PORT=5432
POSTGRES_DB=sistema_premiacao
POSTGRES_USER=api_user
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# Configurações do Sistema de Metas
OPERATIONAL_GOALS_ENABLED=true
OPERATIONAL_GOALS_MAX_CONCURRENT_CALCULATIONS=2
OPERATIONAL_GOALS_CALCULATION_TIMEOUT_MINUTES=30
OPERATIONAL_GOALS_DATA_RETENTION_MONTHS=24

# Feriados (API externa)
HOLIDAYS_API_PROVIDER=brasil_api
HOLIDAYS_API_URL=https://brasilapi.com.br/api/feriados/v1
HOLIDAYS_API_TIMEOUT_SECONDS=10

# Cache e Performance
REDIS_HOST=redis-prod.empresa.local
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}
CALCULATION_CACHE_TTL_HOURS=24

# Logs e Monitoramento
LOG_LEVEL=info
LOG_FORMAT=json
AUDIT_LOG_RETENTION_DAYS=1095  # 3 anos
ERROR_NOTIFICATION_EMAIL=ti@empresa.com.br

# Limites de Segurança
MAX_ORACLE_QUERY_TIMEOUT_SECONDS=300
MAX_CALCULATION_MEMORY_MB=2048
MAX_TEMP_TABLE_ROWS=1000000
```

#### **B. Configuração de Docker (Produção)**

```dockerfile
# Dockerfile.operational-goals
FROM node:18-alpine

WORKDIR /app

# Instalar Oracle Instant Client
RUN apk add --no-cache libaio libnsl libc6-compat curl && \
    cd /tmp && \
    curl -o instantclient-basiclite.zip https://download.oracle.com/otn_software/linux/instantclient/instantclient-basiclite-linuxx64.zip && \
    unzip instantclient-basiclite.zip && \
    mv instantclient*/ /opt/oracle/instantclient && \
    rm instantclient-basiclite.zip && \
    echo /opt/oracle/instantclient > /etc/ld.so.conf.d/oracle-instantclient.conf && \
    ldconfig

ENV ORACLE_HOME=/opt/oracle/instantclient
ENV LD_LIBRARY_PATH=/opt/oracle/instantclient
ENV PATH=$PATH:/opt/oracle/instantclient

# Copiar aplicação
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Configurações de produção
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048"

EXPOSE 3000

# Health check específico para módulo de metas
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/operational-goals/health || exit 1

CMD ["node", "dist/server.js"]
```

#### **C. Scripts de Monitoramento**

```bash
#!/bin/bash
# monitor-operational-goals.sh

# Verificar se há cálculos em execução há mais de 30 minutos
LONG_RUNNING=$(psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
  SELECT COUNT(*)
  FROM operational_goals_calculations
  WHERE status IN ('CALCULATING', 'VALIDATING', 'LOADING_ORACLE_DATA')
    AND created_at < NOW() - INTERVAL '30 minutes'
")

if [ "$LONG_RUNNING" -gt 0 ]; then
  echo "ALERTA: $LONG_RUNNING cálculo(s) executando há mais de 30 minutos"
  # Enviar notificação
fi

# Verificar uso de memória da aplicação
MEMORY_USAGE=$(docker stats --no-stream --format "{{.MemUsage}}" operational-goals-api | cut -d'/' -f1)
MEMORY_MB=$(echo $MEMORY_USAGE | sed 's/MiB//')

if [ "$MEMORY_MB" -gt 1800 ]; then
  echo "ALERTA: Uso de memória elevado: ${MEMORY_MB}MB"
fi

# Verificar conectividade Oracle
if ! timeout 10 sqlplus -s $ORACLE_USER/$ORACLE_PASSWORD@$ORACLE_HOST:$ORACLE_PORT/$ORACLE_SERVICE_NAME <<< "SELECT 1 FROM DUAL;" > /dev/null 2>&1; then
  echo "ERRO: Falha na conexão com Oracle"
  exit 1
fi

echo "Monitoramento OK - $(date)"
```

### **14.4 Plano de Testes Detalhado**

#### **A. Testes Unitários**

```typescript
// Exemplo de teste para cálculo de KM PREVISTA
describe('OperationalGoalsService.calculateKmPrevista', () => {
  it('deve calcular KM prevista corretamente com dados válidos', async () => {
    // Arrange
    const mockHistorico = [
      { data: '2025-05-01', sectorId: 1, kmRodada: 1200, tipoDia: 'UTIL' },
      { data: '2025-05-02', sectorId: 1, kmRodada: 1180, tipoDia: 'UTIL' },
      { data: '2025-05-03', sectorId: 1, kmRodada: 800, tipoDia: 'SABADO' },
      // ... mais dados de teste
    ];

    const mockCalendario = {
      qtdDiasUteis: 22,
      qtdSabados: 4,
      qtdDomingosFeriados: 5,
    };

    // Act
    const resultado = await service.calculateKmPrevista({
      historicoDiario: mockHistorico,
      calendarioMesFuturo: mockCalendario,
    });

    // Assert
    expect(resultado.kmPrevista).toBeGreaterThan(0);
    expect(resultado.detalhesCalculo.mediaKmUtil).toBeCloseTo(1190, 0);
    expect(resultado.detalhesCalculo.projecaoUtil).toBeCloseTo(26180, 0);
  });

  it('deve lançar erro quando dados históricos insuficientes', async () => {
    // Arrange
    const mockHistoricoInsuficiente = [
      { data: '2025-05-01', sectorId: 1, kmRodada: 1200, tipoDia: 'UTIL' },
    ];

    // Act & Assert
    await expect(
      service.calculateKmPrevista({
        historicoDiario: mockHistoricoInsuficiente,
        calendarioMesFuturo: {
          qtdDiasUteis: 22,
          qtdSabados: 4,
          qtdDomingosFeriados: 5,
        },
      })
    ).rejects.toThrow('Dados históricos insuficientes');
  });
});
```

#### **B. Testes de Integração**

```typescript
describe('Integration: Oracle Data Loading', () => {
  it('deve carregar dados operacionais do Oracle corretamente', async () => {
    // Teste real com banco Oracle de homologação
    const startDate = '2025-05-01';
    const endDate = '2025-05-31';
    const sectorIds = [124, 239, 240, 31];

    const dados = await oracleDataService.fetchDailyOperationalData(
      startDate,
      endDate,
      sectorIds
    );

    expect(dados).toBeDefined();
    expect(dados.length).toBeGreaterThan(0);
    expect(dados[0]).toHaveProperty('dataOperacao');
    expect(dados[0]).toHaveProperty('codigoSetor');
    expect(dados[0]).toHaveProperty('kmRodada');
  });

  it('deve integrar com sistema de parâmetros existente', async () => {
    // Teste de salvamento em ParameterValueEntity
    const mockCalculation = createMockCalculationResult();

    const savedParams =
      await operationalGoalsService.saveCalculatedGoalsAsParameters(
        mockCalculation.id,
        testUser.id
      );

    expect(savedParams).toHaveLength(12); // 4 setores × 3 critérios

    // Verificar se foi salvo corretamente
    const combustivelParam = savedParams.find(
      (p) => p.criterionId === COMBUSTIVEL_CRITERION_ID && p.sectorId === 1
    );

    expect(combustivelParam).toBeDefined();
    expect(combustivelParam.valor).toBe(
      mockCalculation.combustivelData['1'].metaConsumoLitros.toString()
    );
  });
});
```

#### **C. Testes de Carga**

```typescript
describe('Performance Tests', () => {
  it(
    'deve calcular metas para todos os setores em menos de 5 minutos',
    async () => {
      const startTime = Date.now();

      const resultado = await operationalGoalsService.calculateOperationalGoals(
        competitionPeriodId,
        userId,
        holidayClassifications
      );

      const duration = Date.now() - startTime;

      expect(resultado.status).toBe('COMPLETED');
      expect(duration).toBeLessThan(5 * 60 * 1000); // 5 minutos
    },
    10 * 60 * 1000
  ); // timeout de 10 minutos

  it('deve suportar múltiplos cálculos simultâneos', async () => {
    const promises = Array.from({ length: 3 }, (_, i) =>
      operationalGoalsService.calculateOperationalGoals(
        competitionPeriodId + i,
        userId,
        holidayClassifications
      )
    );

    const resultados = await Promise.all(promises);

    expect(resultados).toHaveLength(3);
    expect(resultados.every((r) => r.status === 'COMPLETED')).toBe(true);
  });
});
```

#### **D. Testes de Validação de Negócio**

```typescript
describe('Business Logic Validation', () => {
  it('deve aplicar sistema de saldo corretamente', async () => {
    // Cenário: Meta anterior = R$ 100.000, Tolerância = 8%, Gasto real = R$ 115.000
    const saldoInput = {
      metaAprovadaAnterior: 100000,
      gastoRealAnterior: 115000,
      percentualTolerancia: 0.08,
    };

    const resultado = await businessRules.calcularSaldoDevedor(saldoInput);

    expect(resultado.tetoGasto).toBe(108000); // 100.000 × 1.08
    expect(resultado.saldoDevedor).toBe(7000); // 115.000 - 108.000
    expect(resultado.houveExcedente).toBe(true);
  });

  it('deve detectar anomalias em KM prevista', async () => {
    const kmPrevista = 50000; // 50% menor que o histórico
    const mediaHistorica = 100000;

    const anomalies = await anomalyDetectionService.detectAnomalies({
      kmPrevista: { '1': kmPrevista },
      historicalAverages: { '1': mediaHistorica },
    });

    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].type).toBe('KM_PREVISTA_ANOMALY');
    expect(anomalies[0].severity).toBe('HIGH');
  });
});
```

---

## **15. DOCUMENTAÇÃO DE PRODUÇÃO**

### **15.1 Manual de Operação**

#### **A. Procedimento Padrão Mensal**

```
📋 CHECKLIST MENSAL - CÁLCULO DE METAS OPERACIONAIS

□ 1. PREPARAÇÃO (Dias 1-2 do mês)
  □ Verificar fechamento da vigência anterior
  □ Confirmar nova vigência em status PLANEJAMENTO
  □ Validar dados Oracle do mês fechado

□ 2. CLASSIFICAÇÃO DE FERIADOS (Conforme necessário)
  □ Acessar tela de Planejamento
  □ Verificar feriados detectados automaticamente
  □ Classificar cada feriado como Útil/Sábado/Domingo
  □ Confirmar todas as classificações

□ 3. VALIDAÇÃO DE PARÂMETROS (Mensal)
  □ Revisar parâmetros de cálculo
  □ Atualizar preço do combustível se necessário
  □ Verificar percentuais de tolerância e premiação

□ 4. EXECUÇÃO DO CÁLCULO
  □ Clicar em "Calcular Metas Operacionais"
  □ Aguardar conclusão (até 5 minutos)
  □ Revisar resultados e alertas
  □ Verificar relatório de transparência

□ 5. APROVAÇÃO E INTEGRAÇÃO
  □ Analisar cada meta calculada
  □ Aprovar ou ajustar valores se necessário
  □ Confirmar integração com sistema de premiação
  □ Verificar se vigência pode mudar para ATIVA

□ 6. DOCUMENTAÇÃO (Obrigatório)
  □ Salvar relatório de transparência
  □ Documentar ajustes manuais realizados
  □ Comunicar metas à equipe operacional
```

#### **B. Troubleshooting Guide**

```
🔧 PROBLEMAS COMUNS E SOLUÇÕES

❌ ERRO: "Dados Oracle insuficientes"
✅ SOLUÇÃO:
  1. Verificar conexão com Oracle
  2. Confirmar dados do mês anterior no ERP
  3. Contactar TI se persistir

❌ ERRO: "Feriados não classificados"
✅ SOLUÇÃO:
  1. Acessar tela de classificação de feriados
  2. Classificar todos os feriados pendentes
  3. Salvar e tentar calcular novamente

❌ ERRO: "Meta negativa por saldo devedor"
✅ SOLUÇÃO:
  1. Revisar gasto real do mês anterior
  2. Considerar ajustar tolerância do saldo
  3. Usar meta mínima sugerida pelo sistema

❌ ERRO: "Anomalia detectada em KM prevista"
✅ SOLUÇÃO:
  1. Verificar classificação de feriados
  2. Confirmar dados no Oracle
  3. Investigar eventos especiais do período

❌ ERRO: "Timeout na execução"
✅ SOLUÇÃO:
  1. Aguardar e tentar novamente
  2. Verificar carga do sistema
  3. Contactar TI se recorrente
```

### **15.2 Plano de Contingência**

#### **A. Cenários de Falha e Respostas**

```
🚨 CENÁRIO 1: Falha Total do Sistema
RESPOSTA IMEDIATA:
  1. Ativar processo manual com Excel (backup)
  2. Notificar equipe de TI
  3. Documentar impacto nos prazos

RESOLUÇÃO:
  1. Diagnosticar causa raiz
  2. Restaurar sistema a partir de backup
  3. Recalcular metas quando sistema voltar
  4. Validar resultados vs cálculo manual

🚨 CENÁRIO 2: Falha na Conexão Oracle
RESPOSTA IMEDIATA:
  1. Verificar status da rede
  2. Tentar reconexão manual
  3. Usar dados cacheados se disponíveis

RESOLUÇÃO:
  1. Coordenar com equipe Oracle/DBA
  2. Aguardar restabelecimento da conexão
  3. Recalcular com dados atualizados

🚨 CENÁRIO 3: Resultados Anômalos
RESPOSTA IMEDIATA:
  1. NÃO aprovar metas automaticamente
  2. Executar validação manual
  3. Comparar com cálculo Excel

RESOLUÇÃO:
  1. Investigar causa da anomalia
  2. Corrigir dados de entrada se necessário
  3. Recalcular ou usar valores manuais
```

#### **B. Contatos de Emergência**

```
📞 ESCALATION MATRIX

NÍVEL 1 - Operacional:
  Analista de TI: (61) 9999-1111
  Coordenador de Sistemas: (61) 9999-2222

NÍVEL 2 - Técnico:
  DBA Oracle: (61) 9999-3333
  Desenvolvedor Senior: (61) 9999-4444

NÍVEL 3 - Gerencial:
  Gerente de TI: (61) 9999-5555
  Diretor Operacional: (61) 9999-6666

E-MAILS DE NOTIFICAÇÃO:
  Crítico: ti-critico@empresa.com.br
  Operacional: operacoes@empresa.com.br
  Diretoria: diretoria@empresa.com.br
```

---

## **📋 CONCLUSÃO DA DOCUMENTAÇÃO TÉCNICA**

Esta documentação técnica completa fornece todos os elementos necessários para a implementação bem-sucedida da automação do cálculo de metas operacionais. O documento abrange:

### **✅ Aspectos Técnicos Detalhados:**

- Arquitetura de dados completa
- Algoritmos de cálculo especificados
- Estruturas de banco definidas
- APIs REST documentadas
- Integrações mapeadas

### **✅ Aspectos Operacionais:**

- Fluxo de trabalho detalhado
- Validações e tratamento de erros
- Sistema de auditoria e transparência
- Procedimentos de contingência

### **✅ Aspectos de Implementação:**

- Sequência de desenvolvimento
- Plano de testes abrangente
- Configurações de produção
- Monitoramento e manutenção

### **✅ Documentação de Suporte:**

- Manual de operação
- Troubleshooting guide
- Scripts de monitoramento
- Planos de contingência

---

**🎯 PRÓXIMO PASSO:** Com esta documentação como base, a equipe de desenvolvimento pode iniciar a implementação seguindo o cronograma de 10 semanas estabelecido, começando pela **Fase 1 - Fundação**.

**📋 APROVAÇÃO:** Esta documentação deve ser revisada e aprovada pela diretoria antes do início do desenvolvimento, garantindo alinhamento completo com as expectativas e requisitos do negócio.

**🔄 VERSIONAMENTO:** Este documento será mantido atualizado durante toda a implementação, servindo como referência viva do projeto.

---

**Documentação Técnica v1.0 - Automação de Cálculo de Metas Operacionais**  
**Data:** 15 de julho de 2025  
**Status:** Pronto para Implementação  
**Próxima Revisão:** Após Fase 1 de Implementação
