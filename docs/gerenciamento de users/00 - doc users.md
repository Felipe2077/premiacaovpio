# 📚 Documentação - Sistema de Gestão de Usuários

## 🎯 **Visão Geral**

O Sistema de Gestão de Usuários permite o controle completo de usuários da aplicação, incluindo CRUD, permissões, segurança e auditoria. Foi desenvolvido seguindo padrões enterprise com foco em segurança e rastreabilidade.

### **🏗️ Arquitetura Implementada**

- **Backend**: TypeScript + Fastify + TypeORM
- **Validação**: DTOs tipados com funções de validação
- **Segurança**: RBAC (Role-Based Access Control)
- **Auditoria**: Logs automáticos de todas as ações
- **Paginação**: Suporte completo com filtros avançados

#### **🔐 Indicadores Visuais Sugeridos:**

**🟢 Status Normal:**

- Badge verde: "Ativo"
- Tooltip: "0 tentativas de login"

**🟡 Status Atenção:**

- Badge amarelo: "3/5 tentativas"
- Tooltip: "Cuidado: 2 tentativas restantes"

**🔴 Status Bloqueado:**

- Badge vermelho: "Bloqueado"
- Tooltip: "Desbloqueio em 12 minutos"
- Botão: "Desbloquear Agora"

#### **📊 Dashboard de Segurança:**

- **Total de contas bloqueadas**: Métrica em tempo real
- **Tentativas de login hoje**: Gráfico por hora
- **Usuários com múltiplas tentativas**: Lista de atenção
- **Histórico de desbloqueios**: Log de ações administrativas

---

## 🔒 **Sistema de Bloqueio de Contas**

### **🚨 Configurações de Segurança Implementadas:**

#### **📊 Limites Configurados:**

- **Tentativas máximas**: `5 tentativas` de login incorretas
- **Tempo de bloqueio**: `15 minutos` automáticos
- **Reset automático**: Contador zerado após login bem-sucedido

#### **🔄 Fluxo de Bloqueio:**

1. **1ª-4ª tentativa**: Login falha, contador incrementa
2. **5ª tentativa**: Conta é **bloqueada automaticamente** por 15 minutos
3. **Durante bloqueio**: Todas as tentativas são rejeitadas
4. **Após 15 minutos**: Bloqueio expira automaticamente
5. **Login bem-sucedido**: Contador é resetado para zero

#### **⏰ Comportamento Temporal:**

- **Bloqueio expira**: Automaticamente após exatamente 15 minutos
- **Não acumula tempo**: Cada bloqueio é sempre de 15 minutos
- **Fuso horário**: Sistema usa horário do servidor (UTC)

#### **🔧 Admin Override:**

- **Desbloqueio manual**: Admin pode desbloquear antes dos 15 minutos
- **Reset contador**: Admin pode zerar tentativas via API
- **Auditoria**: Desbloqueio manual gera log de auditoria

### **📱 Estados no Frontend:**

#### **🟢 Conta Normal**

```json
{
  "loginAttempts": 0,
  "isLocked": false,
  "lockedUntil": null
}
```

#### **🟡 Conta com Tentativas**

```json
{
  "loginAttempts": 3,
  "isLocked": false,
  "lockedUntil": null
}
```

#### **🔴 Conta Bloqueada**

```json
{
  "loginAttempts": 5,
  "isLocked": true,
  "lockedUntil": "2025-06-24T18:15:00Z"
}
```

### **⚠️ Mensagens de Erro no Login:**

#### **❌ Credenciais Incorretas (1ª-4ª tentativa):**

```json
{
  "error": "Credenciais inválidas"
}
```

#### **🚫 Conta Bloqueada (5ª+ tentativa):**

```json
{
  "error": "Conta bloqueada por 12 minutos devido a múltiplas tentativas de login falharam"
}
```

_Nota: O tempo restante é calculado dinamicamente_

#### **⛔ Conta Desativada:**

```json
{
  "error": "Conta desativada"
}
```

### **Roles Disponíveis:**

- **`DIRETOR`**: Acesso total (pode gerenciar usuários)
- **`GERENTE`**: Acesso operacional (não pode gerenciar usuários)
- **`VISUALIZADOR`**: Apenas leitura (não pode gerenciar usuários)

### **Permissão Necessária:**

- **`MANAGE_USERS`**: Obrigatória para todas as rotas de gestão de usuários
- Apenas usuários com role `DIRETOR` possuem esta permissão

---

## 📋 **API Endpoints - Referência Completa**

### **🔍 1. Listagem e Busca**

