### **Documentação de Cálculo de Indicadores de Metas Operacionais**

**Versão:** 3.0 (Final)
**Data:** 15 de julho de 2025
**Objetivo:** Servir como especificação técnica para a automação dos cálculos de metas operacionais (KM, Combustível, Pneus, Peças), substituindo o processo manual em planilhas.

#### **Índice**

1.  Visão Geral do Fluxo
2.  Regra de Negócio Global: Sistema de Saldo (Débito/Crédito)
3.  Indicador Base: KM PREVISTA
4.  Indicador de Custo: METAS DE COMBUSTÍVEL (LT e R$)
5.  Indicador de Custo: META DE CUSTO COM PNEUS (R$)
6.  Indicador de Custo: META DE CUSTO COM PEÇAS (R$)
7.  Anexo A: Cálculo dos Custos Médios Anuais por Km (R$/Km)

---

### **1. Visão Geral do Fluxo**

O sistema de cálculo de metas é sequencial e interdependente. O fluxo de dados segue a seguinte ordem:

1.  O indicador **KM PREVISTA** é calculado primeiro, após a classificação manual de feriados.
2.  O resultado da **KM PREVISTA** serve como principal _input_ para o cálculo das metas de **COMBUSTÍVEL**, **PNEUS** e **PEÇAS**.
3.  As metas de **PNEUS** e **PEÇAS** são, adicionalmente, ajustadas pela regra de negócio **Sistema de Saldo**.

---

### **2. Regra de Negócio Global: Sistema de Saldo (Débito/Crédito)**

Esta regra é transversal e se aplica sobre a meta base dos indicadores de Pneus e Peças.

- **Definição:** Um mecanismo que ajusta a meta de um mês com base no gasto excedente do mês anterior.
- **Parâmetros Necessários:**
  - `PercentualTolerancia`: Um valor percentual de tolerância sobre a meta (ex: 8% ou 0,08). **Este valor deve ser parametrizável na API.**
- **Fontes de Dados (para cada indicador afetado - Pneus/Peças):**
  - `MetaAprovada_M`: A meta final que foi definida para o mês anterior (M).
  - `GastoReal_M`: O valor total que foi gasto no indicador no mês anterior (M).
- **Lógica de Apuração (a ser executada no início de cada mês M+1):**
  1.  **Calcular o Teto de Gasto do Mês Anterior:**
      `TetoGasto_M = MetaAprovada_M * (1 + PercentualTolerancia)`
  2.  **Verificar se Houve Excedente:**
      Comparar `GastoReal_M` com `TetoGasto_M`.
  3.  **Calcular o Saldo Devedor:**
      - Se `GastoReal_M > TetoGasto_M`, então:
        `SaldoDevedor = GastoReal_M - TetoGasto_M`
      - Caso contrário:
        `SaldoDevedor = 0`
- **Output:**
  - `SaldoDevedor`: Este valor será subtraído da meta base do mês atual para os indicadores de Pneus e Peças.

---

### **3. Indicador Base: KM PREVISTA**

- **Objetivo:** Estimar a quilometragem total que a frota irá percorrer em um mês futuro (M+1).
- **Unidade:** Quilômetros (km).

#### **Regra de Negócio Específica: Classificação Manual de Feriados**

Esta regra é um pré-requisito para o cálculo da KM Prevista e garante o controle gerencial sobre a operação.

