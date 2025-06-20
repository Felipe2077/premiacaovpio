**Documento de Especificação Técnica – V1.9Novo Sistema de Gestão da Premiação por Desempenho de Filiais**

**Data:** 07 de Maio de 2025 (Quarta-feira)
**Local:** Valparaíso de Goiás, GO

**1. Introdução**

O presente documento detalha a abordagem técnica e as especificações funcionais para o desenvolvimento do novo Sistema de Gestão da Premiação por Desempenho de Filiais. O sistema visa substituir a solução atual baseada em Power BI, endereçando requisitos críticos de transparência, segurança, flexibilidade controlada, rastreabilidade e auditabilidade. O objetivo é criar uma plataforma web robusta, confiável e auditável para gerenciar todo o ciclo da premiação, desde a definição de regras até a apuração e visualização dos resultados, servindo como a fonte única da verdade para a premiação.

**2. Arquitetura Geral**

- **Modelo:** Aplicação Web Monorepo.
- **Estrutura:** Monorepo gerenciado com **Turborepo** e **pnpm workspace**, contendo:
  - `apps/api`: Backend Node.js com Fastify, TypeORM, TypeScript. Responsável pela API REST, lógica de negócio, cálculo da premiação e acesso aos bancos de dados.
  - `apps/web`: Frontend React com Next.js (App Router), TypeScript, Tailwind CSS, Shadcn UI, Zustand (ou outro para estado global se necessário), React Query (TanStack Query), Zod (para validação). Responsável pela interface do usuário pública e administrativa.
  - `packages/shared-types`: Tipos TypeScript compartilhados entre frontend e backend (DTOs, Interfaces, Enums).
  - `packages/typescript-config`, `packages/eslint-config`: Configurações compartilhadas.
- **Persistência:**
  - **PostgreSQL (Principal):** Banco de dados primário do sistema. Armazenará:
    - Dados de Configuração: `users`, `roles`, `user_roles`, `sectors`, `criteria`, `parameter_values` (metas versionadas), `competition_periods`.
    - Dados Brutos/Staging (Pós-ETL): **Novas tabelas específicas** para cada tipo de dado extraído do Oracle/MySQL antes da transformação final (ex: `raw_oracle_ausencias`, `raw_mysql_quebras_defeitos`, `raw_oracle_ipk_components`). Isso garante a retenção dos dados conforme extraídos e permite recálculos ou auditoria na fonte.
    - Dados de Desempenho Consolidados: `performance_data` (com `valorRealizado` final pós-expurgo e `valorMeta` aplicado, otimizada para cálculo e front).
    - Resultados e Logs: `final_rankings` (ranking oficial do período), `audit_logs`, `expurgo_events`.
    - Gerenciado via Docker em desenvolvimento.
  - **Oracle (Fonte ERP):** Banco de dados legado (ERP Globus?) de onde a maioria dos dados operacionais brutos será extraída via ETL (KM, Passageiros, Custos, RH, Ocorrências, etc.). Requer Instant Client e conexão via `node-oracledb`. **Dependência crítica de funções customizadas `GLOBUS.FC_ARR...`**.
  - **MySQL (Fonte Legada):** Banco de dados legado (`negocioperfeito`) de onde dados específicos (Quebra, Defeito, Furo por Viagem, Falta Frota) serão extraídos via ETL. Requer driver `mysql2`.
- **Cache:** Redis (Opcional V1, recomendado para V2) para cache de parâmetros, resultados calculados, sessões de usuário.
- **Hospedagem:** Servidor próprio da empresa (requisito de infraestrutura interna).

**3. Princípios de Design**

- **Segurança por Design:** Mecanismos de controle de acesso robusto (RBAC), validação de entrada/saída (Zod), proteção contra alterações não autorizadas serão implementados desde o início.
- **Transparência Radical:** Todas as regras (parâmetros), cálculos (lógica documentada), dados brutos (nas tabelas de staging) e histórico de ações visíveis e acessíveis a usuários autorizados.
- **Flexibilidade Parametrizada:** Regras de negócio configuráveis via interface administrativa, com versionamento e justificativa obrigatória.
- **Auditabilidade Completa:** Trilha de auditoria detalhada e imutável (idealmente) para todas as ações críticas (mudanças de parâmetros, expurgos, logins, cálculos, ETL). Inclui auditoria de exceções (Expurgos).
- **Abstração Elevada e Separação de Responsabilidades (Mantra):** Design de código modular, componentes focados, baixo acoplamento em todas as camadas (Frontend, Backend, ETL), evitando arquivos e componentes monolíticos.

**4. Funcionalidades Principais (Versão 1 Final)**

**4.1. Gestão de Parâmetros e Metas:**

