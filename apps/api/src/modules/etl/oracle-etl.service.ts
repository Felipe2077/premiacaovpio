// apps/api/src/modules/etl/oracle-etl.service.ts (VERSÃO REALMENTE INTEGRAL E SEM COMENTÁRIOS DE CÓDIGO)
import { AppDataSource, OracleDataSource } from '@/database/data-source';
import { RawOracleAusenciaEntity } from '@/entity/raw-data/raw-oracle-ausencia.entity';
import { RawOracleColisaoEntity } from '@/entity/raw-data/raw-oracle-colisao.entity';
import { RawOracleEstoqueCustoEntity } from '@/entity/raw-data/raw-oracle-estoque-custo.entity';
import { RawOracleFleetPerformanceEntity } from '@/entity/raw-data/raw-oracle-fleet-performance.entity';
import { RawOracleKmOciosaEntity } from '@/entity/raw-data/raw-oracle-km-ociosa.entity';
import 'reflect-metadata';
import { DataSource, Repository } from 'typeorm';

// Interfaces para resultados crus das queries Oracle
interface AusenciaRawFromQuery {
  SETOR: string;
  OCORRENCIA: 'FALTA FUNC' | 'ATESTADO FUNC';
  DATA: Date;
  TOTAL: number | string;
}
interface ColisaoRawFromQuery {
  SETOR: string;
  DATA: Date;
  TOTAL: number | string;
}
interface EstoqueCustoRawFromQuery {
  SETOR: string;
  DATA: Date;
  TOTAL: number | string;
}
interface KmCombustivelRawFromQuery {
  SETOR: string;
  DATA_MES_ANO: Date;
  KM: number | string;
  QNTCOMB: number | string;
}
interface KmOciosaRawFromQuery {
  SETOR: string;
  DATA: Date;
  ociosaPercent: number | string;
}
interface IpkRawFromQuery {
  SETOR: string;
  OCORRENCIA: 'IPK';
  DATA: Date;
  TOTAL: number | string;
}

export class OracleEtlService {
  // Repositórios das tabelas RAW no POSTGRES (AppDataSource)
  private rawAusenciaRepo: Repository<RawOracleAusenciaEntity>;
  private rawColisaoRepo: Repository<RawOracleColisaoEntity>;
  private rawEstoqueCustoRepo: Repository<RawOracleEstoqueCustoEntity>;
  private rawFleetPerfRepo: Repository<RawOracleFleetPerformanceEntity>;
  private rawKmOciosaRepo: Repository<RawOracleKmOciosaEntity>;

  constructor() {
    this.rawAusenciaRepo = AppDataSource.getRepository(RawOracleAusenciaEntity);
    this.rawColisaoRepo = AppDataSource.getRepository(RawOracleColisaoEntity);
    this.rawEstoqueCustoRepo = AppDataSource.getRepository(
      RawOracleEstoqueCustoEntity
    );
    this.rawFleetPerfRepo = AppDataSource.getRepository(
      RawOracleFleetPerformanceEntity
    );
    this.rawKmOciosaRepo = AppDataSource.getRepository(RawOracleKmOciosaEntity);
    console.log(
      '[OracleEtlService] Instanciado e repositórios Raw configurados.'
    );
  }

  private async ensureOracleConnection(): Promise<DataSource> {
    const dataSource = OracleDataSource;
    if (!dataSource.isInitialized) {
      console.log('[Oracle ETL] Inicializando OracleDataSource...');
      await dataSource.initialize();
      console.log('[Oracle ETL] OracleDataSource inicializado.');
    }
    return dataSource;
  }
  private async ensurePostgresConnection(): Promise<DataSource> {
    const dataSource = AppDataSource;
    if (!dataSource.isInitialized) {
      console.log('[Oracle ETL] Inicializando AppDataSource (Postgres)...');
      await dataSource.initialize();
      console.log('[Oracle ETL] AppDataSource (Postgres) inicializado.');
    }
    return dataSource;
  }

