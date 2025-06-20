-- ============================================================================
-- CHECKLIST COMPLETO - CAPTURA DE DADOS ORACLE + AUTENTICAÇÃO PRÓPRIA
-- Status: O que já temos ✅ | O que falta ❓ | Próximos passos 🚀
-- ============================================================================

-- ############################################################################
-- 1. DADOS DE REQUISIÇÕES DE PAGAMENTO
-- ############################################################################

/\*
=== STATUS: ✅ COMPLETO ===

O QUE JÁ TEMOS:
✅ Consulta principal com todos os dados necessários
✅ Mapeamento completo BGM_APROVEME ↔ CPGDOCTO ↔ CTR_CADASTRODEUSUARIOS
✅ Solicitante identificado (CPGDOCTO.USUARIO)
✅ Favorecido mapeado (dados_adicionais.Fornecedor)
✅ Status de aprovação (A/R/NULL)
✅ Dados adicionais (documento, vencimento, observações)
✅ ID_EXTERNO para sincronização incremental
✅ Consultas para requisições pendentes
✅ Consultas para mudanças de status

CAMPOS MAPEADOS:

- erp_payment_id: BGM_APROVEME.IDAPROVEME
- erp_external_id: BGM_APROVEME.ID_EXTERNO
- solicitante_username: CPGDOCTO.USUARIO
- nome_solicitante: CTR_CADASTRODEUSUARIOS.NOMEUSUARIO
- email_solicitante: CTR_CADASTRODEUSUARIOS.EMAIL
- nome_favorecido: dados_adicionais.Fornecedor
- valor_total: BGM_APROVEME.VALOR
- status_erp: BGM_APROVEME.STATUS_APROVACAO
- data_criacao: BGM_APROVEME.DATA
- numero_requisicao: BGM_APROVEME.REQUISICAO
- justificativa_rejeicao: BGM_APROVEME.JUSTIFICATIVAREPROVACAO
- usuario_aprovador_erp: BGM_APROVEME.USUARIO_APROVADOR
- data_aprovacao_erp: BGM_APROVEME.DATA_APROVACAO
- numero_documento: dados_adicionais.Documento
- data_vencimento: dados_adicionais.Vencimento
- observacoes: dados_adicionais.Observação

RESULTADO: 100% MAPEADO ✅
\*/

-- ############################################################################
-- 2. DADOS DE USUÁRIOS
-- ############################################################################

/\*
=== STATUS: ✅ COMPLETO ===

O QUE JÁ TEMOS:
✅ Consulta para mapear usuários do ERP
✅ Classificação automática (SOLICITANTE/APROVADOR)
✅ Sugestão de papel (REQUESTER/DIRECTOR)
✅ Estatísticas de uso (solicitações/aprovações)
✅ Dados pessoais (nome, email, ativo)
✅ ID_EXTERNO para rastreabilidade

RESULTADOS DA CONSULTA DE USUÁRIOS:

- 41 usuários identificados
- 6 DIRECTORS identificados (LUZIA, ARACI, JOAOFILHO, ISRAELFERREIRA, JAYANNE, DANTAS, MARCELO, IVO, CARDOSO, LUCASFORESTI, CRISTIANECF, VICTOR, BALSANULFO, AURISTELA)
- 35 REQUESTERS identificados
- Emails mapeados para maioria dos usuários

CAMPOS MAPEADOS:

- erp_username: CTR_CADASTRODEUSUARIOS.USUARIO
- nome_completo: CTR_CADASTRODEUSUARIOS.NOMEUSUARIO
- email: CTR_CADASTRODEUSUARIOS.EMAIL
- ativo_erp: CTR_CADASTRODEUSUARIOS.ATIVO
- id_externo_usuario: CTR_CADASTRODEUSUARIOS.ID_EXTERNO
- tipo_usuario: SOLICITANTE/APROVADOR (calculado)
- papel_sugerido: REQUESTER/DIRECTOR (calculado)
- total_solicitacoes: (calculado)
- total_aprovacoes: (calculado)

RESULTADO: 100% MAPEADO ✅
\*/

-- ############################################################################
-- 3. SISTEMA DE SINCRONIZAÇÃO
-- ############################################################################

/\*
=== STATUS: ✅ COMPLETO (DESIGN) ===

O QUE JÁ TEMOS:
✅ Estratégia de sincronização incremental
✅ Uso do ID_EXTERNO para evitar duplicações
✅ Consultas para novos registros
✅ Consultas para mudanças de status
✅ Algoritmo de sincronização definido
✅ Estrutura de controle de sincronização

