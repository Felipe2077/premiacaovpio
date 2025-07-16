# 🎯 Fluxograma - Automação de Cálculo de Metas Operacionais

**Sistema de Premiação v3.0 | COMBUSTÍVEL • PNEUS • PEÇAS**

---

## 📋 FASE 1: PRÉ-CONDIÇÕES

_Verificações necessárias antes do cálculo_

```mermaid
graph TD
    A[🎯 INÍCIO DO PROCESSO] --> B{📅 Vigência em PLANEJAMENTO?}
    B -->|❌ NÃO| C[🚫 BLOQUEAR - Status Inválido]
    B -->|✅ SIM| D{🔗 Oracle Conectado?}
    D -->|❌ NÃO| E[🚫 BLOQUEAR - Sem Conexão]
    D -->|✅ SIM| F{⚙️ Parâmetros OK?}
    F -->|❌ NÃO| G[🚫 BLOQUEAR - Config Incompleta]
    F -->|✅ SIM| H[✅ PRÉ-CONDIÇÕES ATENDIDAS]
```

### ✅ Validações Críticas:

- **Status da Vigência:** Deve estar em `PLANEJAMENTO`
- **Conexão Oracle:** ERP acessível com dados históricos
- **Parâmetros:** Tolerância, fatores, percentuais configurados

---

## 🎉 FASE 2: GESTÃO DE FERIADOS

_Classificação manual necessária para KM PREVISTA_

```mermaid
graph LR
    A[📆 Detectar Feriados] --> B{❓ Há Feriados no Mês?}
    B -->|❌ NÃO| C[➡️ Prosseguir Cálculo]
    B -->|✅ SIM| D[👨‍💼 Interface de Classificação]
    D --> E[📝 Diretor Classifica Cada Feriado]
    E --> F{✅ Todos Classificados?}
    F -->|❌ NÃO| G[⚠️ BLOQUEAR - Pendência]
    F -->|✅ SIM| H[💾 Salvar Classificações]
    H --> C
```

### 📝 Tipos de Classificação:

- **🏢 Útil:** Feriado trabalhado normalmente
- **🏖️ Sábado:** Operação reduzida como sábado
- **🏠 Domingo:** Sem operação como domingo

---

## 📊 FASE 3: CARREGAMENTO DE DADOS (ETL)

_Extração de dados do Oracle ERP_

```mermaid
graph TD
    A[🔄 INÍCIO ETL] --> B[📈 Dados Operacionais Diários]
    A --> C[⛽ Histórico Combustível 3M]
    A --> D[🛞 Custos Pneus/Peças 12M]
    A --> E[🚗 Cadastro Frota Atual]

    B --> F[📊 Consolidação por Setor]
    C --> F
    D --> F
    E --> F

    F --> G{✅ Dados Consistentes?}
    G -->|❌ NÃO| H[🚫 ERRO - Dados Incompletos]
    G -->|✅ SIM| I[💾 Armazenar em Tabelas Temp]
```

### 📋 Dados Necessários:

| Fonte                   | Período  | Uso              |
| ----------------------- | -------- | ---------------- |
| **Operação Diária**     | 3 meses  | KM PREVISTA      |
| **Consumo Combustível** | 3 meses  | Eficiência média |
| **Custos Pneus/Peças**  | 12 meses | R$/km médio      |
| **Frota Ativa**         | Atual    | Qtd veículos     |

---

## 🧮 FASE 4: CÁLCULOS SEQUENCIAIS

_Ordem obrigatória - cada cálculo depende do anterior_

```mermaid
graph TD
    A[🔄 INÍCIO CÁLCULOS] --> B[📏 1. KM PREVISTA]

    B --> B1[📊 Médias por Tipo de Dia]
    B1 --> B2[📅 Aplicar Feriados Classificados]
    B2 --> B3[🔢 Projeção Mês Futuro]
    B3 --> B4[✅ KM PREVISTA Calculada]

    B4 --> C[⛽ 2. COMBUSTÍVEL]
    C --> C1[📈 Eficiência Média 3M]
    C1 --> C2[🔢 Previsão Bruta Litros]
    C2 --> C3[📉 Aplicar Fator Redução 1,5%]
    C3 --> C4[✅ Meta Combustível]

    C4 --> D[🛞 3. PNEUS]
    D --> D1[💰 Custo Médio R$/km 12M]
    D1 --> D2[🔢 Meta Base = KM × R$/km]
    D2 --> D3[🎁 Aplicar Premiação -3%]
    D3 --> D4[⚖️ Sistema de Saldo]
    D4 --> D5[✅ Meta Pneus Final]

    D5 --> E[🔧 4. PEÇAS]
    E --> E1[💰 Custo Médio R$/km 12M]
    E1 --> E2[🔢 Meta Base = KM × R$/km]
    E2 --> E3[🎁 Aplicar Premiação -3%]
    E3 --> E4[⚖️ Sistema de Saldo]
    E4 --> E5[✅ Meta Peças Final]
```

