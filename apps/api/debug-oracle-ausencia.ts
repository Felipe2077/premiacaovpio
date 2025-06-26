// apps/api/debug-oracle-ausencia.ts
// Script para testar a query Oracle de ausências diretamente

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

async function debugOracleAusencia() {
  console.log('🔍 === DEBUG: Query Oracle Ausências ===\n');

  let connection;
  try {
    // Conectar ao Oracle
    connection = await oracledb.getConnection({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECT_STRING,
    });

    console.log('✅ Conectado ao Oracle');

    // Testar diferentes versões da query para identificar o problema

    // ========================================
    // TESTE 1: Query mais simples primeiro
    // ========================================
    console.log('\n📊 TESTE 1: Query simples de contagem');

    const querySimple = `
      SELECT COUNT(*) as TOTAL_REGISTROS
      FROM FLP_HISTORICO H, VW_FUNCIONARIOS F
      WHERE H.CODINTFUNC = F.CODINTFUNC 
        AND H.CODOCORR IN ('81', '82', '125')
        AND H.DTHIST BETWEEN TO_DATE('2025-06-01', 'YYYY-MM-DD') AND TO_DATE('2025-06-30', 'YYYY-MM-DD')
    `;

    const resultSimple = await connection.execute(querySimple);
    console.log('Total de registros na base:', resultSimple.rows[0][0]);

    // ========================================
    // TESTE 2: Adicionar filtro JOVEM
    // ========================================
    console.log('\n📊 TESTE 2: Com filtro JOVEM');

    const queryJovem = `
      SELECT COUNT(*) as TOTAL_REGISTROS
      FROM FLP_HISTORICO H, VW_FUNCIONARIOS F
      WHERE H.CODINTFUNC = F.CODINTFUNC 
        AND H.CODOCORR IN ('81', '82', '125')
        AND H.DTHIST BETWEEN TO_DATE('2025-06-01', 'YYYY-MM-DD') AND TO_DATE('2025-06-30', 'YYYY-MM-DD')
        AND F.DESCFUNCAO NOT LIKE '%JOVEM%'
    `;

    const resultJovem = await connection.execute(queryJovem);
    console.log('Com filtro JOVEM:', resultJovem.rows[0][0]);

    // ========================================
    // TESTE 3: Query completa como estava funcionando antes
    // ========================================
    console.log('\n📊 TESTE 3: Query completa original (que funcionava)');

    const queryOriginal = `
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
            (F.CODAREA IN (1131, 1132, 1148) OR F.CODAREA BETWEEN 1141 AND 1144)) A
      WHERE A.SETOR <> 'OUTRAS'
      GROUP BY A.SETOR,
               A.OCORRENCIA,
               A.DATA
      ORDER BY A.SETOR, A.DATA
    `;

    const resultOriginal = await connection.execute(queryOriginal);
    console.log(
      'Query original (SEM filtro JOVEM):',
      resultOriginal.rows.length,
      'registros'
    );

    if (resultOriginal.rows.length > 0) {
      console.log('Primeiros registros:');
      resultOriginal.rows.slice(0, 5).forEach((row, i) => {
        console.log(
          `  ${i + 1}. ${row[0]} - ${row[1]} - ${row[2]} - ${row[3]}`
        );
      });
    }

    // ========================================
    // TESTE 4: Query modificada (atual que não funciona)
    // ========================================
    console.log('\n📊 TESTE 4: Query modificada (atual com problema)');

    const queryModificada = `
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

    const resultModificada = await connection.execute(queryModificada);
    console.log(
      'Query modificada (COM filtro JOVEM):',
      resultModificada.rows.length,
      'registros'
    );

    if (resultModificada.rows.length > 0) {
      console.log('Primeiros registros:');
      resultModificada.rows.slice(0, 5).forEach((row, i) => {
        console.log(
          `  ${i + 1}. ${row[0]} - ${row[1]} - ${row[2]} - ${row[3]}`
        );
      });
    }

    // ========================================
    // TESTE 5: Verificar se problema é o filtro JOVEM
    // ========================================
    console.log('\n📊 TESTE 5: Verificando registros JOVEM');

    const queryJovemCheck = `
      SELECT COUNT(*) as TOTAL_JOVEM
      FROM VW_FUNCIONARIOS F
      WHERE F.DESCFUNCAO LIKE '%JOVEM%'
        AND (F.CODAREA IN (1131, 1132, 1148) OR F.CODAREA BETWEEN 1141 AND 1144)
    `;

    const resultJovemCheck = await connection.execute(queryJovemCheck);
    console.log(
      'Funcionários JOVEM que seriam excluídos:',
      resultJovemCheck.rows[0][0]
    );

    console.log('\n💡 === DIAGNÓSTICO ===');
    console.log(
      '1. Se query original funciona mas modificada não: problema é o filtro JOVEM'
    );
    console.log(
      '2. Se nenhuma funciona: problema é outro (data, conexão, etc.)'
    );
    console.log('3. Use a query que funcionar no ETL');
  } catch (error) {
    console.error('❌ Erro na investigação Oracle:', error);
  } finally {
    if (connection) {
      await connection.close();
      console.log('\n✅ Conexão Oracle fechada');
    }
  }
}

// Executar debug
debugOracleAusencia();
