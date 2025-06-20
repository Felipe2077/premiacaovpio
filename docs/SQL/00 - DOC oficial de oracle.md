# Documentação Completa - Sistema Aprovador de Pagamentos Digital

## 📋 Sumário

1. [Visão Geral do Projeto](#visão-geral)
2. [Arquitetura Descoberta](#arquitetura-descoberta)
3. [Mapeamento Completo de Tabelas](#mapeamento-tabelas)
4. [Consultas SQL Essenciais](#consultas-sql)
5. [Estratégia de Sincronização](#estratégia-sincronização)
6. [Sistema de Usuários](#sistema-usuarios)
7. [Implementação Técnica](#implementação-técnica)
8. [Decisões Pendentes](#decisões-pendentes)

---

## 🎯 Visão Geral do Projeto {#visão-geral}

### Objetivo

Desenvolver um sistema mobile de aprovação de pagamentos que sincroniza com o ERP GLOBUS, permitindo que solicitantes definam fluxos de aprovação customizados e aprovadores processem requisições pelo app.

### Mudança Arquitetural

- **ANTES:** API REST do ERP → Nossa API → App Mobile
- **DEPOIS:** Consulta SQL direta no Oracle → Nossa API → App Mobile
- **MOTIVO:** ERP não fornecerá API, acesso direto ao banco Oracle

### Stack Tecnológico

- **Backend:** Node.js + Fastify + TypeORM + PostgreSQL + Oracle
- **Frontend:** React Native + Expo
- **Banco ERP:** Oracle (GLOBUS schema)
- **Banco Interno:** PostgreSQL

---

## 🏗️ Arquitetura Descoberta {#arquitetura-descoberta}

### Sistema ERP GLOBUS

- **Módulo Principal:** BGM_APROVEME (sistema de aprovação existente)
- **Schema:** GLOBUS
- **Tabelas Principais:**
  - `BGM_APROVEME`: Fluxo de aprovação (28.035 registros)
  - `CPGDOCTO`: Documentos de contas a pagar (856.607 registros)
  - `CTR_CADASTRODEUSUARIOS`: Usuários do sistema (841 registros)
  - `BGM_FORNECEDOR`: Cadastro de fornecedores (3.980 registros)

### Fluxo de Dados Descoberto

```
1. Usuário cria requisição no ERP (CPGDOCTO)
2. Sistema gera entrada no BGM_APROVEME
3. Fluxo de aprovação no ERP (BGM_APROVEME_USUARIOS)
4. Status atualizado (A=Aprovado, R=Rejeitado, NULL=Pendente)
5. Nosso sistema sincroniza dados e permite fluxo customizado
```

---

## 📊 Mapeamento Completo de Tabelas {#mapeamento-tabelas}

### BGM_APROVEME (Tabela Principal de Aprovações)

**Finalidade:** Controla o fluxo de aprovação de requisições no ERP
**Registros:** 28.035 (crescimento ativo)

| Campo                     | Tipo           | Descrição                                                 | Uso no Sistema      |
| ------------------------- | -------------- | --------------------------------------------------------- | ------------------- |
| `IDAPROVEME`              | NUMBER(22)     | PK - ID único da requisição                               | `erp_payment_id`    |
| `EMPRESA`                 | VARCHAR2(50)   | Nome da empresa                                           | `company`           |
| `FILIAL`                  | VARCHAR2(30)   | Filial da requisição                                      | `branch`            |
| `DATA`                    | DATE           | Data de criação da requisição                             | `created_date`      |
| `TIPO`                    | VARCHAR2(50)   | Tipo do documento (NOTA FISCAL, BOLETO, etc.)             | `document_type`     |
| `VALOR`                   | NUMBER(22)     | Valor monetário da requisição                             | `total_amount`      |
| `STATUS_APROVACAO`        | VARCHAR2(1)    | Status atual: A=Aprovado, R=Rejeitado, NULL=Pendente      | `erp_status`        |
| `USUARIO_APROVADOR`       | VARCHAR2(15)   | Username de quem aprovou/rejeitou                         | `approver_username` |
| `DATA_APROVACAO`          | DATE           | Data da aprovação/rejeição                                | `approval_date`     |
| `REQUISICAO`              | VARCHAR2(30)   | Número da requisição no formato 0000041476/001            | `request_number`    |
| `JUSTIFICATIVAREPROVACAO` | VARCHAR2(1000) | Motivo da rejeição                                        | `rejection_reason`  |
| `ROTINA`                  | VARCHAR2(20)   | Sistema de origem: FIN_CPG_LIB_PAGTO, FIN_CPG_ASS_ELETRON | `origin_routine`    |
| `ID_EXTERNO`              | RAW(16)        | GUID único para sincronização                             | `erp_external_id`   |

### BGM_APROVEME_DADOSADICIONAIS (Dados Complementares)

**Finalidade:** Armazena dados adicionais das requisições
**Relacionamento:** N:1 com BGM_APROVEME via IDAPROVEME

| Campo        | Tipo          | Descrição              | Valores Importantes          |
| ------------ | ------------- | ---------------------- | ---------------------------- |
| `IDAPROVEME` | NUMBER(22)    | FK para BGM_APROVEME   | -                            |
| `ORDEM`      | NUMBER(22)    | Ordem de exibição      | -                            |
| `TITULO`     | VARCHAR2(50)  | Tipo do dado adicional | Ver tabela de títulos abaixo |
| `TEXTO`      | VARCHAR2(200) | Valor do dado          | -                            |

**Títulos Importantes:**

- `Fornecedor`: Nome do favorecido (75.361 registros)
- `CODDOCTOCPG`: Código para relacionar com CPGDOCTO (75.358 registros)
- `Documento`: Número do documento (75.358 registros)
- `Vencimento`: Data de vencimento (75.358 registros)
- `Emissão`: Data de emissão (75.358 registros)
- `Origem`: Sistema de origem: CPG, EST, FLP, SRH, ESF (75.404 registros)
- `Observação`: Observações da requisição (19.204 registros)

### CPGDOCTO (Documentos de Contas a Pagar)

**Finalidade:** Tabela origem das requisições de pagamento
**Relacionamento:** 1:1 com BGM_APROVEME via CODDOCTOCPG

| Campo              | Tipo         | Descrição                                | Uso no Sistema          |
| ------------------ | ------------ | ---------------------------------------- | ----------------------- |
| `CODDOCTOCPG`      | NUMBER(22)   | PK - Código do documento                 | Chave de relacionamento |
| `USUARIO`          | VARCHAR2(15) | **SOLICITANTE** - Username de quem criou | `requester_username`    |
| `USUARIO_INCLUSAO` | VARCHAR2(15) | Username de quem incluiu                 | Backup do solicitante   |
| `DATA_INCLUSAO`    | DATE         | Data de criação no CPG                   | `created_date_origin`   |

### CTR_CADASTRODEUSUARIOS (Usuários do Sistema)

**Finalidade:** Cadastro de usuários do ERP GLOBUS
**Registros:** 841 usuários (41 ativos relevantes)

| Campo         | Tipo         | Descrição             | Uso no Sistema         |
| ------------- | ------------ | --------------------- | ---------------------- |
| `USUARIO`     | VARCHAR2(15) | PK - Username único   | `erp_username`         |
| `NOMEUSUARIO` | VARCHAR2(40) | Nome completo         | `name`                 |
| `EMAIL`       | VARCHAR2(50) | Email do usuário      | `email`                |
| `ATIVO`       | VARCHAR2(1)  | S=Ativo, N=Inativo    | `erp_active`           |
| `ID_EXTERNO`  | RAW(16)      | GUID único do usuário | `erp_user_external_id` |

### BGM_APROVEME_USUARIOS (Usuários do Fluxo de Aprovação)

**Finalidade:** Define quem pode aprovar cada requisição
**Relacionamento:** N:N entre BGM_APROVEME e usuários

| Campo               | Tipo         | Descrição                  | Uso |
| ------------------- | ------------ | -------------------------- | --- |
| `IDAPROVEME`        | NUMBER(22)   | FK para BGM_APROVEME       | -   |
| `USUARIO`           | VARCHAR2(15) | Username do aprovador      | -   |
| `PERMITIRAPROVACAO` | VARCHAR2(1)  | S=Pode aprovar, N=Não pode | -   |

---

## 🔍 Consultas SQL Essenciais {#consultas-sql}

### 1. Sincronização Completa Inicial

**Uso:** Carga inicial do sistema (executar 1x na implementação)
**Período:** Últimos 90 dias
**Filtros:** Apenas CPG (tem solicitante), apenas rotinas de liberação

```sql
SELECT
    -- === DADOS PRINCIPAIS DA REQUISIÇÃO ===
    ap.IDAPROVEME as erp_payment_id,
    ap.EMPRESA as empresa,
    ap.FILIAL as filial,
    ap.DATA as data_criacao,
    ap.TIPO as tipo_documento,
    ap.VALOR as valor_total,
    'BRL' as moeda,
    ap.STATUS_APROVACAO as status_erp,
    ap.USUARIO_APROVADOR as usuario_aprovador_erp,
    ap.DATA_APROVACAO as data_aprovacao_erp,
    ap.REQUISICAO as numero_requisicao,
    ap.JUSTIFICATIVAREPROVACAO as justificativa_rejeicao,
    ap.ROTINA as rotina_origem,
    ap.ID_EXTERNO as id_externo_erp,

    -- === SOLICITANTE ===
    cpg.USUARIO as solicitante_username,
    cad_solic.NOMEUSUARIO as nome_solicitante,
    cad_solic.EMAIL as email_solicitante,

    -- === FAVORECIDO ===
    fornec.TEXTO as nome_favorecido,

    -- === DADOS ADICIONAIS ===
    doc.TEXTO as numero_documento,
    venc.TEXTO as data_vencimento_str,
    emiss.TEXTO as data_emissao_str,
    origem.TEXTO as sistema_origem,
    obs.TEXTO as observacoes,

    -- === METADADOS ===
    CASE
        WHEN ap.STATUS_APROVACAO IS NULL THEN 'PENDING'
        WHEN ap.STATUS_APROVACAO = 'A' THEN 'APPROVED'
        WHEN ap.STATUS_APROVACAO = 'R' THEN 'REJECTED'
        ELSE 'UNKNOWN'
    END as internal_status,

    CASE
        WHEN ap.DATA >= TRUNC(SYSDATE) - 7 THEN 'ALTA'
        WHEN ap.DATA >= TRUNC(SYSDATE) - 30 THEN 'MEDIA'
        ELSE 'BAIXA'
    END as prioridade,

    SYSDATE as data_sincronizacao

FROM GLOBUS.BGM_APROVEME ap

-- === JOINS PARA DADOS ADICIONAIS ===
LEFT JOIN (SELECT IDAPROVEME, TEXTO FROM GLOBUS.BGM_APROVEME_DADOSADICIONAIS WHERE TITULO = 'Origem') origem
    ON ap.IDAPROVEME = origem.IDAPROVEME
LEFT JOIN (SELECT IDAPROVEME, TEXTO FROM GLOBUS.BGM_APROVEME_DADOSADICIONAIS WHERE TITULO = 'Fornecedor') fornec
    ON ap.IDAPROVEME = fornec.IDAPROVEME
LEFT JOIN (SELECT IDAPROVEME, TEXTO FROM GLOBUS.BGM_APROVEME_DADOSADICIONAIS WHERE TITULO = 'Documento') doc
    ON ap.IDAPROVEME = doc.IDAPROVEME
LEFT JOIN (SELECT IDAPROVEME, TEXTO FROM GLOBUS.BGM_APROVEME_DADOSADICIONAIS WHERE TITULO = 'Vencimento') venc
    ON ap.IDAPROVEME = venc.IDAPROVEME
LEFT JOIN (SELECT IDAPROVEME, TEXTO FROM GLOBUS.BGM_APROVEME_DADOSADICIONAIS WHERE TITULO = 'Emissão') emiss
    ON ap.IDAPROVEME = emiss.IDAPROVEME
LEFT JOIN (SELECT IDAPROVEME, TEXTO FROM GLOBUS.BGM_APROVEME_DADOSADICIONAIS WHERE TITULO = 'Observação') obs
    ON ap.IDAPROVEME = obs.IDAPROVEME
LEFT JOIN (SELECT IDAPROVEME, TEXTO FROM GLOBUS.BGM_APROVEME_DADOSADICIONAIS WHERE TITULO = 'CODDOCTOCPG') cod_cpg
    ON ap.IDAPROVEME = cod_cpg.IDAPROVEME

-- === JOIN COM SOLICITANTE ===
LEFT JOIN GLOBUS.CPGDOCTO cpg ON cpg.CODDOCTOCPG = TO_NUMBER(cod_cpg.TEXTO)
LEFT JOIN GLOBUS.CTR_CADASTRODEUSUARIOS cad_solic ON cad_solic.USUARIO = cpg.USUARIO

-- === FILTROS ===
WHERE origem.TEXTO = 'CPG'  -- Apenas CPG (tem solicitante)
AND ap.ROTINA IN ('FIN_CPG_LIB_PAGTO', 'FIN_CPG_ASS_ELETRON')  -- Apenas aprovações
AND ap.DATA >= TRUNC(SYSDATE) - 90  -- Últimos 90 dias

ORDER BY ap.DATA DESC, ap.IDAPROVEME DESC;
```

### 2. Requisições Pendentes (Prioridade)

**Uso:** Buscar APs que precisam entrar no nosso fluxo
**Execução:** A cada sincronização (5-15 minutos)
**Filtro:** STATUS_APROVACAO IS NULL

```sql
SELECT
    ap.IDAPROVEME as erp_payment_id,
    ap.EMPRESA,
    ap.FILIAL,
    ap.DATA as data_criacao,
    ap.TIPO,
    ap.VALOR as valor_total,
    ap.REQUISICAO as numero_requisicao,

    -- Solicitante
    cpg.USUARIO as solicitante_username,
    cad_solic.NOMEUSUARIO as nome_solicitante,
    cad_solic.EMAIL as email_solicitante,

    -- Favorecido
    fornec.TEXTO as nome_favorecido,
    doc.TEXTO as numero_documento,
    venc.TEXTO as data_vencimento_str,

    -- Prioridade
    CASE
        WHEN ap.DATA >= TRUNC(SYSDATE) - 7 THEN 'ALTA'
        WHEN ap.DATA >= TRUNC(SYSDATE) - 30 THEN 'MEDIA'
        ELSE 'BAIXA'
    END as prioridade,

    ap.ID_EXTERNO as id_externo_erp

FROM GLOBUS.BGM_APROVEME ap

-- Joins necessários
INNER JOIN (SELECT IDAPROVEME, TEXTO FROM GLOBUS.BGM_APROVEME_DADOSADICIONAIS WHERE TITULO = 'Origem') origem
    ON ap.IDAPROVEME = origem.IDAPROVEME
INNER JOIN (SELECT IDAPROVEME, TEXTO FROM GLOBUS.BGM_APROVEME_DADOSADICIONAIS WHERE TITULO = 'CODDOCTOCPG') cod_cpg
    ON ap.IDAPROVEME = cod_cpg.IDAPROVEME
LEFT JOIN (SELECT IDAPROVEME, TEXTO FROM GLOBUS.BGM_APROVEME_DADOSADICIONAIS WHERE TITULO = 'Fornecedor') fornec
    ON ap.IDAPROVEME = fornec.IDAPROVEME
LEFT JOIN (SELECT IDAPROVEME, TEXTO FROM GLOBUS.BGM_APROVEME_DADOSADICIONAIS WHERE TITULO = 'Documento') doc
    ON ap.IDAPROVEME = doc.IDAPROVEME
LEFT JOIN (SELECT IDAPROVEME, TEXTO FROM GLOBUS.BGM_APROVEME_DADOSADICIONAIS WHERE TITULO = 'Vencimento') venc
    ON ap.IDAPROVEME = venc.IDAPROVEME
LEFT JOIN GLOBUS.CPGDOCTO cpg ON cpg.CODDOCTOCPG = TO_NUMBER(cod_cpg.TEXTO)
LEFT JOIN GLOBUS.CTR_CADASTRODEUSUARIOS cad_solic ON cad_solic.USUARIO = cpg.USUARIO

WHERE ap.STATUS_APROVACAO IS NULL  -- Apenas pendentes
AND origem.TEXTO = 'CPG'           -- Apenas CPG
AND ap.ROTINA = 'FIN_CPG_LIB_PAGTO'  -- Apenas liberação de pagamento
AND ap.DATA >= TRUNC(SYSDATE) - 60   -- Últimos 60 dias
AND ap.VALOR >= 10  -- Valor mínimo
AND cpg.USUARIO IS NOT NULL  -- Garantir solicitante

ORDER BY ap.DATA DESC;
```

### 3. Sincronização Incremental

**Uso:** Detectar mudanças de status nas requisições já sincronizadas
**Execução:** A cada sincronização incremental
**Parâmetro:** :ultima_sincronizacao (timestamp da última execução) 90006

```sql
SELECT
    ap.IDAPROVEME as erp_payment_id,
    ap.STATUS_APROVACAO as status_erp,
    ap.USUARIO_APROVADOR as usuario_aprovador_erp,
    ap.DATA_APROVACAO as data_aprovacao_erp,
    ap.JUSTIFICATIVAREPROVACAO as justificativa_rejeicao,

    CASE
        WHEN ap.STATUS_APROVACAO IS NULL THEN 'PENDING'
        WHEN ap.STATUS_APROVACAO = 'A' THEN 'APPROVED'
        WHEN ap.STATUS_APROVACAO = 'R' THEN 'REJECTED'
    END as novo_status,

    SYSDATE as data_sincronizacao_incremental

FROM GLOBUS.BGM_APROVEME ap
INNER JOIN (SELECT IDAPROVEME, TEXTO FROM GLOBUS.BGM_APROVEME_DADOSADICIONAIS WHERE TITULO = 'Origem') origem
    ON ap.IDAPROVEME = origem.IDAPROVEME

WHERE origem.TEXTO = 'CPG'
AND (
    (ap.DATA_APROVACAO >= :ultima_sincronizacao)  -- Aprovações recentes
    OR (ap.DATA >= :ultima_sincronizacao)         -- Criações recentes
)
ORDER BY ap.DATA DESC;
```

### 4. Mapeamento de Usuários

**Uso:** Sincronizar usuários do ERP para nosso sistema
**Execução:** 1x por dia ou conforme necessário
**Resultado:** 41 usuários ativos identificados

```sql
SELECT
    -- Dados do ERP
    cad.USUARIO as erp_username,
    cad.NOMEUSUARIO as nome_completo,
    cad.EMAIL as email,
    cad.ATIVO as ativo_erp,
    cad.ID_EXTERNO as id_externo_usuario,

    -- Classificação automática
    CASE
        WHEN EXISTS (SELECT 1 FROM GLOBUS.CPGDOCTO cpg WHERE cpg.USUARIO = cad.USUARIO) THEN 'SOLICITANTE'
        WHEN EXISTS (SELECT 1 FROM GLOBUS.BGM_APROVEME ap WHERE ap.USUARIO_APROVADOR = cad.USUARIO) THEN 'APROVADOR'
        WHEN EXISTS (SELECT 1 FROM GLOBUS.BGM_APROVEME_USUARIOS usu WHERE usu.USUARIO = cad.USUARIO) THEN 'APROVADOR'
        ELSE 'OUTROS'
    END as tipo_usuario,

    -- Estatísticas
    (SELECT COUNT(*) FROM GLOBUS.CPGDOCTO cpg WHERE cpg.USUARIO = cad.USUARIO) as total_solicitacoes,
    (SELECT COUNT(*) FROM GLOBUS.BGM_APROVEME ap WHERE ap.USUARIO_APROVADOR = cad.USUARIO) as total_aprovacoes,

    -- Papel sugerido para nosso sistema
    CASE
        WHEN EXISTS (SELECT 1 FROM GLOBUS.BGM_APROVEME ap WHERE ap.USUARIO_APROVADOR = cad.USUARIO)
             OR EXISTS (SELECT 1 FROM GLOBUS.BGM_APROVEME_USUARIOS usu WHERE usu.USUARIO = cad.USUARIO)
)
ORDER BY (SELECT COUNT(*) FROM GLOBUS.CPGDOCTO cpg WHERE cpg.USUARIO = cad.USUARIO) DESC;
```

---

## 🔧 Implementação Técnica {#implementação-técnica}

### Estrutura de Dados no PostgreSQL

#### Payment Requests (Requisições)

```sql
CREATE TABLE payment_requests (
    id SERIAL PRIMARY KEY,

    -- Chaves do ERP
    erp_payment_id INTEGER UNIQUE NOT NULL,        -- BGM_APROVEME.IDAPROVEME
    erp_external_id VARCHAR(50) UNIQUE NOT NULL,   -- BGM_APROVEME.ID_EXTERNO

    -- Dados básicos
    company VARCHAR(100),                          -- EMPRESA
    branch VARCHAR(50),                            -- FILIAL
    created_date DATE,                             -- DATA
    document_type VARCHAR(50),                     -- TIPO
    total_amount DECIMAL(15,2),                    -- VALOR
    currency VARCHAR(3) DEFAULT 'BRL',
    request_number VARCHAR(30),                    -- REQUISICAO

    -- Status e aprovação
    erp_status VARCHAR(1),                         -- STATUS_APROVACAO (A/R/NULL)
    internal_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, IN_WORKFLOW
    approver_username VARCHAR(50),                 -- USUARIO_APROVADOR
    approval_date DATE,                            -- DATA_APROVACAO
    rejection_reason TEXT,                         -- JUSTIFICATIVAREPROVACAO

    -- Solicitante
    requester_username VARCHAR(50) NOT NULL,      -- CPGDOCTO.USUARIO
    requester_name VARCHAR(100),                  -- Nome do solicitante
    requester_email VARCHAR(100),                 -- Email do solicitante

    -- Favorecido
    payee_name VARCHAR(200),                       -- dados_adicionais.Fornecedor
    document_number VARCHAR(50),                   -- dados_adicionais.Documento
    due_date_str VARCHAR(20),                      -- dados_adicionais.Vencimento
    issue_date_str VARCHAR(20),                    -- dados_adicionais.Emissão
    observations TEXT,                             -- dados_adicionais.Observação

    -- Controle interno
    priority VARCHAR(10) DEFAULT 'MEDIA',         -- ALTA, MEDIA, BAIXA
    workflow_sequence JSONB,                       -- Sequência de aprovação customizada
    current_approver_index INTEGER DEFAULT 0,     -- Índice do aprovador atual

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_sync_at TIMESTAMP DEFAULT NOW(),

    -- Índices
    INDEX idx_erp_payment_id (erp_payment_id),
    INDEX idx_erp_external_id (erp_external_id),
    INDEX idx_internal_status (internal_status),
    INDEX idx_requester (requester_username),
    INDEX idx_created_date (created_date),
    INDEX idx_priority (priority)
);
```

#### Payment Comments (Comentários)

```sql
CREATE TABLE payment_comments (
    id SERIAL PRIMARY KEY,
    payment_request_id INTEGER NOT NULL REFERENCES payment_requests(id),
    user_id UUID NOT NULL REFERENCES users(id),
    comment_text TEXT NOT NULL,
    comment_type VARCHAR(20) DEFAULT 'COMMENT', -- COMMENT, APPROVAL, REJECTION, WORKFLOW_CHANGE
    created_at TIMESTAMP DEFAULT NOW(),

    INDEX idx_payment_comments_payment (payment_request_id),
    INDEX idx_payment_comments_user (user_id),
    INDEX idx_payment_comments_type (comment_type)
);
```

#### Sync Control (Controle de Sincronização)

```sql
CREATE TABLE sync_control (
    id SERIAL PRIMARY KEY,
    sync_type VARCHAR(50) NOT NULL,               -- FULL, INCREMENTAL, USERS
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    last_erp_payment_id INTEGER,                  -- Último IDAPROVEME processado
    last_erp_external_id VARCHAR(50),             -- Último ID_EXTERNO processado
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    execution_time_seconds INTEGER,
    status VARCHAR(20) DEFAULT 'RUNNING',         -- RUNNING, SUCCESS, ERROR, PARTIAL
    error_details TEXT,

    INDEX idx_sync_control_type (sync_type),
    INDEX idx_sync_control_status (status),
    INDEX idx_sync_control_started (started_at)
);
```

### TypeORM Entities

#### PaymentRequest Entity

```typescript
@Entity('payment_requests')
export class PaymentRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  erp_payment_id: number;

  @Column({ unique: true })
  erp_external_id: string;

  @Column()
  company: string;

  @Column()
  branch: string;

  @Column({ type: 'date' })
  created_date: Date;

  @Column()
  document_type: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  total_amount: number;

  @Column({ default: 'BRL' })
  currency: string;

  @Column({ nullable: true })
  request_number: string;

  @Column({ nullable: true })
  erp_status: string; // A, R, null

  @Column({ default: 'PENDING' })
  internal_status: PaymentStatus;

  @Column({ nullable: true })
  approver_username: string;

  @Column({ type: 'date', nullable: true })
  approval_date: Date;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string;

  @Column()
  requester_username: string;

  @Column({ nullable: true })
  requester_name: string;

  @Column({ nullable: true })
  requester_email: string;

  @Column({ nullable: true })
  payee_name: string;

  @Column({ nullable: true })
  document_number: string;

  @Column({ nullable: true })
  due_date_str: string;

  @Column({ nullable: true })
  issue_date_str: string;

  @Column({ type: 'text', nullable: true })
  observations: string;

  @Column({ default: 'MEDIA' })
  priority: Priority;

  @Column({ type: 'jsonb', nullable: true })
  workflow_sequence: string[];

  @Column({ default: 0 })
  current_approver_index: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ default: () => 'NOW()' })
  last_sync_at: Date;

  // Relacionamentos
  @OneToMany(() => PaymentComment, (comment) => comment.payment_request)
  comments: PaymentComment[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({
    name: 'requester_username',
    referencedColumnName: 'erp_username',
  })
  requester: User;
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  IN_WORKFLOW = 'IN_WORKFLOW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum Priority {
  ALTA = 'ALTA',
  MEDIA = 'MEDIA',
  BAIXA = 'BAIXA',
}
```

#### User Entity

```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column()
  password_hash: string;

  @Column({ nullable: true })
  email: string;

  @Column()
  name: string;

  @Column({ default: UserRole.REQUESTER })
  role: UserRole;

  @Column({ default: true })
  active: boolean;

  @Column({ unique: true, nullable: true })
  erp_username: string;

  @Column({ nullable: true })
  erp_id_externo: string;

  @Column({ nullable: true })
  erp_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ nullable: true })
  last_login_at: Date;

  @Column({ nullable: true })
  last_erp_sync: Date;

  // Relacionamentos
  @OneToMany(() => PaymentComment, (comment) => comment.user)
  comments: PaymentComment[];
}

export enum UserRole {
  REQUESTER = 'REQUESTER',
  DIRECTOR = 'DIRECTOR',
  ADMIN = 'ADMIN',
}
```

### Services de Sincronização

#### ERPSyncService

```typescript
@Injectable()
export class ERPSyncService {
  constructor(
    @InjectRepository(PaymentRequest)
    private paymentRepo: Repository<PaymentRequest>,

    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(SyncControl)
    private syncRepo: Repository<SyncControl>,

    private oracleService: OracleService
  ) {}

  async syncIncremental(): Promise<SyncResult> {
    const syncRecord = await this.startSyncRecord('INCREMENTAL');

    try {
      // 1. Buscar novos registros não sincronizados
      const newPayments = await this.oracleService.getNewPayments();
      let created = 0;

      for (const payment of newPayments) {
        const exists = await this.paymentRepo.findOne({
          where: { erp_external_id: payment.erp_external_id },
        });

        if (!exists) {
          await this.createPaymentRequest(payment);
          created++;
        }
      }

      // 2. Buscar mudanças de status
      const lastSync = await this.getLastSyncTime();
      const statusChanges = await this.oracleService.getStatusChanges(lastSync);
      let updated = 0;

      for (const change of statusChanges) {
        await this.updatePaymentStatus(change);
        updated++;
      }

      await this.completeSyncRecord(syncRecord, {
        status: 'SUCCESS',
        records_created: created,
        records_updated: updated,
        records_processed: created + updated,
      });

      return { success: true, created, updated };
    } catch (error) {
      await this.completeSyncRecord(syncRecord, {
        status: 'ERROR',
        error_details: error.message,
      });
      throw error;
    }
  }

  private async createPaymentRequest(data: any): Promise<PaymentRequest> {
    const payment = this.paymentRepo.create({
      erp_payment_id: data.erp_payment_id,
      erp_external_id: data.erp_external_id,
      company: data.empresa,
      branch: data.filial,
      created_date: data.data_criacao,
      document_type: data.tipo_documento,
      total_amount: data.valor_total,
      request_number: data.numero_requisicao,
      erp_status: data.status_erp,
      internal_status: this.mapInternalStatus(data.status_erp),
      requester_username: data.solicitante_username,
      requester_name: data.nome_solicitante,
      requester_email: data.email_solicitante,
      payee_name: data.nome_favorecido,
      document_number: data.numero_documento,
      due_date_str: data.data_vencimento_str,
      priority: data.prioridade,
      last_sync_at: new Date(),
    });

    return await this.paymentRepo.save(payment);
  }

  private mapInternalStatus(erpStatus: string): PaymentStatus {
    switch (erpStatus) {
      case 'A':
        return PaymentStatus.APPROVED;
      case 'R':
        return PaymentStatus.REJECTED;
      case null:
      case undefined:
        return PaymentStatus.PENDING;
      default:
        return PaymentStatus.PENDING;
    }
  }
}
```

#### OracleService

```typescript
@Injectable()
export class OracleService {
  constructor(
    @InjectDataSource('oracle')
    private oracleDataSource: DataSource
  ) {}

  async getNewPayments(): Promise<any[]> {
    const query = `
      SELECT 
        ap.IDAPROVEME as erp_payment_id,
        ap.ID_EXTERNO as erp_external_id,
        ap.EMPRESA as empresa,
        ap.FILIAL as filial,
        ap.DATA as data_criacao,
        ap.TIPO as tipo_documento,
        ap.VALOR as valor_total,
        ap.STATUS_APROVACAO as status_erp,
        ap.REQUISICAO as numero_requisicao,
        cpg.USUARIO as solicitante_username,
        cad_solic.NOMEUSUARIO as nome_solicitante,
        cad_solic.EMAIL as email_solicitante,
        fornec.TEXTO as nome_favorecido,
        doc.TEXTO as numero_documento,
        venc.TEXTO as data_vencimento_str,
        CASE 
          WHEN ap.DATA >= TRUNC(SYSDATE) - 7 THEN 'ALTA'
          WHEN ap.DATA >= TRUNC(SYSDATE) - 30 THEN 'MEDIA'
          ELSE 'BAIXA'
        END as prioridade
      FROM GLOBUS.BGM_APROVEME ap
      LEFT JOIN (SELECT IDAPROVEME, TEXTO FROM GLOBUS.BGM_APROVEME_DADOSADICIONAIS WHERE TITULO = 'Origem') origem 
        ON ap.IDAPROVEME = origem.IDAPROVEME
      LEFT JOIN (SELECT IDAPROVEME, TEXTO FROM GLOBUS.BGM_APROVEME_DADOSADICIONAIS WHERE TITULO = 'Fornecedor') fornec 
        ON ap.IDAPROVEME = fornec.IDAPROVEME
      LEFT JOIN (SELECT IDAPROVEME, TEXTO FROM GLOBUS.BGM_APROVEME_DADOSADICIONAIS WHERE TITULO = 'Documento') doc 
        ON ap.IDAPROVEME = doc.IDAPROVEME
      LEFT JOIN (SELECT IDAPROVEME, TEXTO FROM GLOBUS.BGM_APROVEME_DADOSADICIONAIS WHERE TITULO = 'Vencimento') venc 
        ON ap.IDAPROVEME = venc.IDAPROVEME
      LEFT JOIN (SELECT IDAPROVEME, TEXTO FROM GLOBUS.BGM_APROVEME_DADOSADICIONAIS WHERE TITULO = 'CODDOCTOCPG') cod_cpg 
        ON ap.IDAPROVEME = cod_cpg.IDAPROVEME
      LEFT JOIN GLOBUS.CPGDOCTO cpg ON cpg.CODDOCTOCPG = TO_NUMBER(cod_cpg.TEXTO)
      LEFT JOIN GLOBUS.CTR_CADASTRODEUSUARIOS cad_solic ON cad_solic.USUARIO = cpg.USUARIO
      WHERE origem.TEXTO = 'CPG'
      AND ap.ROTINA IN ('FIN_CPG_LIB_PAGTO', 'FIN_CPG_ASS_ELETRON')
      AND ap.DATA >= TRUNC(SYSDATE) - 60
      AND ap.ID_EXTERNO NOT IN (
        SELECT erp_external_id FROM payment_requests WHERE erp_external_id IS NOT NULL
      )
      ORDER BY ap.DATA DESC
    `;

    return await this.oracleDataSource.query(query);
  }

  async getStatusChanges(since: Date): Promise<any[]> {
    const query = `
      SELECT 
        ap.IDAPROVEME as erp_payment_id,
        ap.ID_EXTERNO as erp_external_id,
        ap.STATUS_APROVACAO as status_erp,
        ap.USUARIO_APROVADOR as usuario_aprovador_erp,
        ap.DATA_APROVACAO as data_aprovacao_erp,
        ap.JUSTIFICATIVAREPROVACAO as justificativa_rejeicao
      FROM GLOBUS.BGM_APROVEME ap
      INNER JOIN (SELECT IDAPROVEME, TEXTO FROM GLOBUS.BGM_APROVEME_DADOSADICIONAIS WHERE TITULO = 'Origem') origem 
        ON ap.IDAPROVEME = origem.IDAPROVEME
      WHERE origem.TEXTO = 'CPG'
      AND (ap.DATA_APROVACAO >= :since OR ap.DATA >= :since)
      AND ap.ID_EXTERNO IN (
        SELECT erp_external_id FROM payment_requests WHERE erp_external_id IS NOT NULL
      )
    `;

    return await this.oracleDataSource.query(query, [since]);
  }

  async getERPUsers(): Promise<any[]> {
    const query = `
      SELECT 
        cad.USUARIO as erp_username,
        cad.NOMEUSUARIO as nome_completo,
        cad.EMAIL as email,
        cad.ATIVO as ativo_erp,
        cad.ID_EXTERNO as id_externo_usuario,
        CASE 
          WHEN EXISTS (SELECT 1 FROM GLOBUS.BGM_APROVEME ap WHERE ap.USUARIO_APROVADOR = cad.USUARIO)
               OR EXISTS (SELECT 1 FROM GLOBUS.BGM_APROVEME_USUARIOS usu WHERE usu.USUARIO = cad.USUARIO AND usu.PERMITIRAPROVACAO = 'S')
          THEN 'DIRECTOR'
          ELSE 'REQUESTER'
        END as papel_sugerido,
        (SELECT COUNT(*) FROM GLOBUS.CPGDOCTO cpg WHERE cpg.USUARIO = cad.USUARIO) as total_solicitacoes,
        (SELECT COUNT(*) FROM GLOBUS.BGM_APROVEME ap WHERE ap.USUARIO_APROVADOR = cad.USUARIO) as total_aprovacoes
      FROM GLOBUS.CTR_CADASTRODEUSUARIOS cad
      WHERE cad.ATIVO = 'S'
      AND (
        EXISTS (SELECT 1 FROM GLOBUS.CPGDOCTO cpg WHERE cpg.USUARIO = cad.USUARIO)
        OR EXISTS (SELECT 1 FROM GLOBUS.BGM_APROVEME ap WHERE ap.USUARIO_APROVADOR = cad.USUARIO)
        OR EXISTS (SELECT 1 FROM GLOBUS.BGM_APROVEME_USUARIOS usu WHERE usu.USUARIO = cad.USUARIO)
      )
      ORDER BY total_solicitacoes DESC
    `;

    return await this.oracleDataSource.query(query);
  }
}
```

### Configuração do TypeORM

#### app.module.ts

```typescript
@Module({
  imports: [
    // PostgreSQL (nosso banco principal)
    TypeOrmModule.forRoot({
      name: 'default',
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      entities: [User, PaymentRequest, PaymentComment, SyncControl],
      synchronize: process.env.NODE_ENV === 'development',
      logging: process.env.NODE_ENV === 'development',
    }),

    // Oracle (banco do ERP)
    TypeOrmModule.forRoot({
      name: 'oracle',
      type: 'oracle',
      host: process.env.ORACLE_HOST,
      port: parseInt(process.env.ORACLE_PORT),
      username: process.env.ORACLE_USERNAME,
      password: process.env.ORACLE_PASSWORD,
      serviceName: process.env.ORACLE_SERVICE_NAME,
      entities: [], // Não precisamos de entities para Oracle, apenas queries
      synchronize: false,
      logging: false,
    }),

    // Feature modules
    TypeOrmModule.forFeature([
      User,
      PaymentRequest,
      PaymentComment,
      SyncControl,
    ]),
    TypeOrmModule.forFeature([], 'oracle'),

    AuthModule,
    PaymentsModule,
    SyncModule,
    UsersModule,
  ],
})
export class AppModule {}
```

### Jobs de Sincronização

#### sync.service.ts

```typescript
@Injectable()
export class SyncJobService {
  private readonly logger = new Logger(SyncJobService.name);

  constructor(private erpSyncService: ERPSyncService) {}

  // Executa a cada 15 minutos
  @Cron('0 */15 * * * *')
  async handleIncrementalSync() {
    this.logger.log('Iniciando sincronização incremental...');

    try {
      const result = await this.erpSyncService.syncIncremental();
      this.logger.log(
        `Sincronização concluída: ${result.created} criados, ${result.updated} atualizados`
      );
    } catch (error) {
      this.logger.error('Erro na sincronização incremental:', error.message);
    }
  }

  // Executa 1x por dia às 2h da manhã
  @Cron('0 0 2 * * *')
  async handleUserSync() {
    this.logger.log('Iniciando sincronização de usuários...');

    try {
      const result = await this.erpSyncService.syncUsers();
      this.logger.log(
        `Sincronização de usuários concluída: ${result.processed} processados`
      );
    } catch (error) {
      this.logger.error('Erro na sincronização de usuários:', error.message);
    }
  }

  // Executa 1x por semana para limpeza
  @Cron('0 0 3 * * 0')
  async handleCleanup() {
    this.logger.log('Iniciando limpeza de logs antigos...');

    try {
      await this.erpSyncService.cleanupOldLogs();
      this.logger.log('Limpeza concluída');
    } catch (error) {
      this.logger.error('Erro na limpeza:', error.message);
    }
  }
}
```

---

## ❓ Decisões Pendentes {#decisões-pendentes}

### Decisões Críticas Para Usuários

#### 1. Estratégia de Usernames

**Opções:**

- A) Usar os mesmos usernames do ERP (LUZIA, JOAOFILHO, etc.)
- B) Criar usernames próprios (luzia.cunha, joao.filho, etc.)

**Recomendação:** Opção A (facilita mapeamento e não confunde usuários)

#### 2. Geração de Emails Faltantes

**Problema:** Muitos usuários não têm email no ERP
**Opções:**

- A) Gerar emails padrão: username@vpioneira.com.br
- B) Gerar emails genéricos: username@empresa.local
- C) Deixar NULL e exigir preenchimento

**Recomendação:** Opção A (com domínio real da empresa)

#### 3. Senhas Iniciais

**Opções:**

- A) Senha fixa "temp123" + reset obrigatório no primeiro login
- B) Última parte do CPF + ano atual (se disponível)
- C) Enviar email para cada usuário com link de criação de senha
- D) Gerar senhas aleatórias e enviar por email