### ⚡ Sequência Crítica:

```
KM PREVISTA → COMBUSTÍVEL → PNEUS → PEÇAS
     ↓             ↓          ↓       ↓
   BASE         DEPENDE    DEPENDE  DEPENDE
```

### 🔢 Fórmulas Principais:

#### 1️⃣ **KM PREVISTA**

```
MediaKmUtil = Σ(KM dias úteis) / Qtd dias úteis
KM_PREVISTA = (MediaKmUtil × DiasUteis) +
              (MediaKmSab × Sabados) +
              (MediaKmDom × DomingosFeriados)
```

#### 2️⃣ **COMBUSTÍVEL**

```
Eficiencia = TotalKM_3M / TotalLitros_3M
LitrosBruto = KM_PREVISTA / Eficiencia
MetaLitros = LitrosBruto × (1 - FatorReducao)
```

#### 3️⃣ **PNEUS**

```
MetaBase = KM_PREVISTA × CustoKmPneu × (1 - %Premiacao)
SaldoDevedor = MAX(0, GastoAnterior - (MetaAnterior × (1 + Tolerancia)))
MetaFinal = MetaBase - SaldoDevedor
```

#### 4️⃣ **PEÇAS**

```
MetaBase = KM_PREVISTA × CustoKmPecas × (1 - %Premiacao)
SaldoDevedor = MAX(0, GastoAnterior - (MetaAnterior × (1 + Tolerancia)))
MetaFinal = MetaBase - SaldoDevedor
```

---

## ✅ FASE 5: VALIDAÇÕES E ANOMALIAS

_Verificações automáticas dos resultados_

```mermaid
graph TD
    A[🔍 INÍCIO VALIDAÇÕES] --> B[📊 Verificar KM PREVISTA]
    A --> C[💰 Verificar Metas Negativas]
    A --> D[📈 Verificar Custos Médios]
    A --> E[🔄 Verificar Consistência]

    B --> B1{📏 KM > 30% diferente?}
    B1 -->|✅ SIM| B2[⚠️ ANOMALIA: KM Anômala]
    B1 -->|❌ NÃO| B3[✅ KM OK]

    C --> C1{💸 Meta < 0?}
    C1 -->|✅ SIM| C2[⚠️ ANOMALIA: Meta Negativa]
    C1 -->|❌ NÃO| C3[✅ Meta OK]

    D --> D1{💰 Custo fora da faixa?}
    D1 -->|✅ SIM| D2[⚠️ ANOMALIA: Custo Anômalo]
    D1 -->|❌ NÃO| D3[✅ Custo OK]

    B2 --> F[📋 Relatório de Anomalias]
    C2 --> F
    D2 --> F
    B3 --> G[✅ Validações OK]
    C3 --> G
    D3 --> G
```

### 🚨 Tipos de Anomalias:

| Tipo              | Limite               | Ação                        |
| ----------------- | -------------------- | --------------------------- |
| **KM Anômala**    | >30% variação        | Revisar feriados/dados      |
| **Meta Negativa** | Meta < 0             | Usar meta mínima (10% base) |
| **Custo Anômalo** | Fora faixa histórica | Verificar dados Oracle      |

---

## 📋 FASE 6: APRESENTAÇÃO DOS RESULTADOS

_Interface para análise e aprovação_

```mermaid
graph LR
    A[📊 Resultados Calculados] --> B[🖥️ Dashboard Principal]
    A --> C[🔍 Relatório Transparência]
    A --> D[⚠️ Alertas de Anomalias]

    B --> E[📈 Metas por Setor/Critério]
    B --> F[📊 Comparação Histórica]

    C --> G[🧮 Passo-a-Passo Cálculos]
    C --> H[📋 Dados Utilizados]
    C --> I[⚙️ Parâmetros Aplicados]

    D --> J[🚨 Lista de Anomalias]
    D --> K[💡 Sugestões de Correção]
```

### 📊 Interface Inclui:

- ✅ **Dashboard:** Metas calculadas com comparação histórica
- ✅ **Transparência:** "Como chegamos aqui?" completo
- ✅ **Anomalias:** Alertas e sugestões automáticas
- ✅ **Drill-down:** Detalhes por setor/critério

---

## ✅ FASE 7: APROVAÇÃO E INTEGRAÇÃO

_Decisão final e salvamento no sistema_

```mermaid
graph TD
    A[👨‍💼 Análise do Diretor] --> B{❓ Aprovar Metas?}

    B -->|❌ NÃO| C[📝 Ajustes Manuais]
    C --> D[🔄 Recalcular se Necessário]
    D --> B

    B -->|✅ SIM| E[💾 Salvar ParameterValueEntity]
    E --> F[🔄 Sincronizar PerformanceData]
    F --> G[📝 Registrar Auditoria]
    G --> H[✅ Metas Aprovadas]

    B -->|⚠️ ANOMALIAS| I[🔍 Investigar Anomalias]
    I --> J{🔧 Corrigir Dados?}
    J -->|✅ SIM| K[🔄 Recalcular]
    J -->|❌ NÃO| L[✅ Aceitar com Ressalvas]
    K --> B
    L --> E
```

