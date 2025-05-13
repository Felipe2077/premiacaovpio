// test-parameter-service.ts (na raiz do projeto - VERSÃO COMPLETA)
import * as dotenv from 'dotenv';
import path from 'path';
import 'reflect-metadata';
// Importa o ParameterService e os DTOs/Entidades que ele usa
import { AppDataSource } from './apps/api/src/database/data-source';
import { UserEntity } from './apps/api/src/entity/user.entity'; // Para simular o actingUser
import {
  CreateParameterDto,
  ParameterService,
} from './apps/api/src/modules/parameters/parameter.service';

// --- Carregar .env da API ---
const envPath = path.resolve(__dirname, 'apps/api/.env');
dotenv.config({ path: envPath });
console.log(`[Test Parameter Script] .env carregado de: ${envPath}`);

// --- Função de Teste ---
async function runParameterServiceTest() {
  console.log('--- Iniciando Teste do ParameterService ---');

  // Verifica credenciais Postgres básicas
  if (
    !process.env.POSTGRES_USER ||
    !process.env.POSTGRES_PASSWORD ||
    !process.env.POSTGRES_DB
  ) {
    console.error('ERRO: Credenciais Postgres não encontradas no .env!');
    return;
  }

  try {
    // 1. Garantir que o AppDataSource (Postgres) está inicializado
    if (!AppDataSource.isInitialized) {
      console.log(
        '[Test Parameter Script] Inicializando AppDataSource (Postgres)...'
      );
      await AppDataSource.initialize();
      console.log(
        '[Test Parameter Script] AppDataSource (Postgres) INICIALIZADO.'
      );
    } else {
      console.log(
        '[Test Parameter Script] AppDataSource (Postgres) já estava inicializado.'
      );
    }

    // 2. Instanciar o ParameterService
    const parameterService = new ParameterService();

    // 3. Simular um usuário que está realizando a ação (actingUser)
    // Em um sistema real, isso viria da autenticação. Aqui, vamos pegar o admin mockado do seed.
    const userRepository = AppDataSource.getRepository(UserEntity);
    let mockAdminUser = await userRepository.findOneBy({
      email: 'admin@sistema.com',
    });
    if (!mockAdminUser) {
      // Se o admin do seed não existir, cria um temporário só para o teste (ou lança erro)
      console.warn(
        '[Test Parameter Script] Usuário admin mock não encontrado, criando um temporário...'
      );
      mockAdminUser = await userRepository.save({
        nome: 'Admin Teste',
        email: 'testadmin@sistema.com',
        ativo: true,
      });
      if (!mockAdminUser)
        throw new Error('Não foi possível criar usuário mock para o teste.');
    }
    console.log(
      `[Test Parameter Script] Usando actingUser: ID=<span class="math-inline">\{mockAdminUser\.id\}, Nome\=</span>{mockAdminUser.nome}`
    );

    // 4. Dados para criar uma nova meta
    // Primeiro, precisamos de um competitionPeriodId, criterionId e sectorId válidos (que existem no seu seed)
    // Vamos assumir que o período com mesAno '2025-04' (ID 2 no seu seed) e critério 'ATRASO' (ID 1) para setor 'GAMA' (ID 1)
    const testPeriodId = 2; // ID do período '2025-04' (VERIFIQUE NO SEU SEED/DB)
    const testCriterionId = 1; // ID do critério 'ATRASO' (VERIFIQUE NO SEU SEED/DB)
    const testSectorId = 1; // ID do setor 'GAMA' (VERIFIQUE NO SEU SEED/DB)

    const newParameterData: CreateParameterDto = {
      nomeParametro: 'TESTE_META_ATRASO_GAMA',
      valor: '250', // Novo valor de meta para teste
      dataInicioEfetivo: '2025-04-01',
      criterionId: testCriterionId,
      sectorId: testSectorId,
      competitionPeriodId: testPeriodId, // Associando ao período de Abril/2025
      justificativa:
        'Meta de teste criada pelo script test-parameter-service.ts',
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

    // 5. Testar a busca de parâmetros para o período
    const periodToSearch = '2025-04';
    console.log(
      `\n[Test Parameter Script] Buscando parâmetros para o período: ${periodToSearch}`
    );
    const foundParameters =
      await parameterService.findParametersForPeriod(periodToSearch);
    console.log(
      `[Test Parameter Script] Parâmetros encontrados para <span class="math-inline">\{periodToSearch\} \(</span>{foundParameters.length} registros):`
    );
    if (foundParameters.length > 0) {
      console.log(JSON.stringify(foundParameters.slice(0, 5), null, 2)); // Mostra os 5 primeiros
    }

    // 6. Testar a busca filtrando por setor e critério (usando os IDs do parâmetro que acabamos de criar)
    if (createdParameter) {
      console.log(
        `\n[Test Parameter Script] Buscando parâmetros para período ${periodToSearch}, setor ${createdParameter.sectorId}, critério ${createdParameter.criterionId}`
      );
      const specificParams = await parameterService.findParametersForPeriod(
        periodToSearch,
        createdParameter.sectorId || undefined, // Passa undefined se for null
        createdParameter.criterionId || undefined // Passa undefined se for null
      );
      console.log(
        `[Test Parameter Script] Parâmetros específicos encontrados (${specificParams.length} registros):`
      );
      if (specificParams.length > 0) {
        console.log(JSON.stringify(specificParams.slice(0, 5), null, 2));
      }
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
    // Garante que a conexão Postgres seja fechada
    if (AppDataSource && AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('Conexão Postgres (AppDataSource) finalizada.');
    }
    console.log('Processo de teste do ParameterService finalizado.');
  }
}

// Executa o teste
runParameterServiceTest();
