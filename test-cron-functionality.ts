// test-cron-functionality.ts
import 'reflect-metadata';
import { AppDataSource } from './apps/api/src/database/data-source';
import { UserEntity } from './apps/api/src/entity/user.entity';
import { SchedulingService } from './apps/api/src/modules/scheduling/scheduling.service';

async function testCronFunctionality() {
  console.log('🧪 TESTE DE FUNCIONAMENTO DO CRON');
  console.log('=================================');

  let scheduleId: number | null = null;

  try {
    // Inicializar banco
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Banco de dados conectado');
    }

    await AppDataSource.synchronize();
    console.log('✅ Esquema sincronizado');

    // Criar usuário de teste se não existir
    const userRepo = AppDataSource.getRepository(UserEntity);
    let testUser = await userRepo.findOne({
      where: { email: 'test@sistema.com' },
    });

    if (!testUser) {
      testUser = userRepo.create({
        nome: 'Usuário Teste',
        email: 'test@sistema.com',
        senha: 'test123',
        isActive: true,
      });
      await userRepo.save(testUser);
      console.log('✅ Usuário de teste criado');
    }

    // Instanciar serviço de agendamento
    const schedulingService = new SchedulingService();
    await schedulingService.initialize();
    console.log('✅ SchedulingService inicializado');

    // Calcular horário para execução em 2 minutos
    const now = new Date();
    const nextRun = new Date(now.getTime() + 2 * 60 * 1000);
    const testTime = `${nextRun.getHours().toString().padStart(2, '0')}:${nextRun.getMinutes().toString().padStart(2, '0')}`;

    console.log(`\n🕐 Criando agendamento de teste para: ${testTime}`);
    console.log(`   Execução prevista: ${nextRun.toLocaleString()}`);

    // Criar agendamento de teste
    const testSchedule = await schedulingService.createSchedule(
      {
        name: 'Teste Cron - Execução Rápida',
        description: 'Agendamento de teste para validar funcionamento do cron',
        frequency: 'DAILY',
        timeOfDay: testTime,
        jobType: 'PARTIAL_RECALCULATION',
        advancedConfig: {
          onlyIfActiveePeriod: false,
          emailNotifications: false,
          skipIfPreviousRunning: false,
        },
      },
      testUser
    );

    scheduleId = testSchedule.id;

    console.log(`✅ Agendamento criado: ID ${testSchedule.id}`);
    console.log(`   Cron: ${testSchedule.cronExpression}`);
    console.log(`   Próxima execução: ${testSchedule.nextRunAt}`);

    // Monitorar execução
    console.log('\n⏰ Aguardando execução do agendamento...');
    console.log('   Pressione Ctrl+C para cancelar');

    let attempts = 0;
    const maxAttempts = 300; // 5 minutos

    const checkExecution = async (): Promise<void> => {
      return new Promise((resolve, reject) => {
        const interval = setInterval(async () => {
          attempts++;

          try {
            const updatedSchedule = await schedulingService.getScheduleById(
              scheduleId!
            );

            if (!updatedSchedule) {
              clearInterval(interval);
              reject(new Error('Agendamento não encontrado'));
              return;
            }

            process.stdout.write(
              `\r⏳ Verificando... ${attempts}/${maxAttempts}s - Execuções: ${updatedSchedule.executionCount}`
            );

            // Sucesso - agendamento executou
            if (updatedSchedule.executionCount > 0) {
              clearInterval(interval);
              console.log('\n\n🎉 AGENDAMENTO EXECUTADO COM SUCESSO!');
              console.log('=====================================');
              console.log(`   Execuções: ${updatedSchedule.executionCount}`);
              console.log(`   Última execução: ${updatedSchedule.lastRunAt}`);
              console.log(`   Status: ${updatedSchedule.lastRunStatus}`);
              console.log(
                `   Mensagem: ${updatedSchedule.lastRunMessage || 'N/A'}`
              );
              resolve();
              return;
            }

            // Falha - teve erros
            if (updatedSchedule.consecutiveFailures > 0) {
              clearInterval(interval);
              console.log('\n\n❌ AGENDAMENTO FALHOU');
              console.log('===================');
              console.log(`   Falhas: ${updatedSchedule.consecutiveFailures}`);
              console.log(
                `   Última mensagem: ${updatedSchedule.lastRunMessage}`
              );
              console.log(`   Status: ${updatedSchedule.status}`);
              reject(new Error('Agendamento falhou na execução'));
              return;
            }

            // Timeout
            if (attempts >= maxAttempts) {
              clearInterval(interval);
              console.log('\n\n⏰ TIMEOUT - Agendamento não executou');
              console.log('===================================');
              console.log('   Possíveis causas:');
              console.log('   1. Horário ainda não chegou');
              console.log('   2. Sistema de queue não está funcionando');
              console.log('   3. AutomationService não está disponível');
              console.log('\n📊 Status final:');
              console.log(`   Ativo: ${updatedSchedule.isActive}`);
              console.log(`   Status: ${updatedSchedule.status}`);
              console.log(`   Próxima execução: ${updatedSchedule.nextRunAt}`);
              reject(new Error('Timeout aguardando execução'));
              return;
            }
          } catch (error) {
            clearInterval(interval);
            reject(error);
          }
        }, 1000);
      });
    };

    // Aguardar execução
    await checkExecution();

    // Limpar agendamento de teste
    console.log('\n🧹 Removendo agendamento de teste...');
    await schedulingService.deleteSchedule(scheduleId!, testUser);
    console.log('✅ Agendamento removido');

    console.log('\n✅ TESTE DE CRON CONCLUÍDO COM SUCESSO!');
    console.log('   O sistema de agendamento está funcionando perfeitamente.');
  } catch (error) {
    console.error('\n❌ ERRO NO TESTE DE CRON:');
    console.error('========================');
    console.error(error);

    // Tentar limpar agendamento de teste se foi criado
    if (scheduleId) {
      try {
        const schedulingService = new SchedulingService();
        const userRepo = AppDataSource.getRepository(UserEntity);
        const testUser = await userRepo.findOne({
          where: { email: 'test@sistema.com' },
        });
        if (testUser) {
          await schedulingService.deleteSchedule(scheduleId, testUser);
          console.log('🧹 Agendamento de teste removido');
        }
      } catch (cleanupError) {
        console.error('❌ Erro ao limpar agendamento:', cleanupError);
      }
    }

    process.exit(1);
  } finally {
    // Fechar conexão
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('\n🔌 Conexão fechada');
    }
  }

  process.exit(0);
}

// Tratar Ctrl+C
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Teste cancelado pelo usuário');

  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }

  process.exit(0);
});

// Executar teste
testCronFunctionality().catch((error) => {
  console.error('\n💥 ERRO CRÍTICO:', error);
  process.exit(1);
});