CONSULTAS PRONTAS:

- Sincronização completa inicial
- Sincronização incremental
- Detecção de mudanças de status
- Histórico por favorecido
- Estatísticas e monitoramento

RESULTADO: 100% PLANEJADO ✅
\*/

-- ############################################################################
-- 4. O QUE FALTA - IMPLEMENTAÇÃO TÉCNICA
-- ############################################################################

/\*
=== STATUS: ❓ FALTA IMPLEMENTAR ===

4.1. ESTRUTURA DO BANCO DE DADOS (PostgreSQL)
❓ Criar tabelas no nosso sistema
❓ Definir relacionamentos
❓ Criar índices para performance
❓ Setup de migração do Prisma para TypeORM

4.2. CONEXÃO COM ORACLE
❓ Configurar TypeORM para Oracle
❓ Setup de credenciais e connection string
❓ Testar conectividade
❓ Configurar pool de conexões

4.3. ENTITIES E REPOSITORIES (TypeORM)
❓ Criar entities para Payment, User, Comment, etc.
❓ Implementar repositories
❓ Mapear relacionamentos
❓ Configurar migrations

4.4. SERVICES DE SINCRONIZAÇÃO
❓ Implementar ERPSyncService
❓ Jobs de sincronização automática
❓ Tratamento de erros
❓ Logging e monitoramento

4.5. SISTEMA DE USUÁRIOS E AUTENTICAÇÃO
❓ CRÍTICO: Estrutura de usuários
❓ CRÍTICO: Mapeamento ERP ↔ Nossa aplicação
❓ CRÍTICO: Autenticação JWT
❓ CRÍTICO: Autorização por papel
\*/

-- ############################################################################
-- 5. QUESTÕES CRÍTICAS PARA USUÁRIOS (AUTENTICAÇÃO PRÓPRIA)
-- ############################################################################

-- 5.1. Estrutura proposta para tabela de usuários
/\*
CREATE TABLE users (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Dados básicos de autenticação
    username VARCHAR(50) UNIQUE NOT NULL,           -- Nosso username (pode ser igual ao ERP)
    password_hash VARCHAR(255) NOT NULL,            -- Hash bcrypt da senha
    email VARCHAR(100),                             -- Email do usuário
    name VARCHAR(100) NOT NULL,                     -- Nome completo

    -- Autorização
    role VARCHAR(20) NOT NULL DEFAULT 'REQUESTER', -- REQUESTER, DIRECTOR, ADMIN
    active BOOLEAN DEFAULT true,                    -- Ativo no nosso sistema

    -- Ligação com ERP
    erp_username VARCHAR(15) UNIQUE,                -- Username no ERP (GLOBUS.USUARIO)
    erp_id_externo VARCHAR(50),                     -- ID_EXTERNO do ERP
    erp_active BOOLEAN,                             -- Status no ERP

    -- Dados sincronizados do ERP
    erp_total_requests INTEGER DEFAULT 0,           -- Total de solicitações no ERP
    erp_total_approvals INTEGER DEFAULT 0,          -- Total de aprovações no ERP

    -- Controle
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP,
    last_erp_sync TIMESTAMP,

    -- Índices
    INDEX idx_users_username (username),
    INDEX idx_users_erp_username (erp_username),
    INDEX idx_users_role (role),
    INDEX idx_users_active (active)

);

QUESTÕES A DECIDIR:
❓ Username no nosso sistema = username do ERP? (recomendado: SIM)
❓ Como gerar senhas iniciais? (sugestão: email + reset obrigatório)
❓ Quem pode ser ADMIN? (sugestão: poucos usuários específicos)
❓ Como sincronizar mudanças de papel? (automático ou manual?)
\*/

-- 5.2. Consulta para criar usuários iniciais
SELECT
cad.USUARIO as erp_username,
cad.USUARIO as username_sugerido, -- Usar o mesmo username
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

-- ############################################################################
-- 6. PRÓXIMOS PASSOS PRIORITÁRIOS
-- ############################################################################

/\*
=== ROADMAP DE IMPLEMENTAÇÃO ===

FASE 1: SETUP TÉCNICO (1-2 semanas)
🚀 1. Configurar TypeORM com Oracle + PostgreSQL
🚀 2. Migrar schema do Prisma para TypeORM
🚀 3. Criar entities básicas (User, Payment)
🚀 4. Testar conectividade com Oracle