- **Interface Dedicada (`/admin/parameters`):** Tela para Diretores gerenciarem metas para cada critério/filial, por período.
- **Contexto por Período:** Operação baseada em um **Período de Premiação** selecionável (Mês/Ano).
- **Acompanhamento de Definição de Metas:** **Cards de Progresso** (um por filial) exibem "X de 15 metas definidas" para o período em planejamento, com barra de progresso e detalhamento de pendências.
- **Ativação do Ciclo:** Botão "Iniciar Premiação" habilitado se todas as metas estiverem definidas, mudando o status do período para 'ATIVA'.
- **Visualização de Parâmetros Definidos:** Tabela em lista com Nome, Valor, Critério (Nome), Setor (Nome), Vigências, Status, Justificativa (Tooltip), Ícone de Histórico. Filtros funcionais.
- **Criação/Edição de Metas (Modal Interativo):** Formulário para Valor, Critério, Setor, Início Vigência, Justificativa. Exibe seção de **Contexto Histórico** (mini-tabela/gráfico com desempenho passado do Setor/Critério, via API `/api/performance/history` que lê das tabelas `raw_...` ou `performance_data` históricas). Salvar executa API (`POST/PUT /api/parameters`) com versionamento e auditoria.
- **Visualização de Histórico do Parâmetro (Modal):** Exibe tabela com histórico de versões do parâmetro (Valor Antigo, Novo, Datas, Usuário, Justificativa), via API.

**4.2. Cálculo e Apuração de Resultados:**

- **Processo de ETL:**
  - **Extração:** `OracleEtlService` e `MySqlEtlService` conectam às fontes, executam queries (incluindo funções customizadas Oracle) e buscam dados brutos/semi-agregados.
  - **Carga em Staging:** Os dados extraídos são salvos em **tabelas `raw_...` específicas** no Postgres.
  - **Transformação e Carga Final:** Um processo (no `EtlService` ou `CalculationService`) lê das tabelas `raw_...`, busca Expurgos Aprovados (`expurgo_events`), busca Metas Vigentes (`parameter_values`), aplica os expurgos aos dados brutos, e salva o `valorRealizado` (pós-expurgo) e `valorMeta` na tabela `performance_data`, consolidado na granularidade necessária (ex: mensal por filial/critério).
  - **Incremental:** Lógica para buscar apenas dados novos/alterados.
  - **Logs ETL:** Registro detalhado do processo.
- **Motor de Cálculo (`RankingService` ou `CalculationService`):**
  - Disparado para um período 'ATIVO'.
  - Lê `performance_data` (com `valorRealizado` pós-expurgo e `valorMeta`) e `criteria` (com `sentido_melhor`).
  - Aplica fórmula **`Razão = Realizado / Meta`** (com tratamento para Meta=0 e Nulos=0).
  - Aplica **Regras Especiais** (Falta Func <= 10; Escala Invertida - pendente confirmação).
  - **Rankeia** filiais por critério (com desempate pendente).
  - **Calcula Pontos** (escala padrão 1.0->2.5; invertida se aplicável).
  - **Calcula Pontuação Geral** (soma simples V1).
  - Gera e salva **Ranking Final** (`final_rankings`).
  - Registra log de auditoria.

**4.3. Visualização e Relatórios:**

- **4.3.1. Tela Pública (`/` - Visão B Refinada):** Exibe Ranking Final, Tabela de Pontuação Detalhada (com cores/tooltips), Tabela de Desempenho vs Meta (com Valor/Meta/% e barra de progresso). _(Futuro)_ "Dias Restantes", "Confete".
- **4.3.2. Área Restrita (Gerencial/Admin):** Layout com `AdminSidebar`. Página Visão Geral (`/admin`) com Saudação (Nome/Perfil) e Cards de Resumo (Stats do período). Páginas dedicadas (`/admin/parameters`, `/admin/audit-logs`, `/admin/expurgos`).
- **4.3.3. Diretrizes e Melhorias para Interface do Usuário (Frontend):**
  - **Clareza e Consolidação:** Apresentação clara dos dados, evitando sobrecarga de informação. As duas tabelas detalhadas na visão pública são um exemplo.
  - **Uso de Gráficos:** Incorporar gráficos para facilitar compreensão (histórico no modal de metas, ranking - Opcional V1).
  - **Clareza na Pontuação e Definições:** Acesso fácil à definição de critérios e explicação do cálculo de pontos (tooltips, legendas). Explicitar sentido da pontuação.
  - **Transparência de Expurgo:** Indicar na visualização de resultados se um valor foi afetado por expurgo aprovado (ícone/tooltip).
  - **Visibilidade de Pesos:** (Não aplicável V1). Se houver pesos futuros, devem ser visíveis.
  - **Interatividade e Drill-Down:** Filtros funcionais, ordenação, capacidade de "mergulhar" nos dados (histórico de parâmetros, detalhes de logs).
  - **Análise de Tendências:** (Futuro V2) Exibir evolução do desempenho ao longo do tempo.
  - **Loading/Error States:** Uso de `Skeleton` e `Alert` (Shadcn) em todas as páginas.

**4.4. Logging e Histórico ("Eventos do Sistema"):**