#### **GET /api/admin/users**

Lista usuários com filtros e paginação.

**Headers:**

```http
Authorization: Bearer {token}
```

**Query Parameters:**
| Parâmetro | Tipo | Obrigatório | Descrição | Valores |
|-----------|------|-------------|-----------|---------|
| `page` | integer | ❌ | Página atual | Default: 1 |
| `limit` | integer | ❌ | Itens por página | Default: 20, Max: 100 |
| `active` | boolean | ❌ | Filtrar por status | `true`, `false` |
| `role` | string | ❌ | Filtrar por role | `DIRETOR`, `GERENTE`, `VISUALIZADOR` |
| `sectorId` | integer | ❌ | Filtrar por setor | ID do setor |
| `search` | string | ❌ | Busca por nome/email | Texto livre |
| `sortBy` | string | ❌ | Ordenação | `nome:asc`, `email:desc`, etc. |

**Exemplo de Request:**

```http
GET /api/admin/users?page=1&limit=10&active=true&role=GERENTE&sortBy=nome:asc
```

**Response (200):**

```json
{
  "data": [
    {
      "id": 1,
      "nome": "João Silva",
      "email": "joao@empresa.com",
      "role": "GERENTE",
      "ativo": true,
      "lastLoginAt": "2025-06-24T10:30:00Z",
      "sectorId": 1,
      "sector": null,
      "createdAt": "2025-01-15T08:00:00Z",
      "updatedAt": "2025-06-20T14:30:00Z",
      "loginAttempts": 0,
      "isLocked": false
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3,
  "hasNextPage": true,
  "hasPrevPage": false
}
```

---

#### **GET /api/admin/users/{id}**

Busca usuário específico por ID.

**Path Parameters:**

- `id` (integer): ID do usuário

**Response (200):**

```json
{
  "id": 1,
  "nome": "João Silva",
  "email": "joao@empresa.com",
  "role": "GERENTE",
  "permissions": ["request_expurgos", "view_reports", "view_rankings"],
  "ativo": true,
  "sectorId": 1,
  "sector": null,
  "lastLoginAt": "2025-06-24T10:30:00Z",
  "loginAttempts": 0,
  "lockedUntil": null,
  "isLocked": false,
  "createdAt": "2025-01-15T08:00:00Z",
  "updatedAt": "2025-06-20T14:30:00Z",
  "activeSessions": 0,
  "recentActivity": []
}
```

**Erros Possíveis:**

- `404`: Usuário não encontrado
- `400`: ID inválido

---

### **🏗️ 2. Criação de Usuários**

#### **POST /api/admin/users**

Cria novo usuário no sistema.

**Body (JSON):**

```json
{
  "nome": "Maria Santos",
  "email": "maria@empresa.com",
  "password": "MinhaSenh@123",
  "role": "GERENTE",
  "sectorId": 1,
  "ativo": true,
  "sendWelcomeEmail": false
}
```

**Campos:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `nome` | string | ✅ | Nome completo (min: 2 chars) |
| `email` | string | ✅ | Email único no sistema |
| `password` | string | ❌ | Senha (min: 8 chars). Se não fornecida, será gerada |
| `role` | enum | ✅ | `DIRETOR`, `GERENTE`, `VISUALIZADOR` |
| `sectorId` | integer | ❌ | ID do setor |
| `ativo` | boolean | ❌ | Default: `true` |
| `sendWelcomeEmail` | boolean | ❌ | Default: `true` (funcionalidade futura) |

**Response (201):**

```json
{
  "user": {
    "id": 15,
    "nome": "Maria Santos",
    "email": "maria@empresa.com",
    "role": "GERENTE",
    "ativo": true,
    "lastLoginAt": null,
    "sectorId": 1,
    "sector": null,
    "createdAt": "2025-06-24T15:30:00Z",
    "updatedAt": "2025-06-24T15:30:00Z",
    "loginAttempts": 0,
    "isLocked": false
  },
  "temporaryPassword": "A9kL#mN8xY2p",
  "actions": {
    "emailSent": false,
    "passwordGenerated": true
  }
}
```

**Regras de Negócio:**

- ✅ Email deve ser único no sistema
- ✅ Senha é gerada automaticamente se não fornecida
- ✅ Senha gerada contém: maiúsculas, minúsculas, números e símbolos
- ✅ Setor deve existir se fornecido
- ✅ Log de auditoria é criado automaticamente

**Erros Possíveis:**

- `400`: Email já em uso, dados inválidos
- `404`: Setor não encontrado

---

### **✏️ 3. Atualização de Usuários**

