## 🎯 Introdução e Contexto

Este documento contém o mapeamento **COMPLETO E DEFINITIVO** do banco Oracle ERP GLOBUS para o Sistema Aprovador de Pagamentos. Todas as informações foram validadas com consultas reais no banco de produção.

### Mudança Arquitetural

- **ANTES:** BGM_APROVEME (tabela descontinuada) + API REST do ERP
- **DEPOIS:** CPGDOCTO + CTR_CADASTRODEUSUARIOS + BGM_FORNECEDOR + Consultas SQL diretas
- **MOTIVO:** Tabela BGM_APROVEME não é mais movimentada e ERP não fornecerá API

### Stack Tecnológico Final

- **Backend:** Node.js + Fastify + TypeORM + PostgreSQL + Oracle
- **Frontend:** React Native + Expo (mantém atual)
- **Banco ERP:** Oracle (schema GLOBUS)
- **Banco Interno:** PostgreSQL

---

## 🗄️ Estrutura Completa das Tabelas Oracle

### 1. CPGDOCTO (Tabela Principal)

**Finalidade:** Documentos de contas a pagar - TABELA PRINCIPAL DO SISTEMA  
**Registros:** 856.607 (crescimento ativo)  
**Schema:** GLOBUS.CPGDOCTO

#### Campos Principais Mapeados:

| Campo Oracle       | Tipo         | Descrição                      | Uso no Sistema       | Obrigatório |
| ------------------ | ------------ | ------------------------------ | -------------------- | ----------- |
| `CODDOCTOCPG`      | NUMBER(22)   | **PK** - ID único do documento | `erp_payment_id`     | ✅          |
| `USUARIO`          | VARCHAR2(15) | **Username do solicitante**    | `requester_username` | ✅          |
| `USUARIO_INCLUSAO` | VARCHAR2(15) | Username de quem incluiu       | `creator_username`   | ❌          |
| `DATA_INCLUSAO`    | DATE         | **Data de criação**            | `created_date`       | ✅          |
| `EMISSAOCPG`       | DATE         | Data de emissão                | `emission_date`      | ❌          |
| `ENTRADACPG`       | DATE         | Data de entrada                | `entry_date`         | ❌          |
| `VENCIMENTOCPG`    | DATE         | **Data de vencimento**         | `due_date`           | ✅          |
| `PAGAMENTOCPG`     | DATE         | Data do pagamento              | `payment_date`       | ❌          |

#### Campos de Status (CRÍTICOS):

| Campo Oracle        | Tipo        | Valores                                       | Descrição               | Uso no Sistema     |
| ------------------- | ----------- | --------------------------------------------- | ----------------------- | ------------------ |
| `STATUSDOCTOCPG`    | VARCHAR2(1) | **B** (62,71%), **N** (30,83%), **C** (6,46%) | Status principal        | `erp_status`       |
| `QUITADODOCTOCPG`   | VARCHAR2(1) | **S** (53,2%), **N** (46,8%)                  | Documento quitado       | `paid_status`      |
| `PAGAMENTOLIBERADO` | VARCHAR2(1) | **S** (58,34%), **N** (41,66%)                | Liberado para pagamento | `payment_released` |

#### Campos de Aprovação:

| Campo Oracle                    | Tipo         | Descrição                        | Uso no Sistema              |
| ------------------------------- | ------------ | -------------------------------- | --------------------------- |
| `USUARIO_LIBEROU_PAGTO`         | VARCHAR2(15) | Quem liberou o pagamento         | `payment_approver`          |
| `USUARIO_LIB_PAGTO_APROVE_ME`   | VARCHAR2(15) | **Usuário do sistema APROVE_ME** | `aproveme_approver`         |
| `USUARIO_ASS_ELETRON_APROVE_ME` | VARCHAR2(15) | Assinatura eletrônica            | `electronic_signature_user` |

#### Campos Financeiros:

| Campo Oracle   | Tipo            | Descrição          | Uso no Sistema   |
| -------------- | --------------- | ------------------ | ---------------- |
| `DESCONTOCPG`  | NUMBER(22,15,6) | Desconto aplicado  | `discount`       |
| `ACRESCIMOCPG` | NUMBER(22,15,6) | Acréscimo aplicado | `addition`       |
| `VLRINSSCPG`   | NUMBER(22,13,2) | Valor INSS         | `inss_value`     |
| `VLRIRRFCPG`   | NUMBER(22,13,2) | Valor IRRF         | `irrf_value`     |
| `VLRPISCPG`    | NUMBER(22,13,2) | Valor PIS          | `pis_value`      |
| `VLRCOFINSCPG` | NUMBER(22,13,2) | Valor COFINS       | `cofins_value`   |
| `VLRCSLCPG`    | NUMBER(22,13,2) | Valor CSL          | `csl_value`      |
| `VLRISSCPG`    | NUMBER(22,13,2) | Valor ISS          | `iss_value`      |
| `VLR_ORIGINAL` | NUMBER(22,13,2) | **Valor original** | `original_value` |

#### Campos do Documento:

| Campo Oracle         | Tipo          | Descrição               | Uso no Sistema    |
| -------------------- | ------------- | ----------------------- | ----------------- |
| `NRODOCTOCPG`        | VARCHAR2(10)  | **Número do documento** | `document_number` |
| `SERIEDOCTOCPG`      | VARCHAR2(5)   | Série do documento      | `document_series` |
| `CODTPDOC`           | VARCHAR2(3)   | **Tipo do documento**   | `document_type`   |
| `OBSDOCTOCPG`        | VARCHAR2(300) | Observações             | `observations`    |
| `FAVORECIDODOCTOCPG` | VARCHAR2(200) | **Nome do favorecido**  | `payee_name`      |

#### Campos de Relacionamento:

| Campo Oracle    | Tipo           | Descrição                | Relacionamento              |
| --------------- | -------------- | ------------------------ | --------------------------- |
| `CODIGOFORN`    | NUMBER(22,6,0) | **Código do fornecedor** | → BGM_FORNECEDOR.CODIGOFORN |
| `SISTEMA`       | VARCHAR2(3)    | Sistema origem           | Sempre "CPG"                |
| `CODIGOFL`      | NUMBER(22,3,0) | Código da filial         | -                           |
| `CODIGOEMPRESA` | NUMBER(22,3,0) | Código da empresa        | -                           |

---

### 2. CTR_CADASTRODEUSUARIOS (Usuários)

**Finalidade:** Cadastro de usuários do ERP GLOBUS  
**Registros:** 865 total (252 ativos)  
**Schema:** GLOBUS.CTR_CADASTRODEUSUARIOS

#### Estrutura Completa:

| Campo Oracle    | Tipo         | Nullable | Descrição               | Uso no Sistema    |
| --------------- | ------------ | -------- | ----------------------- | ----------------- |
| `USUARIO`       | VARCHAR2(15) | N        | **PK - Username único** | `erp_username`    |
| `NOMEUSUARIO`   | VARCHAR2(40) | Y        | **Nome completo**       | `name`            |
| `EMAIL`         | VARCHAR2(50) | Y        | **Email do usuário**    | `email`           |
| `ATIVO`         | VARCHAR2(1)  | Y        | **S=Ativo, N=Inativo**  | `erp_active`      |
| `ID_EXTERNO`    | RAW(16)      | Y        | **GUID único**          | `erp_external_id` |
| `SENHA`         | VARCHAR2(10) | N        | Senha (não usar)        | -                 |
| `ADMINISTRADOR` | VARCHAR2(1)  | Y        | Se é admin              | -                 |
| `DATAINC`       | DATE         | Y        | Data de inclusão        | -                 |
| `DATAALT`       | DATE         | Y        | Data de alteração       | -                 |

#### Estatísticas de Usuários:

- **252 usuários ativos** (ATIVO = 'S')
- **23 usuários com email** válido
- **Apenas 41 usuários relevantes** para o sistema (que fazem requisições ou aprovações)

---

### 3. BGM_FORNECEDOR (Fornecedores)

**Finalidade:** Cadastro de fornecedores/favorecidos  
**Registros:** 3.980  
**Schema:** GLOBUS.BGM_FORNECEDOR

#### Campos Principais:

| Campo Oracle     | Tipo          | Nullable | Descrição                     | Uso no Sistema    |
| ---------------- | ------------- | -------- | ----------------------------- | ----------------- |
| `CODIGOFORN`     | NUMBER(22)    | N        | **PK - Código do fornecedor** | `supplier_id`     |
| `NOMEFORNECEDOR` | VARCHAR2(100) | Y        | **Nome/Razão social**         | `supplier_name`   |
| `SITUACAO`       | VARCHAR2(1)   | Y        | Situação do fornecedor        | `supplier_status` |

