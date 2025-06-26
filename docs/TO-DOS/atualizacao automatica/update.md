# 🚀 Roadmap - Sistema de Atualização Automática ETL

**Projeto**: Sistema de Gestão da Premiação por Desempenho de Filiais  
**Data**: 20 de Junho de 2025  
**Objetivo**: Automatizar processo ETL manual e implementar sistema de atualizações baseado em vigências

---

## 📋 **CONTEXTO E PROBLEMA ATUAL**

### **Situação Atual**

- **3 scripts manuais** que precisam ser executados em sequência:
  1. `run-full-raw-etl-april-2025.ts` - ETL para tabelas RAW
  2. `test-etl-orchestrator.ts` - Processamento RAW → performance_data
  3. `test-calculation-service.ts` - Cálculo de rankings e pontuações

### **Problemas Identificados**

- ❌ Processo manual e sequencial demorado
- ❌ Datas hardcoded (`2025-06-01`, `2025-06-30`, `2025-06`)
- ❌ Sem proteção para vigências FECHADAS (dados imutáveis)
- ❌ Expurgos aprovados não recalculam automaticamente a tela pública
- ❌ Sem agendamento automático por vigência
- ❌ Sem interface para disparar atualizações

### **Regras de Negócio Fundamentais**

- **VIGÊNCIA ATIVA**: Dados podem ser sobrescritos (ETL + Expurgos + Cálculos)
- **VIGÊNCIA FECHADA**: Dados são **IMUTÁVEIS** (apenas consulta)
- **VIGÊNCIA PLANEJAMENTO**: Apenas alteração de metas (sem ETL)
- **Lifecycle**: `PLANEJAMENTO → ATIVA → FECHADA`

---

## 🏗️ **ARQUITETURA DA SOLUÇÃO**

### **Componentes Principais**

#### **1. AutomationService** (Orquestrador Central)

```typescript
class AutomationService {
  async runFullUpdateForActivePeriod(options?: UpdateOptions);
  async runPartialUpdate(type: 'expurgo' | 'meta-change');
  private async validateActivePeriod();
  private async protectClosedPeriods();
}
```

#### **2. Sistema de Queue/Jobs (BullMQ)**

```typescript
// Jobs de longa duração
queue.add('full-etl-update', { triggeredBy: 'manual|automatic|expurgo' });
queue.add('recalculate-rankings', { reason: 'expurgo-approved' });
queue.add('scheduled-update', { cronPattern: '0 2 * * *' });
```

#### **3. Triggers Automáticos**

- **Expurgo Aprovado** → Recálculo automático
- **Meta Alterada** (em PLANEJAMENTO) → Preparação para próxima vigência
- **Agendamento** → ETL diário/semanal configurável

#### **4. Interface de Controle** (Frontend)

- Botão "Atualizar Dados" com progress bar
- Configuração de agendamento (frequência, horários)
- Dashboard de status das atualizações
- Histórico de execuções

---

## 📊 **ANÁLISE DO MODELO DE DADOS**

### **Estrutura de Vigências** ✅

```typescript
CompetitionPeriodEntity {
  mesAno: string;           // "YYYY-MM" (único)
  status: 'PLANEJAMENTO' | 'ATIVA' | 'FECHADA';
  dataInicio/dataFim: string; // Range da vigência
  fechadaPorUserId: number;   // Auditoria
}
```

### **Tabelas RAW - Padrão Identificado**

```typescript
// Dados Diários
RawMySqlOcorrenciaHorariaEntity {
  metricDate: string;     // "YYYY-MM-DD"
  sectorName: string;
  // ... dados específicos
}

// Dados Mensais
RawOracleFleetPerformanceEntity {
  metricMonth: string;    // "YYYY-MM"
  sectorName: string;
  // ... dados específicos
}
```

### **Estratégia de Segmentação por Vigência**

```sql
-- Para dados diários
WHERE metricDate >= vigenciaAtiva.dataInicio
  AND metricDate <= vigenciaAtiva.dataFim

-- Para dados mensais
WHERE metricMonth = vigenciaAtiva.mesAno
```

---

## 🛣️ **ROADMAP DE IMPLEMENTAÇÃO**

### **🎯 FASE 1: REFATORAÇÃO BASE (1-2 semanas)**

#### **1.1 AutomationService Core**

- [ ] Criar `AutomationService` que encapsula os 3 scripts existentes
- [ ] Implementar busca dinâmica de vigência ativa
- [ ] Adicionar proteções para vigência fechada
- [ ] Substituir datas hardcoded por valores dinâmicos

#### **1.2 Adaptação dos Scripts Existentes**