- **Objetivo:** Permitir que a diretoria defina o comportamento operacional de cada feriado, garantindo que a previsão de KM reflita a operação real planejada.
- **Processo:**
  1.  **Detecção Automática:** Ao iniciar a previsão para o mês futuro (M+1), a API deve consultar uma fonte de dados de feriados (nacionais, estaduais e municipais para **Brasília-DF**) e identificar todas as datas classificadas como feriado.
  2.  **Exigência de Classificação (Ponto de Interrupção):** Se feriados forem detectados, o processo de cálculo é **pausado**. O sistema deve exibir uma tela de gerenciamento para um usuário autorizado (diretor).
  3.  **Interface do Diretor:** A tela deve listar cada feriado encontrado (ex: `15/11/2025 - Proclamação da República`) e exigir que o diretor atribua uma das seguintes classificações operacionais para cada um:
      - Tratar como "Dia Útil"
      - Tratar como "Sábado"
      - Tratar como "Domingo"
  4.  **Confirmação e Continuidade:** Somente após o diretor salvar a classificação de **todos** os feriados do mês, o sistema é liberado para prosseguir com o cálculo da KM PREVISTA.

#### **Fontes de Dados:**

1.  **Operação Diária do Mês de Referência (M):** A quilometragem total realizada (`km_realizado`) em cada dia do mês anterior.
2.  **Calendário do Mês de Referência (M):** Detalhamento de dia da semana para cada dia.
3.  **Calendário do Mês Futuro (M+1) com Classificação de Feriados:** A contagem total de dias para cada categoria, já considerando as classificações manuais feitas pelo diretor.

#### **Lógica de Cálculo:**

**Etapa A: Análise do Mês de Referência (M)**

1.  **Segmentar dias:** Agrupar todos os dias do mês (M) em três categorias: "Dias Úteis", "Sábados" e "Domingos/Feriados".
2.  **Calcular Médias por Categoria:**
    - `MediaKmUtil = Soma(km_realizado dos Dias Úteis) / Total de Dias Úteis`
    - `MediaKmSabado = Soma(km_realizado dos Sábados) / Total de Sábados`
    - `MediaKmDomFer = Soma(km_realizado dos Domingos/Feriados) / Total de Domingos/Feriados`

**Etapa B: Projeção para o Mês Futuro (M+1)**

1.  **Contar Dias no Mês Futuro:** Obter a quantidade de dias de cada categoria para o mês da previsão (M+1), respeitando a classificação de feriados definida pelo diretor.
    - `QtdDiasUteis_M1`
    - `QtdSabados_M1`
    - `QtdDomingos_M1`
2.  **Projetar por Categoria:** Multiplicar a média de cada categoria pela quantidade de dias correspondente no mês futuro.
    - `PrevistoKmUtil = MediaKmUtil * QtdDiasUteis_M1`
    - `PrevistoKmSabado = MediaKmSabado * QtdSabados_M1`
    - `PrevistoKmDomFer = MediaKmDomFer * QtdDomingos_M1`
3.  **Calcular Total:** Somar as projeções.
    - `KM_PREVISTA = PrevistoKmUtil + PrevistoKmSabado + PrevistoKmDomFer`

---

### **4. Indicador de Custo: METAS DE COMBUSTÍVEL (LT e R$)**

- **Objetivo:** Calcular a meta operacional de consumo (Litros) e a projeção de custo (Reais).
- **Unidades:** Litros (LT) e Reais (R$).

#### **Fontes de Dados:**

1.  `KM_PREVISTA` por Garagem (Output do Indicador Base).
2.  **Histórico de Consumo e KM por Garagem (Últimos 3 Meses):**
    - `KmRodada` e `LitrosConsumidos` para os três meses fechados que antecedem o mês da previsão (M-1, M-2, M-3).
3.  `FatorReducao`: Percentual de meta de redução (ex: 1,5% ou 0,015).
4.  `PrecoPorLitro`: Custo de referência do combustível, inserido manualmente no dia do cálculo.

#### **Lógica de Cálculo (por Garagem):**

**Etapa A: Cálculo da Média de Consumo (Média Móvel de 3 Meses)**

1.  `TotalKm_3M = Km_M1 + Km_M2 + Km_M3`
2.  `TotalLitros_3M = Litros_M1 + Litros_M2 + Litros_M3`
3.  `MediaKmPorLitro = TotalKm_3M / TotalLitros_3M`

**Etapa B: Cálculo da Previsão Bruta (LT)**