  async extractAndLoadAusencia(
    startDate: string,
    endDate: string
  ): Promise<number> {
    const criterionNameForLog = 'Ausências (Falta/Atestado)';
    console.log(
      `[Oracle ETL] Iniciando extração/carga de ${criterionNameForLog} para ${startDate} a ${endDate}`
    );
    const oracleDataSource = await this.ensureOracleConnection();
    await this.ensurePostgresConnection();
    try {
      const query = `
            SELECT A.SETOR, A.OCORRENCIA, A.DATA, COUNT(DISTINCT A.CODFUNC) AS TOTAL
            FROM (
                SELECT CASE WHEN F.CODAREA = 1131 THEN 'SANTA MARIA' WHEN F.CODAREA = 1132 THEN 'GAMA' WHEN F.CODAREA BETWEEN 1141 AND 1144 THEN 'PARANOÁ' WHEN F.CODAREA = 1148 THEN 'SÃO SEBASTIÃO' ELSE 'OUTRAS' END AS SETOR,
                       'FALTA FUNC' AS OCORRENCIA, F.CODFUNC, TRUNC(H.DTHIST) AS DATA
                FROM FLP_HISTORICO H, VW_FUNCIONARIOS F
                WHERE H.CODINTFUNC = F.CODINTFUNC AND H.CODOCORR IN ('81')
                  AND H.DTHIST >= TO_DATE(:1, 'YYYY-MM-DD') AND H.DTHIST < TO_DATE(:2, 'YYYY-MM-DD') + 1
                  AND F.DESCFUNCAO NOT LIKE '%JOVEM%' AND F.CODAREA IN (1131, 1132, 1141, 1142, 1143, 1144, 1148)
            ) A
            WHERE A.SETOR <> 'OUTRAS' GROUP BY A.SETOR, A.OCORRENCIA, A.DATA
            UNION ALL
            SELECT A.SETOR, A.OCORRENCIA, A.DATA, COUNT(DISTINCT A.CODFUNC) AS TOTAL
            FROM (
                SELECT CASE WHEN F.CODAREA = 1131 THEN 'SANTA MARIA' WHEN F.CODAREA = 1132 THEN 'GAMA' WHEN F.CODAREA BETWEEN 1141 AND 1144 THEN 'PARANOÁ' WHEN F.CODAREA = 1148 THEN 'SÃO SEBASTIÃO' ELSE 'OUTRAS' END AS SETOR,
                       'ATESTADO FUNC' AS OCORRENCIA, F.CODFUNC, TRUNC(H.DTHIST) AS DATA
                FROM FLP_HISTORICO H, VW_FUNCIONARIOS F
                WHERE H.CODINTFUNC = F.CODINTFUNC AND H.CODOCORR IN ('82', '125')
                  AND H.DTHIST >= TO_DATE(:1, 'YYYY-MM-DD') AND H.DTHIST < TO_DATE(:2, 'YYYY-MM-DD') + 1
                  AND F.DESCFUNCAO NOT LIKE '%JOVEM%' AND F.CODAREA IN (1131, 1132, 1141, 1142, 1143, 1144, 1148)
            ) A
            WHERE A.SETOR <> 'OUTRAS' GROUP BY A.SETOR, A.OCORRENCIA, A.DATA
            ORDER BY SETOR, DATA, OCORRENCIA
            `;
      const parameters = [startDate, endDate];
      const results: AusenciaRawFromQuery[] = await oracleDataSource.query(
        query,
        parameters
      );
      console.log(
        `[Oracle ETL] Query Oracle ${criterionNameForLog} retornou ${results.length} registros.`
      );
      if (results.length === 0) return 0;

      const entitiesToSave = results.map((r) =>
        this.rawAusenciaRepo.create({
          metricDate: r.DATA.toISOString().split('T')[0],
          sectorName: r.SETOR,
          occurrenceType: r.OCORRENCIA,
          employeeCount: Number(r.TOTAL) || 0,
        })
      );

      console.log(
        `[Oracle ETL] Salvando ${entitiesToSave.length} registros em raw_oracle_ausencias...`
      );
      await this.rawAusenciaRepo.save(entitiesToSave, { chunk: 100 });
      console.log(
        `[Oracle ETL] Registros de ${criterionNameForLog} salvos no Postgres.`
      );
      return entitiesToSave.length;
    } catch (error) {
      console.error(
        `[Oracle ETL] ERRO ao extrair/carregar ${criterionNameForLog}:`,
        error
      );
      if (error instanceof Error && 'errorNum' in error) {
        console.error(`  [Oracle Error Num]: ${(error as any).errorNum}`);
      }
      return 0;
    }
  }

  async extractAndLoadColisao(
    startDate: string,
    endDate: string
  ): Promise<number> {
    const criterionName = 'COLISÃO';
    console.log(
      `[Oracle ETL] Iniciando extração/carga de ${criterionName} para ${startDate} a ${endDate}`
    );
    const oracleDataSource = await this.ensureOracleConnection();
    await this.ensurePostgresConnection();
    try {
      const query = `
            SELECT A.SETOR, TRUNC(A.DATA) AS DATA, COUNT(A.CODOCORR) AS TOTAL
            FROM (
                SELECT CASE WHEN V.CODIGOGA = 31 THEN 'PARANOÁ' WHEN V.CODIGOGA = 124 THEN 'SANTA MARIA' WHEN V.CODIGOGA = 239 THEN 'SÃO SEBASTIÃO' WHEN V.CODIGOGA = 240 THEN 'GAMA' ELSE 'OUTRAS' END AS SETOR,
                       I.DATARAINFGER AS DATA, I.CODOCORR
                FROM ACD_INFORMACOESGERAIS I, FRT_CADVEICULOS V
                WHERE I.CODOCORR = 70 AND I.DATARAINFGER >= TO_DATE(:1, 'YYYY-MM-DD') AND I.DATARAINFGER < TO_DATE(:2, 'YYYY-MM-DD') + 1
                  AND I.CODIGOVEIC = V.CODIGOVEIC AND V.CODIGOEMPRESA = 4 AND V.CODIGOGA IN (31, 124, 239, 240)
                  AND I.NUMERORAINFGERPRINCIPAL IS NULL
            ) A
            WHERE A.SETOR <> 'OUTRAS'
            GROUP BY A.SETOR, TRUNC(A.DATA)
            ORDER BY A.SETOR, DATA
            `;
      const parameters = [startDate, endDate];
      const results: ColisaoRawFromQuery[] = await oracleDataSource.query(
        query,
        parameters
      );
      console.log(
        `[Oracle ETL] Query Oracle ${criterionName} retornou ${results.length} registros.`
      );
      if (results.length === 0) return 0;

      const entitiesToSave = results.map((r) =>
        this.rawColisaoRepo.create({
          metricDate: r.DATA.toISOString().split('T')[0],
          sectorName: r.SETOR,
          totalCount: Number(r.TOTAL) || 0,
        })
      );

      console.log(
        `[Oracle ETL] Salvando ${entitiesToSave.length} registros em raw_oracle_colisoes...`
      );
      await this.rawColisaoRepo.save(entitiesToSave, { chunk: 100 });
      console.log(
        `[Oracle ETL] Registros de ${criterionName} salvos no Postgres.`
      );
      return entitiesToSave.length;
    } catch (error) {
      console.error(
        `[Oracle ETL] ERRO ao extrair/carregar ${criterionName}:`,
        error
      );
      if (error instanceof Error && 'errorNum' in error) {
        console.error(`  [Oracle Error Num]: ${(error as any).errorNum}`);
      }
      return 0;
    }
  }