**Recomendação:** Opção A (mais simples para implementação inicial)

#### 4. Usuários ADMIN

**Candidatos baseados em volume de transações:**

- LUZIA (90.599 solicitações, 25.781 aprovações)
- JOAOFILHO (65.526 solicitações, 3.846 aprovações)

**Recomendação:** LUZIA + JOAOFILHO como ADMINs iniciais

#### 5. Sincronização de Papéis

**Cenário:** E se alguém se tornar aprovador no ERP depois?
**Opções:**

- A) Automático (verifica a cada sincronização diária)
- B) Manual (admin atualiza no nosso sistema)
- C) Híbrido (alerta admin sobre mudanças)

**Recomendação:** Opção A (automático com log para auditoria)

### Funcionalidades Técnicas

#### 6. Fluxo de Aprovação Customizado

**Questões:**

- Como o solicitante escolhe os aprovadores?
- Vai ter aprovadores obrigatórios (ex: sempre um diretor no final)?
- Vai ter limite de valor por aprovador?
- Fluxos pré-definidos por tipo de documento?

#### 7. Notificações

**Questões:**

- Push notifications no app?
- Emails para aprovadores?
- Qual a urgência das notificações?

#### 8. Relatórios e Analytics

**Questões:**

- Dashboards básicos no app?
- Relatórios para gestão?
- Métricas de performance de aprovação?