FASE 2: SINCRONIZAÇÃO BÁSICA (1 semana)
🚀 5. Implementar ERPSyncService básico
🚀 6. Sincronização inicial de usuários (consulta 5.2)
🚀 7. Sincronização inicial de requisições
🚀 8. Testes de sincronização

FASE 3: AUTENTICAÇÃO E USUÁRIOS (1 semana)
🚀 9. Sistema de autenticação JWT
🚀 10. CRUD de usuários
🚀 11. Autorização por papel (REQUESTER/DIRECTOR)
🚀 12. Reset de senhas

FASE 4: FUNCIONALIDADES DO APP (2 semanas)
🚀 13. Endpoints para listar requisições
🚀 14. Endpoints para aprovar/rejeitar
🚀 15. Sistema de comentários
🚀 16. Fluxo de aprovação customizado

FASE 5: SINCRONIZAÇÃO AVANÇADA (1 semana)
🚀 17. Sincronização incremental automática
🚀 18. Jobs de background
🚀 19. Monitoramento e logs
🚀 20. Tratamento de erros

FASE 6: REFINAMENTOS (1 semana)
🚀 21. Performance optimization
🚀 22. Testes de integração
🚀 23. Deploy e produção
🚀 24. Documentação
\*/

-- ############################################################################
-- 7. DECISÕES CRÍTICAS PENDENTES
-- ############################################################################

/\*
=== DECISÕES QUE VOCÊ PRECISA TOMAR AGORA ===

1. USERNAMES NO NOSSO SISTEMA:
   RECOMENDAÇÃO: Usar os mesmos usernames do ERP (LUZIA, JOAOFILHO, etc.)
   VANTAGEM: Facilita mapeamento e não confunde usuários
   ❓ DECISÃO: Concorda com essa abordagem?

2. EMAILS FALTANTES:
   PROBLEMA: Alguns usuários não têm email no ERP
   RECOMENDAÇÃO: Gerar emails padrão (username@vpioneira.com.br)
   ❓ DECISÃO: Qual domínio usar para emails automáticos?

3. SENHAS INICIAIS:
   RECOMENDAÇÃO: Senha temporária + reset obrigatório no primeiro login
   OPÇÕES:

   - A: Senha fixa "temp123" para todos
   - B: Última parte do CPF + ano atual
   - C: Email para cada usuário com link de criação de senha
     ❓ DECISÃO: Qual estratégia para senhas iniciais?

4. PAPEL DE ADMIN:
   RECOMENDAÇÃO: Poucos usuários específicos
   SUGESTÃO: LUZIA, JOAOFILHO (maiores volumes de transações)
   ❓ DECISÃO: Quem deve ser ADMIN inicial?

5. SINCRONIZAÇÃO DE PAPÉIS:
   PROBLEMA: E se alguém se tornar aprovador no ERP?
   OPÇÕES:

   - A: Automático (verifica a cada sincronização)
   - B: Manual (admin atualiza no nosso sistema)
     ❓ DECISÃO: Sincronização automática de papéis?

6. DEPARTAMENTO/SETOR:
   FALTA: Não identificamos departamentos dos usuários
   IMPACTO: Pode afetar fluxos de aprovação
   ❓ DECISÃO: Precisamos implementar departamentos agora ou depois?
   \*/

-- ############################################################################
-- 8. CHECKLIST FINAL
-- ############################################################################

/\*
=== DADOS DO ORACLE ===
✅ Requisições de pagamento - 100% mapeado
✅ Usuários e aprovadores - 100% mapeado  
✅ Relacionamentos - 100% mapeado
✅ Sincronização incremental - 100% planejado
✅ Consultas de negócio - 100% prontas

=== IMPLEMENTAÇÃO TÉCNICA ===
❓ Setup TypeORM + Oracle
❓ Migração Prisma → TypeORM
❓ Entities e Repositories
❓ Services de sincronização
❓ Sistema de autenticação
❓ CRUD de usuários
❓ Jobs de background

=== DECISÕES PENDENTES ===
❓ Estratégia de usernames
❓ Geração de emails faltantes
❓ Senhas iniciais
❓ Usuários ADMIN
❓ Sincronização de papéis
❓ Mapeamento de departamentos

CONCLUSÃO:
Dados 100% mapeados ✅
Implementação técnica 0% ❓
Decisões críticas pendentes ❓

PRONTO PARA COMEÇAR A IMPLEMENTAÇÃO ASSIM QUE AS DECISÕES FOREM TOMADAS! 🚀
\*/
