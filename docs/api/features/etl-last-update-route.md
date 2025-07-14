# 📚 **Documentação: API de Última Execução ETL**

_Versão: 1.0 | Data: Julho 2025 | Sistema de Premiação VPIO_

---

## 📋 **Visão Geral**

Esta documentação descreve as APIs públicas criadas para consultar informações sobre a última execução do sistema ETL (Extract, Transform, Load) da aplicação de premiação. Essas rotas foram implementadas para permitir que o frontend exiba a data/hora da última atualização dos dados sem necessidade de autenticação.

---

## 🚀 **Endpoints Disponíveis**

### **1. GET /api/automation/last-execution**

Retorna informações detalhadas sobre a última execução bem-sucedida do ETL.

#### **Características:**

- ✅ **Rota pública** (sem autenticação)
- ✅ **Cache automático** recomendado (5-10 minutos)
- ✅ **Dados formatados** para exibição
- ✅ **Error handling robusto**

#### **Exemplo de Requisição:**

```bash
curl -X GET "http://localhost:3001/api/automation/last-execution" \
     -H "Content-Type: application/json"
```

#### **Resposta de Sucesso (200):**

```json
{
  "success": true,
  "message": "Última execução ETL encontrada",
  "data": {
    "lastExecution": {
      "executedAt": "2025-07-14T13:45:22.123Z",
      "status": "success",
      "durationMs": 42500,
      "durationFormatted": "42.5s",
      "recordsProcessed": 1250,
      "triggeredBy": "automatic",
      "periodProcessed": "2025-07",
      "executedAtFormatted": "14/07/2025 10:45:22",
      "relativeTime": "há 2 horas"
    },
    "hasExecutions": true
  },
  "timestamp": "2025-07-14T15:30:00.000Z"
}
```

#### **Resposta sem Dados (200):**

```json
{
  "success": true,
  "message": "Nenhuma execução ETL encontrada",
  "data": {
    "lastExecution": null,
    "hasExecutions": false
  }
}
```

#### **Resposta de Erro (500):**

```json
{
  "success": false,
  "message": "Erro ao consultar última execução ETL",
  "error": "Descrição específica do erro",
  "data": {
    "lastExecution": null,
    "hasExecutions": false
  }
}
```

---

### **2. GET /api/automation/execution-history**

Retorna histórico das últimas execuções ETL.

#### **Características:**

- ✅ **Rota pública** (sem autenticação)
- ✅ **Paginação** via query parameter
- ✅ **Limite máximo** de 50 registros
- ✅ **Ordenação** por data (mais recente primeiro)

#### **Parâmetros de Query:**

| Parâmetro | Tipo   | Obrigatório | Padrão | Descrição                            |
| --------- | ------ | ----------- | ------ | ------------------------------------ |
| `limit`   | string | Não         | "10"   | Número máximo de registros (máx: 50) |

#### **Exemplo de Requisição:**

```bash
# Buscar últimas 5 execuções
curl -X GET "http://localhost:3001/api/automation/execution-history?limit=5" \
     -H "Content-Type: application/json"
```

#### **Resposta de Sucesso (200):**

```json
{
  "success": true,
  "message": "Histórico de 3 execuções ETL",
  "data": {
    "executions": [
      {
        "executedAt": "2025-07-14T13:45:22.123Z",
        "status": "success",
        "durationMs": 42500,
        "durationFormatted": "42.5s",
        "recordsProcessed": 1250,
        "triggeredBy": "automatic",
        "periodProcessed": "2025-07",
        "executedAtFormatted": "14/07/2025 10:45:22",
        "relativeTime": "há 2 horas"
      },
      {
        "executedAt": "2025-07-14T09:30:15.456Z",
        "status": "success",
        "durationMs": 38200,
        "durationFormatted": "38.2s",
        "recordsProcessed": 1180,
        "triggeredBy": "manual",
        "periodProcessed": "2025-07",
        "executedAtFormatted": "14/07/2025 06:30:15",
        "relativeTime": "há 6 horas"
      }
    ],
    "total": 3,
    "limit": 5,
    "hasMore": false
  },
  "timestamp": "2025-07-14T15:30:00.000Z"
}
```

---

## 📊 **Estrutura dos Dados**

### **Objeto `lastExecution`:**