**⚠️ IMPORTANTE:** BGM_FORNECEDOR **NÃO TEM** campos EMAIL ou CNPJCPF na estrutura real!

---

### 4. CPGDOCTO_HISTORICO_NEGOCIACOES (Histórico)

**Finalidade:** Histórico de alterações dos documentos  
**Registros:** 1.287.583 (volume alto)  
**Schema:** GLOBUS.CPGDOCTO_HISTORICO_NEGOCIACOES

#### Estrutura Completa:

| Campo Oracle       | Tipo          | Nullable | Descrição                       | Uso no Sistema         |
| ------------------ | ------------- | -------- | ------------------------------- | ---------------------- |
| `CODDOCTOCPG`      | NUMBER(22)    | N        | **FK para CPGDOCTO**            | `erp_payment_id`       |
| `DATA_EVENTO`      | DATE          | N        | **Data do evento**              | `action_date`          |
| `USUARIO`          | VARCHAR2(15)  | N        | **Usuário que fez a ação**      | `action_user`          |
| `COD_TP_EVENTO`    | NUMBER(22)    | N        | **Código do tipo de evento**    | `event_type_code`      |
| `MAIS_INFORMACOES` | VARCHAR2(500) | N        | **Comentário/descrição**        | `comment`              |
| `SEQUENCIA_EVENTO` | NUMBER(22)    | N        | **Sequência do evento**         | `sequence_number`      |
| `STATUSDOCTOCPG`   | CHAR(1)       | Y        | Status na época                 | `status_at_time`       |
| `VLR_BRUTO`        | NUMBER(22)    | Y        | **🎯 VALOR TOTAL DO DOCUMENTO** | `amount_at_time`       |
| `VENCIMENTOCPG`    | DATE          | Y        | Vencimento na época             | `due_date_at_time`     |
| `PAGAMENTOCPG`     | DATE          | Y        | Pagamento na época              | `payment_date_at_time` |
| `ATUALIZA`         | CHAR(1)       | N        | Flag de atualização             | -                      |

**🎯 CAMPO CRÍTICO:** `VLR_BRUTO` contém o **valor total real** do documento!

#### Exemplo de Dados Reais:

```
CODDOCTOCPG: 351963, VLR_BRUTO: 56, USUARIO: BALTAZAR, DATA_EVENTO: 21/12/11
CODDOCTOCPG: 351734, VLR_BRUTO: 160, USUARIO: BALTAZAR, DATA_EVENTO: 21/12/11
```

---

### 5. CPGDOCTO_ANEXO (Anexos)

**Finalidade:** Anexos dos documentos  
**Registros:** 2.097  
**Schema:** GLOBUS.CPGDOCTO_ANEXO

#### Estrutura Completa:

| Campo Oracle  | Tipo          | Nullable | Descrição               | Uso no Sistema   |
| ------------- | ------------- | -------- | ----------------------- | ---------------- |
| `ID`          | NUMBER(22)    | N        | **PK - ID do anexo**    | `attachment_id`  |
| `CODDOCTOCPG` | NUMBER(22)    | N        | **FK para CPGDOCTO**    | `erp_payment_id` |
| `DATA`        | DATE          | N        | **Data do upload**      | `upload_date`    |
| `NOME`        | VARCHAR2(200) | N        | **Nome do arquivo**     | `filename`       |
| `ARQUIVO`     | BLOB          | N        | **Conteúdo do arquivo** | `file_content`   |

**⚠️ NOTA:** Não há campo de usuário que fez upload!

---

### 6. CPGITDOC (Itens do Documento)

**Finalidade:** Itens/parcelas dos documentos  
**Registros:** 1.026.142  
**Schema:** GLOBUS.CPGITDOC

#### Campo de Valor:

| Campo Oracle   | Tipo       | Nullable | Descrição         | Uso no Sistema |
| -------------- | ---------- | -------- | ----------------- | -------------- |
| `VALORITEMDOC` | NUMBER(22) | Y        | **Valor do item** | `item_amount`  |

**Uso:** Alternativa para calcular valor total quando VLR_BRUTO não estiver disponível.

---

### 7. CPG_PARAM_LIB_PAG (Parâmetros de Liberação)

**Finalidade:** Configuração de usuários aprovadores  
**Registros:** 1  
**Schema:** GLOBUS.CPG_PARAM_LIB_PAG

#### Estrutura:

| Campo Oracle    | Tipo         | Nullable | Descrição             |
| --------------- | ------------ | -------- | --------------------- |
| `CODIGOEMPRESA` | NUMBER(22)   | N        | Código da empresa     |
| `CODIGOFL`      | NUMBER(22)   | N        | Código da filial      |
| `TIPO_DIV`      | VARCHAR2(2)  | N        | Tipo de divisão       |
| `CODIGO`        | NUMBER(22)   | N        | Código                |
| `USUARIO`       | VARCHAR2(15) | N        | **Usuário aprovador** |

#### Dados Reais:

```
CODIGOEMPRESA: 1, CODIGOFL: 1, TIPO_DIV: DP, CODIGO: 3000, USUARIO: MARCELO
```

---

### 8. CPG_PARAM_LIB_PAG_TPDESP (Parâmetros por Tipo)

**Finalidade:** Aprovadores por tipo de despesa  
**Registros:** 4.250  
**Schema:** GLOBUS.CPG_PARAM_LIB_PAG_TPDESP

#### Estrutura:

| Campo Oracle    | Tipo         | Nullable | Descrição             |
| --------------- | ------------ | -------- | --------------------- |
| `CODIGOEMPRESA` | NUMBER(22)   | N        | Código da empresa     |
| `CODIGOFL`      | NUMBER(22)   | N        | Código da filial      |
| `CODTPDESPESA`  | VARCHAR2(5)  | N        | **Tipo de despesa**   |
| `USUARIO`       | VARCHAR2(15) | N        | **Usuário aprovador** |

---

## 🔄 Mapeamento de Status Definitivo

### Status Principal (STATUSDOCTOCPG)

| Valor Oracle | Percentual | Status Interno | Descrição                      |
| ------------ | ---------- | -------------- | ------------------------------ |
| **B**        | 62,71%     | **PENDING**    | Bloqueado/aguardando aprovação |
| **N**        | 30,83%     | **NEW**        | Novo/não processado            |
| **C**        | 6,46%      | **CANCELLED**  | Cancelado                      |

### Status de Pagamento (QUITADODOCTOCPG)

| Valor Oracle | Percentual | Descrição        |
| ------------ | ---------- | ---------------- |
| **S**        | 53,2%      | **Quitado/Pago** |
| **N**        | 46,8%      | **Não quitado**  |

### Status de Liberação (PAGAMENTOLIBERADO)

| Valor Oracle | Percentual | Descrição                   |
| ------------ | ---------- | --------------------------- |
| **S**        | 58,34%     | **Liberado para pagamento** |
| **N**        | 41,66%     | **Não liberado**            |

### Lógica de Status Interno

```sql
CASE
    WHEN STATUSDOCTOCPG = 'B' AND QUITADODOCTOCPG = 'S' THEN 'PAID'
    WHEN STATUSDOCTOCPG = 'B' AND PAGAMENTOLIBERADO = 'S' THEN 'APPROVED'
    WHEN STATUSDOCTOCPG = 'B' THEN 'PENDING'
    WHEN STATUSDOCTOCPG = 'C' THEN 'CANCELLED'
    WHEN STATUSDOCTOCPG = 'N' THEN 'NEW'
    ELSE 'UNKNOWN'
END
```

---

## 💰 Estratégia de Valor Total

### Prioridade de Campos:

1. **🥇 VLR_BRUTO** (CPGDOCTO_HISTORICO_NEGOCIACOES)

   - Campo principal confirmado com dados reais
   - Valores: 56, 160, 400, 195.15, 812, 566, 392.3, etc.

2. **🥈 VALORITEMDOC** (CPGITDOC)

   - Soma dos itens do documento
   - Usar quando VLR_BRUTO não disponível

3. **🥉 VLR_ORIGINAL** (CPGDOCTO)
   - Valor original (backup)

### Consulta para Valor Total:

```sql
-- Buscar valor do histórico mais recente
SELECT
    CODDOCTOCPG,
    FIRST_VALUE(VLR_BRUTO) OVER (
        PARTITION BY CODDOCTOCPG
        ORDER BY DATA_EVENTO DESC, SEQUENCIA_EVENTO DESC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) as VLR_BRUTO
FROM GLOBUS.CPGDOCTO_HISTORICO_NEGOCIACOES
WHERE VLR_BRUTO > 0
```

---

## 🔗 Relacionamentos Validados

### 1. CPGDOCTO → BGM_FORNECEDOR

