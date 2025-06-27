# 📋 **ESPECIFICAÇÃO PARA DESENVOLVIMENTO FRONTEND - SISTEMA DE VIGÊNCIAS**

## **🎯 OBJETIVO**

Criar uma interface web moderna e intuitiva para gerenciar o ciclo completo de vigências, respeitando os níveis de acesso RBAC e proporcionando uma experiência otimizada para cada perfil de usuário.

---

## **👥 PERSONAS E FLUXOS**

### **🔴 DIRETOR - Painel Executivo**

**Responsabilidades:** Oficialização de resultados, resolução de empates, controle total do sistema

**Fluxos principais:**

1. **Dashboard executivo** com períodos pendentes
2. **Oficialização de períodos** com análise de empates
3. **Ativação de ciclos** após definição de metas
4. **Relatórios de auditoria** e histórico de decisões

### **🟡 GERENTE - Painel Operacional**

**Responsabilidades:** Monitoramento de resultados, análise de rankings, preparação para oficialização

**Fluxos principais:**

1. **Dashboard operacional** com status dos períodos
2. **Análise de rankings** e detecção de empates
3. **Validação de setores** para resolução de empates
4. **Relatórios setoriais** de performance

### **🟢 VISUALIZADOR - Painel Público**

**Responsabilidades:** Consulta de rankings e relatórios públicos

**Fluxos principais:**

1. **Dashboard público** com rankings atuais
2. **Histórico de resultados** oficializados
3. **Relatórios públicos** de performance

---

## **🖥️ ESTRUTURA DE PÁGINAS**

### **1. Layout Principal**

```
/app/vigencias/layout.tsx
├── Header com navegação contextual
├── Sidebar com menu por perfil
└── Content area responsiva
```

### **2. Dashboard Principal**

```
/app/vigencias/page.tsx
├── Cards de status por perfil
├── Período atual em destaque
├── Ações rápidas disponíveis
└── Alertas e notificações
```

### **3. Gestão de Períodos**

```
/app/vigencias/periodos/
├── page.tsx (Lista de períodos)
├── [id]/page.tsx (Detalhes do período)
├── [id]/analise/page.tsx (Análise de ranking)
├── [id]/oficializar/page.tsx (Oficialização - DIRETOR)
└── components/
    ├── PeriodCard.tsx
    ├── StatusBadge.tsx
    └── OfficialisationForm.tsx
```

### **4. Resolução de Empates**

```
/app/vigencias/empates/
├── page.tsx (Lista de empates pendentes)
├── [periodId]/page.tsx (Resolução específica)
└── components/
    ├── TieAnalysisCard.tsx
    ├── SectorSelector.tsx
    └── JustificationForm.tsx
```

### **5. Auditoria e Histórico**

```
/app/vigencias/auditoria/
├── page.tsx (Logs de auditoria)
├── periodos/page.tsx (Histórico de períodos)
└── components/
    ├── AuditLogTable.tsx
    ├── PeriodHistory.tsx
    └── FilterPanel.tsx
```

---

## **🎨 COMPONENTES E DESIGN SYSTEM**

### **Componentes Base**

#### **PeriodStatusBadge**

```typescript
interface PeriodStatusBadgeProps {
  status: 'PLANEJAMENTO' | 'ATIVA' | 'PRE_FECHADA' | 'FECHADA';
  size?: 'sm' | 'md' | 'lg';
}

// Cores e ícones:
// PLANEJAMENTO: azul, ícone de planejamento
// ATIVA: verde, ícone de play
// PRE_FECHADA: laranja, ícone de pausa
// FECHADA: roxo, ícone de check
```

#### **ActionButton**

```typescript
interface ActionButtonProps {
  action: 'officialize' | 'start' | 'close' | 'analyze';
  permissions: string[];
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}

// Botões contextuais baseados em permissões
// Oficializar: vermelho, ícone de gavel
// Iniciar: verde, ícone de play
// Analisar: azul, ícone de analytics
```

#### **TieIndicator**

```typescript
interface TieIndicatorProps {
  tieData: {
    hasGlobalTies: boolean;
    tiedGroups: TiedGroup[];
    winnerTieGroup?: TiedGroup;
  };
  compact?: boolean;
}

// Indicador visual de empates
// Sem empate: check verde
// Empate detectado: warning laranja
// Empate na 1ª posição: alerta vermelho
```

### **Layouts Responsivos**

#### **Desktop (>= 1024px)**

- Sidebar fixa com navegação completa
- Área principal com 2-3 colunas
- Modais para ações críticas
- Tables completas com todas as colunas

#### **Tablet (768px - 1023px)**

- Sidebar colapsível
- Área principal com 1-2 colunas
- Cards adaptáveis
- Tables com colunas essenciais

#### **Mobile (< 768px)**

- Menu hamburger
- Layout de coluna única
- Cards em stack
- Tables responsivas com scroll horizontal

---

## **🔐 CONTROLE DE ACESSO NO FRONTEND**

### **Hook de Autenticação**

```typescript
// hooks/useAuth.ts
interface User {
  id: number;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const hasPermission = (permission: string) =>
    user?.permissions.includes(permission) ?? false;

  const hasRole = (role: string) => user?.roles.includes(role) ?? false;

  const isDirector = () => hasRole('DIRETOR');
  const isManager = () => hasRole('GERENTE');
  const isViewer = () => hasRole('VISUALIZADOR');

  return {
    user,
    loading,
    hasPermission,
    hasRole,
    isDirector,
    isManager,
    isViewer,
  };
};
```

