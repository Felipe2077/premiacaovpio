achei uma falha nas lógica de rotas, meta só pode ser criada e editada em vigencia em planejamento, vigencia ativa e fechada não:

usando a rotas abaixo eu consigo criar uma meta mesmo com vigencia ativa, ela cria e o sistema já tem capacidade pelo versionamento de metas pegar a mais recente, então a rota nao barra a criação da meta

POST /api/parameters (para criação manual)
http://localhost:3001/api/parameters
body:
{
"nomeParametro": "META_PNEUS_GAMA_MAIO_TESTE",
"valor": "100000",
"dataInicioEfetivo": "2025-05-01",
"criterionId": 13, // ID do critério "PNEUS"
"sectorId": 1, // ID do setor "GAMA"
"competitionPeriodId": 3, // ID do período "2025-05" (PLANEJAMENTO)
"justificativa": "Meta inicial para Pneus GAMA em Maio"
}

resultado: 201 created:
{
"id": 61,
"nomeParametro": "META_PNEUS_GAMA_MAIO_TESTE",
"valor": "100000",
"dataInicioEfetivo": "2025-05-01",
"dataFimEfetivo": null,
"criterionId": 13,
"sectorId": 1,
"previousVersionId": null,
"createdByUserId": 1,
"justificativa": "Meta inicial para Pneus GAMA em Maio",
"createdAt": "2025-05-23T14:31:39.233Z",
"competitionPeriodId": 3,
"metadata": null
}