---

## 🚀 Roadmap de Implementação

### Fase 1: Setup Técnico (1-2 semanas)

1. ✅ **Configurar TypeORM** com Oracle + PostgreSQL
2. ✅ **Migrar schema** do Prisma para TypeORM
3. ✅ **Criar entities** básicas (User, PaymentRequest, PaymentComment)
4. ✅ **Testar conectividade** com Oracle
5. ✅ **Setup de credenciais** e variáveis de ambiente

### Fase 2: Sincronização Básica (1 semana)

6. ✅ **Implementar ERPSyncService** básico
7. ✅ **Sincronização inicial** de usuários
8. ✅ **Sincronização inicial** de requisições (90 dias)
9. ✅ **Testes de sincronização** e validação de dados

### Fase 3: Autenticação e Usuários (1 semana)

10. ✅ **Sistema de autenticação** JWT
11. ✅ **CRUD de usuários** (criar, listar, atualizar)
12. ✅ **Autorização por papel** (REQUESTER/DIRECTOR/ADMIN)
13. ✅ **Reset de senhas** e primeiro login obrigatório

### Fase 4: Funcionalidades do App (2 semanas)

14. ✅ **Endpoints para listar** requisições por usuário/papel
15. ✅ **Endpoints para aprovar/rejeitar** requisições
16. ✅ **Sistema de comentários** e histórico
17. ✅ **Fluxo de aprovação** customizado pelo solicitante
18. ✅ **Histórico por favorecido** (modal de detalhes)

