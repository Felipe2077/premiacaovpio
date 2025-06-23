// src/scripts/init-scheduling.ts
import 'reflect-metadata';
import { AppDataSource } from '../database/data-source';
import { SchedulingService } from '../modules/scheduling/scheduling.service';

/**
 * Script para inicializar o sistema de agendamento
 * Execute após o servidor estar configurado
 */
async function initializeScheduling() {
  console.log('🚀 Inicializando sistema de agendamento...');
  
  try {
    // Garantir que o banco está conectado
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Banco de dados conectado');
    }

    // Inicializar o serviço de agendamento
    const schedulingService = new SchedulingService();
    await schedulingService.initialize();
    
    console.log('✅ Sistema de agendamento inicializado com sucesso!');
    console.log('');
    console.log('📋 APIs disponíveis:');
    console.log('   GET    /api/scheduling/schedules - Listar agendamentos');
    console.log('   POST   /api/scheduling/schedules - Criar agendamento');
    console.log('   GET    /api/scheduling/schedules/:id - Buscar agendamento');
    console.log('   PUT    /api/scheduling/schedules/:id - Atualizar agendamento');
    console.log('   DELETE /api/scheduling/schedules/:id - Remover agendamento');
    console.log('   POST   /api/scheduling/schedules/:id/execute - Executar agora');
    console.log('   GET    /api/scheduling/system/status - Status do sistema');
    console.log('   POST   /api/scheduling/system/restart - Reiniciar sistema');
    console.log('   GET    /api/scheduling/system/health - Health check');
    console.log('   GET    /api/scheduling/templates - Templates predefinidos');
    
  } catch (error) {
    console.error('❌ Erro ao inicializar sistema de agendamento:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  initializeScheduling();
}

export { initializeScheduling };
