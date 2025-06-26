// apps/api/debug-compare-queries.ts
// Script para comparar exatamente ETL vs Power BI

import * as dotenv from 'dotenv';
import oracledb from 'oracledb';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

// Inicializar Oracle Client
try {
  if (
    process.env.ORACLE_HOME &&
    (process.platform === 'darwin' || process.platform === 'linux')
  ) {
    oracledb.initOracleClient({ libDir: process.env.ORACLE_HOME });
    console.log('Oracle Thick Client inicializado.');
  }
} catch (err) {
  console.warn('Oracle Client já inicializado ou erro:', err);
}

async function compareQueries() {
  console.log('🔍 === COMPARAÇÃO: ETL vs Power BI ===\n');

  let connection;
  try {
    connection = await oracledb.getConnection({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECT_STRING,
    });

    console.log('✅ Conectado ao Oracle');

    // ========================================
    // QUERY POWER BI (EXATA)
    // ========================================
    console.log('\n📊 QUERY POWER BI (sem filtros extras)');

    const queryPowerBI = `
      SELECT A.SETOR,
             A.OCORRENCIA,
             A.DATA,
             COUNT(DISTINCT A.CODFUNC) AS TOTAL
      FROM
      (SELECT CASE WHEN F.CODAREA = 1131 THEN 'SANTA MARIA'
                   WHEN F.CODAREA = 1132 THEN 'GAMA'
                   WHEN F.CODAREA BETWEEN 1141 AND 1144 THEN 'PARANOÁ'
                   WHEN F.CODAREA = 1148 THEN 'SÃO SEBASTIÃO' END AS SETOR,
             'FALTA FUNC' AS OCORRENCIA,
             F.CODFUNC,
             TRUNC(H.DTHIST, 'mm') AS DATA
      FROM FLP_HISTORICO H,
           VW_FUNCIONARIOS F
      WHERE H.CODINTFUNC = F.CODINTFUNC AND
            H.CODOCORR IN ('81') AND
            H.DTHIST BETWEEN TO_DATE('2025-06-01', 'YYYY-MM-DD') AND TO_DATE('2025-06-30', 'YYYY-MM-DD') AND
            F.DESCFUNCAO NOT LIKE '%JOVEM%') A
      GROUP BY A.SETOR,
               A.OCORRENCIA,
               A.DATA
               
      UNION ALL

      SELECT A.SETOR,
             A.OCORRENCIA,
             A.DATA,
             COUNT(DISTINCT A.CODFUNC) AS TOTAL
      FROM
      (SELECT CASE WHEN F.CODAREA = 1131 THEN 'SANTA MARIA'
                   WHEN F.CODAREA = 1132 THEN 'GAMA'
                   WHEN F.CODAREA BETWEEN 1141 AND 1144 THEN 'PARANOÁ'
                   WHEN F.CODAREA = 1148 THEN 'SÃO SEBASTIÃO' END AS SETOR,
             'ATESTADO FUNC' AS OCORRENCIA,
             F.CODFUNC,
             TRUNC(H.DTHIST, 'mm') AS DATA
      FROM FLP_HISTORICO H,
           VW_FUNCIONARIOS F
      WHERE H.CODINTFUNC = F.CODINTFUNC AND
            H.CODOCORR IN ('82', '125') AND
            H.DTHIST BETWEEN TO_DATE('2025-06-01', 'YYYY-MM-DD') AND TO_DATE('2025-06-30', 'YYYY-MM-DD') AND
            F.DESCFUNCAO NOT LIKE '%JOVEM%') A
      GROUP BY A.SETOR,
               A.OCORRENCIA,
               A.DATA
    `;

    const resultPowerBI = await connection.execute(queryPowerBI);
    console.log(`📊 Power BI Query: ${resultPowerBI.rows.length} registros`);

    // Calcular totais por setor
    const totalsPowerBI = {};
    resultPowerBI.rows.forEach((row) => {
      const setor = row[0];
      const ocorrencia = row[1];
      const total = parseInt(row[3]);
      const key = `${setor}-${ocorrencia}`;
      totalsPowerBI[key] = (totalsPowerBI[key] || 0) + total;
    });

    console.log('📋 Totais Power BI:');
    Object.entries(totalsPowerBI).forEach(([key, total]) => {
      console.log(`  ${key}: ${total}`);
    });

    // ========================================
    // QUERY ETL ATUAL (COM FILTROS EXTRAS)
    // ========================================
    console.log('\n📊 QUERY ETL ATUAL (com filtros CODAREA + OUTRAS)');

    const queryETL = `
      SELECT A.SETOR,
             A.OCORRENCIA,
             A.DATA,
             COUNT(DISTINCT A.CODFUNC) AS TOTAL
      FROM
      (SELECT CASE WHEN F.CODAREA = 1131 THEN 'SANTA MARIA'
                   WHEN F.CODAREA = 1132 THEN 'GAMA'
                   WHEN F.CODAREA BETWEEN 1141 AND 1144 THEN 'PARANOÁ'
                   WHEN F.CODAREA = 1148 THEN 'SÃO SEBASTIÃO' END AS SETOR,
             'FALTA FUNC' AS OCORRENCIA,
             F.CODFUNC,
             TRUNC(H.DTHIST, 'mm') AS DATA
      FROM FLP_HISTORICO H,
           VW_FUNCIONARIOS F
      WHERE H.CODINTFUNC = F.CODINTFUNC AND
            H.CODOCORR IN ('81') AND
            H.DTHIST BETWEEN TO_DATE('2025-06-01', 'YYYY-MM-DD') AND TO_DATE('2025-06-30', 'YYYY-MM-DD') AND
            F.DESCFUNCAO NOT LIKE '%JOVEM%' AND
            (F.CODAREA IN (1131, 1132, 1148) OR F.CODAREA BETWEEN 1141 AND 1144)) A
      WHERE A.SETOR <> 'OUTRAS'
      GROUP BY A.SETOR,
               A.OCORRENCIA,
               A.DATA
               
      UNION ALL

      SELECT A.SETOR,
             A.OCORRENCIA,
             A.DATA,
             COUNT(DISTINCT A.CODFUNC) AS TOTAL
      FROM
      (SELECT CASE WHEN F.CODAREA = 1131 THEN 'SANTA MARIA'
                   WHEN F.CODAREA = 1132 THEN 'GAMA'
                   WHEN F.CODAREA BETWEEN 1141 AND 1144 THEN 'PARANOÁ'
                   WHEN F.CODAREA = 1148 THEN 'SÃO SEBASTIÃO' END AS SETOR,
             'ATESTADO FUNC' AS OCORRENCIA,
             F.CODFUNC,
             TRUNC(H.DTHIST, 'mm') AS DATA
      FROM FLP_HISTORICO H,
           VW_FUNCIONARIOS F
      WHERE H.CODINTFUNC = F.CODINTFUNC AND
            H.CODOCORR IN ('82', '125') AND
            H.DTHIST BETWEEN TO_DATE('2025-06-01', 'YYYY-MM-DD') AND TO_DATE('2025-06-30', 'YYYY-MM-DD') AND
            F.DESCFUNCAO NOT LIKE '%JOVEM%' AND
            (F.CODAREA IN (1131, 1132, 1148) OR F.CODAREA BETWEEN 1141 AND 1144)) A
      WHERE A.SETOR <> 'OUTRAS'
      GROUP BY A.SETOR,
               A.OCORRENCIA,
               A.DATA
    `;

    const resultETL = await connection.execute(queryETL);
    console.log(`📊 ETL Query: ${resultETL.rows.length} registros`);

    // Calcular totais por setor
    const totalsETL = {};
    resultETL.rows.forEach((row) => {
      const setor = row[0];
      const ocorrencia = row[1];
      const total = parseInt(row[3]);
      const key = `${setor}-${ocorrencia}`;
      totalsETL[key] = (totalsETL[key] || 0) + total;
    });

    console.log('📋 Totais ETL:');
    Object.entries(totalsETL).forEach(([key, total]) => {
      console.log(`  ${key}: ${total}`);
    });

    // ========================================
    // COMPARAÇÃO E DIFERENÇAS
    // ========================================
    console.log('\n🔍 === COMPARAÇÃO DIRETA ===');

    const allKeys = new Set([
      ...Object.keys(totalsPowerBI),
      ...Object.keys(totalsETL),
    ]);

    allKeys.forEach((key) => {
      const powerBI = totalsPowerBI[key] || 0;
      const etl = totalsETL[key] || 0;
      const diff = etl - powerBI;

      if (diff !== 0) {
        console.log(`❌ ${key}: Power BI=${powerBI}, ETL=${etl}, Diff=${diff}`);
      } else {
        console.log(`✅ ${key}: ${powerBI} (iguais)`);
      }
    });

    // ========================================
    // INVESTIGAR REGISTROS QUE SÃO FILTRADOS
    // ========================================
    console.log('\n🔍 === REGISTROS FILTRADOS PELOS FILTROS EXTRAS ===');

    const queryFiltrados = `
      SELECT A.SETOR,
             A.OCORRENCIA,
             A.DATA,
             COUNT(DISTINCT A.CODFUNC) AS TOTAL
      FROM
      (SELECT CASE WHEN F.CODAREA = 1131 THEN 'SANTA MARIA'
                   WHEN F.CODAREA = 1132 THEN 'GAMA'
                   WHEN F.CODAREA BETWEEN 1141 AND 1144 THEN 'PARANOÁ'
                   WHEN F.CODAREA = 1148 THEN 'SÃO SEBASTIÃO' 
                   ELSE 'OUTRAS' END AS SETOR,
             'ATESTADO FUNC' AS OCORRENCIA,
             F.CODFUNC,
             TRUNC(H.DTHIST, 'mm') AS DATA
      FROM FLP_HISTORICO H,
           VW_FUNCIONARIOS F
      WHERE H.CODINTFUNC = F.CODINTFUNC AND
            H.CODOCORR IN ('82', '125') AND
            H.DTHIST BETWEEN TO_DATE('2025-06-01', 'YYYY-MM-DD') AND TO_DATE('2025-06-30', 'YYYY-MM-DD') AND
            F.DESCFUNCAO NOT LIKE '%JOVEM%') A
      WHERE A.SETOR = 'OUTRAS'
      GROUP BY A.SETOR,
               A.OCORRENCIA,
               A.DATA
    `;

    const resultFiltrados = await connection.execute(queryFiltrados);
    console.log(
      `📊 Registros 'OUTRAS' filtrados: ${resultFiltrados.rows.length}`
    );

    if (resultFiltrados.rows.length > 0) {
      const totalFiltrado = resultFiltrados.rows.reduce(
        (sum, row) => sum + parseInt(row[3]),
        0
      );
      console.log(`📊 Total filtrado como 'OUTRAS': ${totalFiltrado}`);
    }

    console.log('\n💡 === DIAGNÓSTICO ===');
    console.log('1. Se Power BI tem mais registros: ETL está filtrando demais');
    console.log(
      '2. Se ETL tem mais registros: Power BI tem filtros que o ETL não tem'
    );
    console.log('3. Use a query do Power BI (sem filtros extras) no ETL');
  } catch (error) {
    console.error('❌ Erro na comparação:', error);
  } finally {
    if (connection) {
      await connection.close();
      console.log('\n✅ Conexão Oracle fechada');
    }
  }
}

// Executar comparação
compareQueries();
