// apps/api/debug-simple.ts
// Script simplificado usando SQL direto para evitar problemas de decorators

import * as dotenv from 'dotenv';
import path from 'path';
import { Client } from 'pg';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function debugWithDirectSQL() {
  console.log('🔍 === DEBUG: Investigação Simples com SQL Direto ===\n');

  // Criar conexão direta com Postgres
  const client = new Client({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'premiacao',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao Postgres via client direto');

    const dataInicio = '2025-06-01';
    const dataFim = '2025-06-30';

    console.log(`📅 Período de teste: ${dataInicio} a ${dataFim}\n`);

    // ========================================
    // 1. INVESTIGAR FURO POR VIAGEM (Problema Principal)
    // ========================================
    console.log('🚀 === FURO POR VIAGEM (Problema Principal) ===');

    // Verificar registros com nome correto
    const queryCorreto = `
      SELECT "sectorName", "criterionName", "metricDate", "totalCount" 
      FROM raw_mysql_ocorrencias_horarias 
      WHERE "criterionName" = 'FURO POR VIAGEM' 
        AND "metricDate" BETWEEN $1 AND $2
      ORDER BY "metricDate", "sectorName"
    `;

    const resultCorreto = await client.query(queryCorreto, [
      dataInicio,
      dataFim,
    ]);
    console.log(
      `📊 Registros com 'FURO POR VIAGEM' (correto): ${resultCorreto.rows.length}`
    );

    if (resultCorreto.rows.length > 0) {
      console.log('✅ Registros encontrados:');
      resultCorreto.rows.forEach((row, i) => {
        console.log(
          `  ${i + 1}. ${row.sectorName}: ${row.totalCount} (${row.metricDate})`
        );
      });
      const totalCorreto = resultCorreto.rows.reduce(
        (sum, row) => sum + parseInt(row.totalCount),
        0
      );
      console.log(`📊 Total: ${totalCorreto}`);
    }

    // Verificar registros com nome incorreto
    const queryIncorreto = `
      SELECT "sectorName", "criterionName", "metricDate", "totalCount" 
      FROM raw_mysql_ocorrencias_horarias 
      WHERE "criterionName" = 'FURO DE VIAGEM' 
        AND "metricDate" BETWEEN $1 AND $2
      ORDER BY "metricDate", "sectorName"
    `;

    const resultIncorreto = await client.query(queryIncorreto, [
      dataInicio,
      dataFim,
    ]);
    console.log(
      `📊 Registros com 'FURO DE VIAGEM' (incorreto): ${resultIncorreto.rows.length}`
    );

    if (resultIncorreto.rows.length > 0) {
      console.log('❌ PROBLEMA CONFIRMADO: Dados salvos com nome incorreto!');
      resultIncorreto.rows.forEach((row, i) => {
        console.log(
          `  ${i + 1}. ${row.sectorName}: ${row.totalCount} (${row.metricDate})`
        );
      });
      const totalIncorreto = resultIncorreto.rows.reduce(
        (sum, row) => sum + parseInt(row.totalCount),
        0
      );
      console.log(`📊 Total: ${totalIncorreto}`);
    }

    // ========================================
    // 2. INVESTIGAR QUEBRA (PARANOÁ: 27 real vs 26 calculado)
    // ========================================
    console.log('\n\n🧩 === QUEBRA - PARANOÁ ===');

    const queryQuebra = `
      SELECT "sectorName", "occurrenceType", "metricDate", "totalCount" 
      FROM raw_mysql_quebras_defeitos 
      WHERE "sectorName" = 'PARANOÁ' 
        AND "occurrenceType" = 'QUEBRA'
        AND "metricDate" BETWEEN $1 AND $2
      ORDER BY "metricDate"
    `;

    const resultQuebra = await client.query(queryQuebra, [dataInicio, dataFim]);
    console.log(`📊 Registros QUEBRA-PARANOÁ: ${resultQuebra.rows.length}`);

    if (resultQuebra.rows.length > 0) {
      const totalQuebra = resultQuebra.rows.reduce(
        (sum, row) => sum + parseInt(row.totalCount),
        0
      );
      console.log(`📊 Total calculado: ${totalQuebra}`);
      console.log('📋 Detalhes:');
      resultQuebra.rows.forEach((row, i) => {
        console.log(
          `  ${i + 1}. Data: ${row.metricDate}, Count: ${row.totalCount}`
        );
      });
    }

    // ========================================
    // 3. INVESTIGAR DEFEITO (GAMA: 96 real vs 97 calculado)
    // ========================================
    console.log('\n\n🛠️ === DEFEITO - GAMA ===');

    const queryDefeito = `
      SELECT "sectorName", "occurrenceType", "metricDate", "totalCount" 
      FROM raw_mysql_quebras_defeitos 
      WHERE "sectorName" = 'GAMA' 
        AND "occurrenceType" = 'DEFEITO'
        AND "metricDate" BETWEEN $1 AND $2
      ORDER BY "metricDate"
    `;

    const resultDefeito = await client.query(queryDefeito, [
      dataInicio,
      dataFim,
    ]);
    console.log(`📊 Registros DEFEITO-GAMA: ${resultDefeito.rows.length}`);

    if (resultDefeito.rows.length > 0) {
      const totalDefeito = resultDefeito.rows.reduce(
        (sum, row) => sum + parseInt(row.totalCount),
        0
      );
      console.log(`📊 Total calculado: ${totalDefeito}`);
      console.log('📋 Detalhes:');
      resultDefeito.rows.forEach((row, i) => {
        console.log(
          `  ${i + 1}. Data: ${row.metricDate}, Count: ${row.totalCount}`
        );
      });
    }

    // ========================================
    // 4. INVESTIGAR ATESTADO FUNC (PARANOÁ: 63 real vs 61 calculado)
    // ========================================
    console.log('\n\n👥 === ATESTADO FUNC - PARANOÁ ===');

    const queryAtestado = `
      SELECT "sectorName", "occurrenceType", "metricDate", "employeeCount" 
      FROM raw_oracle_ausencias 
      WHERE "sectorName" = 'PARANOÁ' 
        AND "occurrenceType" = 'ATESTADO FUNC'
        AND "metricDate" BETWEEN $1 AND $2
      ORDER BY "metricDate"
    `;

    const resultAtestado = await client.query(queryAtestado, [
      dataInicio,
      dataFim,
    ]);
    console.log(
      `📊 Registros ATESTADO FUNC-PARANOÁ: ${resultAtestado.rows.length}`
    );

    if (resultAtestado.rows.length > 0) {
      const totalAtestado = resultAtestado.rows.reduce(
        (sum, row) => sum + parseInt(row.employeeCount),
        0
      );
      console.log(`📊 Total calculado: ${totalAtestado}`);
      console.log('📋 Detalhes:');
      resultAtestado.rows.forEach((row, i) => {
        console.log(
          `  ${i + 1}. Data: ${row.metricDate}, Count: ${row.employeeCount}`
        );
      });
    }

    // ========================================
    // 5. VERIFICAR BORDAS DO PERÍODO
    // ========================================
    console.log('\n\n🔍 === VERIFICAÇÃO DE BORDAS ===');

    const queryBordas = `
      SELECT "sectorName", "occurrenceType", "metricDate", "totalCount",
             CASE 
               WHEN "metricDate" < $1 THEN 'ANTES_PERÍODO'
               WHEN "metricDate" > $2 THEN 'APÓS_PERÍODO'
               ELSE 'DENTRO_PERÍODO'
             END as periodo_status
      FROM raw_mysql_quebras_defeitos 
      WHERE "sectorName" = 'PARANOÁ' 
        AND "occurrenceType" = 'QUEBRA'
        AND "metricDate" BETWEEN '2025-05-31' AND '2025-07-01'
      ORDER BY "metricDate"
    `;

    const resultBordas = await client.query(queryBordas, [dataInicio, dataFim]);
    console.log(`📊 Registros nas bordas: ${resultBordas.rows.length}`);

    resultBordas.rows.forEach((row) => {
      const emoji = row.periodo_status === 'DENTRO_PERÍODO' ? '✅' : '❌';
      console.log(
        `  ${emoji} ${row.metricDate}: ${row.totalCount} (${row.periodo_status})`
      );
    });

    // ========================================
    // 6. VERIFICAÇÃO DE DUPLICATAS
    // ========================================
    console.log('\n\n🔍 === VERIFICAÇÃO DE DUPLICATAS ===');

    const queryDuplicatas = `
      SELECT "sectorName", "occurrenceType", "metricDate", COUNT(*) as count
      FROM raw_mysql_quebras_defeitos 
      WHERE "metricDate" BETWEEN $1 AND $2
      GROUP BY "sectorName", "occurrenceType", "metricDate"
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `;

    const resultDuplicatas = await client.query(queryDuplicatas, [
      dataInicio,
      dataFim,
    ]);

    if (resultDuplicatas.rows.length > 0) {
      console.log('❌ DUPLICATAS ENCONTRADAS:');
      resultDuplicatas.rows.forEach((row) => {
        console.log(
          `  ${row.sectorName} - ${row.occurrenceType} - ${row.metricDate}: ${row.count} registros`
        );
      });
    } else {
      console.log('✅ Nenhuma duplicata encontrada');
    }

    // ========================================
    // 7. RESUMO E RECOMENDAÇÕES
    // ========================================
    console.log('\n\n💡 === RESUMO E RECOMENDAÇÕES ===');

    if (resultIncorreto.rows.length > 0) {
      console.log(
        '❌ PROBLEMA 1: MySqlEtlService salvando "FURO DE VIAGEM" em vez de "FURO POR VIAGEM"'
      );
      console.log(
        '   ✅ SOLUÇÃO: Corrigir extractAndLoadFuroDeViagem para usar nome correto'
      );
    }

    if (resultCorreto.rows.length === 0 && resultIncorreto.rows.length === 0) {
      console.log(
        '⚠️  NENHUM DADO DE FURO POR VIAGEM ENCONTRADO - Verificar se ETL foi executado'
      );
    }

    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('1. 🔧 Corrigir MySqlEtlService.extractAndLoadFuroDeViagem');
    console.log('2. 🔄 Reexecutar ETL completo');
    console.log('3. 🧪 Testar novamente');
  } catch (error) {
    console.error('❌ Erro na investigação:', error);
  } finally {
    await client.end();
    console.log('\n✅ Investigação concluída e conexão fechada!');
  }
}

// Executar investigação
debugWithDirectSQL();
