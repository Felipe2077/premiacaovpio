Roadmap Detalhado do Projeto: Sistema de Gestão da Premiação (V1)
(Data: 18 de Maio de 2025)
Visão Geral do Progresso: O núcleo do backend para ETL e cálculo da premiação está funcional, e a tela pública exibe os resultados. As funcionalidades administrativas do backend (gestão de ciclos, metas e expurgos) também estão prontas. O foco principal agora é a implementação e conexão das interfaces administrativas no frontend e, em seguida, a camada de autenticação e segurança.
Estimativa de Progresso Geral (Rumo à V1 Funcional): ~65-70%
(Avançamos muito no backend e na funcionalidade principal. O frontend admin é o próximo grande bloco.)
Fases do Projeto:
FASE 0: Configuração Inicial e Provas de Conceito
Status: ✅ 100% Concluída
Subfases:
✅ Definição da stack tecnológica (Node.js, Fastify, TypeORM, Next.js, React, Tailwind, Shadcn UI, PostgreSQL).
✅ Configuração do Monorepo (PNPM Workspaces, Turborepo).
✅ Conexão inicial com bancos de dados legados (Oracle, MySQL).
✅ Prova de conceito para extração de dados simples.
✅ Configuração do ambiente de desenvolvimento Docker para PostgreSQL.

FASE 1: Backend - API e Serviços Base
Status: ✅ 100% Concluída
Subfases:
✅ Estrutura da API com Fastify e TypeScript.
✅ Definição das entidades TypeORM principais (Users, Roles, Sectors, Criteria, CompetitionPeriods, ParameterValues, ExpurgoEvents, AuditLogs, PerformanceData, CriterionScores, FinalRankings).
✅ Implementação do AppDataSource e sincronização inicial do schema.
✅ Script de Seed (seed.ts) para popular o banco com dados mock.
✅ Implementação do CompetitionPeriodService (métodos de busca GET).
✅ Endpoints API GET para CompetitionPeriods.

FASE 2: Frontend - UI Conceitual e Telas Públicas Iniciais
Status: ✅ 100% Concluída
Subfases:
✅ Estrutura do projeto Next.js com App Router.
✅ Configuração de Tailwind CSS e Shadcn UI.
✅ Desenvolvimento das telas públicas conceituais (Ranking, Detalhes) com dados mock.
✅ Desenvolvimento das telas administrativas conceituais (/admin/parameters, /admin/expurgos, etc.) com dados mock.
✅ Implementação inicial do FilterControls e tabelas de exibição (RankingTable, PerformanceTable, PointsTable).

FASE 3: Esclarecimento e Definição de Requisitos de Negócio (Detalhado)
Status: ✅ ~99% Concluída
Subfases/Pendências:
✅ Definição da maioria das fontes de dados e queries de referência do Power BI.
✅ Definição das regras de cálculo para a maioria dos critérios.
✅ Definição da regra "FALTA FUNC <= 10" (pontuação 1.0).
✅ Definição da regra "Meta Zero, Realizado Zero" (pontuação 1.0 para "MENOR é melhor").
✅ Confirmação de que não há "Escala Invertida" para pontuação.
🟡 Pendente: Regra de Desempate para o Ranking Geral (Diretor decide na V1, sistema mostra empate).
🟡 Pendente (Baixa Prioridade): Query MySQL exata ou CODOCORRENCIA para "FALTA FROTA" (atualmente tratado como 0 no ETL).

FASE 4: Implementação ETL Completo (Extração, Transformação e Carga)
Status: ✅ CONCLUÍDA E VALIDADA!
Subfases:
4.1 Extração para Tabelas Raw:
✅ Implementação do MySqlEtlService para Quebra, Defeito, Atraso, Furo por Atraso, Furo de Viagem (salvando em raw_mysql_...).
✅ Implementação do OracleEtlService para Ausências, Colisão, Peças, Pneus, Desempenho Frota (KM/L, Litros), KM Ociosa (Componentes), IPK (Calculado) (salvando em raw_oracle_...).
✅ Script run-full-raw-etl-[MES].ts para orquestrar a carga raw.
4.2 Transformação e Carga na performance_data:
✅ Implementação do EtlService (orquestrador).
✅ Método processAndLoadPerformanceDataForPeriod que lê das tabelas raw_....
✅ Lógica para buscar metas da parameter_values (considerando vigência).
✅ Lógica inicial para buscar e aplicar expurgos da expurgo_events.
✅ Cálculo do valorRealizadoFinal para cada critério/setor.
✅ Cálculo do percentual final da KM Ociosa (usando componentes e expurgo).
✅ Salvamento dos dados processados na tabela performance_data.
✅ Teste e validação do fluxo para um período completo (Maio/2025).