### Fase 5: Sincronização Avançada (1 semana)

19. ✅ **Sincronização incremental** automática (jobs)
20. ✅ **Jobs de background** com cron scheduling
21. ✅ **Monitoramento e logs** de sincronização
22. ✅ **Tratamento de erros** e recovery

### Fase 6: Refinamentos (1 semana)

23. ✅ **Performance optimization** (índices, queries)
24. ✅ **Testes de integração** end-to-end
25. ✅ **Deploy e produção** configuration
26. ✅ **Documentação** técnica e de usuário

---

## 📋 Checklist Final

### ✅ Dados do Oracle - 100% Mapeados

- [x] Requisições de pagamento completas
- [x] Usuários e aprovadores identificados
- [x] Relacionamentos descobertos e testados
- [x] Sincronização incremental planejada
- [x] Consultas de negócio prontas e validadas

### ❓ Implementação Técnica - 0% Implementado

- [ ] Setup TypeORM + Oracle + PostgreSQL
- [ ] Entities e Repositories
- [ ] Services de sincronização
- [ ] Sistema de autenticação
- [ ] CRUD de usuários
- [ ] Jobs de background
- [ ] Endpoints da API
- [ ] Testes e validação

### ❓ Decisões Pendentes

- [ ] Estratégia de usernames
- [ ] Geração de emails faltantes
- [ ] Senhas iniciais
- [ ] Usuários ADMIN
- [ ] Sincronização de papéis
- [ ] Regras de fluxo de aprovação