  async extractAndLoadPecas(
    startDate: string,
    endDate: string
  ): Promise<number> {
    const criterionName = 'PEÇAS';
    console.log(
      `[Oracle ETL] Iniciando extração/carga de ${criterionName} para ${startDate} a ${endDate}`
    );
    const oracleDataSource = await this.ensureOracleConnection();
    await this.ensurePostgresConnection();
    try {
      const query = `
            SELECT A.SETOR, TRUNC(A.DATA) AS DATA, SUM(A.TOTAL) AS TOTAL
            FROM (
                SELECT CASE WHEN R.CODIGOGA = 31 THEN 'PARANOÁ' WHEN R.CODIGOGA = 124 THEN 'SANTA MARIA' WHEN R.CODIGOGA = 239 THEN 'SÃO SEBASTIÃO' WHEN R.CODIGOGA = 240 THEN 'GAMA' ELSE 'OUTRAS' END AS SETOR,
                       R.DATARQ AS DATA, ROUND(NVL(I.VALORTOTALITENSMOVTO,0), 2) TOTAL -- Usar NVL para evitar nulls na soma
                FROM EST_REQUISICAO R INNER JOIN EST_MOVTO M ON R.NUMERORQ = M.NUMERORQ
                      INNER JOIN EST_ITENSMOVTO I ON M.DATAMOVTO = I.DATAMOVTO AND I.SEQMOVTO = M.SEQMOVTO
                      INNER JOIN EST_CADMATERIAL J ON I.CODIGOMATINT = J.CODIGOMATINT
                      -- Removido Join com EST_DIVISAO D e CPGTPDES T pois não eram usados no WHERE/SELECT
                WHERE M.DATAMOVTO >= TO_DATE(:1, 'YYYY-MM-DD') AND M.DATAMOVTO < TO_DATE(:2, 'YYYY-MM-DD') + 1
                  AND R.CODIGOEMPRESA = 4 AND R.CODIGOGA IN (31, 124, 239, 240)
                  AND ((J.CODDIVISAO BETWEEN 5100 AND 5311) OR (J.CODDIVISAO BETWEEN 5500 AND 5730) OR (J.CODDIVISAO BETWEEN 7300 AND 7430) OR (J.CODDIVISAO IN(5470,6000,6010,6710,6730,6770,8200)))
                  AND M.CODIGOHISMOV IN (20, 48)
            ) A
            WHERE A.SETOR <> 'OUTRAS'
            GROUP BY A.SETOR, TRUNC(A.DATA)
            ORDER BY A.SETOR, DATA
            `;
      const parameters = [startDate, endDate];
      const results: EstoqueCustoRawFromQuery[] = await oracleDataSource.query(
        query,
        parameters
      );
      console.log(
        `[Oracle ETL] Query Oracle ${criterionName} retornou ${results.length} registros.`
      );
      if (results.length === 0) return 0;

      const entitiesToSave = results.map((r) =>
        this.rawEstoqueCustoRepo.create({
          metricDate: r.DATA.toISOString().split('T')[0],
          sectorName: r.SETOR,
          criterionName: criterionName,
          totalValue: Number(r.TOTAL) || 0,
        })
      );

      console.log(
        `[Oracle ETL] Salvando ${entitiesToSave.length} registros em raw_oracle_estoque_custos...`
      );
      await this.rawEstoqueCustoRepo.save(entitiesToSave, { chunk: 100 });
      console.log(
        `[Oracle ETL] Registros de ${criterionName} salvos no Postgres.`
      );
      return entitiesToSave.length;
    } catch (error) {
      console.error(
        `[Oracle ETL] ERRO ao extrair/carregar ${criterionName}:`,
        error
      );
      if (error instanceof Error && 'errorNum' in error) {
        console.error(`  [Oracle Error Num]: ${(error as any).errorNum}`);
      }
      return 0;
    }
  }

