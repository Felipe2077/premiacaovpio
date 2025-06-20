-- ============================================================================
-- MAPEAMENTO FINAL COMPLETO - ORACLE GLOBUS → SISTEMA APROVADOR
-- Baseado em investigação real dos dados
-- ============================================================================

-- ############################################################################
-- 1. CONSULTA PRINCIPAL DE SINCRONIZAÇÃO - DEFINITIVA E FUNCIONAL
-- ############################################################################

-- 1.1. Consulta principal corrigida (SEM CAMPOS INEXISTENTES)
SELECT
c.CODDOCTOCPG as erp_payment_id,
c.USUARIO as requester_username,
c.USUARIO_INCLUSAO as creator_username,
c.DATA_INCLUSAO as created_date,
c.EMISSAOCPG as emission_date,
c.ENTRADACPG as entry_date,
c.VENCIMENTOCPG as due_date,
c.PAGAMENTOCPG as payment_date,

    -- Status fields CONFIRMADOS
    c.STATUSDOCTOCPG as erp_status,
    c.QUITADODOCTOCPG as paid_status,
    c.PAGAMENTOLIBERADO as payment_released,

    -- Approval users
    c.USUARIO_LIBEROU_PAGTO as payment_approver,
    c.USUARIO_LIB_PAGTO_APROVE_ME as aproveme_approver,
    c.USUARIO_ASS_ELETRON_APROVE_ME as electronic_signature_user,

    -- Financial data (impostos e descontos)
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

    -- Supplier data (APENAS CAMPOS QUE EXISTEM)
    f.NOMEFORNECEDOR as supplier_name,
    f.CODIGOFORN as supplier_code,
    -- f.CNPJCPF não existe, usar outro campo

    -- Requester data
    u.NOMEUSUARIO as requester_name,
    u.EMAIL as requester_email,
    u.ATIVO as requester_active,

    -- Valor total do histórico (campo confirmado)
    h.VLR_BRUTO as total_amount,

    -- Status mapping DEFINITIVO baseado nos dados reais
    CASE
        WHEN c.STATUSDOCTOCPG = 'B' AND c.QUITADODOCTOCPG = 'S' THEN 'PAID'
        WHEN c.STATUSDOCTOCPG = 'B' AND c.PAGAMENTOLIBERADO = 'S' THEN 'APPROVED'
        WHEN c.STATUSDOCTOCPG = 'B' THEN 'PENDING'
        WHEN c.STATUSDOCTOCPG = 'C' THEN 'CANCELLED'
        WHEN c.STATUSDOCTOCPG = 'N' THEN 'NEW'
        ELSE 'UNKNOWN'
    END as internal_status,

    -- Priority baseado na data e status
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
-- Buscar o valor total do histórico mais recente
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
AND c.STATUSDOCTOCPG IN ('B', 'N', 'C') -- Apenas status relevantes
ORDER BY c.DATA_INCLUSAO DESC, c.CODDOCTOCPG DESC;

-- ############################################################################
-- 2. CONSULTA DE SINCRONIZAÇÃO INCREMENTAL
-- ############################################################################

-- 2.1. Detectar mudanças recentes (últimas 24 horas)
SELECT
c.CODDOCTOCPG as erp_payment_id,
c.STATUSDOCTOCPG as current_status,
c.QUITADODOCTOCPG as paid_status,
c.PAGAMENTOLIBERADO as payment_released,
c.PAGAMENTOCPG as payment_date,
c.DATA_INCLUSAO as created_date,

    -- Status mapeado
    CASE
        WHEN c.STATUSDOCTOCPG = 'B' AND c.QUITADODOCTOCPG = 'S' THEN 'PAID'
        WHEN c.STATUSDOCTOCPG = 'B' AND c.PAGAMENTOLIBERADO = 'S' THEN 'APPROVED'
        WHEN c.STATUSDOCTOCPG = 'B' THEN 'PENDING'
        WHEN c.STATUSDOCTOCPG = 'C' THEN 'CANCELLED'
        WHEN c.STATUSDOCTOCPG = 'N' THEN 'NEW'
        ELSE 'UNKNOWN'
    END as internal_status,

    -- Valor atual
    h.VLR_BRUTO as total_amount,

    -- Última modificação via histórico
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
c.DATA_INCLUSAO >= TRUNC(SYSDATE) - 1 -- Criados ontem
OR h.ultima_modificacao >= TRUNC(SYSDATE) - 1 -- Ou modificados ontem
)
AND c.STATUSDOCTOCPG IN ('B', 'N', 'C')
ORDER BY COALESCE(h.ultima_modificacao, c.DATA_INCLUSAO) DESC;

-- ############################################################################
-- 3. CONSULTA DE HISTÓRICO/COMENTÁRIOS
-- ############################################################################