```sql
-- Relacionamento: 100% funcional
LEFT JOIN GLOBUS.BGM_FORNECEDOR f ON f.CODIGOFORN = c.CODIGOFORN
```

**Teste realizado:** 10.000 registros = 100% match ✅

### 2. CPGDOCTO → CTR_CADASTRODEUSUARIOS

```sql
-- Relacionamento: 100% funcional
LEFT JOIN GLOBUS.CTR_CADASTRODEUSUARIOS u ON u.USUARIO = c.USUARIO
```

### 3. CPGDOCTO → CPGDOCTO_HISTORICO_NEGOCIACOES

```sql
-- Relacionamento: 1:N
LEFT JOIN GLOBUS.CPGDOCTO_HISTORICO_NEGOCIACOES h ON h.CODDOCTOCPG = c.CODDOCTOCPG
```

### 4. CPGDOCTO → CPGDOCTO_ANEXO

```sql
-- Relacionamento: 1:N
LEFT JOIN GLOBUS.CPGDOCTO_ANEXO a ON a.CODDOCTOCPG = c.CODDOCTOCPG
```

---

## 📋 Consultas SQL Definitivas

### 1. Sincronização Principal

```sql
SELECT
    c.CODDOCTOCPG as erp_payment_id,
    c.USUARIO as requester_username,
    c.USUARIO_INCLUSAO as creator_username,
    c.DATA_INCLUSAO as created_date,
    c.EMISSAOCPG as emission_date,
    c.ENTRADACPG as entry_date,
    c.VENCIMENTOCPG as due_date,
    c.PAGAMENTOCPG as payment_date,

    -- Status fields
    c.STATUSDOCTOCPG as erp_status,
    c.QUITADODOCTOCPG as paid_status,
    c.PAGAMENTOLIBERADO as payment_released,

    -- Approval users
    c.USUARIO_LIBEROU_PAGTO as payment_approver,
    c.USUARIO_LIB_PAGTO_APROVE_ME as aproveme_approver,
    c.USUARIO_ASS_ELETRON_APROVE_ME as electronic_signature_user,

    -- Financial data
    c.DESCONTOCPG as discount,
    c.ACRESCIMOCPG as addition,
    c.VLRINSSCPG as inss_value,
    c.VLRIRRFCPG as irrf_value,
    c.VLRPISCPG as pis_value,
    c.VLRCOFINSCPG as cofins_value,
    c.VLRCSLCPG as csl_value,
    c.VLRISSCPG as iss_value,
    c.VLR_ORIGINAL as original_value,

    -- Document info
    c.NRODOCTOCPG as document_number,
    c.SERIEDOCTOCPG as document_series,
    c.CODTPDOC as document_type,
    c.OBSDOCTOCPG as observations,
    c.FAVORECIDODOCTOCPG as payee_name,

    -- Supplier data
    f.NFANTASIAFORN as supplier_name,
    f.CODIGOFORN as supplier_code,

    -- Requester data
    u.NOMEUSUARIO as requester_name,
    u.EMAIL as requester_email,
    u.ATIVO as requester_active,

    -- Total amount from history
    h.VLR_BRUTO as total_amount,

    -- Internal status mapping
    CASE
        WHEN c.STATUSDOCTOCPG = 'B' AND c.QUITADODOCTOCPG = 'S' THEN 'PAID'
        WHEN c.STATUSDOCTOCPG = 'B' AND c.PAGAMENTOLIBERADO = 'S' THEN 'APPROVED'
        WHEN c.STATUSDOCTOCPG = 'B' THEN 'PENDING'
        WHEN c.STATUSDOCTOCPG = 'C' THEN 'CANCELLED'
        WHEN c.STATUSDOCTOCPG = 'N' THEN 'NEW'
        ELSE 'UNKNOWN'
    END as internal_status,

    -- Priority
    CASE
        WHEN c.STATUSDOCTOCPG = 'B' AND c.DATA_INCLUSAO >= TRUNC(SYSDATE) - 7 THEN 'HIGH'
        WHEN c.STATUSDOCTOCPG = 'N' AND c.DATA_INCLUSAO >= TRUNC(SYSDATE) - 3 THEN 'HIGH'
        WHEN c.STATUSDOCTOCPG IN ('B', 'N') AND c.DATA_INCLUSAO >= TRUNC(SYSDATE) - 30 THEN 'MEDIUM'
        ELSE 'LOW'
    END as priority

FROM GLOBUS.CPGDOCTO c
LEFT JOIN GLOBUS.BGM_FORNECEDOR f ON f.CODIGOFORN = c.CODIGOFORN
LEFT JOIN GLOBUS.CTR_CADASTRODEUSUARIOS u ON u.USUARIO = c.USUARIO
LEFT JOIN (
    SELECT
        CODDOCTOCPG,
        FIRST_VALUE(VLR_BRUTO) OVER (
            PARTITION BY CODDOCTOCPG
            ORDER BY DATA_EVENTO DESC, SEQUENCIA_EVENTO DESC
            ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
        ) as VLR_BRUTO
    FROM GLOBUS.CPGDOCTO_HISTORICO_NEGOCIACOES
    WHERE VLR_BRUTO > 0
) h ON h.CODDOCTOCPG = c.CODDOCTOCPG

WHERE c.DATA_INCLUSAO >= TRUNC(SYSDATE) - :dias_retroativos
AND c.STATUSDOCTOCPG IN ('B', 'N', 'C')
ORDER BY c.DATA_INCLUSAO DESC, c.CODDOCTOCPG DESC;
```