| Campo                 | Tipo           | Descrição                                                        |
| --------------------- | -------------- | ---------------------------------------------------------------- |
| `executedAt`          | string (ISO)   | Data/hora da execução em formato ISO                             |
| `status`              | string         | Status da execução (`"success"` ou `"completed"`)                |
| `durationMs`          | number \| null | Duração em milissegundos                                         |
| `durationFormatted`   | string \| null | Duração formatada (ex: "42.5s", "2.1min")                        |
| `recordsProcessed`    | number \| null | Número de registros processados                                  |
| `triggeredBy`         | string         | Origem do trigger (`"manual"`, `"automatic"`, `"expurgo"`, etc.) |
| `periodProcessed`     | string \| null | Período processado (ex: "2025-07")                               |
| `executedAtFormatted` | string         | Data/hora formatada em PT-BR                                     |
| `relativeTime`        | string         | Tempo relativo (ex: "há 2 horas", "há 3 dias")                   |

### **Valores Possíveis:**

#### **`status`:**

- `"success"` - Execução completada com sucesso
- `"completed"` - Execução finalizada (status indeterminado)

#### **`triggeredBy`:**

- `"manual"` - Disparado manualmente por usuário
- `"automatic"` - Execução automática/agendada
- `"expurgo"` - Disparado por aprovação de expurgo
- `"meta-change"` - Disparado por mudança de meta
- `"unknown"` - Origem não identificada

---

## 💻 **Exemplos de Integração**

### **1. JavaScript Vanilla:**

```javascript
// Função para buscar última execução
async function getLastETLExecution() {
  try {
    const response = await fetch('/api/automation/last-execution');
    const data = await response.json();

    if (data.success && data.data.hasExecutions) {
      const exec = data.data.lastExecution;

      console.log(`Última atualização: ${exec.relativeTime}`);
      console.log(`Status: ${exec.status}`);
      console.log(`Duração: ${exec.durationFormatted}`);

      return exec;
    } else {
      console.log('Nenhuma execução ETL encontrada');
      return null;
    }
  } catch (error) {
    console.error('Erro ao buscar execução ETL:', error);
    return null;
  }
}

// Auto-refresh a cada 5 minutos
setInterval(getLastETLExecution, 5 * 60 * 1000);
```

### **2. React Hook:**

```jsx
import { useState, useEffect } from 'react';

function useLastETLExecution() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchLastExecution() {
      try {
        setLoading(true);
        const response = await fetch('/api/automation/last-execution');
        const result = await response.json();

        if (result.success) {
          setData(result.data);
          setError(null);
        } else {
          setError(result.message);
        }
      } catch (err) {
        setError('Erro ao buscar última execução');
      } finally {
        setLoading(false);
      }
    }

    fetchLastExecution();

    // Atualizar a cada 5 minutos
    const interval = setInterval(fetchLastExecution, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { data, loading, error };
}

// Componente de exemplo
function ETLStatus() {
  const { data, loading, error } = useLastETLExecution();

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;
  if (!data?.hasExecutions) return <div>Nenhuma execução encontrada</div>;

  const exec = data.lastExecution;
  return (
    <div className='etl-status'>
      <h3>Última Atualização ETL</h3>
      <p>
        <strong>Data:</strong> {exec.executedAtFormatted}
      </p>
      <p>
        <strong>Status:</strong> {exec.status}
      </p>
      <p>
        <strong>Duração:</strong> {exec.durationFormatted}
      </p>
      <p>
        <strong>Registros:</strong> {exec.recordsProcessed?.toLocaleString()}
      </p>
      <p>
        <em>{exec.relativeTime}</em>
      </p>
    </div>
  );
}
```

### **3. Vue.js Composition API:**

```vue
<template>
  <div v-if="loading">Carregando...</div>
  <div v-else-if="error">Erro: {{ error }}</div>
  <div v-else-if="!hasExecutions">Nenhuma execução encontrada</div>
  <div v-else class="etl-status">
    <h3>Última Atualização ETL</h3>
    <p><strong>Data:</strong> {{ lastExecution.executedAtFormatted }}</p>
    <p><strong>Status:</strong> {{ lastExecution.status }}</p>
    <p><strong>Duração:</strong> {{ lastExecution.durationFormatted }}</p>
    <p>
      <em>{{ lastExecution.relativeTime }}</em>
    </p>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const loading = ref(true);
const error = ref(null);
const lastExecution = ref(null);
const hasExecutions = ref(false);
let intervalId = null;

async function fetchLastExecution() {
  try {
    loading.value = true;
    const response = await fetch('/api/automation/last-execution');
    const data = await response.json();

    if (data.success) {
      lastExecution.value = data.data.lastExecution;
      hasExecutions.value = data.data.hasExecutions;
      error.value = null;
    } else {
      error.value = data.message;
    }
  } catch (err) {
    error.value = 'Erro ao buscar última execução';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchLastExecution();
  // Auto-refresh a cada 5 minutos
  intervalId = setInterval(fetchLastExecution, 5 * 60 * 1000);
});

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId);
  }
});
</script>
```