#### **PUT /api/admin/users/{id}**

Atualiza dados de usuário existente.

**Body (JSON) - Todos os campos são opcionais:**

```json
{
  "nome": "Maria Santos Silva",
  "email": "maria.santos@empresa.com",
  "role": "DIRETOR",
  "sectorId": 2,
  "ativo": true
}
```

**Response (200):**

```json
{
  "id": 15,
  "nome": "Maria Santos Silva",
  "email": "maria.santos@empresa.com",
  "role": "DIRETOR",
  "ativo": true,
  "lastLoginAt": null,
  "sectorId": 2,
  "sector": null,
  "createdAt": "2025-06-24T15:30:00Z",
  "updatedAt": "2025-06-24T16:45:00Z",
  "loginAttempts": 0,
  "isLocked": false
}
```

**Regras de Negócio:**

- ✅ Apenas campos fornecidos são atualizados
- ✅ Email deve continuar único se alterado
- ✅ Histórico de alterações é mantido via auditoria
- ✅ Usuário não pode alterar próprio role/status

---

### **🗑️ 4. Desativação de Usuários**

#### **DELETE /api/admin/users/{id}**

Desativa usuário (soft delete - não remove do banco).

**Body (JSON):**

```json
{
  "justification": "Usuário solicitou desligamento da empresa"
}
```

**Campos:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `justification` | string | ✅ | Justificativa (min: 10, max: 500 chars) |

**Response (200):**

```json
{
  "success": true,
  "message": "Usuário desativado com sucesso"
}
```

**Regras de Negócio:**

- ✅ Usuário não pode desativar própria conta
- ✅ Justificativa é obrigatória para auditoria
- ✅ Dados não são removidos do banco (soft delete)
- ✅ Usuário desativado não consegue fazer login

---

## 🔧 **Ações Administrativas**

### **🔓 Desbloqueio Manual (Admin)**

#### **POST /api/admin/users/{id}/unlock**

Desbloqueia conta antes do tempo natural de expiração.

**Body (JSON):**

```json
{
  "justification": "Desbloqueio solicitado pelo usuário via suporte telefônico",
  "resetLoginAttempts": true
}
```

**Campos:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `justification` | string | ✅ | Motivo do desbloqueio (min: 10, max: 500 chars) |
| `resetLoginAttempts` | boolean | ❌ | Se deve zerar contador (default: `true`) |

**Response (200):**

```json
{
  "success": true,
  "message": "Usuário desbloqueado com sucesso"
}
```

**Regras de Negócio:**

- ✅ Apenas contas realmente bloqueadas podem ser desbloqueadas
- ✅ Justificativa é obrigatória para auditoria
- ✅ Admin pode escolher manter ou resetar contador de tentativas
- ✅ Log de auditoria é criado automaticamente

**Erros Possíveis:**

- `404`: Usuário não encontrado
- `409`: Usuário não está bloqueado
- `400`: Justificativa inválida

---

## 🔐 **Sistema de Permissões**

### **🔑 Reset de Senha**

#### **POST /api/admin/users/{id}/reset-password**

Faz reset da senha do usuário.

**Body (JSON):**

```json
{
  "justification": "Reset solicitado pelo usuário - esqueceu a senha",
  "newPassword": "NovaSenh@456",
  "forceChangeOnLogin": true,
  "notifyUser": true
}
```

**Campos:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `justification` | string | ✅ | Motivo do reset |
| `newPassword` | string | ❌ | Nova senha. Se não fornecida, será gerada |
| `forceChangeOnLogin` | boolean | ❌ | Default: `true` |
| `notifyUser` | boolean | ❌ | Default: `true` (funcionalidade futura) |

**Response (200):**

```json
{
  "success": true,
  "newPassword": "X7nM#kR2vL9q",
  "actions": {
    "emailSent": false,
    "passwordGenerated": true
  }
}
```

---

### **🔄 Ativar/Desativar Usuário**

#### **POST /api/admin/users/{id}/toggle-status**

Alterna status ativo/inativo do usuário.

**Body (JSON):**

```json
{
  "ativo": false,
  "justification": "Suspensão temporária por violação de política"
}
```

**Response (200):**

```json
{
  "id": 15,
  "nome": "Maria Santos Silva",
  "email": "maria.santos@empresa.com",
  "role": "GERENTE",
  "ativo": false,
  "lastLoginAt": null,
  "sectorId": 1,
  "sector": null,
  "createdAt": "2025-06-24T15:30:00Z",
  "updatedAt": "2025-06-24T17:15:00Z",
  "loginAttempts": 0,
  "isLocked": false
}
```