-- 3.1. Buscar histórico de um documento específico
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

    -- User details
    u.NOMEUSUARIO as user_name,
    u.EMAIL as user_email

FROM GLOBUS.CPGDOCTO_HISTORICO_NEGOCIACOES h
LEFT JOIN GLOBUS.CTR_CADASTRODEUSUARIOS u ON u.USUARIO = h.USUARIO

WHERE h.CODDOCTOCPG = :payment_id
ORDER BY h.DATA_EVENTO DESC, h.SEQUENCIA_EVENTO DESC;

-- ############################################################################
-- 4. CONSULTA DE ANEXOS
-- ############################################################################

-- 4.1. Buscar anexos de um documento
SELECT
a.ID as attachment_id,
a.CODDOCTOCPG as erp_payment_id,
a.NOME as filename,
a.DATA as upload_date,
LENGTH(a.ARQUIVO) as file_size_bytes,

    -- Não há campo de usuário que fez upload na estrutura real
    'SYSTEM' as uploader_name

FROM GLOBUS.CPGDOCTO_ANEXO a
WHERE a.CODDOCTOCPG = :payment_id
ORDER BY a.DATA DESC;

-- ############################################################################
-- 5. CONSULTA DE VALOR TOTAL ALTERNATIVA (USAR CPGITDOC)
-- ############################################################################

-- 5.1. Calcular valor total pelos itens do documento
SELECT
c.CODDOCTOCPG as erp_payment_id,
c.NRODOCTOCPG as document_number,
c.FAVORECIDODOCTOCPG as payee_name,

    -- Valor total calculado pelos itens
    COALESCE(SUM(i.VALORITEMDOC), 0) as total_amount_items,

    -- Valor do histórico (backup)
    h.VLR_BRUTO as total_amount_history,

    -- Usar o maior valor entre itens e histórico
    GREATEST(
        COALESCE(SUM(i.VALORITEMDOC), 0),
        COALESCE(h.VLR_BRUTO, 0)
    ) as final_total_amount

FROM GLOBUS.CPGDOCTO c
LEFT JOIN GLOBUS.CPGITDOC i ON i.CODDOCTOCPG = c.CODDOCTOCPG
LEFT JOIN (
SELECT
CODDOCTOCPG,
MAX(VLR_BRUTO) as VLR_BRUTO
FROM GLOBUS.CPGDOCTO_HISTORICO_NEGOCIACOES
WHERE VLR_BRUTO > 0
GROUP BY CODDOCTOCPG
) h ON h.CODDOCTOCPG = c.CODDOCTOCPG

WHERE c.CODDOCTOCPG = :payment_id
GROUP BY c.CODDOCTOCPG, c.NRODOCTOCPG, c.FAVORECIDODOCTOCPG, h.VLR_BRUTO;

-- ############################################################################
-- 6. CONSULTA DE USUÁRIOS ATIVOS E APROVADORES
-- ############################################################################

-- 6.1. Mapear usuários com papéis baseado em atividade real
SELECT
u.USUARIO as erp_username,
u.NOMEUSUARIO as name,
u.EMAIL as email,
u.ATIVO as erp_active,
u.ID_EXTERNO as erp_external_id,

    -- Classificação baseada em parâmetros de liberação
    CASE
        WHEN p.USUARIO IS NOT NULL THEN 'DIRECTOR'
        WHEN pt.USUARIO IS NOT NULL THEN 'DIRECTOR'
        WHEN aprovacoes.total > 10 THEN 'DIRECTOR' -- Aprovou mais de 10
        WHEN solicitacoes.total > 0 THEN 'REQUESTER'
        ELSE 'VIEWER'
    END as suggested_role,

    -- Estatísticas de atividade
    COALESCE(aprovacoes.total, 0) as total_approvals,
    COALESCE(solicitacoes.total, 0) as total_requests,
    COALESCE(aprovacoes.total_aproveme, 0) as total_aproveme_approvals,

    -- Dados para criação de usuário
    CASE
        WHEN u.EMAIL IS NOT NULL AND LENGTH(TRIM(u.EMAIL)) > 0 THEN u.EMAIL
        ELSE LOWER(u.USUARIO) || '@empresa.com.br'
    END as email_final