---

## 🔗 Informações de Conexão

### Oracle (ERP GLOBUS)

```env
ORACLE_HOST=seu_host_oracle
ORACLE_PORT=1521
ORACLE_USERNAME=seu_usuario
ORACLE_PASSWORD=sua_senha
ORACLE_SERVICE_NAME=globus
```

### PostgreSQL (Nosso Sistema)

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=aprovador_user
DB_PASSWORD=sua_senha_postgres
DB_DATABASE=aprovador_pagamentos
```

### Consultas de Teste

```sql
-- Testar conexão Oracle
SELECT COUNT(*) FROM GLOBUS.BGM_APROVEME;

-- Testar dados de usuários
SELECT COUNT(*) FROM GLOBUS.CTR_CADASTRODEUSUARIOS WHERE ATIVO = 'S';

-- Testar relacionamento principal
SELECT COUNT(*) FROM GLOBUS.BGM_APROVEME ap
INNER JOIN GLOBUS.BGM_APROVEME_DADOSADICIONAIS da ON ap.IDAPROVEME = da.IDAPROVEME
WHERE da.TITULO = 'CODDOCTOCPG';
```

---

## 💡 Informações Importantes

### Usuários Chave Identificados

- **LUZIA**: Principal solicitante (90.599 requisições) + aprovadora (25.781 aprovações)
- **JOAOFILHO**: Alto volume (65.526 requisições) + aprovador (3.846 aprovações)
- **ARACI**: Solicitante ativo (71.237 requisições) + aprovadora (2.610 aprovações)
- **LUCASFORESTI**: Aprovador principal (91 aprovações, 0 solicitações)

### Status do ERP

- **'A'**: Aprovado (66,25% dos casos)
- **'R'**: Rejeitado (33,75% dos casos)
- **NULL**: Pendente (40.858 registros ativos na Viação Pioneira)

### Tipos de Documento Mais Comuns

1. **NOTA FISCAL** (41,78%)
2. **RECIBO** (24,8%)
3. **BOLETO** (21,75%)USUARIO = cad.USUARIO AND usu.PERMITIRAPROVACAO = 'S')
   THEN 'DIRECTOR' -- Pode aprovar
   ELSE 'REQUESTER' -- Apenas solicita
   END as papel_sugerido

FROM GLOBUS.CTR_CADASTRODEUSUARIOS cad
WHERE cad.ATIVO = 'S'
AND (
EXISTS (SELECT 1 FROM GLOBUS.CPGDOCTO cpg WHERE cpg.USUARIO = cad.USUARIO)
OR EXISTS (SELECT 1 FROM GLOBUS.BGM_APROVEME ap WHERE ap.USUARIO_APROVADOR = cad.USUARIO)
OR EXISTS (SELECT 1 FROM GLOBUS.BGM_APROVEME_USUARIOS usu WHERE usu.USUARIO = cad.USUARIO)
)
ORDER BY total_solicitacoes DESC, total_aprovacoes DESC;

````

### 5. Detalhes de Requisição Específica
**Uso:** Buscar dados completos de uma AP para exibir no app
**Parâmetro:** :id_requisicao (IDAPROVEME)

```sql
SELECT
    ap.IDAPROVEME as erp_payment_id,
    ap.EMPRESA,
    ap.FILIAL,
    ap.DATA as data_criacao,
    ap.TIPO,
    ap.VALOR as valor_total,
    ap.STATUS_APROVACAO as status_erp,
    ap.USUARIO_APROVADOR as usuario_aprovador_erp,
    ap.DATA_APROVACAO as data_aprovacao_erp,
    ap.REQUISICAO as numero_requisicao,
    ap.JUSTIFICATIVAREPROVACAO as justificativa_rejeicao,

    -- Solicitante
    cpg.USUARIO as solicitante_username,
    cad_solic.NOMEUSUARIO as nome_solicitante,
    cad_solic.EMAIL as email_solicitante,

    -- Favorecido e dados
    fornec.TEXTO as nome_favorecido,
    doc.TEXTO as numero_documento,
    venc.TEXTO as data_vencimento_str,
    emiss.TEXTO as data_emissao_str,
    obs.TEXTO as observacoes,

    -- Todos os dados adicionais
    (SELECT LISTAGG(da.TITULO || ': ' || da.TEXTO, CHR(10)) WITHIN GROUP (ORDER BY da.ORDEM)
     FROM GLOBUS.BGM_APROVEME_DADOSADICIONAIS da
     WHERE da.IDAPROVEME = ap.IDAPROVEME) as dados_adicionais_completos,

    -- Usuários do fluxo de aprovação
    (SELECT LISTAGG(usu.USUARIO || ' (' || NVL(usu.PERMITIRAPROVACAO, 'N') || ')', ', ') WITHIN GROUP (ORDER BY usu.USUARIO)
     FROM GLOBUS.BGM_APROVEME_USUARIOS usu
     WHERE usu.IDAPROVEME = ap.IDAPROVEME) as usuarios_aprovacao