### 2. Sincronização Incremental

```sql
SELECT
    c.CODDOCTOCPG as erp_payment_id,
    c.STATUSDOCTOCPG as current_status,
    c.QUITADODOCTOCPG as paid_status,
    c.PAGAMENTOLIBERADO as payment_released,
    c.PAGAMENTOCPG as payment_date,
    c.DATA_INCLUSAO as created_date,

    CASE
        WHEN c.STATUSDOCTOCPG = 'B' AND c.QUITADODOCTOCPG = 'S' THEN 'PAID'
        WHEN c.STATUSDOCTOCPG = 'B' AND c.PAGAMENTOLIBERADO = 'S' THEN 'APPROVED'
        WHEN c.STATUSDOCTOCPG = 'B' THEN 'PENDING'
        WHEN c.STATUSDOCTOCPG = 'C' THEN 'CANCELLED'
        WHEN c.STATUSDOCTOCPG = 'N' THEN 'NEW'
        ELSE 'UNKNOWN'
    END as internal_status,

    h.VLR_BRUTO as total_amount,
    h.ultima_modificacao,
    SYSDATE as sync_timestamp

FROM GLOBUS.CPGDOCTO c
LEFT JOIN (
    SELECT
        CODDOCTOCPG,
        MAX(DATA_EVENTO) as ultima_modificacao,
        FIRST_VALUE(VLR_BRUTO) OVER (
            PARTITION BY CODDOCTOCPG
            ORDER BY DATA_EVENTO DESC, SEQUENCIA_EVENTO DESC
            ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
        ) as VLR_BRUTO
    FROM GLOBUS.CPGDOCTO_HISTORICO_NEGOCIACOES
    WHERE VLR_BRUTO > 0
    GROUP BY CODDOCTOCPG, VLR_BRUTO, DATA_EVENTO, SEQUENCIA_EVENTO
) h ON h.CODDOCTOCPG = c.CODDOCTOCPG

WHERE (
    c.DATA_INCLUSAO >= TRUNC(SYSDATE) - 1
    OR h.ultima_modificacao >= TRUNC(SYSDATE) - 1
)
AND c.STATUSDOCTOCPG IN ('B', 'N', 'C')
ORDER BY COALESCE(h.ultima_modificacao, c.DATA_INCLUSAO) DESC;
```

### 3. Histórico de Documento

```sql
SELECT
    h.CODDOCTOCPG as erp_payment_id,
    h.DATA_EVENTO as action_date,
    h.USUARIO as action_user,
    h.COD_TP_EVENTO as event_type_code,
    h.MAIS_INFORMACOES as comment,
    h.SEQUENCIA_EVENTO as sequence_number,
    h.STATUSDOCTOCPG as status_at_time,
    h.VLR_BRUTO as amount_at_time,
    h.VENCIMENTOCPG as due_date_at_time,
    h.PAGAMENTOCPG as payment_date_at_time,

    u.NOMEUSUARIO as user_name,
    u.EMAIL as user_email

FROM GLOBUS.CPGDOCTO_HISTORICO_NEGOCIACOES h
LEFT JOIN GLOBUS.CTR_CADASTRODEUSUARIOS u ON u.USUARIO = h.USUARIO

WHERE h.CODDOCTOCPG = :payment_id
ORDER BY h.DATA_EVENTO DESC, h.SEQUENCIA_EVENTO DESC;
```