- [ ] Refatorar `run-full-raw-etl-april-2025.ts` → método `runRawETL(startDate, endDate)`
- [ ] Refatorar `test-etl-orchestrator.ts` → método `processPerformanceData(periodMesAno)`
- [ ] Refatorar `test-calculation-service.ts` → método `calculateRankings(periodMesAno)`

#### **1.3 Proteção de Dados**

- [ ] Validação obrigatória: "É vigência ativa?" antes de qualquer update
- [ ] Filtro por vigência nas operações DELETE das tabelas RAW
- [ ] Logs de auditoria indicando vigência afetada

#### **1.4 API Endpoints**

```typescript
POST / api / automation / update - active - period; // Disparo manual
GET / api / automation / status; // Status atual
GET / api / automation / active - period; // Vigência ativa
```

### **🎯 FASE 2: SISTEMA DE QUEUE (2-3 semanas)**

#### **2.1 Configuração BullMQ**

- [ ] Instalar e configurar BullMQ + Redis
- [ ] Criar estrutura de jobs com tipos específicos
- [ ] Implementar retry automático e tratamento de falhas
- [ ] Dashboard de monitoramento de jobs

#### **2.2 Jobs Específicos**

```typescript
// Jobs principais
'full-etl-update'; // ETL completo para vigência ativa
'partial-recalculation'; // Apenas recálculo (pós-expurgo)
'scheduled-update'; // Agendamento automático
'data-validation'; // Validação pós-ETL
```

#### **2.3 Progress Tracking**

- [ ] WebSocket para progresso em tempo real
- [ ] Estimativa de tempo restante
- [ ] Cancelamento de jobs em andamento
- [ ] Notificações de conclusão/erro

#### **2.4 Interface de Controle v1**

- [ ] Botão "Atualizar Dados" com progress bar
- [ ] Status em tempo real do processamento
- [ ] Histórico das últimas execuções
- [ ] Indicador de vigência ativa

### **🎯 FASE 3: TRIGGERS E AGENDAMENTO (2-3 semanas)**

#### **3.1 Triggers Automáticos**

- [ ] **Expurgo Aprovado**: Hook no `ExpurgoService` → Job de recálculo
- [ ] **Meta Alterada**: Validação de vigência + preparação
- [ ] **Mudança de Status**: ATIVA → FECHADA (snapshot final)

#### **3.2 Sistema de Agendamento**

- [ ] Configuração flexível via admin (frequência, horários)
- [ ] Cron jobs parametrizáveis
- [ ] Agendamento condicional (apenas vigência ativa)
- [ ] Controle manual de ativação/desativação

#### **3.3 Interface de Controle v2**

```typescript
// Tela de configuração administrativa
- Frequência: Diário/Semanal/Manual
- Horário: Seletor de horário específico
- Dias da semana (se semanal)
- Próxima execução programada
- Histórico de execuções agendadas
```

#### **3.4 Notificações e Alertas**

- [ ] Email/Slack para falhas críticas
- [ ] Dashboard de saúde do sistema
- [ ] Alertas de vigência próxima ao fim
- [ ] Confirmação de conclusão para diretor

### **🎯 FASE 4: OTIMIZAÇÕES E MELHORIAS (2-4 semanas)**

#### **4.1 Performance**

- [ ] Otimização de queries Oracle/MySQL (índices, hints)
- [ ] Paralelização de processamento por setor/critério
- [ ] Cache inteligente para cálculos repetitivos
- [ ] Compressão de dados históricos (vigências fechadas)

#### **4.2 Confiabilidade**

- [ ] Backup automático antes de atualizações
- [ ] Rollback em caso de falha parcial
- [ ] Verificação de integridade dos dados
- [ ] Validação de dependências (Oracle/MySQL online)

#### **4.3 Monitoramento Avançado**

- [ ] Métricas de performance do ETL
- [ ] Tempo real vs estimado de execução
- [ ] Dashboard de saúde com indicadores
- [ ] Alertas proativos de problemas

#### **4.4 Interface Final**

- [ ] Dashboard executivo com KPIs
- [ ] Relatórios de execução automáticos
- [ ] Interface mobile-friendly para aprovações
- [ ] Configurações avançadas por perfil

---

## 🔧 **DETALHES TÉCNICOS IMPORTANTES**

### **Fluxo de Atualização Seguro**

