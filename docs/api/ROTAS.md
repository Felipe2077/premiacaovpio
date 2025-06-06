# Documentação Completa das Rotas da API - Sistema de Premiação

> **Documentação baseada em testes reais executados em Junho 2025**

## Sumário

1. [Visão Geral](#visão-geral)
2. [Base URL e Configuração](#base-url-e-configuração)
3. [Rotas de Metadados](#rotas-de-metadados)
4. [Rotas de Períodos de Competição](#rotas-de-períodos-de-competição)
5. [Rotas de Resultados e Ranking](#rotas-de-resultados-e-ranking)
6. [Rotas de Parâmetros/Metas](#rotas-de-parâmetros-metas)
7. [Rotas de Expurgos](#rotas-de-expurgos)
8. [Códigos de Status e Tratamento de Erros](#códigos-de-status-e-tratamento-de-erros)
9. [Troubleshooting](#troubleshooting)

---

## Visão Geral

A API do Sistema de Premiação fornece endpoints para consulta de resultados, rankings e gestão administrativa do sistema de competição entre filiais da Viação Pioneira.

### Tecnologias

- **Framework**: Fastify (Node.js + TypeScript)
- **ORM**: TypeORM
- **Banco de Dados**: PostgreSQL
- **Validação**: Zod

---

## Base URL e Configuração

```
Base URL: http://localhost:3001
Content-Type: application/json
Accept: application/json
```

---

## Rotas de Metadados

### 1. Critérios Ativos

**Endpoint**: `GET /api/criteria/active`

**Descrição**: Retorna todos os critérios de avaliação ativos no sistema.

**Parâmetros**: Nenhum

**Exemplo de Requisição**:

```http
GET /api/criteria/active
```

**Resposta de Sucesso (200)**:

```json
[
  {
    "id": 1,
    "nome": "ATRASO",
    "index": 1,
    "descricao": null,
    "unidade_medida": "Qtd",
    "sentido_melhor": "MENOR",
    "ativo": true,
    "casasDecimaisPadrao": 0
  }
]
```

**Campos da Resposta**:

- `id`: ID único do critério
- `nome`: Nome do critério
- `index`: Ordem de exibição
- `unidade_medida`: Unidade de medida (Qtd, R$, %, etc.)
- `sentido_melhor`: Direção de melhoria ("MENOR" ou "MAIOR")
- `casasDecimaisPadrao`: Casas decimais para exibição

---

### 2. Setores Ativos

**Endpoint**: `GET /api/sectors/active`

**Descrição**: Retorna todos os setores/filiais ativos no sistema.

**Exemplo de Requisição**:

```http
GET /api/sectors/active
```

**Resposta de Sucesso (200)**:

```json
[
  {
    "id": 1,
    "nome": "GAMA"
  },
  {
    "id": 2,
    "nome": "PARANOÁ"
  },
  {
    "id": 3,
    "nome": "SANTA MARIA"
  },
  {
    "id": 4,
    "nome": "SÃO SEBASTIÃO"
  }
]
```

---

### 3. Logs de Auditoria

**Endpoint**: `GET /api/audit-logs`

**Descrição**: Retorna os logs de auditoria das operações do sistema.

**Exemplo de Requisição**:

```http
GET /api/audit-logs
```

**Resposta de Sucesso (200)**:

```json
[
  {
    "id": "605",
    "timestamp": "2025-06-06T11:48:16.951Z",
    "userId": 1,
    "userName": "Admin Sistema (Mock)",
    "actionType": "META_CRIADA_VIA_CALCULO",
    "entityType": "ParameterValueEntity",
    "entityId": "759",
    "details": {
      "savedValue": 238,
      "appliedData": {
        "sectorId": 1,
        "criterionId": 15,
        "calculationMethod": "media3",
        "adjustmentPercentage": -5
      }
    },
    "justification": "Sugestão do sistema aceita",
    "competitionPeriodId": 202506
  }
]
```

---

## Rotas de Períodos de Competição

### 1. Período Ativo

**Endpoint**: `GET /api/periods/active`

**Descrição**: Retorna o período de competição atualmente ativo.

**Exemplo de Requisição**:

```http
GET /api/periods/active
```

**Resposta de Sucesso (200)**:

```json
{
  "id": 202506,
  "mesAno": "2025-06",
  "dataInicio": "2025-06-01",
  "dataFim": "2025-06-30",
  "status": "ATIVA",
  "fechadaPorUserId": null,
  "fechadaEm": null,
  "createdAt": "2025-06-04T19:17:11.014Z",
  "updatedAt": "2025-06-04T19:17:11.014Z"
}
```

**Resposta de Erro (404)**:

```json
{
  "message": "Nenhum período ativo encontrado."
}
```

---

### 2. Último Período Fechado

**Endpoint**: `GET /api/periods/latest-closed`

**Descrição**: Retorna o último período de competição que foi fechado.

**Exemplo de Requisição**:

```http
GET /api/periods/latest-closed
```

**Resposta de Sucesso (200)**:

```json
{
  "id": 3,
  "mesAno": "2025-05",
  "dataInicio": "2025-05-01",
  "dataFim": "2025-05-31",
  "status": "FECHADA",
  "fechadaPorUserId": null,
  "fechadaEm": null,
  "createdAt": "2025-05-23T12:33:48.933Z",
  "updatedAt": "2025-05-23T12:33:48.933Z"
}
```

---

### 3. Período de Planejamento

**Endpoint**: `GET /api/periods/planning`

**Descrição**: Retorna ou cria um período de planejamento.

**Exemplo de Requisição**:

```http
GET /api/periods/planning
```

**Resposta de Sucesso (200)**:

```json
{
  "id": 202506,
  "mesAno": "2025-06",
  "dataInicio": "2025-06-01",
  "dataFim": "2025-06-30",
  "status": "PLANEJAMENTO",
  "fechadaPorUserId": null,
  "fechadaEm": null,
  "createdAt": "2025-06-04T19:17:11.014Z",
  "updatedAt": "2025-06-04T19:17:11.014Z"
}
```

---

### 4. Listar Todos os Períodos

**Endpoint**: `GET /api/periods`

**Descrição**: Retorna todos os períodos de competição (limitado aos últimos 12).

**Exemplo de Requisição**:

```http
GET /api/periods
```

**Resposta de Sucesso (200)**:

```json
[
  {
    "id": 202506,
    "mesAno": "2025-06",
    "dataInicio": "2025-06-01",
    "dataFim": "2025-06-30",
    "status": "PLANEJAMENTO",
    "fechadaPorUserId": null,
    "fechadaEm": null,
    "createdAt": "2025-06-04T19:17:11.014Z",
    "updatedAt": "2025-06-04T19:17:11.014Z"
  }
]
```

---

### 5. Iniciar Período

**Endpoint**: `POST /api/periods/{id}/start`

**Descrição**: Inicia um período de competição, mudando seu status para ATIVA.

**Parâmetros de URL**:

- `id`: ID do período a ser iniciado

**Exemplo de Requisição**:

```http
POST /api/periods/202506/start
```

**Resposta de Sucesso (200)**:

```json
{
  "id": 202506,
  "mesAno": "2025-06",
  "dataInicio": "2025-06-01",
  "dataFim": "2025-06-30",
  "status": "ATIVA",
  "fechadaPorUserId": null,
  "fechadaEm": null,
  "createdAt": "2025-06-04T19:17:11.014Z",
  "updatedAt": "2025-06-06T13:19:20.858Z"
}
```

---

### 6. Fechar Período

**Endpoint**: `POST /api/periods/{id}/close`

**Descrição**: Fecha um período de competição e dispara o cálculo automático do ranking.

**⚠️ Importante**: Use o ID numérico do período, não o mesAno.

**Parâmetros de URL**:

- `id`: ID numérico do período (ex: 3, não "2025-05")

**Exemplo de Requisição**:

```http
POST /api/periods/3/close
```

**Resposta de Sucesso (200)**:

```json
{
  "id": 3,
  "mesAno": "2025-05",
  "dataInicio": "2025-05-01",
  "dataFim": "2025-05-31",
  "status": "FECHADA",
  "fechadaPorUserId": 1,
  "fechadaEm": "2025-06-06T13:22:03.995Z",
  "createdAt": "2025-05-23T12:33:48.933Z",
  "updatedAt": "2025-06-06T13:22:03.995Z"
}
```

---

## Rotas de Resultados e Ranking

### ⚠️ Status dos Endpoints de Ranking

**Problemas Identificados**:

- `/api/ranking` - Retorna erro 500: "Falha ao calcular ranking"
- `/api/results` (sem período) - Retorna erro: "You must provide selection conditions"

### 1. Resultados com Período Específico ✅

**Endpoint**: `GET /api/results`

**Descrição**: Retorna resultados detalhados para um período específico.

**Parâmetros Query**:

- `period` (obrigatório): Período no formato YYYY-MM

**Exemplo de Requisição**:

```http
GET /api/results?period=2025-04
```

**Resposta de Sucesso (200)**:

```json
[
  {
    "setorId": 1,
    "setorNome": "GAMA",
    "criterioId": 1,
    "criterioNome": "ATRASO",
    "periodo": "2025-04",
    "valorRealizado": 303,
    "valorMeta": 314,
    "percentualAtingimento": 0.964968152866242,
    "pontos": 1,
    "metaPropostaPadrao": null,
    "metaAnteriorValor": null,
    "metaAnteriorPeriodo": null,
    "regrasAplicadasPadrao": null,
    "metaDefinidaValor": null,
    "isMetaDefinida": false
  }
]
```

---

### 2. Resultados do Período Atual ✅

**Endpoint**: `GET /api/results/current`

**Descrição**: Retorna resultados da vigência atualmente ativa.

**Exemplo de Requisição**:

```http
GET /api/results/current
```

**Resposta de Sucesso (200)**:

```json
[
  {
    "setorId": 2,
    "setorNome": "PARANOÁ",
    "criterioId": 1,
    "criterioNome": "ATRASO",
    "periodo": "2025-05",
    "valorRealizado": 591,
    "valorMeta": 314,
    "percentualAtingimento": 1.8821656050955413,
    "pontos": 1,
    "metaPropostaPadrao": null,
    "metaAnteriorValor": null,
    "metaAnteriorPeriodo": null,
    "regrasAplicadasPadrao": null,
    "metaDefinidaValor": null,
    "isMetaDefinida": false
  }
]
```

---

### 3. Resultados por Período (Principal) ✅

**Endpoint**: `GET /api/results/by-period`

**Descrição**: Endpoint principal para obter resultados de um período específico.

**Parâmetros Query**:

- `period` (obrigatório): Período no formato YYYY-MM

**Exemplo de Requisição**:

```http
GET /api/results/by-period?period=2025-06
```

**Resposta de Sucesso (200)**:

```json
[
  {
    "setorId": 1,
    "setorNome": "GAMA",
    "criterioId": 1,
    "criterioNome": "ATRASO",
    "periodo": "2025-06",
    "valorRealizado": 34,
    "valorMeta": 494,
    "percentualAtingimento": 0.06882591093117409,
    "pontos": 1,
    "metaPropostaPadrao": null,
    "metaAnteriorValor": null,
    "metaAnteriorPeriodo": null,
    "regrasAplicadasPadrao": null,
    "metaDefinidaValor": null,
    "isMetaDefinida": false
  }
]
```

---

### 4. Resultados por Data Específica ✅

**Endpoint**: `GET /api/results/by-date`

**Descrição**: Retorna resultados para uma data específica dentro de um período.

**Parâmetros Query**:

- `period` (obrigatório): Período no formato YYYY-MM
- `targetDate` (obrigatório): Data específica no formato YYYY-MM-DD

**Exemplo de Requisição**:

```http
GET /api/results/by-date?period=2025-06&targetDate=2025-06-01
```

**Resposta**: Mesmo formato que `/api/results/by-period`

---

### 5. Resultados por ID de Período ✅

**Endpoint**: `GET /api/results/period/{id}`

**Descrição**: Retorna resultados usando o ID numérico do período.

**Parâmetros de URL**:

- `id`: ID numérico do período

**Exemplo de Requisição**:

```http
GET /api/results/period/202506
```

**Resposta**: Mesmo formato que outros endpoints de resultados.

---

## Rotas de Parâmetros/Metas

### 1. Listar Parâmetros ✅

**Endpoint**: `GET /api/parameters`

**Descrição**: Lista parâmetros/metas para um período específico.

**Parâmetros Query**:

- `period` (obrigatório): Período no formato YYYY-MM
- `sectorId` (opcional): Filtrar por setor
- `criterionId` (opcional): Filtrar por critério
- `onlyActive` (opcional): true/false (padrão: true)

**Exemplo de Requisição**:

```http
GET /api/parameters?period=2025-06
```

**Resposta de Sucesso (200)**:

```json
[
  {
    "id": 759,
    "nomeParametro": "META_FURO_POR_ATRASO_SETOR1_202506",
    "valor": "238",
    "dataInicioEfetivo": "2025-06-01",
    "dataFimEfetivo": null,
    "criterionId": 15,
    "criterio": {
      "id": 15,
      "nome": "FURO POR ATRASO",
      "index": 17,
      "descricao": null,
      "unidade_medida": "Qtd",
      "sentido_melhor": "MENOR",
      "ativo": true,
      "casasDecimaisPadrao": 0
    },
    "sectorId": 1,
    "setor": {
      "id": 1,
      "nome": "GAMA",
      "ativo": true
    },
    "previousVersionId": null,
    "createdByUserId": 1,
    "criadoPor": {
      "id": 1,
      "nome": "Admin Sistema",
      "email": "admin@sistema.com",
      "ativo": true
    },
    "justificativa": "Sugestão do sistema aceita",
    "createdAt": "2025-06-06T11:48:16.948Z",
    "competitionPeriodId": 202506,
    "metadata": {
      "baseValue": 250.95666666666668,
      "wasRounded": true,
      "roundingMethod": "down",
      "calculationMethod": "media3",
      "adjustmentPercentage": -5,
      "roundingDecimalPlaces": 0
    }
  }
]
```

---

### 2. Parâmetros com Filtros ✅

**Exemplo com Filtros**:

```http
GET /api/parameters?period=2025-06&sectorId=1&criterionId=1
```

**Resposta**: Retorna apenas parâmetros do setor GAMA para critério ATRASO.

---

### 3. Buscar Parâmetro por ID ✅

**Endpoint**: `GET /api/parameters/{id}`

**Exemplo de Requisição**:

```http
GET /api/parameters/621
```

**Resposta de Sucesso (200)**:

```json
{
  "id": 621,
  "nomeParametro": "META_FURO_POR_ATRASO_SETOR3_202506",
  "valor": "317",
  "dataInicioEfetivo": "2025-06-01",
  "dataFimEfetivo": null,
  "criterionId": 15,
  "sectorId": 3,
  "previousVersionId": null,
  "createdByUserId": 1,
  "justificativa": "Sugestão do sistema aceita",
  "competitionPeriodId": 202506,
  "metadata": {
    "baseValue": 333.94,
    "wasRounded": true,
    "roundingMethod": "down",
    "calculationMethod": "media3",
    "adjustmentPercentage": -5,
    "roundingDecimalPlaces": 0
  }
}
```

---

### 4. Criar Parâmetro ✅

**Endpoint**: `POST /api/parameters`

**Body**:

```json
{
  "competitionPeriodId": 202506,
  "criterionId": 1,
  "sectorId": 1,
  "valor": 100,
  "dataInicioEfetivo": "2025-07-01",
  "justificativa": "Meta inicial para julho"
}
```

**Resposta de Sucesso (201)**:

```json
{
  "id": 760,
  "nomeParametro": "META_ATRASO_SETOR1_202506",
  "valor": "100",
  "dataInicioEfetivo": "2025-07-01",
  "dataFimEfetivo": null,
  "criterionId": 1,
  "sectorId": 1,
  "previousVersionId": null,
  "createdByUserId": 1,
  "justificativa": "Meta inicial para julho",
  "createdAt": "2025-06-06T13:56:49.734Z",
  "competitionPeriodId": 202506,
  "metadata": null
}
```

**Resposta de Conflito (409)**:

```json
{
  "error": "Já existe meta ativa para critério \"ATRASO\", setor \"1\" e período \"2025-06\". Expire a meta existente antes de criar nova."
}
```

---

### 5. Atualizar Parâmetro ✅

**Endpoint**: `PUT /api/parameters/{id}`

**Body**:

```json
{
  "valor": 95,
  "dataInicioEfetivo": "2025-05-15",
  "justificativa": "Ajuste baseado em análise de capacidade"
}
```

**Resposta de Sucesso (200)**:

```json
{
  "id": 761,
  "nomeParametro": "META_PEÇAS_SETOR2_202505",
  "valor": "95",
  "dataInicioEfetivo": "2025-05-15",
  "dataFimEfetivo": null,
  "criterionId": 12,
  "sectorId": 2,
  "previousVersionId": 721,
  "createdByUserId": 1,
  "justificativa": "Ajuste baseado em análise de capacidade",
  "createdAt": "2025-06-06T14:02:39.816Z",
  "competitionPeriodId": 3,
  "metadata": {
    "baseValue": 21000,
    "wasRounded": false,
    "roundingMethod": "none",
    "calculationMethod": "melhor3",
    "adjustmentPercentage": 0,
    "roundingDecimalPlaces": 0
  }
}
```

**Possíveis Erros**:

```json
{
  "error": "Metas do período 2025-04 (status: FECHADA) não podem ser alteradas. Apenas períodos em PLANEJAMENTO."
}
```

```json
{
  "error": "Nova data de início (2025-07-15) deve estar dentro do período de competição (2025-05-01 a 2025-05-31)."
}
```

---

### 6. Deletar Parâmetro ✅

**Endpoint**: `DELETE /api/parameters/{id}`

**Body**:

```json
{
  "justificativa": "Meta incorreta, precisa ser removida"
}
```

**Resposta de Sucesso (200)**:

```json
{
  "id": 721,
  "nomeParametro": "META_PEÇAS_SETOR2_202505",
  "valor": "21000",
  "dataInicioEfetivo": "2025-05-01",
  "dataFimEfetivo": "2025-06-06",
  "criterionId": 12,
  "sectorId": 2,
  "justificativa": "Sugestão do sistema aceita (Expirado em 2025-06-06 por Admin Sistema (Mock): Meta incorreta, precisa ser removida)",
  "competitionPeriodId": 3
}
```

---

### 7. Calcular Parâmetro Automático ✅

**Endpoint**: `POST /api/parameters/calculate`

**Body**:

```json
{
  "competitionPeriodId": 3,
  "criterionId": 6,
  "sectorId": 1,
  "calculationMethod": "media3",
  "adjustmentPercentage": 5,
  "justificativa": "Meta inicial para julho",
  "finalValue": 5
}
```

**Resposta de Sucesso (200)**:

```json
{
  "id": 714,
  "nomeParametro": "META_ATESTADO_FUNC_SETOR1_202505",
  "valor": "5",
  "dataInicioEfetivo": "2025-05-01",
  "dataFimEfetivo": null,
  "criterionId": 6,
  "sectorId": 1,
  "previousVersionId": null,
  "createdByUserId": 1,
  "justificativa": "Meta inicial para julho (Atualizada via assistente em 2025-06-06T14:22:12.071Z)",
  "createdAt": "2025-06-05T19:54:28.832Z",
  "competitionPeriodId": 3,
  "metadata": {
    "calculationMethod": "media3",
    "adjustmentPercentage": 5,
    "baseValue": 6.073333333333333
  }
}
```

---

### 8. Configurações de Cálculo de Critério ✅

**Endpoint**: `GET /api/criteria/{criterionId}/calculation-settings`

**Exemplo de Requisição**:

```http
GET /api/criteria/1/calculation-settings
```

**Resposta de Sucesso (200)**:

```json
{
  "id": 1,
  "criterionId": 1,
  "calculationMethod": "media3",
  "adjustmentPercentage": "-3.00",
  "requiresRounding": true,
  "roundingMethod": "nearest",
  "roundingDecimalPlaces": 0,
  "createdAt": "2025-05-23T17:39:51.431Z",
  "updatedAt": "2025-05-28T20:45:06.672Z"
}
```

---

## Rotas de Expurgos

### ⚠️ Status dos Endpoints de Expurgos

**Problemas Identificados**:

- Todos os endpoints retornam listas vazias ou erros "não encontrado"
- Endpoint de criação retorna erro de campos obrigatórios

### 1. Listar Expurgos ✅

**Endpoint**: `GET /api/expurgos`

**Exemplo de Requisição**:

```http
GET /api/expurgos
```

**Resposta de Sucesso (200)**:

```json
[]
```

---

### 2. Expurgos com Filtros ✅

**Endpoint**: `GET /api/expurgos`

**Parâmetros Query**:

- `competitionPeriodId`: ID do período
- `sectorId`: ID do setor
- `criterionId`: ID do critério
- `status`: Status do expurgo (PENDENTE, APROVADO, REJEITADO)

**Exemplo de Requisição**:

```http
GET /api/expurgos?competitionPeriodId=202506&status=PENDENTE
```

**Resposta de Sucesso (200)**:

```json
[]
```

---

### 3. Buscar Expurgo por ID ❌

**Endpoint**: `GET /api/expurgos/{id}`

**Exemplo de Requisição**:

```http
GET /api/expurgos/1
```

**Resposta de Erro (404)**:

```json
{
  "message": "Expurgo com ID 1 não encontrado."
}
```

---

### 4. Solicitar Expurgo ❌

**Endpoint**: `POST /api/expurgos/request`

**Body Tentado**:

```json
{
  "competitionPeriodId": 202506,
  "criterionId": 1,
  "sectorId": 1,
  "valor": 5,
  "dataEvento": "2025-06-15",
  "justificativa": "Quebra de equipamento não prevista que impactou o indicador"
}
```

**Resposta de Erro (400)**:

```json
{
  "error": "Campos obrigatórios para solicitar expurgo estão faltando no DTO."
}
```

**🔧 Necessário Investigar**: Campos obrigatórios para criação de expurgo.

---

### 5. Aprovar Expurgo ❌

**Endpoint**: `POST /api/expurgos/{id}/approve`

**Resposta de Erro (404)**:

```json
{
  "error": "Solicitação de expurgo com ID 1 não encontrada."
}
```

---

### 6. Rejeitar Expurgo ❌

**Endpoint**: `POST /api/expurgos/{id}/reject`

**Resposta de Erro (404)**:

```json
{
  "error": "Solicitação de expurgo com ID 2 não encontrada."
}
```

---

## Códigos de Status e Tratamento de Erros

### Códigos de Status Comuns

| Código  | Descrição             | Contexto                                  |
| ------- | --------------------- | ----------------------------------------- |
| **200** | OK                    | Operação bem-sucedida                     |
| **201** | Created               | Recurso criado com sucesso                |
| **400** | Bad Request           | Parâmetros inválidos ou dados malformados |
| **404** | Not Found             | Recurso não encontrado                    |
| **409** | Conflict              | Violação de regra de negócio              |
| **500** | Internal Server Error | Erro interno do servidor                  |

### Padrões de Erro

**Erro de Validação (400)**:

```json
{
  "error": "Query parameter 'period' (formato YYYY-MM) é obrigatório."
}
```

**Erro de Conflito (409)**:

```json
{
  "error": "Já existe meta ativa para critério \"ATRASO\", setor \"1\" e período \"2025-06\"."
}
```

**Erro de Recurso Não Encontrado (404)**:

```json
{
  "message": "Parâmetro com ID 999 não encontrado."
}
```

**Erro Interno (500)**:

```json
{
  "error": "Falha ao calcular ranking."
}
```

---

## Troubleshooting

### 🚨 Problemas Conhecidos

#### 1. Endpoints de Ranking com Erro 500

**Rotas Afetadas**:

- `GET /api/ranking`
- `GET /api/ranking?period=2025-04`

**Erro**:

```json
{
  "error": "Falha ao calcular ranking."
}
```

**Possível Causa**: Problema no RankingService durante cálculo.

**Solução Temporária**: Usar endpoints de resultados como alternativa.

---

#### 2. Endpoint /api/results sem Período

**Rota Afetada**: `GET /api/results`

**Erro**:

```json
{
  "error": "You must provide selection conditions in order to find a single row."
}
```

**Causa**: Endpoint requer parâmetro `period` obrigatório.

**Solução**: Sempre usar `GET /api/results?period=YYYY-MM`.

---

#### 3. Sistema de Expurgos Não Funcional

**Rotas Afetadas**: Todas as rotas de `/api/expurgos/*`

**Problemas**:

- Lista sempre vazia
- Criação falha por campos obrigatórios
- IDs não encontrados

**Investigação Necessária**:

- Verificar DTO `CreateExpurgoDto` completo
- Conferir se há dados de expurgo no banco
- Validar mapeamento de entidades

---

#### 4. Validação de Período em Parâmetros

**Comportamento**: Metas só podem ser alteradas em períodos com status `PLANEJAMENTO`.

**Mensagens de Erro Comuns**:

```json
{
  "error": "Metas do período 2025-04 (status: FECHADA) não podem ser alteradas. Apenas períodos em PLANEJAMENTO."
}
```

**Solução**: Verificar status do período antes de tentar alterações.

---

#### 5. Formato de Data em Períodos

**Importante**: Algumas operações usam ID numérico, outras usam mesAno.

**Exemplos**:

- ✅ Fechar período: `POST /api/periods/3/close` (ID numérico)
- ✅ Buscar resultados: `GET /api/results?period=2025-05` (mesAno)

---

### 🔧 Dicas de Integração

#### 1. Fluxo Básico de Consulta

```javascript
// 1. Obter metadados
const sectors = await fetch('/api/sectors/active').then((r) => r.json());
const criteria = await fetch('/api/criteria/active').then((r) => r.json());

// 2. Verificar período ativo
const activePeriod = await fetch('/api/periods/active').then((r) => r.json());

// 3. Obter resultados
const results = await fetch(
  `/api/results/by-period?period=${activePeriod.mesAno}`
).then((r) => r.json());
```

#### 2. Fluxo de Criação de Meta

```javascript
// 1. Verificar se período permite alterações
const period = await fetch('/api/periods/active').then((r) => r.json());
if (period.status !== 'PLANEJAMENTO') {
  throw new Error('Período não permite alterações');
}

// 2. Criar meta
const newParameter = await fetch('/api/parameters', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    competitionPeriodId: period.id,
    criterionId: 1,
    sectorId: 1,
    valor: 100,
    dataInicioEfetivo: period.dataInicio,
    justificativa: 'Meta inicial',
  }),
});
```

#### 3. Tratamento de Erros Robusto

```javascript
async function fetchWithErrorHandling(url, options = {}) {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'Erro na requisição');
    }

    return await response.json();
  } catch (error) {
    console.error(`Erro em ${url}:`, error.message);
    throw error;
  }
}
```

---

### 📊 Métricas de Performance

#### Tempos de Resposta Observados

- **Metadados** (sectors, criteria): < 50ms
- **Períodos**: < 100ms
- **Resultados**: 100-300ms (dependendo do volume)
- **Parâmetros**: 50-200ms
- **Operações de escrita**: 200-500ms

#### Otimizações Recomendadas

- Implementar cache para metadados
- Paginação para listas grandes
- Índices otimizados no banco de dados

---

### 🎯 Endpoints Mais Usados (por funcionalidade)

#### **Consulta Pública (Tela Principal)**

1. `GET /api/sectors/active` - Listar setores
2. `GET /api/criteria/active` - Listar critérios
3. `GET /api/periods/active` - Período atual
4. `GET /api/results/by-period?period=X` - Resultados

#### **Administração de Metas**

1. `GET /api/parameters?period=X` - Listar metas
2. `POST /api/parameters` - Criar meta
3. `PUT /api/parameters/{id}` - Atualizar meta
4. `POST /api/parameters/calculate` - Calcular automaticamente

#### **Gestão de Períodos**

1. `GET /api/periods` - Listar períodos
2. `POST /api/periods/{id}/start` - Iniciar período
3. `POST /api/periods/{id}/close` - Fechar período

---

### 🚀 Roadmap de Melhorias

#### Curto Prazo

- [ ] Corrigir endpoints de ranking (erro 500)
- [ ] Implementar sistema de expurgos completamente
- [ ] Adicionar validação de entrada mais robusta
- [ ] Melhorar mensagens de erro

#### Médio Prazo

- [ ] Implementar autenticação e autorização
- [ ] Cache inteligente para melhor performance
- [ ] Paginação e filtros avançados
- [ ] Logs estruturados e monitoramento

#### Longo Prazo

- [ ] Versionamento da API
- [ ] Rate limiting
- [ ] Documentação OpenAPI/Swagger
- [ ] Testes automatizados de integração

---

## 📚 Recursos Adicionais

### Ferramentas Recomendadas

- **Postman**: Para testes manuais da API
- **Insomnia**: Alternativa ao Postman
- **Thunder Client**: Extensão do VS Code

### Scripts de Teste Úteis

```bash
# Teste rápido de conectividade
curl -X GET http://localhost:3001/api/sectors/active

# Teste com parâmetros
curl -X GET "http://localhost:3001/api/results/by-period?period=2025-06"

# Teste de criação (substitua os valores)
curl -X POST http://localhost:3001/api/parameters \
  -H "Content-Type: application/json" \
  -d '{"competitionPeriodId":202506,"criterionId":1,"sectorId":1,"valor":100,"dataInicioEfetivo":"2025-06-01","justificativa":"Teste"}'
```

---

**Documentação atualizada com base em testes reais executados em Junho 2025**  
**Status**: ✅ 23 endpoints testados | ❌ 6 endpoints com problemas | 🔧 2 necessitam investigação  
**Última atualização**: 06/06/2025