---

## 🔧 **Implementação Técnica**

### **Arquivos Modificados:**

1. **`apps/api/src/modules/audit/audit.service.ts`**

   - Métodos `getLastSuccessfulETLExecution()` e `getETLExecutionHistory()`

2. **`apps/api/src/controllers/automation.controller.ts`**

   - Métodos `getLastExecution()` e `getExecutionHistory()`

3. **`apps/api/src/routes/automation.routes.ts`**
   - Rotas `GET /api/automation/last-execution` e `GET /api/automation/execution-history`

### **Fonte dos Dados:**

As APIs consultam a tabela `audit_logs` filtrando pelos seguintes `actionType`:

- ✅ `ETL_CONCLUIDO` - Execução ETL finalizada com sucesso
- ✅ `RECALCULO_CONCLUIDO` - Recálculo finalizado com sucesso
- ✅ `ETL_INICIADO` - Execução ETL iniciada (como fallback)
- ✅ `RECALCULO_INICIADO` - Recálculo iniciado (como fallback)

### **Performance:**

- **Query otimizada** com `ORDER BY timestamp DESC LIMIT 1`
- **Índices recomendados** na coluna `actionType` e `timestamp`
- **Relações carregadas** apenas quando necessário (`user`, `competitionPeriod`)

---

## 🐛 **Troubleshooting**

### **Problema: Retorna sempre `hasExecutions: false`**

**Possíveis Causas:**

1. Nenhuma execução ETL foi realizada ainda
2. Logs de auditoria não estão sendo criados corretamente
3. `actionType` não corresponde aos esperados

**Diagnóstico:**

```sql
-- Verificar logs ETL no banco
SELECT
    "actionType",
    "timestamp",
    "details"
FROM audit_logs
WHERE "actionType" LIKE '%ETL%' OR "actionType" LIKE '%RECALCULO%'
ORDER BY "timestamp" DESC
LIMIT 10;
```

**Solução:**

1. Execute uma atualização ETL manual
2. Verifique se o `AutomationService` está criando logs
3. Confirme se os `actionType` estão corretos

### **Problema: Error 500 no endpoint**

**Possíveis Causas:**

1. Erro de conexão com banco de dados
2. Problema no parsing do JSON `details`
3. Erro na formatação de data

**Diagnóstico:**

- Verificar logs do servidor API
- Testar conexão com banco
- Validar estrutura da tabela `audit_logs`

### **Problema: Dados desatualizados no frontend**

**Possíveis Causas:**

1. Cache do browser
2. Intervalo de refresh muito alto
3. Problemas de rede

**Soluções:**

1. Implementar cache-busting: `?_t=${Date.now()}`
2. Reduzir intervalo de refresh
3. Adicionar retry logic

---

## 📈 **Monitoramento e Métricas**

### **Logs a Observar:**

```bash
# Logs de sucesso
[AutomationController] Solicitação de última execução ETL recebida
[AuditLogService] Buscando última execução ETL bem-sucedida...
[AuditLogService] Última execução ETL encontrada: {...}

# Logs de erro
[AuditLogService] Erro ao buscar última execução ETL: {...}
[AutomationController] Erro ao buscar última execução ETL: {...}
```

### **Métricas Recomendadas:**

- **Frequência de chamadas** às APIs
- **Tempo de resposta** médio
- **Taxa de erro** 5xx
- **Utilização** do endpoint por diferentes clients

---

## 🔄 **Manutenção**

### **Atualizações Futuras:**

1. **Cache Redis** para melhor performance
2. **Websockets** para updates em tempo real
3. **Filtros adicionais** (por período, por tipo de trigger)
4. **Métricas agregadas** (média de duração, taxa de sucesso)

### **Backup dos Dados:**

Os dados são baseados na tabela `audit_logs`, que deve ser incluída nos backups regulares da aplicação.

### **Versionamento:**

Esta documentação refere-se à **versão 1.0** da API. Mudanças breaking changes resultarão em nova versão.

---

## 🆘 **Suporte**

### **Contatos:**

- **Desenvolvedor:** Equipe Backend
- **Documentação:** `docs/api/etl-last-execution.md`
- **Repositório:** Sistema de Premiação VPIO

### **Links Úteis:**

- **Swagger:** `http://localhost:3001/docs`
- **Health Check:** `http://localhost:3001/health`
- **Logs de Auditoria:** `GET /api/audit-logs`

---

_Documentação gerada em: Julho 2025_  
_Última atualização: Implementação inicial_
