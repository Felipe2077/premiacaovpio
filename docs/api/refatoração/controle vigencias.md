## 🎯 **NOVO FLUXO DE VIGÊNCIA - ANÁLISE COMPLETA**

### **📋 ESTADOS DA VIGÊNCIA (REVISADOS)**

**Status atuais na API:**

- `PLANEJAMENTO` ✅ (já existe)
- `ATIVA` ✅ (já existe)
- `FECHADA` ✅ (já existe)

**Novo status necessário:**

- `PRE_FECHADA` ❌ (precisa criar)

### **🔄 FLUXO DETALHADO PROPOSTO**

#### **CENÁRIO: Vigência Junho/2025 ATIVA**

**Data: 30/06/2025 23:59** → **01/07/2025 00:00**

**GATILHO AUTOMÁTICO** (Cron/Scheduler):

1. ✅ Sistema detecta fim do período ativo
2. ✅ Sistema cria vigência `2025-07` em `PLANEJAMENTO`
3. ✅ Sistema muda Junho de `ATIVA` → `PRE_FECHADA`
4. ✅ Sistema calcula ranking pré-final (com empates identificados)
5. ✅ Sistema gera logs de auditoria completos

**RESULTADO INTERMEDIÁRIO:**

- 📊 Junho: `PRE_FECHADA` (aguardando oficialização)
- 📋 Julho: `PLANEJAMENTO` (aguardando definição de metas)

#### **AÇÃO DIRETOR #1: Oficialização de Resultados**

**Interface Admin - Tela "Finalizar Período":**

- 👁️ Visualiza ranking pré-final de Junho
- ⚠️ Sistema alerta sobre empates (se houver)
- 🎯 Diretor escolhe vencedor em caso de empate
- ✅ Diretor confirma oficialização
- 📝 Sistema registra tudo em auditoria

**RESULTADO:**

- 🏆 Junho: `PRE_FECHADA` → `FECHADA` (oficial)
- 📋 Julho: ainda em `PLANEJAMENTO`

#### **AÇÃO DIRETOR #2: Ativação do Próximo Ciclo**

**Pré-requisitos:**

- ✅ Todas as metas de Julho definidas (15 metas)
- ✅ Período anterior oficialmente fechado

**Interface Admin - Tela "Iniciar Ciclo":**

- 📊 Visualiza progresso de definição de metas (15/15)
- ✅ Diretor ativa o ciclo de Julho
- 📝 Sistema registra início oficial

**RESULTADO:**

- 🎯 Julho: `PLANEJAMENTO` → `ATIVA`

### **🔍 PONTOS CRÍTICOS IDENTIFICADOS**

#### **1. ENTITY CompetitionPeriodEntity**

- ✅ Adicionar enum `PRE_FECHADA`
- ✅ Adicionar campo `oficialiazadaPorUserId`
- ✅ Adicionar campo `oficializadaEm`
- ✅ Adicionar campo `vencedorEmpateDefinidoPor` (para casos de empate)

#### **2. RANKING/CALCULATION Service**

- ✅ Lógica para detectar empates
- ✅ Flag para ranking "pré-final" vs "oficial"
- ✅ Método para oficializar resultado com resolução de empate

#### **3. AUDIT LOG Enhanced**

- ✅ Log de transição automática `ATIVA` → `PRE_FECHADA`
- ✅ Log de criação automática da próxima vigência
- ✅ Log de oficialização pelo diretor
- ✅ Log de resolução de empates
- ✅ Log de ativação de ciclo

#### **4. SCHEDULER/AUTOMATION**

- ✅ Job automático para transição de vigências
- ✅ Validação de data de fim do período
- ✅ Criação automática da próxima vigência

#### **5. RBAC (Role-Based Access Control)**

- ✅ Apenas `DIRETOR` pode oficializar resultados
- ✅ Apenas `DIRETOR` pode resolver empates
- ✅ Apenas `DIRETOR` pode ativar ciclos

#### **6. FRONTEND Admin Interface**

- ✅ Dashboard de vigências pendentes
- ✅ Tela "Finalizar Período" com gestão de empates
- ✅ Tela "Ativar Ciclo" com validação de metas
- ✅ Histórico de oficializações

### **🎯 BENEFÍCIOS DO NOVO FLUXO**

1. **Governança:** Diretor tem controle final sobre resultados oficiais
2. **Transparência:** Todos os passos auditados e logados
3. **Automação:** Sistema cuida das transições automáticas
4. **Flexibilidade:** Resolução manual de empates quando necessário
5. **Segurança:** Múltiplas validações e roles específicos