  async extractAndLoadPneus(
    startDate: string,
    endDate: string
  ): Promise<number> {
    const criterionName = 'PNEUS';
    console.log(
      `[Oracle ETL] Iniciando extração/carga de ${criterionName} para ${startDate} a ${endDate}`
    );
    const oracleDataSource = await this.ensureOracleConnection();
    await this.ensurePostgresConnection();
    try {
      const query = `
            SELECT A.SETOR, TRUNC(A.DATA) AS DATA, SUM(A.TOTAL) AS TOTAL
            FROM (
                SELECT CASE WHEN R.CODIGOGA = 31 THEN 'PARANOÁ' WHEN R.CODIGOGA = 124 THEN 'SANTA MARIA' WHEN R.CODIGOGA = 239 THEN 'SÃO SEBASTIÃO' WHEN R.CODIGOGA = 240 THEN 'GAMA' ELSE 'OUTRAS' END AS SETOR,
                       R.DATARQ AS DATA, ROUND(NVL(I.VALORTOTALITENSMOVTO,0), 2) TOTAL
                FROM EST_REQUISICAO R INNER JOIN EST_MOVTO M ON R.NUMERORQ = M.NUMERORQ
                      INNER JOIN EST_ITENSMOVTO I ON M.DATAMOVTO = I.DATAMOVTO AND I.SEQMOVTO = M.SEQMOVTO
                      INNER JOIN EST_CADMATERIAL J ON I.CODIGOMATINT = J.CODIGOMATINT
                WHERE M.DATAMOVTO >= TO_DATE(:1, 'YYYY-MM-DD') AND M.DATAMOVTO < TO_DATE(:2, 'YYYY-MM-DD') + 1
                  AND R.CODIGOEMPRESA = 4 AND R.CODIGOGA IN (31, 124, 239, 240)
                  AND J.CODDIVISAO IN (5400,5410,5420,5430,5440,5450,5460,5480,5490) -- Filtro Pneus
                  AND M.CODIGOHISMOV IN (20, 48)
            ) A
            WHERE A.SETOR <> 'OUTRAS'
            GROUP BY A.SETOR, TRUNC(A.DATA)
            ORDER BY A.SETOR, DATA
            `;
      const parameters = [startDate, endDate];
      const results: EstoqueCustoRawFromQuery[] = await oracleDataSource.query(
        query,
        parameters
      );
      console.log(
        `[Oracle ETL] Query Oracle ${criterionName} retornou ${results.length} registros.`
      );
      if (results.length === 0) return 0;

      const entitiesToSave = results.map((r) =>
        this.rawEstoqueCustoRepo.create({
          metricDate: r.DATA.toISOString().split('T')[0],
          sectorName: r.SETOR,
          criterionName: criterionName,
          totalValue: Number(r.TOTAL) || 0,
        })
      );

      console.log(
        `[Oracle ETL] Salvando ${entitiesToSave.length} registros em raw_oracle_estoque_custos...`
      );
      await this.rawEstoqueCustoRepo.save(entitiesToSave, { chunk: 100 });
      console.log(
        `[Oracle ETL] Registros de ${criterionName} salvos no Postgres.`
      );
      return entitiesToSave.length;
    } catch (error) {
      console.error(
        `[Oracle ETL] ERRO ao extrair/carregar ${criterionName}:`,
        error
      );
      if (error instanceof Error && 'errorNum' in error) {
        console.error(`  [Oracle Error Num]: ${(error as any).errorNum}`);
      }
      return 0;
    }
  }