FROM GLOBUS.BGM_APROVEME ap
-- [... mesmos joins das consultas anteriores ...]
WHERE ap.IDAPROVEME = :id_requisicao;
````

### 6. Histórico por Favorecido

**Uso:** Exibir histórico de pagamentos no modal de detalhes
**Parâmetro:** :nome_favorecido (nome do fornecedor)

```sql
SELECT
    ap.IDAPROVEME,
    ap.DATA as data_criacao,
    ap.VALOR as valor_total,
    ap.STATUS_APROVACAO,
    ap.DATA_APROVACAO,
    ap.USUARIO_APROVADOR,
    doc.TEXTO as numero_documento,
    ap.TIPO

FROM GLOBUS.BGM_APROVEME ap
INNER JOIN (SELECT IDAPROVEME, TEXTO FROM GLOBUS.BGM_APROVEME_DADOSADICIONAIS WHERE TITULO = 'Fornecedor') fornec
    ON ap.IDAPROVEME = fornec.IDAPROVEME
LEFT JOIN (SELECT IDAPROVEME, TEXTO FROM GLOBUS.BGM_APROVEME_DADOSADICIONAIS WHERE TITULO = 'Documento') doc
    ON ap.IDAPROVEME = doc.IDAPROVEME

WHERE fornec.TEXTO = :nome_favorecido
AND ap.STATUS_APROVACAO = 'A'  -- Apenas aprovados
AND ap.DATA >= TRUNC(ADD_MONTHS(SYSDATE, -24))  -- Últimos 24 meses

ORDER BY ap.DATA DESC;
```

