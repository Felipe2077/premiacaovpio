// apps/api/src/modules/etl/oracle-etl.service.ts (VERSÃO INTEGRAL)
import { OracleDataSource } from '@/database/data-source'; // Importa o DataSource Oracle
import 'reflect-metadata';
import { DataSource } from 'typeorm';

// Interface para o resultado da query SQL de Ausência
// Garante que estamos tratando os tipos corretamente após a query
interface AusenciaRaw {
  SETOR: string;
  OCORRENCIA: 'FALTA FUNC' | 'ATESTADO FUNC';
  DATA: Date; // TRUNC(DATE) no Oracle retorna Date
  TOTAL: number; // COUNT() retorna number ou BigInt, converteremos para number
}

interface IpkRaw {
  SETOR: string;
  OCORRENCIA: 'IPK';
  DATA: Date; // Agrupado por mês (TRUNC... 'mm')
  TOTAL: number; // Resultado de ROUND(PASSAGEIROS / KM, 2)
}

export class OracleEtlService {
  constructor() {
    console.log('OracleEtlService instanciado.');
  }

  // Método auxiliar para garantir que a conexão Oracle está ativa
  private async ensureOracleConnection(): Promise<DataSource> {
    const dataSource = OracleDataSource;
    if (!dataSource.isInitialized) {
      console.log('[Oracle ETL] Inicializando OracleDataSource...');
      await dataSource.initialize();
      console.log('[Oracle ETL] OracleDataSource inicializado.');
    } else {
      console.log('[Oracle ETL] OracleDataSource já estava inicializado.');
    }
    return dataSource;
    // --- FIM DA MUDANÇA ---
  }

  /**
   * Extrai dados de Falta Func e Atestado Func do Oracle para um período.
   * Busca dados diários para maior granularidade.
   * @param startDate Data de início no formato 'YYYY-MM-DD'
   * @param endDate Data de fim no formato 'YYYY-MM-DD'
   * @returns Promise<AusenciaRaw[]> Array com os dados diários ou vazio em caso de erro.
   */
  async extractAusenciaFromOracle(
    startDate: string,
    endDate: string
  ): Promise<AusenciaRaw[]> {
    console.log(
      `[Oracle ETL] Iniciando extração de Ausências para ${startDate} a ${endDate}`
    );
    const dataSource = await this.ensureOracleConnection();

    try {
      // Query adaptada da Consulta 4 do PBI, usando parâmetros de bind (:1, :2)
      // e agrupando por DIA (TRUNC(H.DTHIST))
      const query = `
            SELECT A.SETOR, A.OCORRENCIA, A.DATA, COUNT(DISTINCT A.CODFUNC) AS TOTAL
            FROM (
                SELECT CASE WHEN F.CODAREA = 1131 THEN 'SANTA MARIA'
                            WHEN F.CODAREA = 1132 THEN 'GAMA'
                            WHEN F.CODAREA BETWEEN 1141 AND 1144 THEN 'PARANOÁ'
                            WHEN F.CODAREA = 1148 THEN 'SÃO SEBASTIÃO' END AS SETOR,
                       'FALTA FUNC' AS OCORRENCIA, F.CODFUNC, TRUNC(H.DTHIST) AS DATA
                FROM FLP_HISTORICO H, VW_FUNCIONARIOS F
                WHERE H.CODINTFUNC = F.CODINTFUNC AND H.CODOCORR IN ('81') -- Código de Falta
                  AND H.DTHIST >= TO_DATE(:1, 'YYYY-MM-DD') -- >= início
                  AND H.DTHIST < TO_DATE(:2, 'YYYY-MM-DD') + 1 -- < fim + 1 dia
                  AND F.DESCFUNCAO NOT LIKE '%JOVEM%'
                  AND F.CODAREA IN (1131, 1132, 1141, 1142, 1143, 1144, 1148)
            ) A
            WHERE A.SETOR IS NOT NULL -- Ignora funcionários de áreas não mapeadas
            GROUP BY A.SETOR, A.OCORRENCIA, A.DATA

            UNION ALL

            SELECT A.SETOR, A.OCORRENCIA, A.DATA, COUNT(DISTINCT A.CODFUNC) AS TOTAL
            FROM (
                SELECT CASE WHEN F.CODAREA = 1131 THEN 'SANTA MARIA'
                            WHEN F.CODAREA = 1132 THEN 'GAMA'
                            WHEN F.CODAREA BETWEEN 1141 AND 1144 THEN 'PARANOÁ'
                            WHEN F.CODAREA = 1148 THEN 'SÃO SEBASTIÃO' END AS SETOR,
                       'ATESTADO FUNC' AS OCORRENCIA, F.CODFUNC, TRUNC(H.DTHIST) AS DATA
                FROM FLP_HISTORICO H, VW_FUNCIONARIOS F
                WHERE H.CODINTFUNC = F.CODINTFUNC AND H.CODOCORR IN ('82', '125') -- Códigos de Atestado
                  AND H.DTHIST >= TO_DATE(:1, 'YYYY-MM-DD')
                  AND H.DTHIST < TO_DATE(:2, 'YYYY-MM-DD') + 1
                  AND F.DESCFUNCAO NOT LIKE '%JOVEM%'
                  AND F.CODAREA IN (1131, 1132, 1141, 1142, 1143, 1144, 1148)
            ) A
            WHERE A.SETOR IS NOT NULL
            GROUP BY A.SETOR, A.OCORRENCIA, A.DATA
            ORDER BY SETOR, DATA, OCORRENCIA
            `;
      const parameters = [startDate, endDate];

      console.log('[Oracle ETL] Executando query de Ausências no Oracle...');
      // Usar query bruta com parâmetros posicionais (:1, :2)
      // O driver node-oracledb substitui :1 pelo primeiro item do array, :2 pelo segundo, etc.
      const results: any[] = await dataSource.query(query, parameters); // Vem como 'any[]' do query genérico
      console.log(
        `[Oracle ETL] Query Oracle Ausência retornou ${results.length} registros.`
      );

      // Converter e Tipar o resultado explicitamente para AusenciaRaw
      const typedResults: AusenciaRaw[] = results.map((r) => ({
        SETOR: r.SETOR,
        OCORRENCIA: r.OCORRENCIA, // Confia que a query retorna os tipos corretos de string
        DATA: r.DATA, // Oracle DATE geralmente vem como objeto Date
        TOTAL: Number(r.TOTAL) || 0, // Garante que TOTAL seja número
      }));

      return typedResults;
    } catch (error) {
      console.error(
        '[Oracle ETL] ERRO ao executar query de Ausências no Oracle:',
        error
      );
      if (error instanceof Error && 'errorNum' in error) {
        console.error(`  [Oracle Error Num]: ${(error as any).errorNum}`);
      }
      return []; // Retorna vazio em caso de erro
    }
    // Não fecha AppDataSource aqui
  }