  // --- Métodos que usam funções/lógica mais complexa ---
  async extractAndLoadIpk(startDate: string, endDate: string): Promise<number> {
    const criterionName = 'IPK';
    console.log(
      `[Oracle ETL] Iniciando extração/carga de ${criterionName} para ${startDate} a ${endDate}`
    );
    const oracleDataSource = await this.ensureOracleConnection();
    await this.ensurePostgresConnection(); // Precisa do Postgres para salvar no raw futuramente
    try {
      const query = `
            SELECT CASE WHEN B.SETOR= 31 THEN 'PARANOÁ'
                        WHEN B.SETOR= 124 THEN 'SANTA MARIA'
                        WHEN B.SETOR= 239 THEN 'SÃO SEBASTIÃO'
                        WHEN B.SETOR= 240 THEN 'GAMA'
                   ELSE 'OUTRAS' END AS SETOR,
                   B.OCORRENCIA,
                   B.DATA, -- Esta é a DATA_MES_ANO agregada
                   CASE WHEN NVL(B.KM, 0) = 0 THEN 0 ELSE ROUND((B.PASSAGEIROS / B.KM), 4) END AS TOTAL -- Usando 4 casas decimais para precisão no IPK
            FROM
            (   -- Subquery B: Agrupa os resultados de A por mês/garagem
                SELECT A.CIDADE AS SETOR,
                       'IPK' AS OCORRENCIA,
                       SUM(A.PASSAGEIROS) AS PASSAGEIROS,
                       SUM(A.KM_OPERACIONAL) AS KM,
                       A.DATA -- DATA aqui é a DATA_MES_ANO vinda de A
                FROM
                (   -- Subquery A: Junta Passageiros (P), KM (K), e Ajuste Passageiros (PV) por dia/garagem e calcula passageiros ajustados
                    SELECT P.CIDADE,
                           CASE WHEN P.CIDADE = 124 AND P.DATA_MES_ANO = PV.DATA_MES_ANO THEN (NVL(P.PASSAGEIROS,0) - NVL(PV.PASSAGEIROS,0))
                                WHEN P.CIDADE = 240 AND P.DATA_MES_ANO = PV.DATA_MES_ANO THEN (NVL(P.PASSAGEIROS,0) + NVL(PV.PASSAGEIROS,0))
                           ELSE NVL(P.PASSAGEIROS,0) END AS PASSAGEIROS, -- Garante que não será nulo
                           NVL(K.KM_OPERACIONAL, 0) AS KM_OPERACIONAL, -- Garante que não será nulo
                           P.DATA_MES_ANO AS DATA -- DATA_MES_ANO (já truncado para mês)
                    FROM
                        /* Subquery P: Passageiros por Garagem/Mês */
                        (SELECT L.CODIGOGA AS CIDADE, SUM(NVL(D.QTD_PASSAG_TRANS,0)) AS PASSAGEIROS, TRUNC(G.DAT_VIAGEM_GUIA, 'mm') AS DATA_MES_ANO
                         FROM T_ARR_GUIA G
                         JOIN T_ARR_DETALHE_GUIA D ON G.COD_SEQ_GUIA = D.COD_SEQ_GUIA
                         JOIN T_ARR_VIAGENS_GUIA V ON D.COD_SEQ_GUIA = V.COD_SEQ_GUIA AND D.COD_SEQ_VIAGEM = V.COD_SEQ_VIAGEM
                         JOIN BGM_CADLINHAS L ON V.COD_INTLINHA = L.CODINTLINHA
                         WHERE G.DAT_VIAGEM_GUIA BETWEEN TO_DATE(:1, 'YYYY-MM-DD') AND TO_DATE(:2, 'YYYY-MM-DD') + 0.99999
                           AND L.CODIGOGA IN (31, 124, 239, 240) AND L.CODIGOEMPRESA = 4
                           AND D.COD_TIPOPAGTARIFA NOT IN (3)
                         GROUP BY L.CODIGOGA, TRUNC(G.DAT_VIAGEM_GUIA, 'mm')) P
                        LEFT JOIN
                        /* Subquery K: KM Operacional por Garagem/Mês (usando função GLOBUS) */
                        (SELECT L.CODIGOGA AS CIDADE, SUM(NVL(GLOBUS.FC_ARR_KMBCO_VIAGENS(BC.IDBCO, 0 ,BV.IDBCOVIAGENS), 0)) AS KM_OPERACIONAL, TRUNC(BC.DATABCO, 'mm') AS DATA_MES_ANO
                         FROM T_ARR_BCO BC
                         JOIN T_ARR_BCO_VIAGENS BV ON BC.IDBCO = BV.IDBCO
                         JOIN BGM_CADLINHAS L ON BV.CODINTLINHA = L.CODINTLINHA -- CORRIGIDO AQUI (sem _)
                         WHERE BC.DATABCO BETWEEN TO_DATE(:1, 'YYYY-MM-DD') AND TO_DATE(:2, 'YYYY-MM-DD') + 0.99999
                           AND BC.CODIGOEMPRESA = 4 AND L.CODIGOGA IN (31, 124, 239, 240)
                         GROUP BY L.CODIGOGA, TRUNC(BC.DATABCO, 'mm')) K ON P.CIDADE = K.CIDADE AND P.DATA_MES_ANO = K.DATA_MES_ANO
                        LEFT JOIN
                        /* Subquery PV: Ajuste Passageiros Específicos por Garagem/Mês */
                        (SELECT L.CODIGOGA AS CIDADESAIDA, 240 AS CIDADEENTRADA, SUM(NVL(D.QTD_PASSAG_TRANS,0)) AS PASSAGEIROS, TRUNC(G.DAT_VIAGEM_GUIA, 'mm') AS DATA_MES_ANO
                         FROM T_ARR_GUIA G
                         JOIN T_ARR_DETALHE_GUIA D ON G.COD_SEQ_GUIA = D.COD_SEQ_GUIA
                         JOIN T_ARR_VIAGENS_GUIA V ON D.COD_SEQ_GUIA = V.COD_SEQ_GUIA AND D.COD_SEQ_VIAGEM = V.COD_SEQ_VIAGEM
                         JOIN BGM_CADLINHAS L ON V.COD_INTLINHA = L.CODINTLINHA
                         JOIN FRT_CADVEICULOS VE ON V.COD_VEICULO = VE.CODIGOVEIC
                         WHERE G.DAT_VIAGEM_GUIA BETWEEN TO_DATE(:1, 'YYYY-MM-DD') AND TO_DATE(:2, 'YYYY-MM-DD') + 0.99999
                           AND L.CODIGOGA IN (124, 240) AND L.CODIGOEMPRESA = 4
                           AND D.COD_TIPOPAGTARIFA NOT IN (3)
                           AND VE.PREFIXOVEIC IN ('0002241','0002243','0002246','0002248')
                         GROUP BY L.CODIGOGA, TRUNC(G.DAT_VIAGEM_GUIA, 'mm')) PV ON P.CIDADE = PV.CIDADESAIDA AND P.DATA_MES_ANO = PV.DATA_MES_ANO
                ) A
                WHERE A.KM_OPERACIONAL IS NOT NULL AND A.KM_OPERACIONAL > 0 -- Evita NULO e divisão por zero antes do Group By
                GROUP BY A.CIDADE, A.DATA -- Agrupa por Garagem e Mês/Ano
            ) B
            WHERE B.SETOR <> 'OUTRAS' -- Filtra setores não mapeados na query externa
            ORDER BY SETOR, DATA
            `; // Query completa do IPK aqui
      const parameters = [startDate, endDate]; // Datas definem o mês(es)
      const results: IpkRawFromQuery[] = await oracleDataSource.query(
        query,
        parameters
      );
      console.log(
        `[Oracle ETL] Query Oracle ${criterionName} retornou ${results.length} registros.`
      );
      if (results.length === 0) return 0;

      // TODO: Definir entidade RawOracleIpkEntity (com PASSAGEIROS e KM) e salvar nela.
      console.warn(
        `[Oracle ETL] Carga para ${criterionName} não implementada ainda (só extração).`
      );
      return results.length;
    } catch (error) {
      /* ... error handling ... */ return 0;
    }
  }

