// apps/api/src/test-auth.ts
import 'reflect-metadata';
import { AppDataSource } from './database/data-source';
import { AuthService } from './services/auth.service';

/**
 * Script de teste básico para validar a implementação de autenticação
 * Execute: npx ts-node src/test-auth.ts
 */

async function testAuth() {
  console.log('🧪 Iniciando testes básicos de autenticação...');

  try {
    // 1. Conectar ao banco
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Conectado ao banco de dados');
    }

    // 2. Instanciar AuthService
    const authService = new AuthService();
    console.log('✅ AuthService instanciado');

    // 3. Teste de health check
    console.log('\n🏥 Testando health check...');
    const health = await authService.healthCheck();
    console.log('Health:', health);

    // 4. Teste de login válido
    console.log('\n🔐 Testando login válido...');
    try {
      const loginResult = await authService.login(
        {
          email: 'diretor@viacaopioneira.com',
          password: 'Pioneira@2025',
        },
        '127.0.0.1',
        'test-agent'
      );

      console.log('✅ Login realizado com sucesso!');
      console.log('📋 Dados do usuário:', {
        id: loginResult.user.id,
        nome: loginResult.user.nome,
        email: loginResult.user.email,
        roles: loginResult.user.roles,
        permissions: loginResult.user.permissions.slice(0, 5), // Primeiras 5 para não poluir
        sessionId: loginResult.sessionId,
      });

      // 5. Teste de permissão
      console.log('\n🛡️ Testando verificação de permissão...');
      const hasPermission = await authService.userHasPermission(
        loginResult.user.id,
        'manage_users'
      );
      console.log('Tem permissão para gerenciar usuários:', hasPermission);

      // 6. Teste de sessões
      console.log('\n📱 Testando listagem de sessões...');
      const sessions = await authService.getUserSessions(loginResult.user.id);
      console.log(`Sessões ativas: ${sessions.length}`);

      // 7. Teste de logout
      console.log('\n👋 Testando logout...');
      await authService.logout(loginResult.sessionId, loginResult.user.id);
      console.log('✅ Logout realizado com sucesso!');
    } catch (error) {
      console.error('❌ Erro no teste de login:', error.message);
    }

    // 8. Teste de login inválido
    console.log('\n🚫 Testando login inválido...');
    try {
      await authService.login(
        {
          email: 'diretor@viacaopioneira.com',
          password: 'senhaerrada',
        },
        '127.0.0.1',
        'test-agent'
      );
      console.log('❌ ERRO: Login inválido deveria ter falhado!');
    } catch (error) {
      console.log('✅ Login inválido rejeitado corretamente:', error.message);
    }

    // 9. Teste de usuário inexistente
    console.log('\n👻 Testando usuário inexistente...');
    try {
      await authService.login(
        {
          email: 'usuario.inexistente@test.com',
          password: 'qualquersenha',
        },
        '127.0.0.1',
        'test-agent'
      );
      console.log('❌ ERRO: Usuário inexistente deveria ter falhado!');
    } catch (error) {
      console.log(
        '✅ Usuário inexistente rejeitado corretamente:',
        error.message
      );
    }

    // 10. Teste de busca de usuário
    console.log('\n🔍 Testando busca de usuário...');
    const user = await authService.getUserById(1);
    if (user) {
      console.log('✅ Usuário encontrado:', {
        id: user.id,
        nome: user.nome,
        email: user.email,
        roles: user.roles,
      });
    } else {
      console.log('❌ Usuário não encontrado');
    }

    console.log('\n🎉 Todos os testes básicos concluídos!');
  } catch (error) {
    console.error('💥 Erro nos testes:', error);
    throw error;
  } finally {
    // Fechar conexão
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Conexão com banco fechada');
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  testAuth()
    .then(() => {
      console.log('✅ Testes finalizados com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Falha nos testes:', error);
      process.exit(1);
    });
}

export { testAuth };