### 4. Anexos de Documento

```sql
SELECT
    a.ID as attachment_id,
    a.CODDOCTOCPG as erp_payment_id,
    a.NOME as filename,
    a.DATA as upload_date,
    LENGTH(a.ARQUIVO) as file_size_bytes

FROM GLOBUS.CPGDOCTO_ANEXO a
WHERE a.CODDOCTOCPG = :payment_id
ORDER BY a.DATA DESC;
```

### 5. Mapeamento de Usuários

```sql
SELECT
    u.USUARIO as erp_username,
    u.NOMEUSUARIO as name,
    u.EMAIL as email,
    u.ATIVO as erp_active,
    u.ID_EXTERNO as erp_external_id,

    CASE
        WHEN p.USUARIO IS NOT NULL THEN 'DIRECTOR'
        WHEN pt.USUARIO IS NOT NULL THEN 'DIRECTOR'
        WHEN aprovacoes.total > 10 THEN 'DIRECTOR'
        WHEN solicitacoes.total > 0 THEN 'REQUESTER'
        ELSE 'VIEWER'
    END as suggested_role,

    COALESCE(aprovacoes.total, 0) as total_approvals,
    COALESCE(solicitacoes.total, 0) as total_requests,
    COALESCE(aproveme.total_aproveme, 0) as total_aproveme_approvals,

    CASE
        WHEN u.EMAIL IS NOT NULL AND LENGTH(TRIM(u.EMAIL)) > 0 THEN u.EMAIL
        ELSE LOWER(u.USUARIO) || '@empresa.com.br'
    END as email_final

FROM GLOBUS.CTR_CADASTRODEUSUARIOS u
LEFT JOIN GLOBUS.CPG_PARAM_LIB_PAG p ON p.USUARIO = u.USUARIO
LEFT JOIN GLOBUS.CPG_PARAM_LIB_PAG_TPDESP pt ON pt.USUARIO = u.USUARIO
LEFT JOIN (
    SELECT USUARIO_LIBEROU_PAGTO as USUARIO, COUNT(*) as total
    FROM GLOBUS.CPGDOCTO
    WHERE USUARIO_LIBEROU_PAGTO IS NOT NULL
    GROUP BY USUARIO_LIBEROU_PAGTO
) aprovacoes ON aprovacoes.USUARIO = u.USUARIO
LEFT JOIN (
    SELECT USUARIO_LIB_PAGTO_APROVE_ME as USUARIO, COUNT(*) as total_aproveme
    FROM GLOBUS.CPGDOCTO
    WHERE USUARIO_LIB_PAGTO_APROVE_ME IS NOT NULL
    GROUP BY USUARIO_LIB_PAGTO_APROVE_ME
) aproveme ON aproveme.USUARIO = u.USUARIO
LEFT JOIN (
    SELECT USUARIO, COUNT(*) as total
    FROM GLOBUS.CPGDOCTO
    GROUP BY USUARIO
) solicitacoes ON solicitacoes.USUARIO = u.USUARIO

WHERE u.ATIVO = 'S'
AND (p.USUARIO IS NOT NULL
     OR pt.USUARIO IS NOT NULL
     OR aprovacoes.total > 0
     OR solicitacoes.total > 0)

ORDER BY COALESCE(aprovacoes.total, 0) DESC, COALESCE(solicitacoes.total, 0) DESC;
```

### 6. Detalhes Completos de Documento