  // --- Métodos para Desempenho de Frota (KM/L e Litros) ---
  private async extractKmCombustivelBase(
    startDate: string,
    endDate: string
  ): Promise<KmCombustivelRawFromQuery[]> {
    console.log(
      `[Oracle ETL] Iniciando extração base de KM/Combustível para ${startDate} a ${endDate}`
    );
    const oracleDataSource = await this.ensureOracleConnection();
    try {
      // Query que busca SUM(KM) e SUM(QNTCOMB) por mês/setor
      const query = `
                SELECT B.SETOR, B.DATA_MES_ANO, B.KM, B.QNTCOMB, B.PASSAGEIROS -- Adicionado Passageiros
                FROM (
                   SELECT A.CIDADE AS SETOR, TRUNC(A.DATA, 'mm') AS DATA_MES_ANO,
                          SUM(A.PASSAGEIROS) AS PASSAGEIROS,
                          SUM(A.KM_OPERACIONAL) AS KM,
                          SUM(A.QNTCOMB) AS QNTCOMB
                   FROM (
                       SELECT P.CIDADE,
                              /* Lógica CASE Passageiros completa */
                              CASE WHEN P.CIDADE = 124 AND P.DATA_MES_ANO = PV.DATA_MES_ANO THEN (NVL(P.PASSAGEIROS,0) - NVL(PV.PASSAGEIROS,0)) WHEN P.CIDADE = 240 AND P.DATA_MES_ANO = PV.DATA_MES_ANO THEN (NVL(P.PASSAGEIROS,0) + NVL(PV.PASSAGEIROS,0)) ELSE NVL(P.PASSAGEIROS,0) END AS PASSAGEIROS,
                              NVL(K.KM_OPERACIONAL, 0) AS KM_OPERACIONAL,
                              NVL(C.QTDECOMB, 0) AS QNTCOMB,
                              P.DATA_MES_ANO AS DATA
                       FROM
                           (SELECT L.CODIGOGA AS CIDADE, SUM(NVL(D.QTD_PASSAG_TRANS,0)) AS PASSAGEIROS, TRUNC(G.DAT_VIAGEM_GUIA, 'mm') AS DATA_MES_ANO FROM T_ARR_GUIA G JOIN T_ARR_DETALHE_GUIA D ON G.COD_SEQ_GUIA = D.COD_SEQ_GUIA JOIN T_ARR_VIAGENS_GUIA V ON D.COD_SEQ_GUIA = V.COD_SEQ_GUIA AND D.COD_SEQ_VIAGEM = V.COD_SEQ_VIAGEM JOIN BGM_CADLINHAS L ON V.COD_INTLINHA = L.CODINTLINHA WHERE G.DAT_VIAGEM_GUIA BETWEEN TO_DATE(:1, 'YYYY-MM-DD') AND TO_DATE(:2, 'YYYY-MM-DD') + 0.99999 AND L.CODIGOGA IN (31, 124, 239, 240) AND L.CODIGOEMPRESA = 4 AND D.COD_TIPOPAGTARIFA NOT IN (3) GROUP BY L.CODIGOGA, TRUNC(G.DAT_VIAGEM_GUIA, 'mm')) P
                           LEFT JOIN (SELECT L.CODIGOGA AS CIDADE, SUM(NVL(GLOBUS.FC_ARR_KMBCO_VIAGENS(BC.IDBCO, 0 ,BV.IDBCOVIAGENS), 0)) AS KM_OPERACIONAL, TRUNC(BC.DATABCO, 'mm') AS DATA_MES_ANO FROM T_ARR_BCO BC JOIN T_ARR_BCO_VIAGENS BV ON BC.IDBCO = BV.IDBCO JOIN BGM_CADLINHAS L ON BV.CODINTLINHA = L.CODINTLINHA WHERE BC.DATABCO BETWEEN TO_DATE(:1, 'YYYY-MM-DD') AND TO_DATE(:2, 'YYYY-MM-DD') + 0.99999 AND BC.CODIGOEMPRESA = 4 AND L.CODIGOGA IN (31, 124, 239, 240) GROUP BY L.CODIGOGA, TRUNC(BC.DATABCO, 'mm')) K ON P.CIDADE = K.CIDADE AND P.DATA_MES_ANO = K.DATA_MES_ANO
                           LEFT JOIN (SELECT V.CODIGOGA AS CIDADE, SUM(NVL(C.QTDECOMB,0)) AS QTDECOMB, TRUNC(C.DATAABASTCARRO, 'mm') AS DATA_MES_ANO FROM VWABA_CONSCOMBREPVEIC C JOIN FRT_CADVEICULOS V ON C.CODIGOVEIC=V.CODIGOVEIC WHERE C.DATAABASTCARRO BETWEEN TO_DATE(:1, 'YYYY-MM-DD') AND TO_DATE(:2, 'YYYY-MM-DD') + 0.99999 AND V.CODIGOGA IN (31, 124, 239, 240) AND V.CODIGOEMPRESA = 4 GROUP BY V.CODIGOGA, TRUNC(C.DATAABASTCARRO, 'mm') ) C ON P.CIDADE = C.CIDADE AND P.DATA_MES_ANO = C.DATA_MES_ANO
                           LEFT JOIN (SELECT L.CODIGOGA AS CIDADESAIDA, SUM(NVL(D.QTD_PASSAG_TRANS,0)) AS PASSAGEIROS, TRUNC(G.DAT_VIAGEM_GUIA, 'mm') AS DATA_MES_ANO FROM T_ARR_GUIA G JOIN T_ARR_DETALHE_GUIA D ON G.COD_SEQ_GUIA = D.COD_SEQ_GUIA JOIN T_ARR_VIAGENS_GUIA V ON D.COD_SEQ_GUIA = V.COD_SEQ_GUIA AND D.COD_SEQ_VIAGEM = V.COD_SEQ_VIAGEM JOIN BGM_CADLINHAS L ON V.COD_INTLINHA = L.CODINTLINHA JOIN FRT_CADVEICULOS VE ON V.COD_VEICULO = VE.CODIGOVEIC WHERE G.DAT_VIAGEM_GUIA BETWEEN TO_DATE(:1, 'YYYY-MM-DD') AND TO_DATE(:2, 'YYYY-MM-DD') + 0.99999 AND L.CODIGOGA IN (124, 240) AND L.CODIGOEMPRESA = 4 AND D.COD_TIPOPAGTARIFA NOT IN (3) AND VE.PREFIXOVEIC IN ('0002241','0002243','0002246','0002248') GROUP BY L.CODIGOGA, TRUNC(G.DAT_VIAGEM_GUIA, 'mm')) PV ON P.CIDADE = PV.CIDADESAIDA AND P.DATA_MES_ANO = PV.DATA_MES_ANO
                   ) A
                   GROUP BY A.CIDADE, A.DATA
                ) B
                ORDER BY B.SETOR, B.DATA_MES_ANO
             `;
      const parameters = [startDate, endDate];
      console.log(
        '[Oracle ETL] Executando query base de KM/Combustível no Oracle...'
      );
      const results: KmCombustivelRawFromQuery[] = await oracleDataSource.query(
        query,
        parameters
      );
      console.log(
        `[Oracle ETL] Query base KM/Combustível retornou ${results.length} registros.`
      );
      return results;
    } catch (error) {
      /* ... error handling ... */ return [];
    }
  }