  // --- NOVO MÉTODO PARA ORACLE IPK ---
  /**
   * Extrai dados para cálculo do IPK do Oracle para um período.
   * Query complexa adaptada da Consulta 11 do PBI.
   * @param startDate Data de início (formato YYYY-MM-DD)
   * @param endDate Data de fim (formato YYYY-MM-DD)
   * @returns Promise<IpkRaw[]> Array com IPK mensal por setor ou vazio se erro.
   */
  async extractIpkFromOracle(
    startDate: string,
    endDate: string
  ): Promise<IpkRaw[]> {
    console.log(
      `[Oracle ETL] Iniciando extração de IPK para ${startDate} a ${endDate}`
    );
    const dataSource = await this.ensureOracleConnection();

    try {
      // Query GRANDE e COMPLEXA adaptada - ATENÇÃO aos detalhes e nomes de tabelas/colunas!
      // Usando :1 para startDate e :2 para endDate
      const query = `
      SELECT CASE WHEN B.SETOR= 31 THEN 'PARANOÁ'
                  WHEN B.SETOR= 124 THEN 'SANTA MARIA'
                  WHEN B.SETOR= 239 THEN 'SÃO SEBASTIÃO'
                  WHEN B.SETOR= 240 THEN 'GAMA'
             ELSE 'OUTRAS' END AS SETOR,
             B.OCORRENCIA,
             B.DATA,
             CASE WHEN NVL(B.KM, 0) = 0 THEN 0 ELSE ROUND((B.PASSAGEIROS / B.KM), 2) END AS TOTAL
      FROM
      (SELECT A.CIDADE AS SETOR,
              'IPK' AS OCORRENCIA,
             SUM(A.PASSAGEIROS) AS PASSAGEIROS,
             SUM(A.KM_OPERACIONAL) AS KM,
             A.DATA
      FROM
      (SELECT P.CIDADE,
              CASE WHEN P.CIDADE = 124 AND P.DATA_MES_ANO = PV.DATA_MES_ANO THEN (P.PASSAGEIROS - PV.PASSAGEIROS)
                   WHEN P.CIDADE = 240 AND P.DATA_MES_ANO = PV.DATA_MES_ANO THEN (P.PASSAGEIROS + PV.PASSAGEIROS)
              ELSE P.PASSAGEIROS END AS PASSAGEIROS,
              K.KM_OPERACIONAL,
              P.DATA_MES_ANO AS DATA
       FROM
       /* Subquery P: Passageiros */
       (SELECT L.CODIGOGA AS CIDADE, SUM(D.QTD_PASSAG_TRANS) AS PASSAGEIROS, TRUNC(G.DAT_VIAGEM_GUIA, 'mm') AS DATA_MES_ANO
        FROM T_ARR_GUIA G, T_ARR_DETALHE_GUIA D, T_ARR_VIAGENS_GUIA V, BGM_CADLINHAS L
        WHERE D.COD_SEQ_GUIA = V.COD_SEQ_GUIA AND D.COD_SEQ_VIAGEM = V.COD_SEQ_VIAGEM AND G.COD_SEQ_GUIA = D.COD_SEQ_GUIA
          AND G.DAT_VIAGEM_GUIA BETWEEN TO_DATE(:1, 'YYYY-MM-DD') AND TO_DATE(:2, 'YYYY-MM-DD') + 0.99999
          AND V.COD_INTLINHA = L.CODINTLINHA AND L.CODIGOGA IN (31, 124, 239, 240) AND L.CODIGOEMPRESA = 4
          AND D.COD_TIPOPAGTARIFA NOT IN (3)
        GROUP BY L.CODIGOGA, TRUNC(G.DAT_VIAGEM_GUIA, 'mm')) P
       LEFT JOIN
       /* Subquery K: KM Operacional */
       (SELECT L.CODIGOGA AS CIDADE, SUM(NVL(GLOBUS.FC_ARR_KMBCO_VIAGENS(BC.IDBCO, 0 ,BV.IDBCOVIAGENS), 0)) AS KM_OPERACIONAL, TRUNC(BC.DATABCO, 'mm') AS DATA_MES_ANO
        FROM T_ARR_BCO BC, T_ARR_BCO_VIAGENS BV, BGM_CADLINHAS L
        WHERE BC.IDBCO = BV.IDBCO
          AND BC.DATABCO BETWEEN TO_DATE(:1, 'YYYY-MM-DD') AND TO_DATE(:2, 'YYYY-MM-DD') + 0.99999
          -- // --- CORREÇÃO APLICADA AQUI --- //
          AND BC.CODIGOEMPRESA = 4 AND BV.CODINTLINHA = L.CODINTLINHA AND L.CODIGOGA IN (31, 124, 239, 240)
          -- // ----------------------------- //
        GROUP BY L.CODIGOGA, TRUNC(BC.DATABCO, 'mm')) K ON P.CIDADE = K.CIDADE AND P.DATA_MES_ANO = K.DATA_MES_ANO
       LEFT JOIN
       /* Subquery PV: Ajuste Passageiros */
       (SELECT L.CODIGOGA AS CIDADESAIDA, 240 AS CIDADEENTRADA, SUM(D.QTD_PASSAG_TRANS) AS PASSAGEIROS, TRUNC(G.DAT_VIAGEM_GUIA, 'mm') AS DATA_MES_ANO
        FROM T_ARR_GUIA G, T_ARR_DETALHE_GUIA D, T_ARR_VIAGENS_GUIA V, BGM_CADLINHAS L, FRT_CADVEICULOS VE
        WHERE D.COD_SEQ_GUIA = V.COD_SEQ_GUIA AND D.COD_SEQ_VIAGEM = V.COD_SEQ_VIAGEM AND G.COD_SEQ_GUIA = D.COD_SEQ_GUIA
          AND G.DAT_VIAGEM_GUIA BETWEEN TO_DATE(:1, 'YYYY-MM-DD') AND TO_DATE(:2, 'YYYY-MM-DD') + 0.99999
          AND V.COD_INTLINHA = L.CODINTLINHA AND L.CODIGOGA IN (124, 240) AND L.CODIGOEMPRESA = 4
          AND D.COD_TIPOPAGTARIFA NOT IN (3) AND V.COD_VEICULO = VE.CODIGOVEIC
          AND VE.PREFIXOVEIC IN ('0002241','0002243','0002246','0002248')
        GROUP BY L.CODIGOGA, TRUNC(G.DAT_VIAGEM_GUIA, 'mm')) PV ON P.CIDADE = PV.CIDADESAIDA AND P.DATA_MES_ANO = PV.DATA_MES_ANO
       ) A
       WHERE A.KM_OPERACIONAL IS NOT NULL AND A.KM_OPERACIONAL > 0
       GROUP BY A.CIDADE, A.DATA
      ) B
      ORDER BY SETOR, DATA
      `;
      const parameters = [startDate, endDate];

      console.log('[Oracle ETL] Executando query de IPK no Oracle...');
      const results: any[] = await dataSource.query(query, parameters);
      console.log(
        `[Oracle ETL] Query Oracle IPK retornou ${results.length} registros.`
      );

      // Tipar e converter resultado
      const typedResults: IpkRaw[] = results.map((r) => ({
        SETOR: r.SETOR,
        OCORRENCIA: 'IPK',
        DATA: r.DATA, // Deve vir como Date do TRUNC('mm')
        TOTAL: Number(r.TOTAL) || 0,
      }));

      return typedResults;
    } catch (error) {
      console.error(
        '[Oracle ETL] ERRO ao executar query de IPK no Oracle:',
        error
      );
      if (error instanceof Error && 'errorNum' in error) {
        console.error(`  [Oracle Error Num]: ${(error as any).errorNum}`);
      }
      return [];
    }
  }
}