- **Trilha de Auditoria:** Tabela `audit_logs` com Quem, O quê, Quando, Por Quê, Detalhes (JSONB com `valorAntigo`/`valorNovo`).
- **Tela de Consulta (`/admin/audit-logs`):** Tabela paginada/filtrável. Modal de Detalhes exibe info completa do log, formatando `valorAntigo`/`valorNovo`.

**4.5. Gestão de Acesso (Perfis e Permissões):**

- **Autenticação:** Login seguro (JWT).
- **Perfis (RBAC):** `Diretor` (total), `Gerente de Filial` (view all, request expurgo p/ sua filial, ligado a `setorId`), `Visualizador` (view all).
- **Controle:** Na API (middlewares) e UI (condicional).

**4.6. Gestão de Expurgos (Eventos Excepcionais):**

- **Critérios Elegíveis:** Quebra, Defeito, KM Ociosa.
- **Tela de Gestão (`/admin/expurgos`):** Tabela paginada/filtrável com todos os detalhes do expurgo, incluindo `status` (Badge Colorido), Justificativas (Solicitação e Decisão com Tooltip).
- **Ações Condicionais:** Botão "+ Registrar" (Gerente/Diretor). Botões "Aprovar"/"Rejeitar" (habilitados para Diretor em status 'PENDENTE', acionam modal para `justificativaAprovacao`).
- **Modal de Registro:** Formulário para Filial, Critério, Data, Descrição, Justificativa Solicitação. Salvar chama API (`POST /api/expurgos/request`).
- **Impacto no Cálculo:** Subtração do valor expurgado do `valorRealizado` bruto (da tabela `raw_...`) antes da comparação com a meta.

**7. Design do Banco de Dados (PostgreSQL) - Estrutura Revisada**

- **Entidades Principais:** `users` (add `setorId?`), `roles`, `user_roles`, `sectors`, `criteria`, `parameter_values` (versionada, fonte das metas), `audit_logs`, `expurgo_events` (com `solicitadoPorUserId`, `justificativaSolicitacao`, `aprovadoPorUserId?`, `justificativaAprovacao?`, `status` ENUM, `valorAjuste?`), `CompetitionPeriodEntity` (`id`, `mesAno` TEXT 'YYYY-MM', `status` TEXT ENUM('PLANEJAMENTO', 'ATIVA', 'FECHADA'), `dataInicio` DATE, `dataFim` DATE, `fechadaPorUserId?`, `fechadaEm?`).
- **Novas Tabelas de Staging (Raw Data):** Entidades específicas para os dados semi-agregados vindos do ETL de cada fonte antes da aplicação de expurgos e transformação final (ex: `RawOracleAusenciaEntity`, `RawMySqlQuebraDefeitoEntity`, `RawOracleIpkComponentsEntity`, etc.). Essas tabelas conterão `SETOR` (nome ou código mapeável), `DATA_EVENTO` (diária), `VALOR_BRUTO`, e colunas específicas do critério.
- **Tabela de Performance Final:** `performance_data` (contém `periodId`, `sectorId`, `criterionId`, `metricDate` (mês), `valorRealizadoFinal` (pós-expurgo), `valorMetaAplicada`).
- **Tabela de Ranking:** `final_rankings` (contém `periodId`, `sectorId`, `pontuacaoTotal`, `posicaoRanking`).

**8. Implementação da Lógica de Cálculo**

- **Local:** Backend (`CalculationService`).
- **Inputs:** Dados das tabelas `raw_...` (staging), `parameter_values`, `expurgo_events` (aprovados), `criteria` para o período.
- **Etapas:** Ler dados brutos -> Aplicar Expurgos (ajustando valores brutos) -> Salvar/Atualizar `performance_data` com `valorRealizadoFinal` e `valorMetaAplicada` -> Calcular Razão `% vs Meta` -> Aplicar Regras Especiais -> Rankear por critério -> Calcular Pontos -> Somar Pontos -> Gerar Ranking Final -> Salvar `final_rankings`.

**9. Implementação da Segurança e Auditoria**

- **Auth:** JWT.
- **RBAC:** Detalhar permissões API/UI.
- **Logging:** Completo em `audit_logs`.

**10. Requisitos Não Funcionais**

- **Performance:** UI responsiva (<2-3s). API <500ms. ETL noturno eficiente. Cálculo mensal rápido. Banco otimizado.
- **Segurança:** RBAC, Auth JWT, proteção contra vulnerabilidades web, privacidade de dados (LGPD), armazenamento seguro de credenciais.
- **Usabilidade:** Interfaces intuitivas, feedback claro (loading/erro), design consistente, ações críticas com confirmação.
- **Manutenibilidade:** Código Limpo (Mantra SoC), documentação (código, specs), design modular, guias de estilo.
- **Escalabilidade:** Arquitetura considera expansão futura (filiais, critérios, usuários). PostgreSQL escalável. ETL projetado para volume.
- **Documentação (Geral):** Especificação Funcional/Técnica, Diagrama de Arquitetura, Modelo de Dados, Documentação API (Swagger/OpenAPI), Guia de Instalação/Deploy, Guia de Usuário (Admin).
