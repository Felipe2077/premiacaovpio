// test-expurgo-service.ts (na raiz do projeto - VERSÃO COMPLETA)
import * as dotenv from 'dotenv';
import path from 'path';
import 'reflect-metadata';
import { AppDataSource } from './apps/api/src/database/data-source';
import { CompetitionPeriodEntity } from './apps/api/src/entity/competition-period.entity';
import { CriterionEntity } from './apps/api/src/entity/criterion.entity';
import { SectorEntity } from './apps/api/src/entity/sector.entity';
import { UserEntity } from './apps/api/src/entity/user.entity';
import { ExpurgoService } from './apps/api/src/modules/expurgos/expurgo.service';
import {
  ApproveRejectExpurgoDto,
  CreateExpurgoDto,
  ExpurgoStatus,
  FindExpurgosDto,
} from './packages/shared-types/dist';

// --- Carregar .env da API ---
const envPath = path.resolve(__dirname, 'apps/api/.env');
dotenv.config({ path: envPath });
console.log(`[Test Expurgo Script] .env carregado de: ${envPath}`);

async function runExpurgoServiceTest() {
  console.log('--- Iniciando Teste do ExpurgoService ---');

  if (!process.env.POSTGRES_USER) {
    console.error('ERRO: Credenciais Postgres não encontradas no .env!');
    return;
  }

  let createdExpurgoId1: number | undefined;
  let createdExpurgoId2: number | undefined;

  try {
    if (!AppDataSource.isInitialized) {
      console.log(
        '[Test Expurgo Script] Inicializando AppDataSource (Postgres)...'
      );
      await AppDataSource.initialize();
      console.log(
        '[Test Expurgo Script] AppDataSource (Postgres) INICIALIZADO.'
      );
    }

    const expurgoService = new ExpurgoService();
    const userRepository = AppDataSource.getRepository(UserEntity);
    const periodRepository = AppDataSource.getRepository(
      CompetitionPeriodEntity
    );
    const criterionRepository = AppDataSource.getRepository(CriterionEntity);
    const sectorRepository = AppDataSource.getRepository(SectorEntity);

    // Simular usuários (actingUser e approvingUser)
    let mockRequestingUser = await userRepository.findOneBy({
      email: 'user@sistema.com',
    }); // Usuário comum para solicitar
    if (!mockRequestingUser) {
      mockRequestingUser = await userRepository.save({
        nome: 'Usuário Solicitante Teste',
        email: 'requester@test.com',
        ativo: true,
      });
    }
    let mockApprovingUser = await userRepository.findOneBy({
      email: 'admin@sistema.com',
    }); // Admin para aprovar/rejeitar
    if (!mockApprovingUser) {
      mockApprovingUser = await userRepository.save({
        nome: 'Admin Aprovador Teste',
        email: 'approver@test.com',
        ativo: true,
      });
    }
    if (!mockRequestingUser || !mockApprovingUser)
      throw new Error('Não foi possível obter/criar usuários mock.');

    // Buscar IDs existentes do SEED para competitionPeriod, criterion, sector
    const competitionPeriod = await periodRepository.findOneBy({
      mesAno: '2025-04',
    }); // Período de Abril
    const criterionQuebra = await criterionRepository.findOneBy({
      nome: 'QUEBRA',
    });
    const sectorGama = await sectorRepository.findOneBy({ nome: 'GAMA' });

    if (!competitionPeriod || !criterionQuebra || !sectorGama) {
      console.error(
        'ERRO: Período, Critério (QUEBRA) ou Setor (GAMA) de teste não encontrados no banco (verifique o seed).'
      );
      return;
    }

    // --- 1. Testar requestExpurgo ---
    console.log('\n--- Testando requestExpurgo (Expurgo 1)... ---');
    const expurgoData1: CreateExpurgoDto = {
      competitionPeriodId: competitionPeriod.id,
      sectorId: sectorGama.id,
      criterionId: criterionQuebra.id,
      dataEvento: '2025-04-10',
      descricaoEvento: 'Vazamento de óleo confirmado pelo mecânico chefe.',
      justificativaSolicitacao:
        'Quebra não foi culpa da operação, mas sim falha mecânica severa e comprovada.',
      valorAjusteNumerico: 1, // Expurgo de 1 quebra
    };
    const solicitado1 = await expurgoService.requestExpurgo(
      expurgoData1,
      mockRequestingUser
    );
    createdExpurgoId1 = solicitado1.id;
    console.log(
      '[Test Expurgo Script] Solicitação de Expurgo 1 CRIADA:',
      JSON.stringify(solicitado1, null, 2)
    );
    if (solicitado1.status !== ExpurgoStatus.PENDENTE)
      throw new Error('Status inicial do expurgo 1 deveria ser PENDENTE');

    // --- 2. Testar findExpurgoById ---
    console.log(
      `\n--- Testando findExpurgoById para ID: ${createdExpurgoId1}... ---`
    );
    const foundExpurgo1 = await expurgoService.findExpurgoById(
      createdExpurgoId1!
    );
    console.log(
      '[Test Expurgo Script] Expurgo 1 Encontrado:',
      JSON.stringify(foundExpurgo1, null, 2)
    );
    if (!foundExpurgo1 || foundExpurgo1.id !== createdExpurgoId1)
      throw new Error('Falha ao buscar expurgo 1 pelo ID');

    // --- 3. Testar approveExpurgo ---
    console.log(
      `\n--- Testando approveExpurgo para ID: ${createdExpurgoId1}... ---`
    );
    const approvalData: ApproveRejectExpurgoDto = {
      justificativaAprovacaoOuRejeicao:
        'Análise concluída, evidências suportam o expurgo.',
    };
    const aprovado1 = await expurgoService.approveExpurgo(
      createdExpurgoId1!,
      approvalData,
      mockApprovingUser
    );
    console.log(
      '[Test Expurgo Script] Expurgo 1 APROVADO:',
      JSON.stringify(aprovado1, null, 2)
    );
    if (aprovado1.status !== ExpurgoStatus.APROVADO)
      throw new Error('Status do expurgo 1 deveria ser APROVADO');
    if (aprovado1.aprovadoPorUserId !== mockApprovingUser.id)
      throw new Error('aprovadoPorUserId incorreto no expurgo 1');

    // --- 4. Testar requestExpurgo (Expurgo 2) ---
    console.log('\n--- Testando requestExpurgo (Expurgo 2)... ---');
    const criterionDefeito = await criterionRepository.findOneBy({
      nome: 'DEFEITO',
    });
    if (!criterionDefeito)
      throw new Error('Critério DEFEITO não encontrado para teste');

    const expurgoData2: CreateExpurgoDto = {
      competitionPeriodId: competitionPeriod.id,
      sectorId: sectorGama.id,
      criterionId: criterionDefeito.id,
      dataEvento: '2025-04-15',
      descricaoEvento: 'Problema elétrico intermitente.',
      justificativaSolicitacao: 'Falha não identificada na preventiva.',
      valorAjusteNumerico: 2,
    };
    const solicitado2 = await expurgoService.requestExpurgo(
      expurgoData2,
      mockRequestingUser
    );
    createdExpurgoId2 = solicitado2.id;
    console.log(
      '[Test Expurgo Script] Solicitação de Expurgo 2 CRIADA:',
      JSON.stringify(solicitado2, null, 2)
    );

    // --- 5. Testar rejectExpurgo ---
    console.log(
      `\n--- Testando rejectExpurgo para ID: ${createdExpurgoId2}... ---`
    );
    const rejectionData: ApproveRejectExpurgoDto = {
      justificativaAprovacaoOuRejeicao:
        'Faltam evidências para comprovar a não responsabilidade da operação.',
    };
    const rejeitado2 = await expurgoService.rejectExpurgo(
      createdExpurgoId2!,
      rejectionData,
      mockApprovingUser
    );
    console.log(
      '[Test Expurgo Script] Expurgo 2 REJEITADO:',
      JSON.stringify(rejeitado2, null, 2)
    );
    if (rejeitado2.status !== ExpurgoStatus.REJEITADO)
      throw new Error('Status do expurgo 2 deveria ser REJEITADO');

    // --- 6. Testar findExpurgos (com filtros) ---
    console.log(
      `\n--- Testando findExpurgos para período ${competitionPeriod.mesAno} e status APROVADO... ---`
    );
    const approvedFilters: FindExpurgosDto = {
      competitionPeriodId: competitionPeriod.id,
      status: ExpurgoStatus.APROVADO,
    };
    const approvedExpurgos = await expurgoService.findExpurgos(approvedFilters);
    console.log(
      `[Test Expurgo Script] Expurgos APROVADOS encontrados (${approvedExpurgos.length}):`,
      JSON.stringify(approvedExpurgos, null, 2)
    );
    if (
      approvedExpurgos.length !== 1 ||
      approvedExpurgos[0]!.id !== createdExpurgoId1
    )
      throw new Error('Busca de expurgos APROVADOS falhou');

    console.log(
      `\n--- Testando findExpurgos para período ${competitionPeriod.mesAno} (todos status)... ---`
    );
    const allFilters: FindExpurgosDto = {
      competitionPeriodId: competitionPeriod.id,
    };
    const allExpurgos = await expurgoService.findExpurgos(allFilters);
    console.log(
      `[Test Expurgo Script] TODOS os expurgos encontrados (${allExpurgos.length}):`,
      JSON.stringify(allExpurgos.slice(0, 5), null, 2)
    ); // Mostra até 5
    if (allExpurgos.length < 2)
      throw new Error(
        'Busca de todos os expurgos para o período falhou em encontrar os 2 criados'
      );

    console.log('\n\n--- Teste do ExpurgoService concluído com sucesso! ---');
  } catch (error: unknown) {
    let errorMessage = `--- ERRO GERAL NO TESTE DO EXPURGO SERVICE ---`;
    if (error instanceof Error) {
      errorMessage = `--- ERRO GERAL NO TESTE DO EXPURGO SERVICE (${error.name}): ${error.message} ---`;
    }
    console.error(errorMessage, error);
    if (error instanceof Error && error.stack) {
      console.error('Stack Trace:', error.stack);
    }
  } finally {
    if (AppDataSource && AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('Conexão Postgres (AppDataSource) finalizada.');
    }
    console.log('Processo de teste do ExpurgoService finalizado.');
  }
}

runExpurgoServiceTest();