```sql
SELECT
    -- Dados básicos
    c.CODDOCTOCPG as erp_payment_id,
    c.USUARIO as requester_username,
    c.DATA_INCLUSAO as created_date,
    c.STATUSDOCTOCPG as erp_status,
    c.QUITADODOCTOCPG as paid_status,
    c.PAGAMENTOLIBERADO as payment_released,

    -- Dados do documento
    c.NRODOCTOCPG as document_number,
    c.SERIEDOCTOCPG as document_series,
    c.CODTPDOC as document_type,
    c.OBSDOCTOCPG as observations,
    c.FAVORECIDODOCTOCPG as payee_name,

    -- Datas importantes
    c.EMISSAOCPG as emission_date,
    c.ENTRADACPG as entry_date,
    c.VENCIMENTOCPG as due_date,
    c.PAGAMENTOCPG as payment_date,

    -- Valores financeiros
    h.VLR_BRUTO as total_amount,
    c.DESCONTOCPG as discount,
    c.ACRESCIMOCPG as addition,
    c.VLRINSSCPG as inss_value,
    c.VLRIRRFCPG as irrf_value,

    -- Dados do solicitante
    u.NOMEUSUARIO as requester_name,
    u.EMAIL as requester_email,

    -- Dados do fornecedor
    f.NOMEFORNECEDOR as supplier_name,
    f.CODIGOFORN as supplier_code,

    -- Aprovação
    c.USUARIO_LIBEROU_PAGTO as payment_approver,
    c.USUARIO_LIB_PAGTO_APROVE_ME as aproveme_approver,

    -- Status interno
    CASE
        WHEN c.STATUSDOCTOCPG = 'B' AND c.QUITADODOCTOCPG = 'S' THEN 'PAID'
        WHEN c.STATUSDOCTOCPG = 'B' AND c.PAGAMENTOLIBERADO = 'S' THEN 'APPROVED'
        WHEN c.STATUSDOCTOCPG = 'B' THEN 'PENDING'
        WHEN c.STATUSDOCTOCPG = 'C' THEN 'CANCELLED'
        WHEN c.STATUSDOCTOCPG = 'N' THEN 'NEW'
        ELSE 'UNKNOWN'
    END as internal_status,

    -- Contadores
    anexos.total_anexos,
    historico.total_eventos

FROM GLOBUS.CPGDOCTO c
LEFT JOIN GLOBUS.BGM_FORNECEDOR f ON f.CODIGOFORN = c.CODIGOFORN
LEFT JOIN GLOBUS.CTR_CADASTRODEUSUARIOS u ON u.USUARIO = c.USUARIO
LEFT JOIN (
    SELECT CODDOCTOCPG, MAX(VLR_BRUTO) as VLR_BRUTO
    FROM GLOBUS.CPGDOCTO_HISTORICO_NEGOCIACOES
    WHERE VLR_BRUTO > 0
    GROUP BY CODDOCTOCPG
) h ON h.CODDOCTOCPG = c.CODDOCTOCPG
LEFT JOIN (
    SELECT CODDOCTOCPG, COUNT(*) as total_anexos
    FROM GLOBUS.CPGDOCTO_ANEXO
    GROUP BY CODDOCTOCPG
) anexos ON anexos.CODDOCTOCPG = c.CODDOCTOCPG
LEFT JOIN (
    SELECT CODDOCTOCPG, COUNT(*) as total_eventos
    FROM GLOBUS.CPGDOCTO_HISTORICO_NEGOCIACOES
    GROUP BY CODDOCTOCPG
) historico ON historico.CODDOCTOCPG = c.CODDOCTOCPG

WHERE c.CODDOCTOCPG = :payment_id;
```

### 7. Estatísticas por Status

```sql
SELECT
    c.STATUSDOCTOCPG as erp_status,

    CASE
        WHEN c.STATUSDOCTOCPG = 'B' AND c.QUITADODOCTOCPG = 'S' THEN 'PAID'
        WHEN c.STATUSDOCTOCPG = 'B' AND c.PAGAMENTOLIBERADO = 'S' THEN 'APPROVED'
        WHEN c.STATUSDOCTOCPG = 'B' THEN 'PENDING'
        WHEN c.STATUSDOCTOCPG = 'C' THEN 'CANCELLED'
        WHEN c.STATUSDOCTOCPG = 'N' THEN 'NEW'
        ELSE 'UNKNOWN'
    END as internal_status,

    COUNT(*) as quantidade,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentual,
    ROUND(AVG(h.VLR_BRUTO), 2) as valor_medio,
    ROUND(SUM(h.VLR_BRUTO), 2) as valor_total

FROM GLOBUS.CPGDOCTO c
LEFT JOIN (
    SELECT CODDOCTOCPG, MAX(VLR_BRUTO) as VLR_BRUTO
    FROM GLOBUS.CPGDOCTO_HISTORICO_NEGOCIACOES
    WHERE VLR_BRUTO > 0
    GROUP BY CODDOCTOCPG
) h ON h.CODDOCTOCPG = c.CODDOCTOCPG

WHERE c.DATA_INCLUSAO >= TRUNC(SYSDATE) - 90
GROUP BY c.STATUSDOCTOCPG
ORDER BY quantidade DESC;
```
