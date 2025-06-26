# 📋 Guia: Configurando Regras de Ranking e Pontuação

## 📁 Arquivo: `apps/api/src/modules/ranking/ranking.service.ts`

Este guia explica como modificar as regras de ranking e pontuação no sistema de premiação.

---

## 🎯 1. Estrutura Geral do Sistema

### Fluxo de Cálculo:

1. **Cálculo da Razão** → `calculateRazao()`
2. **Ordenação por Critério** → `sortResultsByCriterion()`
3. **Atribuição de Ranks** → `assignRanksAndPoints()`
4. **Cálculo de Pontos** → `calculatePontos()` ← **AQUI são as regras especiais**

---

## 🛠️ 2. Como Adicionar Regras por Critério

### Localizar o Método `calculatePontos()`

```typescript
private calculatePontos(
  result: ResultadoPorCriterio,
  criterion: CriterionEntity,
  useInvertedScale: boolean
): number | null {
```

### Estrutura Atual:

```typescript
// ========== REGRAS ESPECIAIS POR CRITÉRIO ==========

// FURO POR VIAGEM: Meta zero - realizado 0 = 1.0, realizado > 0 empata em 1.5
if (criterion.nome === 'FURO POR VIAGEM') {
  // Regras específicas aqui
}

// MÉDIA KM/L: Empate em 1º = 1.5, depois escala normal 2.0, 2.5
if (criterion.nome === 'MEDIA KM/L') {
  // Regras específicas aqui
}

// ========== PONTUAÇÃO PADRÃO PARA OUTROS CRITÉRIOS ==========
const pontuacao = {
  1: 1.0, // 1º lugar
  2: 1.5, // 2º lugar
  3: 2.0, // 3º lugar
  4: 2.5, // 4º lugar e demais
};
```

---

## 📝 3. Exemplos de Regras Específicas

### Exemplo 1: Critério com Meta Zero

```typescript
if (criterion.nome === 'NOVO_CRITERIO_META_ZERO') {
  if (result.valorRealizado === 0 && result.valorMeta === 0) {
    console.log(
      `[RankingService] ${result.setorNome}: ${criterion.nome} 0/0 = 1.0 pontos`
    );
    return 1.0;
  } else if (
    result.valorRealizado !== null &&
    result.valorRealizado > 0 &&
    result.valorMeta === 0
  ) {
    console.log(
      `[RankingService] ${result.setorNome}: ${criterion.nome} acima de zero = 1.5 pontos`
    );
    return 1.5;
  }
}
```

### Exemplo 2: Escala de Pontuação Personalizada

```typescript
if (criterion.nome === 'CRITERIO_ESPECIAL') {
  const escalaSuperior = {
    1: 0.5, // Prêmio extra para 1º lugar
    2: 1.0, // 2º lugar melhor que padrão
    3: 1.8, // Penalização menor para 3º
    4: 3.0, // Penalização maior para último
  };

  const pontos =
    escalaSuperior[result.rank as keyof typeof escalaSuperior] || 3.0;
  console.log(
    `[RankingService] ${result.setorNome}: ${criterion.nome} rank=${result.rank} → ${pontos} pontos (escala especial)`
  );
  return pontos;
}
```

### Exemplo 3: Regra Baseada em Valor Absoluto

```typescript
if (criterion.nome === 'CRITERIO_POR_VALOR') {
  if (result.valorRealizado !== null) {
    if (result.valorRealizado <= 5) {
      return 1.0; // Excelente
    } else if (result.valorRealizado <= 10) {
      return 1.5; // Bom
    } else if (result.valorRealizado <= 20) {
      return 2.0; // Regular
    } else {
      return 2.5; // Crítico
    }
  }
}
```

### Exemplo 4: Regra com Empates Especiais

```typescript
if (criterion.nome === 'CRITERIO_EMPATE_ESPECIAL') {
  // Primeiros lugares empatam em pontuação melhor
  if (result.rank === 1 || result.rank === 2) {
    console.log(
      `[RankingService] ${result.setorNome}: ${criterion.nome} top 2 = 1.2 pontos`
    );
    return 1.2;
  }
  // Demais seguem escala normal deslocada
  else if (result.rank === 3) {
    return 2.0;
  } else {
    return 2.8;
  }
}
```

---

## 🔍 4. Como Identificar o Nome do Critério

### Verificar na Tabela `criteria`:

```sql
SELECT id, nome FROM criteria WHERE ativo = true;
```

### Usar o Campo `criterion.nome` no Código:

```typescript
// Sempre usar o nome EXATO da tabela
if (criterion.nome === 'NOME_EXATO_DA_TABELA') {
```

### Nomes Atuais dos Critérios:

- `'ATRASO'`
- `'FURO POR VIAGEM'`
- `'QUEBRA'`
- `'DEFEITO'`
- `'FALTA FUNC'`
- `'ATESTADO FUNC'`
- `'COLISÃO'`
- `'FALTA FROTA'`
- `'IPK'`
- `'MEDIA KM/L'`
- `'KM OCIOSA'`
- `'PEÇAS'`
- `'PNEUS'`
- `'COMBUSTIVEL'`
- `'FURO POR ATRASO'`

---

## ⚠️ 5. Cuidados e Melhores Práticas

### ✅ Sempre Fazer:

1. **Incluir logs detalhados** para debug
2. **Tratar casos nulos** (`result.valorRealizado === null`)
3. **Verificar nome exato** do critério na tabela
4. **Testar com dados reais** antes de aplicar
5. **Documentar a regra** no código com comentários

### ❌ Evitar:

1. **Hardcoding de IDs** (usar `criterion.nome`)
2. **Regras sem logs** (dificulta debug)
3. **Valores mágicos** sem explicação
4. **Não tratar casos extremos**

### Exemplo de Log Detalhado:

```typescript
console.log(
  `[RankingService] ${result.setorNome}: ${criterion.nome} realizado=${result.valorRealizado}, meta=${result.valorMeta}, rank=${result.rank} → ${pontos} pontos (regra: ${nomeRegra})`
);
```

---

## 🧪 6. Como Testar Novas Regras

### 1. Backup do Código Atual

```bash
cp apps/api/src/modules/ranking/ranking.service.ts apps/api/src/modules/ranking/ranking.service.ts.backup
```

### 2. Implementar Nova Regra

- Seguir os exemplos acima
- Adicionar dentro do método `calculatePontos()`

### 3. Testar com Dados Específicos

- Usar os endpoints `/api/results`
- Verificar logs no console
- Comparar com resultados esperados

### 4. Verificar Impacto no Ranking Geral

- Confirmar que a soma de pontos por setor está correta
- Verificar se o ranking final faz sentido

---

## 📊 7. Estrutura dos Dados Disponíveis

### No Objeto `result`:

```typescript
interface ResultadoPorCriterio {
  setorId: number; // ID do setor
  setorNome: string; // Nome do setor (ex: "PARANOÁ")
  criterioId: number; // ID do critério
  criterioNome: string; // Nome do critério (ex: "QUEBRA")
  valorRealizado: number | null; // Valor realizado pelo setor
  valorMeta: number | null; // Meta definida
  razaoCalculada: number | null; // realizado/meta
  rank?: number; // Posição no ranking (1º, 2º, etc)
  pontos: number | null; // Pontos atribuídos (1.0-2.5)
}
```

### No Objeto `criterion`:

```typescript
interface CriterionEntity {
  id: number; // ID único
  nome: string; // Nome do critério
  sentido_melhor: 'MAIOR' | 'MENOR'; // Direção de melhoria
  unidade_medida?: string; // Unidade (%, R$, etc)
  ativo: boolean; // Se está ativo
}
```

---

## 🚀 8. Exemplo Completo: Adicionando Nova Regra

### Cenário: Critério "PONTUALIDADE" onde:

- 95%+ = 1.0 pontos
- 90-94% = 1.5 pontos
- 80-89% = 2.0 pontos
- <80% = 2.5 pontos

```typescript
// Adicionar dentro do método calculatePontos(), antes da seção "PONTUAÇÃO PADRÃO"

// PONTUALIDADE: Regra baseada em percentual de atingimento
if (criterion.nome === 'PONTUALIDADE') {
  if (result.razaoCalculada !== null) {
    const percentual = result.razaoCalculada * 100; // Converter para %

    if (percentual >= 95) {
      console.log(
        `[RankingService] ${result.setorNome}: PONTUALIDADE ${percentual.toFixed(1)}% = 1.0 pontos (excelente)`
      );
      return 1.0;
    } else if (percentual >= 90) {
      console.log(
        `[RankingService] ${result.setorNome}: PONTUALIDADE ${percentual.toFixed(1)}% = 1.5 pontos (bom)`
      );
      return 1.5;
    } else if (percentual >= 80) {
      console.log(
        `[RankingService] ${result.setorNome}: PONTUALIDADE ${percentual.toFixed(1)}% = 2.0 pontos (regular)`
      );
      return 2.0;
    } else {
      console.log(
        `[RankingService] ${result.setorNome}: PONTUALIDADE ${percentual.toFixed(1)}% = 2.5 pontos (crítico)`
      );
      return 2.5;
    }
  }
}
```

---

## 📞 Dúvidas ou Problemas?

1. **Verificar logs** no console da API
2. **Conferir dados** na tabela `performance_data`
3. **Validar nomes** na tabela `criteria`
4. **Testar incrementalmente** (um critério por vez)

Lembre-se: **sempre documentar as regras** e **manter logs detalhados** para facilitar manutenção futura! 🎯