---

## 🔄 Estratégia de Sincronização {#estratégia-sincronização}

### ID_EXTERNO - Chave de Sincronização

- **Tipo:** RAW(16) - GUID único do Oracle
- **Formato:** 32 caracteres hexadecimais
- **Exemplo:** `37B212B21FE0207AE063BF01000AFCF7`
- **Finalidade:** Evitar duplicações 100% na sincronização

### Algoritmo de Sincronização Incremental

```typescript
class ERPSyncService {
  async syncIncremental(): Promise<SyncResult> {
    // 1. Buscar registros NÃO sincronizados
    const newPayments = await this.oracleQuery(`
      SELECT * FROM BGM_APROVEME 
      WHERE ID_EXTERNO NOT IN (
        SELECT erp_external_id FROM payment_requests
      )
    `);

    // 2. Inserir novos registros
    for (const payment of newPayments) {
      await this.createPaymentRequest({
        erp_payment_id: payment.IDAPROVEME,
        erp_external_id: payment.ID_EXTERNO, // ← Chave única
        // ... outros campos
      });
    }

    // 3. Buscar mudanças de status
    const statusChanges = await this.oracleQuery(`
      SELECT * FROM BGM_APROVEME 
      WHERE DATA_APROVACAO >= :ultima_sincronizacao
    `);

    // 4. Atualizar registros modificados
    for (const change of statusChanges) {
      await this.updateByExternalId(change.ID_EXTERNO, {
        erp_status: change.STATUS_APROVACAO,
      });
    }
  }
}
```