  async extractAndLoadFleetPerformance(
    startDate: string,
    endDate: string
  ): Promise<number> {
    const results = await this.extractKmCombustivelBase(startDate, endDate);
    if (results.length === 0) return 0;
    await this.ensurePostgresConnection();
    try {
      const entitiesToSave = results.map((r) => {
        const totalKm = Number(r.KM) || 0;
        const totalFuelLiters = Number(r.QNTCOMB) || 0;
        const avgKmL =
          totalFuelLiters > 0
            ? Number((totalKm / totalFuelLiters).toFixed(4))
            : 0;
        let sectorName = 'OUTRAS';
        if (r.SETOR == '31') sectorName = 'PARANOÁ';
        else if (r.SETOR == '124') sectorName = 'SANTA MARIA';
        else if (r.SETOR == '239') sectorName = 'SÃO SEBASTIÃO';
        else if (r.SETOR == '240') sectorName = 'GAMA';

        return this.rawFleetPerfRepo.create({
          metricMonth: r.DATA_MES_ANO.toISOString().substring(0, 7),
          sectorName: sectorName,
          totalKm: totalKm,
          totalFuelLiters: totalFuelLiters,
          avgKmL: avgKmL,
        });
      });
      console.log(
        `[Oracle ETL] Salvando ${entitiesToSave.length} registros em raw_oracle_fleet_performance...`
      );
      await this.rawFleetPerfRepo.save(entitiesToSave, { chunk: 100 });
      console.log(
        `[Oracle ETL] Registros de Desempenho de Frota salvos no Postgres.`
      );
      return entitiesToSave.length;
    } catch (error) {
      /* ... error handling ... */ return 0;
    }
  }