1.  `LitrosPrevistoBruto = KM_PREVISTA / MediaKmPorLitro`

**Etapa C: Cálculo da Meta Operacional (LT)**

1.  `ValorReducao = LitrosPrevistoBruto * FatorReducao`
2.  `MetaConsumoLT = LitrosPrevistoBruto - ValorReducao`

**Etapa D: Cálculo da Projeção Financeira (Informativo)**

1.  `MetaCustoRS = LitrosPrevistoBruto * PrecoPorLitro`

#### **Outputs:**

- `MetaConsumoLT`: **Meta oficial da operação**, em Litros.
- `MetaCustoRS`: **Projeção financeira de suporte**, em Reais.

---

### **5. Indicador de Custo: META DE CUSTO COM PNEUS (R$)**

- **Objetivo:** Calcular a meta de custo com pneus, ajustada pelo saldo do mês anterior.
- **Unidade:** Reais (R$).

#### **Fontes de Dados:**

1.  `KM_PREVISTA` por Garagem (Output do Indicador Base).
2.  `CustoKmPneu`: Custo médio histórico de pneus por km (calculado no **Anexo A**).
3.  `PercentualPremiacao`: Percentual de redução da meta base (ex: 3% ou 0,03).
4.  `SaldoDevedor_Pneus`: Output da Regra de Negócio Global de Saldo.
5.  `QtdVeiculos` por Garagem.

#### **Lógica de Cálculo (por Garagem):**

**Etapa A: Cálculo da Meta Base**

1.  `CustoPrevistoBruto = KM_PREVISTA * CustoKmPneu`
2.  `ValorPremiacao = CustoPrevistoBruto * PercentualPremiacao`
3.  `MetaBase = CustoPrevistoBruto - ValorPremiacao`

**Etapa B: Aplicação do Saldo**

1.  `MetaFinalAjustada = MetaBase - SaldoDevedor_Pneus`

**Etapa C: Cálculo por Veículo (Informativo)**

1.  `MetaPorVeiculo = MetaFinalAjustada / QtdVeiculos`

#### **Output:**

- `MetaFinalAjustada`: **Meta oficial da operação**, em Reais.

---

### **6. Indicador de Custo: META DE CUSTO COM PEÇAS (R$)**

- **Objetivo:** Calcular a meta de custo com peças, ajustada pelo saldo do mês anterior.
- **Unidade:** Reais (R$).

#### **Fontes de Dados:**

1.  `KM_PREVISTA` por Garagem (Output do Indicador Base).
2.  `CustoKmPecas`: Custo médio histórico de peças por km (calculado no **Anexo A**).
3.  `PercentualPremiacao`: Percentual de redução da meta base (ex: 3% ou 0,03).
4.  `SaldoDevedor_Pecas`: Output da Regra de Negócio Global de Saldo.
5.  `QtdVeiculos` por Garagem.

#### **Lógica de Cálculo (por Garagem):**

**Etapa A: Cálculo da Meta Base**

1.  `CustoPrevistoBruto = KM_PREVISTA * CustoKmPecas`
2.  `ValorPremiacao = CustoPrevistoBruto * PercentualPremiacao`
3.  `MetaBase = CustoPrevistoBruto - ValorPremiacao`

**Etapa B: Aplicação do Saldo**

1.  `MetaFinalAjustada = MetaBase - SaldoDevedor_Pecas`

**Etapa C: Cálculo por Veículo (Informativo)**

1.  `MetaPorVeiculo = MetaFinalAjustada / QtdVeiculos`

#### **Output:**

- `MetaFinalAjustada`: **Meta oficial da operação**, em Reais.

---

### **7. Anexo A: Cálculo dos Custos Médios Anuais por Km (R$/Km)**

- **Objetivo:** Calcular o custo médio histórico por quilômetro (`R$/Km`) para os indicadores de **Peças** e **Pneus**.
- **Frequência:** O valor é atualizado mensalmente, considerando uma janela móvel dos últimos 12 meses.