### 💾 Salvamento Duplo:

1. **ParameterValueEntity** ← Fonte oficial com auditoria
2. **PerformanceDataEntity** ← Cache para sistema de ranking

---

## 🎯 FASE 8: FINALIZAÇÃO

_Ativação do sistema de premiação_

```mermaid
graph TD
    A[✅ Metas Aprovadas] --> B[🔄 Verificar Completude]
    B --> C{🎯 Todas Metas Definidas?}

    C -->|❌ NÃO| D[⏳ Aguardar Outras Metas]
    D --> E[📋 Status: PLANEJAMENTO]

    C -->|✅ SIM| F[🏆 Ativar Vigência]
    F --> G[📊 Status: ATIVA]
    G --> H[🎉 Sistema de Premiação Ativo]

    A --> I[📧 Notificar Equipe]
    A --> J[📋 Documentar Processo]
    A --> K[💾 Backup Resultados]
```

### 🎉 Finalização:

- ✅ **Metas disponíveis** para sistema de ranking
- ✅ **Auditoria completa** registrada
- ✅ **Vigência ativa** se todas as metas estiverem definidas
- ✅ **Equipe notificada** das novas metas

---

## 📊 DADOS DE ENTRADA E SAÍDA

### 📥 **ENTRADAS**

```
┌─ Oracle ERP ─────────────────────────┐
│ • Operação diária (3 meses)         │
│ • Consumo combustível (3 meses)     │
│ • Custos pneus/peças (12 meses)     │
│ • Cadastro da frota (atual)         │
└──────────────────────────────────────┘

┌─ Sistema Atual ──────────────────────┐
│ • Metas anteriores (saldo devedor)  │
│ • Gastos reais anteriores           │
│ • Parâmetros configuráveis          │
└──────────────────────────────────────┘

┌─ Entrada Manual ─────────────────────┐
│ • Classificação de feriados         │
│ • Preço combustível (informativo)   │
│ • Aprovação final das metas         │
└──────────────────────────────────────┘
```

### 📤 **SAÍDAS**

```
┌─ Metas Calculadas ───────────────────┐
│ • COMBUSTÍVEL: Meta em Litros       │
│ • PNEUS: Meta em R$ (com saldo)     │
│ • PEÇAS: Meta em R$ (com saldo)     │
│ • Por setor: 4 setores × 3 = 12     │
└──────────────────────────────────────┘

┌─ Dados de Apoio ─────────────────────┐
│ • KM PREVISTA por setor             │
│ • Relatórios de transparência       │
│ • Metadados dos cálculos            │
│ • Logs de auditoria completos       │
└──────────────────────────────────────┘

┌─ Integração Sistema ─────────────────┐
│ • ParameterValueEntity (oficial)    │
│ • PerformanceDataEntity (cache)     │
│ • Sistema de ranking atualizado     │
└──────────────────────────────────────┘
```

---

## 🚨 PONTOS CRÍTICOS DE ATENÇÃO

### ⚠️ **Bloqueantes Absolutos:**

- 🔴 **Vigência não PLANEJAMENTO** → Para tudo
- 🔴 **Feriados não classificados** → Bloqueia KM PREVISTA
- 🔴 **Dados Oracle incompletos** → Bloqueia cálculos
- 🔴 **Parâmetros não configurados** → Resultados incorretos

### ⚡ **Dependências Sequenciais:**

- 🔗 **COMBUSTÍVEL depende** de KM PREVISTA
- 🔗 **PNEUS depende** de KM PREVISTA + Saldo anterior
- 🔗 **PEÇAS depende** de KM PREVISTA + Saldo anterior
- 🔗 **Ordem obrigatória** - não pode ser paralelo

### 🔄 **Cenários de Recálculo:**

- 📝 **Feriado reclassificado** → Recalcular tudo
- ⚙️ **Parâmetro alterado** → Recalcular afetados
- 📊 **Dados Oracle corrigidos** → Recalcular tudo
- ❌ **Anomalia detectada** → Investigar e recalcular

---

## 💡 BENEFÍCIOS ESPERADOS

### ⚡ **Operacionais:**

- 🚀 **95% redução** no tempo de cálculo (2h → 5min)
- ✅ **Zero erros** de planilha manual
- 🔍 **100% transparência** dos cálculos
- 📊 **Auditoria completa** automática

### 🎯 **Estratégicos:**

- 🏆 **Maior confiabilidade** no sistema de premiação
- 📈 **Decisões baseadas** em dados padronizados
- ⚙️ **Flexibilidade** para ajustar parâmetros
- 🚀 **Base sólida** para futuras expansões

---

**🎉 Fluxograma completo da automação de cálculo de metas operacionais!**

_Sistema de Premiação v3.0 | Documentação Técnica | Julho 2025_