FASE 5: Implementação Cálculo Real da Premiação (Backend)
Status: ✅ CONCLUÍDO E VALIDADO!
Subfases:
✅ Implementação do RankingService (ou CalculationService) com o método calculateAllResults.
✅ Lógica para ler da performance_data.
✅ Cálculo do % vs Meta (ou razão) com precisão adequada e tratamento de Meta Zero.
✅ Ranking por critério (considerando sentido_melhor e empates).
✅ Atribuição de pontos por critério (escala padrão 1.0-2.5, regra "FALTA FUNC <= 10", regra "Meta Zero, Realizado Zero").
✅ Cálculo da Pontuação Total por setor.
✅ Geração do Ranking Geral (considerando empates na pontuação).
✅ Salvamento dos resultados nas tabelas criterion_scores e final_rankings.
✅ Endpoints API (/api/ranking e /api/results) servindo dados dinâmicos por período.
✅ Teste e validação do fluxo para um período completo (Maio/2025).
🟡 Pendente (Ajuste Fino): Remover o "hardcode" do período no RankingService.calculateAllResults (se ainda existir) e garantir que ele use o parâmetro periodMesAno ou o período 'ATIVA' dinamicamente para todas as buscas.

FASE 6: Implementação Admin Funcional (Backend APIs + Frontend Real)
Status: 🟡 Em Andamento
Subfases - Backend APIs (Concluídas):
✅ CompetitionPeriodService: Endpoints GET para listar e POST para Iniciar/Fechar períodos.
✅ ParameterService: Endpoints CRUD (GET, POST, PUT versionado, DELETE lógico) para Gestão de Metas.
✅ ExpurgoService: Endpoints CRUD (GET, POST /request, POST /:id/approve, POST /:id/reject) para Gestão de Expurgos.
Subfases - Frontend Admin (apps/web/src/app/admin/):
🟡Gestão de Metas (/admin/parameters):
🟡 Listagem de metas com seletor de período dinâmico.
✅ Modal e formulário (ParameterForm) para Criação de novas metas.
✅ Modal e formulário (ParameterForm) para Edição de metas (com versionamento).
🟡 Modal e lógica para Visualização do Histórico de alterações de metas.
🟡  Gestão de Expurgos (/admin/expurgos):
Criar a página /admin/expurgos/page.tsx.
Desenvolver o hook useExpurgos.ts (com useQuery para listar, useMutation para solicitar, aprovar, rejeitar).
Implementar a tabela de listagem de expurgos com filtros (período, status, etc.).
Implementar modal com formulário para "Solicitar Novo Expurgo".
Implementar modais/ações para "Aprovar Expurgo" e "Rejeitar Expurgo" (coletando justificativa).

⏳ DEPOIS: UI para Gestão de Ciclos de Premiação:
Criar uma seção na Visão Geral do Admin (/admin/page.tsx) ou uma nova página /admin/periods-management.
Listar os períodos de competição.
Adicionar botões "Iniciar Período" (para status 'PLANEJAMENTO').
Adicionar botões "Fechar Período" (para status 'ATIVA', o que dispara o cálculo).
(Opcional V1) Formulário para criar/editar períodos em 'PLANEJAMENTO'.
FASE X: Melhoria da UI/UX da Tela Pública de Resultados
Status: 🟡 Em Pausa (Conforme seu último feedback, o foco mudou para o admin).
Trabalho Pendente (Quando Retomar):
Analisar e refatorar as tabelas "Desempenho vs Meta" e "Desempenho Detalhado por Critério" para evitar scroll horizontal e melhorar a legibilidade.

FASE 7: Implementação de Autenticação e RBAC (Role-Based Access Control)
Status: ⏳ Não Iniciada
Subfases:
Definição final de Perfis (Admin/Diretor, Gerente, Visualizador) e suas permissões.
Escolha da estratégia de autenticação (ex: JWT com cookies httpOnly).
Implementação de endpoints de login/logout na API.
Middleware de proteção de rotas na API.
Controle de acesso no frontend (ex: proteger rotas /admin, mostrar/ocultar botões de ação).

FASE 8: Testes Finais e Preparação para Demonstração/Produção
Status: ⏳ Não Iniciada
Subfases:
Criação de um plano de testes abrangente.
Testes de integração end-to-end.
Testes de usabilidade com usuários chave.
Correção de bugs finais.
Revisão da documentação.
Preparação do script e ambiente para a demonstração.
(Pós-Demo) Configuração de ambiente de produção e deploy.
Este roadmap mais detalhado deve ajudar a visualizar claramente o que já conquistamos e quais são os próximos passos concretos. O progresso é excelente!