### **Componente de Proteção**

```typescript
// components/ProtectedComponent.tsx
interface ProtectedComponentProps {
  permissions?: string[];
  roles?: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const ProtectedComponent = ({
  permissions,
  roles,
  fallback,
  children
}: ProtectedComponentProps) => {
  const { hasPermission, hasRole } = useAuth();

  const hasRequiredPermissions = permissions?.every(p => hasPermission(p)) ?? true;
  const hasRequiredRoles = roles?.some(r => hasRole(r)) ?? true;

  if (!hasRequiredPermissions || !hasRequiredRoles) {
    return fallback || null;
  }

  return <>{children}</>;
};
```

### **Roteamento Protegido**

```typescript
// middleware/auth.middleware.ts
export const withAuth = (WrappedComponent: React.ComponentType, requiredPermissions?: string[]) => {
  return function AuthComponent(props: any) {
    const { user, loading, hasPermission } = useAuth();

    if (loading) return <LoadingSpinner />;

    if (!user) {
      redirect('/login');
      return null;
    }

    if (requiredPermissions && !requiredPermissions.every(p => hasPermission(p))) {
      return <UnauthorizedPage />;
    }

    return <WrappedComponent {...props} />;
  };
};
```

---

## **📱 TELAS DETALHADAS**

### **1. Dashboard Principal**

#### **Para Diretores**

```typescript
interface DirectorDashboard {
  pendingOfficializations: Period[];
  activeScheduler: SchedulerStatus;
  recentDecisions: AuditLog[];
  systemHealth: SystemStatus;
  quickActions: {
    officializePeriod: () => void;
    runScheduler: () => void;
    viewAuditLogs: () => void;
  };
}
```

**Layout:**

- **Card principal:** Períodos aguardando oficialização (destaque vermelho)
- **Status do scheduler:** Próxima execução e última execução
- **Decisões recentes:** Últimas 5 oficializações com timestamps
- **Ações rápidas:** Botões para principais funcionalidades

#### **Para Gerentes**

```typescript
interface ManagerDashboard {
  periodsToAnalyze: Period[];
  sectorPerformance: SectorMetrics[];
  upcomingDeadlines: Deadline[];
  recentRankings: RankingData[];
}
```

**Layout:**

- **Card principal:** Períodos para análise (destaque laranja)
- **Performance do setor:** Métricas do setor do gerente
- **Rankings recentes:** Últimas posições e tendências
- **Próximos prazos:** Deadlines importantes

#### **Para Visualizadores**

```typescript
interface ViewerDashboard {
  currentRankings: RankingData[];
  publicReports: Report[];
  recentResults: OfficialResult[];
}
```

**Layout:**

- **Rankings atuais:** Posições oficiais mais recentes
- **Relatórios públicos:** Documentos disponíveis para consulta
- **Resultados recentes:** Histórico de vencedores

### **2. Tela de Oficialização (DIRETOR)**

#### **Estrutura**

```typescript
interface OfficialisationPage {
  period: Period;
  rankingAnalysis: RankingAnalysisData;
  tieDetection: TieAnalysisData;
  form: {
    winnerSectorId: number;
    justification: string;
    tieResolvedBy?: number;
  };
}
```

#### **Seções**

1. **Header do Período**

   - Nome do período (ex: "Junho 2025")
   - Datas de início e fim
   - Status atual (PRE_FECHADA)
   - Tempo desde pré-fechamento

2. **Análise de Ranking**

   - Tabela de ranking completa
   - Destaque visual para empates
   - Indicadores de pontuação

3. **Detecção de Empates**

   - Alert especial se houver empate na 1ª posição
   - Lista de setores empatados
   - Sugestões de critérios de desempate

4. **Formulário de Oficialização**
   - Seletor de setor vencedor (dropdown com setores válidos)
   - Campo de justificativa (obrigatório, mín. 50 chars)
   - Checkbox de confirmação
   - Botão "Oficializar Período" (destaque)

#### **Validações**

- Setor selecionado deve estar na lista de elegíveis
- Justificativa obrigatória e significativa
- Confirmação dupla para ação crítica
- Loading state durante processamento

### **3. Tela de Análise de Empates**

#### **Componentes**

```typescript
interface TieAnalysisPage {
  period: Period;
  tieGroups: TiedGroup[];
  sectorValidation: SectorValidationData;
  recommendedCriteria: TieBreakingCriteria[];
}
```

#### **Layout**

1. **Resumo do Empate**

   - Número de setores empatados
   - Pontuação do empate
   - Posições afetadas

2. **Detalhes por Setor**

   - Cards para cada setor empatado
   - Performance detalhada por critério
   - Histórico de resultados anteriores

3. **Critérios de Desempate**

   - Lista de critérios sugeridos
   - Aplicação hipotética de cada critério
   - Resultado simulado após aplicação

4. **Ações Disponíveis**
   - Validar elegibilidade de setores
   - Simular diferentes cenários
   - Prosseguir para oficialização

### **4. Logs de Auditoria**

#### **Filtros Avançados**

```typescript
interface AuditFilters {
  dateRange: { start: Date; end: Date };
  actionTypes: string[];
  users: number[];
  periods: string[];
  entityTypes: string[];
}
```

#### **Visualização**

- **Timeline view:** Eventos cronológicos
- **Table view:** Dados tabulares com filtros
- **Details modal:** Popup com JSON completo do log
- **Export functions:** CSV, PDF para auditoria

---