FROM GLOBUS.CTR_CADASTRODEUSUARIOS u
LEFT JOIN GLOBUS.CPG_PARAM_LIB_PAG p ON p.USUARIO = u.USUARIO
LEFT JOIN GLOBUS.CPG_PARAM_LIB_PAG_TPDESP pt ON pt.USUARIO = u.USUARIO
LEFT JOIN (
SELECT
USUARIO_LIBEROU_PAGTO as USUARIO,
COUNT(_) as total
FROM GLOBUS.CPGDOCTO
WHERE USUARIO_LIBEROU_PAGTO IS NOT NULL
GROUP BY USUARIO_LIBEROU_PAGTO
) aprovacoes ON aprovacoes.USUARIO = u.USUARIO
LEFT JOIN (
SELECT
USUARIO_LIB_PAGTO_APROVE_ME as USUARIO,
COUNT(_) as total_aproveme
FROM GLOBUS.CPGDOCTO
WHERE USUARIO_LIB_PAGTO_APROVE_ME IS NOT NULL
GROUP BY USUARIO_LIB_PAGTO_APROVE_ME
) aproveme ON aproveme.USUARIO = u.USUARIO
LEFT JOIN (
SELECT
USUARIO,
COUNT(\*) as total
FROM GLOBUS.CPGDOCTO
GROUP BY USUARIO
) solicitacoes ON solicitacoes.USUARIO = u.USUARIO

WHERE u.ATIVO = 'S'
AND (p.USUARIO IS NOT NULL
OR pt.USUARIO IS NOT NULL
OR aprovacoes.total > 0
OR solicitacoes.total > 0)

ORDER BY
COALESCE(aprovacoes.total, 0) DESC,
COALESCE(solicitacoes.total, 0) DESC;

-- ############################################################################
-- 7. CONSULTA PARA DETALHES COMPLETOS DE UM DOCUMENTO
-- ############################################################################

-- 7.1. Buscar todos os dados de um documento específico
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
SELECT
CODDOCTOCPG,
MAX(VLR_BRUTO) as VLR_BRUTO
FROM GLOBUS.CPGDOCTO_HISTORICO_NEGOCIACOES
WHERE VLR_BRUTO > 0
GROUP BY CODDOCTOCPG
) h ON h.CODDOCTOCPG = c.CODDOCTOCPG
LEFT JOIN (
SELECT
CODDOCTOCPG,
COUNT(_) as total_anexos
FROM GLOBUS.CPGDOCTO_ANEXO
GROUP BY CODDOCTOCPG
) anexos ON anexos.CODDOCTOCPG = c.CODDOCTOCPG
LEFT JOIN (
SELECT
CODDOCTOCPG,
COUNT(_) as total_eventos
FROM GLOBUS.CPGDOCTO_HISTORICO_NEGOCIACOES
GROUP BY CODDOCTOCPG
) historico ON historico.CODDOCTOCPG = c.CODDOCTOCPG

WHERE c.CODDOCTOCPG = :payment_id;

-- ############################################################################
-- 8. CONSULTAS DE ESTATÍSTICAS E MONITORAMENTO
-- ############################################################################

-- 8.1. Estatísticas gerais por status
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

    -- Estatísticas de valor (usando histórico)
    ROUND(AVG(h.VLR_BRUTO), 2) as valor_medio,
    ROUND(SUM(h.VLR_BRUTO), 2) as valor_total

FROM GLOBUS.CPGDOCTO c
LEFT JOIN (
SELECT
CODDOCTOCPG,
MAX(VLR_BRUTO) as VLR_BRUTO
FROM GLOBUS.CPGDOCTO_HISTORICO_NEGOCIACOES
WHERE VLR_BRUTO > 0
GROUP BY CODDOCTOCPG
) h ON h.CODDOCTOCPG = c.CODDOCTOCPG

WHERE c.DATA_INCLUSAO >= TRUNC(SYSDATE) - 90 -- Últimos 90 dias
GROUP BY c.STATUSDOCTOCPG
ORDER BY quantidade DESC;

-- ############################################################################
-- PARÂMETROS RECOMENDADOS PARA EXECUÇÃO:
-- ############################################################################

/\*
PARÂMETROS SUGERIDOS:

:dias_retroativos = 90 (sincronização inicial)
:dias_retroativos = 1 (sincronização incremental diária)
:payment_id = ID específico do documento

STATUS CONFIRMADOS:

- N = NEW (30,83%) - Documentos novos
- B = PENDING/BLOCKED (62,71%) - Aguardando aprovação
- C = CANCELLED (6,46%) - Cancelados

FLUXO DE PAGAMENTO:

- QUITADODOCTOCPG: S=Pago (53,2%), N=Não Pago (46,8%)
- PAGAMENTOLIBERADO: S=Liberado (58,34%), N=Não Liberado (41,66%)

VALOR TOTAL:

- Prioridade 1: VLR_BRUTO do histórico
- Prioridade 2: Soma do VALORITEMDOC da CPGITDOC
- Backup: VLR_ORIGINAL da CPGDOCTO

RELACIONAMENTOS 100% FUNCIONAIS:

- CPGDOCTO → BGM_FORNECEDOR (via CODIGOFORN)
- CPGDOCTO → CTR_CADASTRODEUSUARIOS (via USUARIO)
- CPGDOCTO → CPGDOCTO_HISTORICO_NEGOCIACOES (via CODDOCTOCPG)
- CPGDOCTO → CPGDOCTO_ANEXO (via CODDOCTOCPG)
  \*/