### **📊 NOMENCLATURA DA API**

**Formato atual detectado:** `YYYY-MM` (ex: `2025-06`, `2025-07`)

**Validação:** Está correto e consistente em todo o sistema.

### **🚀 PRÓXIMOS PASSOS**

1. **Atualização da Entity** (novo status + campos)
2. **Scheduler automático** (transição de vigências)
3. **Métodos do PeriodService** (pré-fechamento + oficialização)
4. **Detecção de empates** no RankingService
5. **Logs de auditoria** completos
6. **Validações RBAC** para diretores

### **✅ Campo `setorVencedorId`**

**Benefícios:**

- 🔗 **Amarração completa:** Resultado oficial fica persistido na entidade
- 📊 **Consultas diretas:** Histórico de vencedores sem precisar recalcular
- 🔍 **Auditoria aprimorada:** Quem venceu, quando e quem definiu
- 📈 **Analytics futuras:** Relatórios de performance por setor ao longo do tempo

### **🎲 EMPATES: Separação de Responsabilidades**

**Entendi perfeitamente:**

- ✅ **Ranking por critério:** Lógica existente mantida intacta
- 🆕 **Ranking global:** Nova lógica específica para empates na pontuação final
- 🎯 **Escopo:** Apenas quando 2+ setores têm a mesma pontuação total

---

## 📋 **ROADMAP TÉCNICO**

### **FASE 1: Estrutura de Dados**

- [ ] Atualizar `CompetitionPeriodEntity`
  - Adicionar enum `PRE_FECHADA`
  - Adicionar `setorVencedorId: number | null`
  - Adicionar `oficialiazadaPorUserId: number | null`
  - Adicionar `oficializadaEm: Date | null`
  - Adicionar `vencedorEmpateDefinidoPor: number | null`

### **FASE 2: Lógica de Negócio**

- [ ] **PeriodService:** Método `preClosePeriod()` (automático)
- [ ] **PeriodService:** Método `officializePeriod()` (manual diretor)
- [ ] **RankingService:** Método `detectGlobalTies()`
- [ ] **RankingService:** Método `resolveGlobalTie(sectorId, directorId)`

### **FASE 3: Automação**

- [ ] **Scheduler:** Job automático transição `ATIVA` → `PRE_FECHADA`
- [ ] **Automation:** Criação automática próxima vigência
- [ ] **RBAC:** Validações role `DIRETOR`

### **FASE 4: Auditoria**

- [ ] **AuditLog:** Eventos específicos para novo fluxo
- [ ] **AuditLog:** Logs de resolução de empates
- [ ] **AuditLog:** Logs de oficialização

### **FASE 5: APIs**

- [ ] **Endpoints:** `POST /api/periods/:id/officialize`
- [ ] **Endpoints:** `POST /api/periods/:id/resolve-tie`
- [ ] **Endpoints:** `GET /api/periods/pending-officializations`

---

## 🛠️ **GUIA TÉCNICO RESUMIDO**

### **1. CompetitionPeriodEntity**

```typescript
// Novos campos
setorVencedorId?: number | null
oficialiazadaPorUserId?: number | null
oficializadaEm?: Date | null
vencedorEmpateDefinidoPor?: number | null

// Novo enum
status: 'PLANEJAMENTO' | 'ATIVA' | 'PRE_FECHADA' | 'FECHADA'
```

### **2. Fluxo Automático (Scheduler)**

```typescript
// Diário às 00:01
checkPeriodsToPreClose() {
  // Se dataFim = hoje-1 E status = ATIVA
  // → status = PRE_FECHADA
  // → criar próxima vigência PLANEJAMENTO
}
```

### **3. Detecção de Empates Globais**

```typescript
detectGlobalTies(rankingFinal) {
  // Agrupar por pontuação total
  // Retornar grupos com count > 1
  return { hasties: boolean, tiedGroups: SectorGroup[] }
}
```

### **4. Oficialização pelo Diretor**

```typescript
officializePeriod(periodId, winnerSectorId, directorId) {
  // Validar role DIRETOR
  // Validar status PRE_FECHADA
  // Setar setorVencedorId, oficialiazadaPorUserId, oficializadaEm
  // Status → FECHADA
  // Log auditoria completo
}
```

### **5. Ordem de Implementação**

1. **Entity + Migration** (estrutura)
2. **PeriodService** (lógica negócio)
3. **RankingService** (empates globais)
4. **Scheduler** (automação)
5. **APIs** (endpoints)
6. **Audit** (logs)

---
