// apps/api/debug-powerbi-null.ts
// Script para investigar como Power BI trata registros NULL

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

async function investigatePowerBINull() {
  console.log('🔍 === INVESTIGAÇÃO: Como Power BI trata NULL ===\n');

  let connection;
  try {
    connection = await oracledb.getConnection({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECT_STRING,
    });

    console.log('✅ Conectado ao Oracle');

    // ========================================
    // 1. INVESTIGAR REGISTROS NULL DETALHADAMENTE
    // ========================================
    console.log('\n📊 INVESTIGAÇÃO: Registros que resultam em NULL');

    const queryNullDetail = `
      SELECT 
        F.CODAREA,
        F.CODFUNC,
        F.DESCFUNCAO,
        CASE WHEN F.CODAREA = 1131 THEN 'SANTA MARIA'
             WHEN F.CODAREA = 1132 THEN 'GAMA'
             WHEN F.CODAREA BETWEEN 1141 AND 1144 THEN 'PARANOÁ'
             WHEN F.CODAREA = 1148 THEN 'SÃO SEBASTIÃO' 
             ELSE NULL END AS SETOR_MAPEADO,
        H.CODOCORR,
        H.DTHIST,
        TRUNC(H.DTHIST, 'mm') AS DATA_MES
      FROM FLP_HISTORICO H,
           VW_FUNCIONARIOS F
      WHERE H.CODINTFUNC = F.CODINTFUNC 
        AND H.CODOCORR IN ('82', '125') 
        AND H.DTHIST BETWEEN TO_DATE('2025-06-01', 'YYYY-MM-DD') AND TO_DATE('2025-06-30', 'YYYY-MM-DD')
        AND F.DESCFUNCAO NOT LIKE '%JOVEM%'
        AND (F.CODAREA NOT IN (1131, 1132, 1148) AND F.CODAREA NOT BETWEEN 1141 AND 1144)
      ORDER BY F.CODAREA, F.CODFUNC
    `;

    const resultNullDetail = await connection.execute(queryNullDetail);
    console.log(
      `📊 Registros com SETOR = NULL: ${resultNullDetail.rows.length}`
    );

    if (resultNullDetail.rows.length > 0) {
      console.log('\n📋 Detalhes dos registros NULL:');

      // Agrupar por CODAREA para análise
      const groupedByArea = {};
      resultNullDetail.rows.forEach((row) => {
        const codarea = row[0];
        const codfunc = row[1];
        const descfuncao = row[2];

        if (!groupedByArea[codarea]) {
          groupedByArea[codarea] = {
            funcionarios: new Set(),
            ocorrencias: 0,
            amostraDescricao: descfuncao,
          };
        }
        groupedByArea[codarea].funcionarios.add(codfunc);
        groupedByArea[codarea].ocorrencias++;
      });

      console.log('📊 Por CODAREA:');
      Object.entries(groupedByArea).forEach(([codarea, info]) => {
        console.log(
          `  CODAREA ${codarea}: ${info.funcionarios.size} funcionários únicos, ${info.ocorrencias} ocorrências`
        );
        console.log(`    Exemplo função: ${info.amostraDescricao}`);
      });

      // Contar funcionários únicos (como faz a query original)
      const uniqueFuncionarios = new Set(
        resultNullDetail.rows.map((row) => row[1])
      );
      console.log(
        `\n📊 Total funcionários únicos com NULL: ${uniqueFuncionarios.size}`
      );
    }

    // ========================================
    // 2. VERIFICAR SE POWER BI USA LÓGICA DIFERENTE
    // ========================================
    console.log('\n🔍 HIPÓTESE: Power BI faz join/agrupamento diferente?');

    // Testar se há alguma lógica no Power BI que redistribui os NULL
    const queryPossibleLogic = `
      SELECT 
        'TEORIA_1_REDISTRIBUIR_NULL' as TESTE,
        COUNT(DISTINCT F.CODFUNC) as TOTAL_NULL,
        FLOOR(COUNT(DISTINCT F.CODFUNC) / 4) as POR_SETOR_SE_REDISTRIBUIR
      FROM FLP_HISTORICO H,
           VW_FUNCIONARIOS F
      WHERE H.CODINTFUNC = F.CODINTFUNC 
        AND H.CODOCORR IN ('82', '125') 
        AND H.DTHIST BETWEEN TO_DATE('2025-06-01', 'YYYY-MM-DD') AND TO_DATE('2025-06-30', 'YYYY-MM-DD')
        AND F.DESCFUNCAO NOT LIKE '%JOVEM%'
        AND (F.CODAREA NOT IN (1131, 1132, 1148) AND F.CODAREA NOT BETWEEN 1141 AND 1144)
        AND TRUNC(H.DTHIST, 'mm') = TO_DATE('2025-06-01', 'YYYY-MM-DD')
      
      UNION ALL
      
      SELECT 
        'TEORIA_2_TOTAL_PARANOA_ATUAL' as TESTE,
        COUNT(DISTINCT F.CODFUNC) as TOTAL_PARANOA,
        0 as PLACEHOLDER
      FROM FLP_HISTORICO H,
           VW_FUNCIONARIOS F
      WHERE H.CODINTFUNC = F.CODINTFUNC 
        AND H.CODOCORR IN ('82', '125') 
        AND H.DTHIST BETWEEN TO_DATE('2025-06-01', 'YYYY-MM-DD') AND TO_DATE('2025-06-30', 'YYYY-MM-DD')
        AND F.DESCFUNCAO NOT LIKE '%JOVEM%'
        AND F.CODAREA BETWEEN 1141 AND 1144
        AND TRUNC(H.DTHIST, 'mm') = TO_DATE('2025-06-01', 'YYYY-MM-DD')
    `;

    const resultLogic = await connection.execute(queryPossibleLogic);
    console.log('\n📊 Análise de possível lógica do Power BI:');
    resultLogic.rows.forEach((row) => {
      console.log(`  ${row[0]}: ${row[1]} funcionários`);
    });

    // ========================================
    // 3. VERIFICAR SE HÁ PROBLEMA NA QUERY POWER BI
    // ========================================
    console.log('\n🔍 VERIFICAÇÃO: Query exata do Power BI por setor');

    // Executar query do Power BI separadamente por setor para ver onde os NULL aparecem
    const setores = [
      { nome: 'PARANOÁ', codarea: 'F.CODAREA BETWEEN 1141 AND 1144' },
      { nome: 'GAMA', codarea: 'F.CODAREA = 1132' },
      { nome: 'SANTA MARIA', codarea: 'F.CODAREA = 1131' },
      { nome: 'SÃO SEBASTIÃO', codarea: 'F.CODAREA = 1148' },
    ];

    for (const setor of setores) {
      const queryPorSetor = `
        SELECT 
          '${setor.nome}' as SETOR,
          COUNT(DISTINCT F.CODFUNC) AS TOTAL
        FROM FLP_HISTORICO H,
             VW_FUNCIONARIOS F
        WHERE H.CODINTFUNC = F.CODINTFUNC 
          AND H.CODOCORR IN ('82', '125') 
          AND H.DTHIST BETWEEN TO_DATE('2025-06-01', 'YYYY-MM-DD') AND TO_DATE('2025-06-30', 'YYYY-MM-DD')
          AND F.DESCFUNCAO NOT LIKE '%JOVEM%'
          AND ${setor.codarea}
          AND TRUNC(H.DTHIST, 'mm') = TO_DATE('2025-06-01', 'YYYY-MM-DD')
      `;

      const resultSetor = await connection.execute(queryPorSetor);
      console.log(`  ${setor.nome}: ${resultSetor.rows[0][1]} funcionários`);
    }

    // ========================================
    // 4. CONCLUSÕES E RECOMENDAÇÕES
    // ========================================
    console.log('\n💡 === CONCLUSÕES ===');
    console.log(
      '1. Se registros NULL existem: Power BI pode ter erro de cálculo'
    );
    console.log('2. Se NULL = 2 e PARANOÁ atual = 61: Total deveria ser 63');
    console.log('3. Verificar se Power BI está fazendo join incorreto');
    console.log('4. Possível que ETL esteja correto e Power BI tenha bug');

    console.log('\n🎯 RECOMENDAÇÃO:');
    console.log('- Manter filtro CODAREA no ETL (dados limpos)');
    console.log('- Investigar lógica do Power BI');
    console.log(
      '- ETL não deve incluir dados inconsistentes só para bater com Power BI bugado'
    );
  } catch (error) {
    console.error('❌ Erro na investigação:', error);
  } finally {
    if (connection) {
      await connection.close();
      console.log('\n✅ Conexão Oracle fechada');
    }
  }
}

// Executar investigação
investigatePowerBINull();