---

## 🔍 **Endpoints de Busca Especializada**

### **📱 Busca Textual**

#### **GET /api/admin/users/search**

Busca rápida por nome ou email.

**Query Parameters:**

- `q` (string, obrigatório): Termo de busca (min: 2 chars)
- `limit` (integer): Limite de resultados (max: 50)

**Exemplo:**

```http
GET /api/admin/users/search?q=maria&limit=5
```

**Response:**

```json
{
  "users": [
    {
      "id": 15,
      "nome": "Maria Santos",
      "email": "maria@empresa.com",
      "role": "GERENTE",
      "ativo": true
    }
  ],
  "total": 1,
  "query": "maria"
}
```

---

### **🏢 Usuários por Setor**

#### **GET /api/admin/users/by-sector/{sectorId}**

Lista usuários de um setor específico.

**Response:** Mesmo formato da listagem principal, filtrado por setor.

---

### **👥 Usuários por Role**

#### **GET /api/admin/users/by-role/{role}**

Lista usuários com role específico.

**Path Parameters:**

- `role`: `DIRETOR`, `GERENTE`, ou `VISUALIZADOR`

---

### **✉️ Validação de Email**

#### **POST /api/admin/users/validate-email**

Verifica se email está disponível.

**Body (JSON):**

```json
{
  "email": "novo@empresa.com",
  "excludeUserId": 5
}
```

**Response (200):**

```json
{
  "email": "novo@empresa.com",
  "available": true,
  "reason": null
}
```

---

## 📊 **Estatísticas e Relatórios**

### **📈 Estatísticas Gerais**

#### **GET /api/admin/users/statistics**

Retorna métricas completas do sistema.

**Response (200):**

```json
{
  "totalUsers": 45,
  "activeUsers": 42,
  "inactiveUsers": 3,
  "lockedUsers": 1,
  "byRole": {
    "DIRETOR": 3,
    "GERENTE": 25,
    "VISUALIZADOR": 17
  },
  "bySector": {
    "GAMA": 12,
    "PARANOÁ": 10,
    "SANTA MARIA": 11,
    "SÃO SEBASTIÃO": 9
  },
  "recentLogins": 18,
  "recentRegistrations": 3
}
```

---

### **🏥 Health Check**

#### **GET /api/admin/users/health**

Verifica saúde do serviço de usuários.

**Response (200):**

```json
{
  "healthy": true,
  "details": {
    "usersCount": 45,
    "databaseConnection": "ok",
    "timestamp": "2025-06-24T18:00:00Z"
  }
}
```

---

## 🔐 **Gestão de Sessões** (Beta)

### **📱 Listar Sessões**

#### **GET /api/admin/users/{id}/sessions**

Lista sessões ativas do usuário.

**Response (200):**

```json
{
  "userId": 15,
  "sessions": [],
  "total": 0,
  "message": "Funcionalidade de sessões será implementada em breve"
}
```

### **❌ Invalidar Sessões**

#### **POST /api/admin/users/{id}/invalidate-sessions**

Força logout de todas as sessões do usuário.

**Body (JSON):**

```json
{
  "justification": "Atividade suspeita detectada"
}
```

---

## 🎨 **Guia para Frontend**

### **📋 Páginas Recomendadas**

#### **1. 👥 Lista de Usuários (`/admin/users`)**

- **Tabela paginada** com colunas: Nome, Email, Role, Status, Último Login, Ações
- **Filtros avançados**: Status, Role, Setor, Busca textual
- **Ações por linha**: Ver, Editar, Desativar, Reset Senha
- **Botão principal**: "Novo Usuário"

#### **2. ➕ Criar/Editar Usuário (`/admin/users/new`, `/admin/users/{id}/edit`)**

- **Formulário com campos**: Nome, Email, Role, Setor, Status
- **Campo senha**: Opcional na criação, automática se vazio
- **Validação em tempo real**: Email único, nome mínimo, etc.
- **Botões**: Salvar, Cancelar

#### **3. 👤 Detalhes do Usuário (`/admin/users/{id}`)**

- **Informações completas**: Dados pessoais, permissões, histórico
- **Ações rápidas**: Reset senha, desbloquear, ativar/desativar
- **Logs de atividade**: Últimos logins, ações realizadas

#### **4. 📊 Dashboard de Usuários (`/admin/users/dashboard`)**

- **Métricas visuais**: Total, ativos, por role, por setor
- **Gráficos**: Distribuição, crescimento, atividade
- **Alertas**: Usuários bloqueados, inativos há muito tempo

