# 🎨 Sistema UI/UX Admin - Documentação

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Estrutura de Arquivos](#estrutura-de-arquivos)
- [Configuração de Tema](#configuração-de-tema)
- [AdminSidebar](#adminsidebar)
- [Componentes Utilitários](#componentes-utilitários)
- [Layout Admin](#layout-admin)
- [Exemplos de Uso](#exemplos-de-uso)
- [Customização](#customização)

---

## 🎯 Visão Geral

Sistema UI/UX moderno para área administrativa com **identidade visual baseada na cor amarela da empresa**. Inclui sidebar colapsável, componentes reutilizáveis e tema consistente.

### ✨ Características Principais

- **Design System** baseado na identidade da empresa
- **Sidebar moderna** com funcionalidades avançadas
- **Componentes reutilizáveis** para estatísticas e status
- **Tema dark/light** com gradientes elegantes
- **Responsividade completa**

---

## 📁 Estrutura de Arquivos

```
apps/web/src/
├── components/
│   └── admin/
│       ├── AdminSidebar.tsx          # Sidebar principal
│       └── AdminComponents.tsx       # Utilitários UI
├── lib/
│   └── theme.ts                      # Configurações de tema
├── app/
│   └── admin/
│       └── layout.tsx                # Layout atualizado
└── docs/
    └── UI/
        └── admin-ui-guide.md         # Esta documentação
```

---

## 🎨 Configuração de Tema

### Arquivo: `apps/web/src/lib/theme.ts`

Centraliza todas as configurações visuais da empresa:

```typescript
import { companyTheme, companyClasses } from '@/lib/theme';

// Cores principais (baseado no amarelo da logo)
companyTheme.primary[400]; // #fbbf24 - Amarelo principal
companyTheme.secondary[800]; // #1e293b - Cinza escuro

// Classes utilitárias
companyClasses.button.primary; // Botão principal amarelo
companyClasses.card.primary; // Card com fundo amarelo sutil
companyClasses.active.sidebar; // Estado ativo da sidebar
```

### Principais Propriedades:

- **`primary`**: Paleta de amarelos (50-900)
- **`secondary`**: Paleta de cinzas modernos (50-900)
- **`gradients`**: Gradientes pré-definidos
- **`companyClasses`**: Classes utilitárias prontas

---

## 🗂️ AdminSidebar

### Arquivo: `apps/web/src/components/admin/AdminSidebar.tsx`

Sidebar moderna e responsiva com funcionalidades avançadas.

### ⚙️ Funcionalidades:

- **Colapsável**: Alterna entre expandida (288px) e compacta (64px)
- **Estados ativos**: Destaque visual para página atual
- **Badges**: Notificações integradas
- **Tooltips**: Informações no modo compacto
- **Avatar do usuário**: Com cores baseadas no perfil
- **Logout integrado**: Botão de sair do sistema

### 🎛️ Configuração de Menu:

```typescript
const menuItems: MenuItem[] = [
  {
    title: 'Visão Geral',
    href: '/admin',
    icon: BarChart3,
    show: true,
    description: 'Dashboard principal',
  },
  {
    title: 'Vigências',
    href: '/admin/vigencias',
    icon: Clock,
    show: canViewReports() || isDirector(),
    hasBadge: true, // Mostra VigenciasBadge
    description: 'Períodos ativos',
  },
  // ... mais itens
];
```

### 🔧 Integração:

```typescript
import { AdminSidebar } from '@/components/admin/AdminSidebar';

// No layout admin
<AdminSidebar />
```

---

## 🧩 Componentes Utilitários

### Arquivo: `apps/web/src/components/admin/AdminComponents.tsx`

### 1. **StatusBadge** - Badges de status com ícones

```typescript
import { StatusBadge } from '@/components/admin/AdminComponents';

<StatusBadge status="active" size="default">
  Sistema Online
</StatusBadge>
```

**Props:**

- `status`: 'active' | 'inactive' | 'pending' | 'error' | 'success' | 'warning'
- `size`: 'sm' | 'default' | 'lg'

### 2. **StatsCard** - Cards de estatísticas modernas

```typescript
<StatsCard
  title="Total de Usuários"
  value={1250}
  description="Usuários ativos"
  icon={Users}
  trend={{
    value: 12,
    type: 'up',
    period: 'vs mês passado'
  }}
  variant="primary"
/>
```

**Props:**

- `title`: Título do card
- `value`: Valor principal (número ou string)
- `icon`: Ícone do Lucide React
- `trend`: Objeto com tendência (opcional)
- `variant`: 'default' | 'primary' | 'success' | 'warning' | 'error'

### 3. **StatsGrid** - Grid responsivo de estatísticas

```typescript
<StatsGrid
  stats={[
    { id: '1', title: 'Usuários', value: 1250, icon: Users },
    { id: '2', title: 'Vendas', value: 85420, icon: TrendingUp },
  ]}
  columns={4}
  isLoading={false}
/>
```

### 4. **AdminPageHeader** - Header padrão para páginas

```typescript
<AdminPageHeader
  title="Gerenciamento de Usuários"
  description="Gerencie usuários, permissões e acessos"
  breadcrumbs={[
    { label: 'Admin', href: '/admin' },
    { label: 'Usuários' }
  ]}
  actions={
    <PrimaryActionButton icon={Plus}>
      Novo Usuário
    </PrimaryActionButton>
  }
/>
```

### 5. **PrimaryActionButton** - Botão de ação principal

```typescript
<PrimaryActionButton
  variant="primary"
  size="default"
  icon={Plus}
  onClick={() => createUser()}
  loading={isCreating}
>
  Criar Usuário
</PrimaryActionButton>
```

---

## 🏗️ Layout Admin

### Arquivo: `apps/web/src/app/admin/layout.tsx`

Layout principal que integra todos os componentes.

### ✨ Características:

- **Background gradiente** moderno
- **Header sticky** com indicador de status
- **Margens responsivas** baseadas no estado da sidebar
- **Proteção de rotas** integrada
- **Toaster** para notificações

### 🔧 Estrutura:

```typescript
<ProtectedRoute permissions={[...]}>
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
    <AdminSidebar />
    <main className="flex-1 ml-16 lg:ml-72">
      <header>/* Header sticky */</header>
      <div className="p-4 sm:p-6 lg:p-8">
        {children}
      </div>
    </main>
  </div>
</ProtectedRoute>
```

---

## 💡 Exemplos de Uso

### Dashboard Page Completo:

```typescript
'use client';

import {
  AdminPageHeader,
  StatsGrid,
  SystemStatusIndicator
} from '@/components/admin/AdminComponents';
import { Users, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

export default function AdminDashboard() {
  const stats = [
    {
      id: 'users',
      title: 'Total de Usuários',
      value: 1250,
      icon: Users,
      variant: 'primary' as const,
      trend: { value: 12, type: 'up' as const, period: 'vs mês passado' }
    },
    {
      id: 'active',
      title: 'Sessões Ativas',
      value: 89,
      icon: CheckCircle,
      variant: 'success' as const,
    },
    // ... mais stats
  ];

  return (
    <>
      <AdminPageHeader
        title="Painel Administrativo"
        description="Visão geral do sistema"
        actions={<SystemStatusIndicator />}
      />

      <StatsGrid stats={stats} columns={4} />

      {/* Resto do conteúdo */}
    </>
  );
}
```

### Página com Loading States:

```typescript
import { StatsGrid, TableSkeleton } from '@/components/admin/AdminComponents';

function UsersPage() {
  const { data, isLoading } = useUsers();

  if (isLoading) {
    return (
      <>
        <StatsGrid stats={[]} isLoading={true} />
        <TableSkeleton rows={5} columns={4} />
      </>
    );
  }

  return (
    // Conteúdo normal
  );
}
```

---

## 🎨 Customização

### Alterando Cores da Empresa:

1. **Edite `theme.ts`**:

```typescript
export const companyTheme = {
  primary: {
    400: '#your-company-color', // Cor principal
    // ... outros tons
  },
};
```

2. **Ajuste gradientes**:

```typescript
gradients: {
  primary: 'bg-gradient-to-r from-your-color-400 to-your-color-500',
}
```

### Adicionando Nova Variante de Card:

```typescript
// Em AdminComponents.tsx
const variants = {
  // ... existentes
  custom: 'border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100',
};

const iconColors = {
  // ... existentes
  custom: 'text-purple-600',
};
```

### Criando Novo Item de Menu:

```typescript
// Em AdminSidebar.tsx, adicione no array menuItems:
{
  title: 'Nova Funcionalidade',
  href: '/admin/nova-funcionalidade',
  icon: YourIcon,
  show: userHasPermission(),
  description: 'Descrição da funcionalidade',
  isNew: true, // Badge "NOVO"
}
```

---

## 🚀 Implementação Rápida

### 1. Instalar Arquivos:

```bash
# Copie os arquivos para as pastas corretas conforme estrutura
```

### 2. Atualizar Imports:

```typescript
// Substitua imports antigos da sidebar por:
import { AdminSidebar } from '@/components/admin/AdminSidebar';
```

### 3. Usar Componentes:

```typescript
// Em qualquer página admin:
import {
  AdminPageHeader,
  StatsCard,
  StatusBadge,
} from '@/components/admin/AdminComponents';
```

### 4. Verificar Dependências:

- `@/components/ui/*` (shadcn/ui)
- `lucide-react`
- `tailwindcss`
- Sistema de autenticação existente (`useAuth`, `useComponentAccess`)

---

## 📝 Notas Importantes

- **Responsividade**: Todos os componentes são responsivos por padrão
- **Acessibilidade**: Componentes incluem atributos ARIA adequados
- **Performance**: Lazy loading e otimizações incluídas
- **Compatibilidade**: Integra com sistema de auth e permissões existente
- **Manutenibilidade**: Código modular e bem documentado

---

**🎯 Esta documentação serve como guia completo para dar continuidade ao desenvolvimento da interface administrativa com outra IA ou desenvolvedor.**
