1. consulta:
SELECT column_name, data_type, character_maximum_length 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE table_name = 'competition_periods';

Resultado:

id	integer	
createdAt	timestamp with time zone	
updatedAt	timestamp with time zone	
dataInicio	date	
dataFim	date	
fechadaPorUserId	integer	
fechadaEm	timestamp with time zone	
mesAno	character varying	7
status	character varying	20

2. consulta:
SELECT column_name, data_type, character_maximum_length 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE table_name = 'criteria';

Resultado:

id	integer	
index	integer	
ativo	boolean	
createdAt	timestamp with time zone	
updatedAt	timestamp with time zone	
nome	character varying	255
sentido_melhor	character varying	10
descricao	text	
unidade_medida	character varying	50

3. consulta:
SELECT column_name, data_type, character_maximum_length 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE table_name = 'criterion_scores';

Resultado:
id	bigint	
competitionPeriodId	integer	
sectorId	integer	
criterionId	integer	
realizedValue	numeric	
targetValue	numeric	
percentVsTarget	numeric	
rankInCriterion	integer	
scoreInCriterion	numeric	
calculatedAt	timestamp with time zone

4. consulta:
SELECT column_name, data_type, character_maximum_length 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE table_name = 'parameter_values';

Resultado:
competitionPeriodId	integer	
createdByUserId	integer	
createdAt	timestamp with time zone	
id	integer	
dataInicioEfetivo	date	
dataFimEfetivo	date	
criterionId	integer	
sectorId	integer	
previousVersionId	integer	
nomeParametro	character varying	100
valor	text	
justificativa	text

5. consulta:
SELECT column_name, data_type, character_maximum_length 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE table_name = 'performance_data';

Resultado:
id	bigint	
competitionPeriodId	integer	
sectorId	integer	
criterionId	integer	
metricDate	date	
valor	numeric	
targetValue	numeric	
loadTimestamp	timestamp with time zone	

6. consulta:
SELECT column_name, data_type, character_maximum_length 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE table_name = 'sectors';

Resultid	integer	
ativo	boolean	
createdAt	timestamp with time zone	
updatedAt	timestamp with time zone	
nome	character varying	255

-- Verificar dados de exemplo em competition_periods
SELECT * FROM competition_periods ORDER BY id DESC LIMIT 5;
id	mesAno	dataInicio	dataFim	status	fechadaPorUserId	fechadaEm	createdAt	updatedAt
3	2025-05	2025-05-01	2025-05-31	ATIVA	[NULL]	[NULL]	2025-05-16 14:27:32.304 -0300	2025-05-16 14:27:32.304 -0300
2	2025-04	2025-04-01	2025-04-30	FECHADA	[NULL]	[NULL]	2025-05-16 14:27:32.304 -0300	2025-05-16 14:27:32.304 -0300
1	2025-03	2025-03-01	2025-03-31	FECHADA	[NULL]	[NULL]	2025-05-16 14:27:32.304 -0300	2025-05-16 14:27:32.304 -0300

-- Verificar dados de exemplo em criteria
SELECT * FROM criteria ORDER BY id LIMIT 5;
id	nome	index	descricao	unidade_medida	sentido_melhor	ativo	createdAt	updatedAt
1	ATRASO	1	[NULL]	Qtd	MENOR	true	2025-05-16 14:27:32.292 -0300	2025-05-16 14:27:32.292 -0300
2	FURO POR VIAGEM	2	[NULL]	%	MENOR	true	2025-05-16 14:27:32.292 -0300	2025-05-16 14:27:32.292 -0300
3	QUEBRA	3	[NULL]	Qtd	MENOR	true	2025-05-16 14:27:32.292 -0300	2025-05-16 14:27:32.292 -0300
4	DEFEITO	4	[NULL]	Qtd	MENOR	true	2025-05-16 14:27:32.292 -0300	2025-05-16 14:27:32.292 -0300
5	FALTA FUNC	5	[NULL]	%	MENOR	true	2025-05-16 14:27:32.292 -0300	2025-05-16 14:27:32.292 -0300

-- Verificar dados de exemplo em criterion_scores (possível local das metas)
SELECT * FROM criterion_scores ORDER BY id DESC LIMIT 5;
id	competitionPeriodId	sectorId	criterionId	realizedValue	targetValue	percentVsTarget	rankInCriterion	scoreInCriterion	calculatedAt
60	3	2	15	328	757	43,3289	4	2,5	2025-05-16 14:28:12.852 -0300
59	3	4	15	636	1.523	41,7597	3	2	2025-05-16 14:28:12.852 -0300
58	3	3	15	307	762	40,2887	2	1,5	2025-05-16 14:28:12.852 -0300
57	3	1	15	244	647	37,7125	1	1	2025-05-16 14:28:12.852 -0300
56	3	2	14	197.984,485	390.917	50,6462	4	2,5	2025-05-16 14:28:12.852 -0300

-- Verificar dados de exemplo em parameter_values (possível local das metas)
SELECT * FROM parameter_values ORDER BY id DESC LIMIT 5;
id	nomeParametro	valor	dataInicioEfetivo	dataFimEfetivo	criterionId	sectorId	previousVersionId	createdByUserId	justificativa	createdAt	competitionPeriodId
69	ATRASO_SANTA MARIA	440	2025-05-21	[NULL]	1	3	68	1	444444	2025-05-17 13:46:31.841 -0300	3
68	ATRASO_SANTA MARIA	440	2025-05-20	2025-05-20	1	3	67	1	asdasdasdas (Versionado em 2025-05-17T16:46:31.841Z por Admin Sistema: 444444)	2025-05-17 13:24:17.896 -0300	3
67	ATRASO_SANTA MARIA	432	2025-05-19	2025-05-19	1	3	66	1	desenvolvimento (Versionado em 2025-05-17T16:24:17.897Z por Admin Sistema: asdasdasdas)	2025-05-17 13:23:25.005 -0300	3
66	ATRASO_SANTA MARIA	431	2025-05-18	2025-05-18	1	3	62	1	teste (Versionado em 2025-05-17T16:23:25.005Z por Admin Sistema: desenvolvimento)	2025-05-17 13:12:47.300 -0300	3
62	ATRASO_SANTA MARIA	431	2025-05-17	2025-05-17	1	3	[NULL]	1	Criação inicial da meta (Versionado em 2025-05-17T16:12:47.302Z por Admin Sistema: teste)	2025-05-17 11:54:02.794 -0300	3

-- Verificar dados de exemplo em performance_data (valores realizados)
SELECT * FROM performance_data ORDER BY id DESC LIMIT 5;
id	competitionPeriodId	sectorId	criterionId	metricDate	valor	targetValue	loadTimestamp
120	3	4	15	2025-05-01	636	1.523	2025-05-16 14:28:09.430 -0300
119	3	4	14	2025-05-01	226.332,492	460.413	2025-05-16 14:28:09.430 -0300
118	3	4	13	2025-05-01	66.305,78	103.970	2025-05-16 14:28:09.430 -0300
117	3	4	12	2025-05-01	177.543,64	221.305	2025-05-16 14:28:09.430 -0300
116	3	4	11	2025-05-01	6,9306	6,43	2025-05-16 14:28:09.430 -0300