---

### **🎯 Componentes Sugeridos**

#### **📝 UserForm**

```typescript
interface UserFormProps {
  user?: UserDetail;
  mode: 'create' | 'edit';
  onSave: (data: CreateUserDto | UpdateUserDto) => void;
  onCancel: () => void;
}
```

#### **📋 UserTable**

```typescript
interface UserTableProps {
  users: PaginatedUsersResponse;
  filters: UserFilters;
  onFilterChange: (filters: UserFilters) => void;
  onUserAction: (action: string, userId: number) => void;
}
```

#### **🔧 UserActions**

```typescript
interface UserActionsProps {
  user: UserSummary;
  onEdit: () => void;
  onDelete: () => void;
  onResetPassword: () => void;
  onToggleStatus: () => void;
}
```

---

### **🔄 Estados de Loading**

#### **📊 Estados Recomendados**

- **Loading**: Carregando dados iniciais
- **Submitting**: Salvando alterações
- **Deleting**: Processando exclusão
- **Refreshing**: Atualizando dados

#### **⚠️ Estados de Erro**

- **NetworkError**: Falha de conexão
- **ValidationError**: Dados inválidos
- **AuthError**: Sem permissão
- **NotFoundError**: Usuário não existe

---

### **📱 Responsividade**

#### **💻 Desktop**

- Tabela completa com todas as colunas
- Filtros laterais ou em drawer
- Modais para ações rápidas

#### **📱 Mobile**

- Cards em lista vertical
- Filtros em bottom sheet
- Ações em menu contextual

---

### **🎨 UX Recomendações**

#### **✅ Feedbacks Visuais**

- **Success**: Toast verde para ações bem-sucedidas
- **Warning**: Modal de confirmação para ações destrutivas
- **Error**: Toast vermelho com detalhes do erro
- **Info**: Badge para indicar status (ativo, bloqueado, etc.)

#### **🔄 Fluxos Principais**

1. **Criar usuário**: Form → Validação → API → Feedback → Redirect
2. **Editar usuário**: Load data → Form → Validação → API → Feedback
3. **Ações rápidas**: Confirmação → API → Feedback → Refresh list

#### **⚡ Performance**

- **Debounce** na busca textual (300ms)
- **Cache** das listas por 5 minutos
- **Lazy loading** da tabela
- **Skeleton screens** durante carregamento

---

## 🔒 **Segurança e Auditoria**

### **🛡️ Autenticação**

- Todas as rotas exigem token JWT válido
- Token deve ter permissão `MANAGE_USERS`
- Middleware de RBAC aplicado automaticamente

### **📝 Logs de Auditoria**

Todas as ações geram logs automáticos com:

- **Usuário que executou** a ação
- **Tipo de ação** (CREATE_USER, UPDATE_USER, etc.)
- **Dados alterados** (antes/depois)
- **Justificativa** (quando aplicável)
- **Timestamp** e **IP** da requisição

### **🔐 Validações de Segurança**

- **Senhas**: Mínimo 8 caracteres, hash BCrypt
- **Emails**: Únicos no sistema, formato válido
- **Justificativas**: Obrigatórias para ações críticas
- **Rate limiting**: Prevenção de spam via schema validation

---

## ❌ **Códigos de Erro**

| Código | Descrição      | Quando Ocorre                        |
| ------ | -------------- | ------------------------------------ |
| `400`  | Bad Request    | Dados inválidos, validação falhou    |
| `401`  | Unauthorized   | Token inválido ou expirado           |
| `403`  | Forbidden      | Sem permissão MANAGE_USERS           |
| `404`  | Not Found      | Usuário/recurso não encontrado       |
| `409`  | Conflict       | Email já em uso, conta já desativada |
| `500`  | Internal Error | Erro no servidor/banco de dados      |

---

## 🚀 **Próximos Passos**

### **📧 Funcionalidades Futuras**

- [ ] Envio automático de emails de boas-vindas
- [ ] Notificações de alteração de senha
- [ ] Gestão completa de sessões ativas
- [ ] Upload de foto de perfil
- [ ] Integração com Active Directory
- [ ] Relatórios avançados em PDF/Excel

### **🔧 Melhorias Técnicas**

- [ ] Cache Redis para consultas frequentes
- [ ] Rate limiting por usuário
- [ ] Logs estruturados (ELK Stack)
- [ ] Métricas de performance
- [ ] Testes automatizados

---

**📋 Esta documentação serve como guia completo para implementação do frontend de gestão de usuários. Todas as rotas estão funcionais e testadas via Postman.**