### Frequência de Sincronização

- **Carga Inicial:** 1x na implementação (90 dias)
- **Incremental:** A cada 5-15 minutos
- **Usuários:** 1x por dia
- **Estatísticas:** Conforme necessário

---

## 👥 Sistema de Usuários {#sistema-usuarios}

### Usuários Identificados

**Total:** 41 usuários ativos relevantes

**Top Solicitantes:**

1. **LUZIA** - 90.599 solicitações, 25.781 aprovações (DIRECTOR)
2. **JOAOFILHO** - 65.526 solicitações, 3.846 aprovações (DIRECTOR)
3. **ARACI** - 71.237 solicitações, 2.610 aprovações (DIRECTOR)

**Aprovadores Principais:**

- **LUCASFORESTI** - 91 aprovações (DIRECTOR)
- **CRISTIANECF** - 48 aprovações (DIRECTOR)
- **VICTOR** - 15 aprovações (DIRECTOR)

### Estratégia de Autenticação

**Decisão:** Autenticação própria (username/senha nossos)

-- 5.2. Consulta para criar usuários iniciais

```sql
SELECT
    cad.USUARIO as erp_username,
    cad.USUARIO as username_sugerido,              -- Usar o mesmo username
    cad.NOMEUSUARIO as name,
    COALESCE(cad.EMAIL, cad.USUARIO || '@vpioneira.com.br') as email, -- Gerar email se não tiver

    -- Papel sugerido baseado no ERP
    CASE
        WHEN EXISTS (SELECT 1 FROM GLOBUS.BGM_APROVEME ap WHERE ap.USUARIO_APROVADOR = cad.USUARIO)
             OR EXISTS (SELECT 1 FROM GLOBUS.BGM_APROVEME_USUARIOS usu WHERE usu.USUARIO = cad.USUARIO AND usu.PERMITIRAPROVACAO = 'S')
        THEN 'DIRECTOR'
        ELSE 'REQUESTER'
    END as role_sugerido,

    -- Estatísticas para validação
    (SELECT COUNT(*) FROM GLOBUS.CPGDOCTO cpg WHERE cpg.USUARIO = cad.USUARIO) as total_solicitacoes,
    (SELECT COUNT(*) FROM GLOBUS.BGM_APROVEME ap WHERE ap.USUARIO_APROVADOR = cad.USUARIO) as total_aprovacoes,

    -- Dados do ERP
    cad.ID_EXTERNO as erp_id_externo,
    cad.ATIVO as erp_active,

    -- Senha inicial sugerida (será hash no sistema)
    'temp123' as senha_inicial_temporaria          -- Usuário deve alterar no primeiro login

FROM GLOBUS.CTR_CADASTRODEUSUARIOS cad
WHERE cad.ATIVO = 'S'
AND (
    EXISTS (SELECT 1 FROM GLOBUS.CPGDOCTO cpg WHERE cpg.USUARIO = cad.USUARIO)
    OR EXISTS (SELECT 1 FROM GLOBUS.BGM_APROVEME ap WHERE ap.USUARIO_APROVADOR = cad.USUARIO)
    OR EXISTS (SELECT 1 FROM GLOBUS.BGM_APROVEME_USUARIOS usu WHERE usu.USUARIO = cad.USUARIO)
)
ORDER BY total_solicitacoes DESC, total_aprovacoes DESC;

```