  // --- Extração de KM Ociosa ---
  async extractAndLoadKmOciosa(
    startDate: string,
    endDate: string
  ): Promise<number> {
    const criterionName = 'KM OCIOSA';
    console.log(
      `[Oracle ETL] Iniciando extração/carga de ${criterionName} para ${startDate} a ${endDate}`
    );
    const oracleDataSource = await this.ensureOracleConnection();
    await this.ensurePostgresConnection();
    try {
      // Query adaptada da Consulta 12 (PI_KMOCIOSA) - USA FUNÇÃO GLOBUS FC_ARR_KMBCO
      // Assumindo agregação MENSAL e corrigindo a DATA fixa
      const query = `
            SELECT
                B.SETOR,
                B.DATA_MES_ANO AS DATA,
                -- Fórmula final do % KM Ociosa como na PBI Query 12
                ROUND((((SUM(NVL(B.KM_HOD2, 0)) - SUM(NVL(B.KM_OPER, 0))) / CASE WHEN SUM(NVL(B.KM_OPER, 0)) = 0 THEN 1 ELSE SUM(NVL(B.KM_OPER, 0)) END ) * 100), 2) AS ociosaPercent
            FROM (
                SELECT
                    A.CODIGOGA,
                    CASE WHEN A.CODIGOGA = 31 THEN 'PARANOÁ' WHEN A.CODIGOGA = 124 THEN 'SANTA MARIA' WHEN A.CODIGOGA = 239 THEN 'SÃO SEBASTIÃO' WHEN A.CODIGOGA = 240 THEN 'GAMA' ELSE 'OUTRAS' END AS SETOR,
                    TRUNC(A.DATA_BASE, 'mm') AS DATA_MES_ANO,
                    A.KM_HOD2,
                    A.KM_OPER
                FROM (
                    -- Subquery A interna: Calcula KMs base por dia/garagem
                    SELECT
                        COALESCE(BC.CODIGOGA, HO.CODIGOGA, ES.CODIGOGA, KI.CODIGOGA) as CODIGOGA,
                        COALESCE(BC.DATA_BASE, HO.DATA_BASE, ES.DATA_BASE /* KI não tem data */) as DATA_BASE,
                        NVL(BC.KM_OPER, 0) AS KM_OPER,
                        NVL(HO.KM_HOD, 0) AS KM_HOD,
                        (NVL(ES.KM_ESP, 0) + NVL(KI.KMTOTALINT, 0)) AS KM_TOTAL_NAO_OPER_CONHECIDO,
                        (NVL(HO.KM_HOD, 0) - (NVL(ES.KM_ESP, 0) + NVL(KI.KMTOTALINT, 0))) AS KM_HOD2
                    FROM
                         -- Usar BS como base principal de Garagens
                        (SELECT DISTINCT CODIGOGA FROM FRT_CADVEICULOS WHERE CODIGOEMPRESA = 4 AND CODIGOGA IN (31, 124, 239, 240)) BS
                        LEFT JOIN
                        (SELECT V.CODIGOGA, TRUNC(A.DATABCO) AS DATA_BASE, SUM(NVL(GLOBUS.FC_ARR_KMBCO(A.IDBCO, 0), 0)) AS KM_OPER, SUM(NVL(GLOBUS.FC_ARR_KMBCO(A.IDBCO, 1), 0)) AS KM_OCIOSA
                         FROM T_ARR_BCO A INNER JOIN T_ARR_BCO_VIAGENS B ON A.IDBCO = B.IDBCO INNER JOIN FRT_CADVEICULOS V ON B.CODIGOVEIC = V.CODIGOVEIC
                         WHERE A.DATABCO BETWEEN TO_DATE(:1, 'YYYY-MM-DD') AND TO_DATE(:2, 'YYYY-MM-DD') + 0.99999 AND A.CODIGOEMPRESA = 4 AND V.CODIGOGA IN (31, 124, 239, 240)
                         GROUP BY V.CODIGOGA, TRUNC(A.DATABCO)) BC ON BS.CODIGOGA = BC.CODIGOGA
                        LEFT JOIN
                        (SELECT V.CODIGOGA, TRUNC(C.DATAVELOC) AS DATA_BASE, SUM(C.KMPERCORRIDOVELOC) AS KM_HOD
                         FROM VWABA_CONFKMCARRO C JOIN FRT_CADVEICULOS V ON V.CODIGOVEIC = C.CODIGOVEIC
                         WHERE C.DATAVELOC >= TO_DATE(:1, 'YYYY-MM-DD') AND C.DATAVELOC < TO_DATE(:2, 'YYYY-MM-DD') + 1 AND V.CODIGOEMPRESA = 4 AND V.CODIGOGA IN (31, 124, 239, 240)
                           AND TO_TIMESTAMP(TO_CHAR(C.DATAVELOC, 'YYYY-MM-DD') || ' ' || C.HORAVELOC, 'YYYY-MM-DD HH24:MI') >= TO_TIMESTAMP(TO_CHAR(C.DATAVELOC, 'YYYY-MM-DD') || ' 04:00', 'YYYY-MM-DD HH24:MI')
                         GROUP BY V.CODIGOGA, TRUNC(C.DATAVELOC)) HO ON BS.CODIGOGA = HO.CODIGOGA AND BC.DATA_BASE = HO.DATA_BASE -- Join ON DATA needed
                       LEFT JOIN
                       (SELECT V.CODIGOGA, TRUNC(M.DTSAIDA) AS DATA_BASE, SUM(M.ODOMETROFIN - M.ODOMETROINIC) AS KM_ESP
                        FROM PLT_SAIDARECOLHIDA M JOIN FRT_CADVEICULOS V ON M.CODIGOVEIC = V.CODIGOVEIC
                        WHERE M.DTSAIDA >= TO_DATE(:1, 'YYYY-MM-DD') AND M.DTSAIDA < TO_DATE(:2, 'YYYY-MM-DD') + 1 AND M.CODOCORRPLTSAIDA BETWEEN 17 AND 26 AND V.CODIGOEMPRESA = 4 AND V.CODIGOGA IN (31, 124, 239, 240)
                        GROUP BY V.CODIGOGA, TRUNC(M.DTSAIDA)) ES ON BS.CODIGOGA = ES.CODIGOGA AND COALESCE(BC.DATA_BASE, HO.DATA_BASE) = ES.DATA_BASE -- Join ON DATA needed
                       LEFT JOIN
                       (SELECT A.CODIGOGA, SUM(A.QTDVEICFRT * A.KM_INT) AS KMTOTALINT FROM (SELECT V.CODIGOGA, COUNT(V.PREFIXOVEIC) AS QTDVEICFRT, CASE WHEN V.CODIGOGA IN (31, 239) THEN 0.60 WHEN V.CODIGOTPFROTA IN (11, 9) AND V.CODIGOGA = 240 THEN 0.21 WHEN V.CODIGOTPFROTA IN (3, 12) AND V.CODIGOGA = 240 THEN 0.60 WHEN V.CODIGOTPFROTA = 9 AND V.CODIGOGA = 124 THEN 0.60 WHEN V.CODIGOTPFROTA NOT IN (9) AND V.CODIGOGA = 124 THEN 0.80 ELSE 0 END AS KM_INT FROM FRT_CADVEICULOS V WHERE V.CODIGOEMPRESA = 4 AND V.CONDICAOVEIC = 'A' AND V.CODIGOGA IN (31, 124, 239, 240) GROUP BY V.CODIGOGA, V.CODIGOTPFROTA) A GROUP BY A.CODIGOGA) KI ON BS.CODIGOGA = KI.CODIGOGA
                ) A
            ) B
            WHERE B.KM_OPER IS NOT NULL AND B.KM_OPER > 0 AND B.SETOR <> 'OUTRAS' -- Evita divisão por zero e setor não mapeado
            GROUP BY B.SETOR, B.DATA_MES_ANO -- Agrupa resultado final por Mês/Setor
            ORDER BY B.SETOR, B.DATA_MES_ANO
            `;
      const parameters = [startDate, endDate];
      const results: KmOciosaRawFromQuery[] = await oracleDataSource.query(
        query,
        parameters
      );
      console.log(
        `[Oracle ETL] Query Oracle ${criterionName} retornou ${results.length} registros.`
      );

      if (results.length === 0) return 0;

      // Salva o percentual final calculado
      const entitiesToSave = results.map((r) =>
        this.rawKmOciosaRepo.create({
          metricMonth: r.DATA.toISOString().substring(0, 7), // Formato YYYY-MM
          sectorName: r.SETOR,
          ociosaPercent: Number(r.ociosaPercent) || 0,
        })
      );

      console.log(
        `[Oracle ETL] Salvando ${entitiesToSave.length} registros em raw_oracle_km_ociosa...`
      );
      await this.rawKmOciosaRepo.save(entitiesToSave, { chunk: 100 });
      console.log(
        `[Oracle ETL] Registros de ${criterionName} salvos no Postgres.`
      );
      return entitiesToSave.length;
    } catch (error) {
      console.error(
        `[Oracle ETL] ERRO ao extrair/carregar ${criterionName}:`,
        error
      );
      if (error instanceof Error && 'errorNum' in error) {
        console.error(`  [Oracle Error Num]: ${(error as any).errorNum}`);
      }
      return 0;
    }
  }
}