```typescript
1. validateActivePeriod() // Verificar se existe vigência ATIVA
2. protectClosedPeriods() // Garantir que não toca vigências FECHADAS
3. deleteRawDataForPeriod(vigenciaAtiva.mesAno) // Limpar apenas vigência ativa
4. extractRawData(vigenciaAtiva.dataInicio, vigenciaAtiva.dataFim) // ETL
5. processPerformanceData(vigenciaAtiva.mesAno) // Transformação
6. calculateRankings(vigenciaAtiva.mesAno) // Cálculos finais
7. auditLog(operation, vigenciaAtiva.id, userId) // Registro de auditoria
```

### **Estrutura de Jobs BullMQ**

```typescript
interface JobData {
  triggeredBy: 'manual' | 'automatic' | 'expurgo' | 'meta-change';
  periodId: number; // ID da vigência
  userId?: number; // Quem disparou (se manual)
  options?: {
    skipValidation?: boolean;
    partialUpdate?: boolean;
    targetCriteria?: number[]; // Para updates específicos
  };
}
```

### **API de Controle**

```typescript
// Endpoints principais
POST /api/automation/trigger-update
GET  /api/automation/status/:jobId
POST /api/automation/cancel/:jobId
GET  /api/automation/schedule/config
PUT  /api/automation/schedule/config
GET  /api/automation/history?limit=50
```

---

## 📋 **CHECKLIST DE VALIDAÇÃO**

### **Funcionalidades Core**

- [ ] ✅ ETL roda apenas para vigência ATIVA
- [ ] ✅ Vigências FECHADAS são protegidas de alteração
- [ ] ✅ Expurgo aprovado dispara recálculo automático
- [ ] ✅ Interface permite disparar atualização manual
- [ ] ✅ Agendamento automático configurável
- [ ] ✅ Progresso visível em tempo real
- [ ] ✅ Logs de auditoria completos

### **Segurança e Integridade**

- [ ] ✅ Apenas vigência ativa pode ser alterada
- [ ] ✅ Backup antes de operações críticas
- [ ] ✅ Rollback em caso de falha
- [ ] ✅ Validação de dependências externas
- [ ] ✅ Controle de acesso por perfil

### **Performance e Usabilidade**

- [ ] ✅ ETL executa em background (sem timeout HTTP)
- [ ] ✅ Interface responsiva durante processamento
- [ ] ✅ Estimativa de tempo realista
- [ ] ✅ Notificações de conclusão/erro
- [ ] ✅ Histórico de execuções acessível

---

## 🚨 **RISCOS E MITIGAÇÕES**

### **Riscos Técnicos**

| Risco                           | Impacto | Mitigação                   |
| ------------------------------- | ------- | --------------------------- |
| Falha durante ETL               | Alto    | Jobs com retry + rollback   |
| Sobrecarga do banco             | Médio   | Processamento por chunks    |
| Timeout HTTP                    | Baixo   | Sistema de queue assíncrono |
| Falha das fontes (Oracle/MySQL) | Alto    | Validação prévia + alertas  |

### **Riscos de Negócio**

| Risco                         | Impacto | Mitigação                         |
| ----------------------------- | ------- | --------------------------------- |
| Alteração de vigência FECHADA | Crítico | Validação obrigatória + logs      |
| Perda de dados históricos     | Crítico | Backup automático + versionamento |
| Expurgo não refletido         | Médio   | Trigger automático + validação    |

---

## 📞 **PONTOS DE DECISÃO PENDENTES**

### **Configurações de Sistema**

1. **Frequência padrão** de agendamento automático?
2. **Horário padrão** para execução (madrugada)?
3. **Retenção de logs** de auditoria (quantos meses)?
4. **Timeout máximo** para jobs de ETL?

### **Interface e UX**

5. **Nível de detalhe** do progresso mostrado?
6. **Notificações**: Email, in-app, ou ambos?
7. **Permissões**: Quem pode disparar manualmente?
8. **Configuração**: Apenas admin ou diretor também?

---

## 📚 **RECURSOS NECESSÁRIOS**

### **Dependências Técnicas**

- **BullMQ** + **Redis** (sistema de queue)
- **WebSockets** (progresso em tempo real)
- **Cron** (agendamento)
- **Nodemailer** (notificações por email)

### **Infraestrutura**

- **Redis** para queue de jobs
- **Monitoramento** de recursos (CPU/Memória)
- **Backup** automatizado do PostgreSQL
- **Logs** centralizados e rotativos

---

**📝 Documento criado em**: 20/06/2025  
**🔄 Última atualização**: 20/06/2025  
**👨‍💻 Responsável**: Desenvolvimento Sistema Premiação

> **💡 Nota**: Este roadmap serve como base para continuidade em conversas futuras. Contém todos os detalhes técnicos, arquiteturais e de negócio necessários para implementação completa do sistema de atualização automática.
