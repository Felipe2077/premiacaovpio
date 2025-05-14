// test-parameter-service.ts (na raiz do projeto - VERSÃO COMPLETA)
import * as dotenv from 'dotenv';
import path from 'path';
import 'reflect-metadata';
// Importa o ParameterService e os DTOs/Entidades que ele usa
import { AppDataSource } from './apps/api/src/database/data-source';
import { CompetitionPeriodEntity } from './apps/api/src/entity/competition-period.entity'; // Para buscar o período
import { CriterionEntity } from './apps/api/src/entity/criterion.entity'; // Para buscar critério
import { SectorEntity } from './apps/api/src/entity/sector.entity'; // Para buscar setor
import { UserEntity } from './apps/api/src/entity/user.entity'; // Para simular o actingUser
import { ParameterService } from './apps/api/src/modules/parameters/parameter.service';
import { CreateParameterDto } from './packages/shared-types/dist';

// --- Carregar .env da API ---
const envPath = path.resolve(__dirname, 'apps/api/.env');
dotenv.config({ path: envPath });
console.log(`[Test Parameter Script] .env carregado de: ${envPath}`);

// --- Função de Teste ---
async function runParameterServiceTest() {
  console.log('--- Iniciando Teste do ParameterService ---');

  if (!process.env.POSTGRES_USER) {
    console.error('ERRO: Credenciais Postgres não encontradas no .env!');
    return;
  }

  try {
    if (!AppDataSource.isInitialized) {
      console.log(
        '[Test Parameter Script] Inicializando AppDataSource (Postgres)...'
      );
      await AppDataSource.initialize();
      console.log(
        '[Test Parameter Script] AppDataSource (Postgres) INICIALIZADO.'
      );
    }

    const parameterService = new ParameterService();
    const userRepository = AppDataSource.getRepository(UserEntity);
    const periodRepository = AppDataSource.getRepository(
      CompetitionPeriodEntity
    );
    const criterionRepository = AppDataSource.getRepository(CriterionEntity);
    const sectorRepository = AppDataSource.getRepository(SectorEntity);

    let mockAdminUser = await userRepository.findOneBy({
      email: 'admin@sistema.com',
    });
    if (!mockAdminUser) {
      console.warn(
        '[Test Parameter Script] Usuário admin mock não encontrado, criando um temporário...'
      );
      mockAdminUser = await userRepository.save({
        nome: 'Admin Teste Script',
        email: 'testadmin@scripts.com',
        ativo: true,
      });
    }
    if (!mockAdminUser)
      throw new Error(
        'Não foi possível obter/criar usuário mock para o teste.'
      );
    console.log(
      `[Test Parameter Script] Usando actingUser: ID=${mockAdminUser.id}, Nome=${mockAdminUser.nome}`
    );

    // Buscar IDs reais do banco para usar no teste de criação
    // (Assumindo que o SEED já rodou e populou estas tabelas)
    const competitionPeriodApril = await periodRepository.findOneBy({
      mesAno: '2025-04',
    });
    const criterionAtraso = await criterionRepository.findOneBy({
      nome: 'ATRASO',
    });
    const sectorGama = await sectorRepository.findOneBy({ nome: 'GAMA' });

    if (!competitionPeriodApril || !criterionAtraso || !sectorGama) {
      console.error(
        'ERRO: Período, Critério ou Setor de teste não encontrados no banco (verifique o seed).'
      );
      console.error({ competitionPeriodApril, criterionAtraso, sectorGama });
      return;
    }

    const testPeriodId = competitionPeriodApril.id;
    const testCriterionId = criterionAtraso.id;
    const testSectorId = sectorGama.id;

    const newParameterData: CreateParameterDto = {
      nomeParametro: `TESTE_META_SCRIPT_${Date.now()}`, // Nome único para evitar conflito
      valor: '275', // Novo valor de meta para teste
      dataInicioEfetivo: '2025-04-01',
      criterionId: testCriterionId,
      sectorId: testSectorId,
      competitionPeriodId: testPeriodId,
      justificativa:
        'Meta de teste criada automaticamente pelo script test-parameter-service.ts',
    };

    console.log(
      '\n[Test Parameter Script] Tentando criar novo parâmetro/meta...'
    );
    const createdParameter = await parameterService.createParameter(
      newParameterData,
      mockAdminUser
    );
    console.log('[Test Parameter Script] Parâmetro/Meta CRIADO COM SUCESSO:');
    console.log(JSON.stringify(createdParameter, null, 2));

    const periodToSearch = '2025-04';
    console.log(
      `\n[Test Parameter Script] Buscando parâmetros ATIVOS para o período: ${periodToSearch}`
    );
    const foundActiveParameters =
      await parameterService.findParametersForPeriod(
        periodToSearch,
        undefined,
        undefined,
        true
      );
    console.log(
      `[Test Parameter Script] Parâmetros ATIVOS encontrados para ${periodToSearch} (${foundActiveParameters.length} registros):`
    );
    if (foundActiveParameters.length > 0) {
      console.log(JSON.stringify(foundActiveParameters.slice(0, 5), null, 2)); // Mostra os 5 primeiros
      const isCreatedParamFoundActive = foundActiveParameters.some(
        (p) => p.id === createdParameter.id
      );
      console.log(
        `[Test Parameter Script] Meta recém-criada (ID: ${createdParameter.id}) encontrada entre as ativas? ${isCreatedParamFoundActive}`
      );
    }

    console.log(
      `\n[Test Parameter Script] Buscando TODOS os parâmetros (incluindo históricos) para o período: ${periodToSearch}`
    );
    const foundAllParameters = await parameterService.findParametersForPeriod(
      periodToSearch,
      undefined,
      undefined,
      false
    );
    console.log(
      `[Test Parameter Script] TODOS os parâmetros encontrados para ${periodToSearch} (${foundAllParameters.length} registros):`
    );
    if (foundAllParameters.length > 0) {
      console.log(JSON.stringify(foundAllParameters.slice(0, 5), null, 2)); // Mostra os 5 primeiros
    }

    console.log('\n--- Teste do ParameterService concluído com sucesso! ---');
  } catch (error: unknown) {
    let errorMessage = `--- ERRO GERAL NO TESTE DO PARAMETER SERVICE ---`;
    if (error instanceof Error) {
      errorMessage = `--- ERRO GERAL NO TESTE DO PARAMETER SERVICE (${error.name}): ${error.message} ---`;
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
    console.log('Processo de teste do ParameterService finalizado.');
  }
}

runParameterServiceTest();