#### **Fontes de Dados:**

1.  **Histórico de 12 Meses por Garagem:**
    - `Km Rodada` e `R$ Total Consumo` para cada um dos últimos 12 meses.

#### **Lógica de Cálculo (por Garagem e por tipo de indicador):**

1.  **Somar os Totais Anuais:**
    - `TotalKmAnual = Soma(Km Rodada dos últimos 12 meses)`
    - `TotalCustoAnual = Soma(R$ Total Consumo dos últimos 12 meses)`
2.  **Calcular o Custo Médio Anual por Km:**
    - `CustoMedioAnual_RS_Por_Km = TotalCustoAnual / TotalKmAnual`

---

### **Mapeamento de Dados para Consultas SQL**

Este documento detalha cada campo de dado bruto necessário para alimentar os cálculos da API, agrupado por sua provável origem no banco de dados.

#### **Fonte 1: Tabela de Operação Diária**

- **Descrição:** Contém os registros diários de performance de cada garagem. É a fonte de dados mais granular e fundamental.
- **Sugestão de Tabela:** `operacao_diaria`

| Nome do Campo (Sugestão) | Descrição                                                 | Exemplo             | Onde é Usado (Indicador)                                                              |
| :----------------------- | :-------------------------------------------------------- | :------------------ | :------------------------------------------------------------------------------------ |
| `data_operacao`          | A data específica em que a operação ocorreu.              | `2025-06-01`        | **KM PREVISTA:** Para agrupar os dias do mês de referência e identificar os feriados. |
| `garagem_id`             | Identificador único da garagem/setor.                     | `1` (São Sebastião) | **TODOS:** Para agrupar e calcular as metas por garagem.                              |
| `km_rodada`              | Quilometragem total percorrida pela garagem naquela data. | `19895`             | **KM PREVISTA:** Para calcular a média diária de KM por tipo de dia.                  |

---

#### **Fonte 2: Tabela de Consolidados Mensais**

- **Descrição:** Contém os dados já totalizados por mês para cada indicador e garagem. Essencial para os cálculos de médias históricas e para o sistema de saldo.
- **Sugestão de Tabela:** `consolidados_mensais`

| Nome do Campo (Sugestão)       | Descrição                                         | Exemplo      | Onde é Usado (Indicador)                                                                    |
| :----------------------------- | :------------------------------------------------ | :----------- | :------------------------------------------------------------------------------------------ |
| `ano_mes`                      | O ano e mês de referência do consolidado.         | `2025-06`    | **TODOS OS HISTÓRICOS:** Para buscar os últimos 3 ou 12 meses.                              |
| `garagem_id`                   | Identificador único da garagem/setor.             | `2` (Itapoã) | **TODOS OS HISTÓRICOS:** Para filtrar por garagem.                                          |
| `total_km_rodada_mes`          | Soma da `km_rodada` da garagem no mês.            | `1,175,482`  | **COMBUSTÍVEL:** Para a média de 3 meses. **Anexo A:** Para a média de 12 meses.            |
| `total_litros_combustivel_mes` | Total de litros de combustível consumidos no mês. | `389,232`    | **COMBUSTÍVEL:** Para o cálculo da média de eficiência dos últimos 3 meses.                 |
| `custo_total_pneus_mes`        | Custo total com pneus no mês (gasto real).        | `74,921.51`  | **PNEUS:** Para a média anual no **Anexo A** e para o **Sistema de Saldo** (`GastoReal_M`). |
| `custo_total_pecas_mes`        | Custo total com peças no mês (gasto real).        | `179,478.22` | **PEÇAS:** Para a média anual no **Anexo A** e para o **Sistema de Saldo** (`GastoReal_M`). |
| `meta_aprovada_pneus_mes`      | A meta final que foi definida para pneus no mês.  | `90,022.00`  | **PNEUS:** Para o **Sistema de Saldo** (`MetaAprovada_M`).                                  |
| `meta_aprovada_pecas_mes`      | A meta final que foi definida para peças no mês.  | `159,231.00` | **PEÇAS:** Para o **Sistema de Saldo** (`MetaAprovada_M`).                                  |

---

#### **Fonte 3: Tabela de Cadastro da Frota**

- **Descrição:** Tabela com a relação de veículos e a qual garagem pertencem.
- **Sugestão de Tabela:** `cadastro_veiculos`

| Nome do Campo (Sugestão)         | Descrição                               | Exemplo           | Onde é Usado (Indicador)                                           |
| :------------------------------- | :-------------------------------------- | :---------------- | :----------------------------------------------------------------- |
| `veiculo_id`                     | Identificador único do veículo.         | `10101`           | **PNEUS, PEÇAS:** Para a contagem de veículos por garagem.         |
| `garagem_id`                     | Garagem à qual o veículo está alocado.  | `3` (Santa Maria) | **PNEUS, PEÇAS:** Para agrupar a contagem de veículos por garagem. |
| **Dado Derivado:** `QtdVeiculos` | `COUNT(veiculo_id) GROUP BY garagem_id` | `189`             | **PNEUS, PEÇAS:** Para o cálculo do R$/Veículo.                    |

---

#### **Fonte 4: Tabela de Configuração de Parâmetros**

- **Descrição:** Tabela fundamental para armazenar as regras de negócio que podem mudar com o tempo, evitando a necessidade de alterar o código da API.
- **Sugestão de Tabela:** `parametros_calculo`

| Nome do Campo (Sugestão) | Descrição                         | Exemplo de Valor              | Onde é Usado (Indicador)                                       |
| :----------------------- | :-------------------------------- | :---------------------------- | :------------------------------------------------------------- |
| `nome_parametro`         | Identificador único do parâmetro. | `PERCENTUAL_TOLERANCIA_SALDO` | Para buscar o valor correto.                                   |
| `valor_parametro`        | O valor do parâmetro.             | `0.08`                        | **PNEUS, PEÇAS:** Na regra do Sistema de Saldo.                |
| `nome_parametro`         |                                   | `FATOR_REDUCAO_COMBUSTIVEL`   |                                                                |
| `valor_parametro`        |                                   | `0.015`                       | **COMBUSTÍVEL:** Para o cálculo da meta operacional em litros. |
| `nome_parametro`         |                                   | `PERCENTUAL_PREMIACAO_PNEUS`  |                                                                |
| `valor_parametro`        |                                   | `0.03`                        | **PNEUS:** Para o cálculo da Meta Base.                        |
| `nome_parametro`         |                                   | `PERCENTUAL_PREMIACAO_PECAS`  |                                                                |
| `valor_parametro`        |                                   | `0.03`                        | **PEÇAS:** Para o cálculo da Meta Base.                        |

---

#### **Fonte 5: Dados Externos e Entradas Manuais (Interface)**

- **Descrição:** Informações que não vêm diretamente do seu banco de dados ou que exigem interação do usuário.

| Nome do Dado                      | Descrição                                                         | Exemplo                                                      | Onde é Usado (Indicador)                                              |
| :-------------------------------- | :---------------------------------------------------------------- | :----------------------------------------------------------- | :-------------------------------------------------------------------- |
| `Lista de Feriados`               | Uma API externa ou tabela interna com os feriados de Brasília-DF. | `{"data": "2025-11-15", "nome": "Proclamação da República"}` | **KM PREVISTA:** Para a detecção automática de feriados.              |
| `Classificação Manual do Feriado` | Input do diretor na tela de gerenciamento.                        | `Domingo`                                                    | **KM PREVISTA:** Para categorizar corretamente os dias do mês futuro. |
| `Preço do Litro de Combustível`   | Input manual do usuário no momento do cálculo.                    | `4.46193`                                                    | **COMBUSTÍVEL:** Para a projeção financeira (cálculo informativo).    |
