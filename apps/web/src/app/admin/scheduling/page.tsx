//apps/web/src/app/admin/scheduling/page.tsx
'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle,
  Clock,
  Database,
  Edit,
  HardDriveDownload,
  HelpCircle,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import type { ScheduleConfig } from '@/hooks/useScheduling';
import {
  CreateScheduleDto,
  JobType,
  useScheduling,
} from '@/hooks/useScheduling';

interface CreateScheduleForm {
  name: string;
  description: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  timeOfDay: string;
  weekDays?: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  dayOfMonth?: number;
  jobType: 'FULL_ETL' | 'PARTIAL_RECALCULATION'; // ✨ Removido DATA_VALIDATION
}

export default function SchedulingAdminPage() {
  // ✨ USANDO O HOOK
  const {
    schedules,
    systemStatus,
    loading,
    error,
    createSchedule,
    deleteSchedule,
    triggerJobByType,
    getActiveSchedules,
    startAutoRefresh,
    stopAutoRefresh,
  } = useScheduling();

  // Estados locais apenas para UI
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [jobToExecute, setJobToExecute] = useState<JobType | null>(null);

  const [scheduleToDelete, setScheduleToDelete] =
    useState<ScheduleConfig | null>(null);

  const [editingSchedule, setEditingSchedule] = useState<ScheduleConfig | null>(
    null
  );
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showExecuteDropdown, setShowExecuteDropdown] = useState(false);

  // Estados do formulário
  const [formData, setFormData] = useState<CreateScheduleForm>({
    name: '',
    description: '',
    frequency: 'DAILY',
    timeOfDay: '02:00',
    jobType: 'FULL_ETL',
    weekDays: {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false,
    },
    dayOfMonth: 1,
  });

  // Auto-refresh gerenciado pelo hook - SEM dependências para evitar loop
  useEffect(() => {
    startAutoRefresh(30000); // 30 segundos
    return () => stopAutoRefresh();
  }, []); // ✅ Array vazio - executa apenas no mount/unmount

  // ✨ NOVOS HANDLERS

  // Handlers originais mantidos
  const handleCreateSchedule = async () => {
    try {
      await createSchedule(formData as CreateScheduleDto);
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      alert('Erro ao criar agendamento: ' + (error as Error).message);
    }
  };

  const handleTriggerJob = async (jobType: JobType) => {
    // A confirmação foi removida daqui
    try {
      await triggerJobByType(jobType);
    } catch (error) {
    } finally {
      setShowExecuteDropdown(false);
    }
  };

  // 3. ESTA FUNÇÃO NÃO TEM MAIS O 'confirm()'
  const handleDeleteSchedule = async (id: number) => {
    try {
      await deleteSchedule(id);
    } catch (error) {
      console.error('Falha ao deletar na página:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      frequency: 'DAILY',
      timeOfDay: '02:00',
      jobType: 'FULL_ETL',
      weekDays: {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false,
      },
      dayOfMonth: 1,
    });
  };
  // ✨ FUNÇÕES UTILITÁRIAS MELHORADAS

  const getStatusInfo = (schedule: ScheduleConfig) => {
    switch (schedule.status) {
      case 'ACTIVE':
        return {
          icon: <CheckCircle className='w-4 h-4 text-green-500' />,
          text: 'Ativo',
          color: 'text-green-600',
          bg: 'bg-green-100',
          description: 'Agendado e funcionando normalmente.',
        };
      case 'PAUSED':
      case 'INACTIVE': // Tratamos INACTIVE como PAUSED para o usuário
        return {
          icon: <Clock className='w-4 h-4 text-gray-500' />,
          text: 'Pausado',
          color: 'text-gray-600',
          bg: 'bg-gray-100',
          description: 'Este agendamento não será executado automaticamente.',
        };
      case 'ERROR':
        return {
          icon: <XCircle className='w-4 h-4 text-red-500' />,
          text: 'Erro',
          color: 'text-red-600',
          bg: 'bg-red-100',
          description: 'A última execução falhou. Verifique os logs.',
        };
      // Adicione outros status que sua API possa retornar aqui
      default:
        return {
          icon: <AlertCircle className='w-4 h-4 text-yellow-500' />,
          text: schedule.status, // Mostra o status desconhecido
          color: 'text-yellow-600',
          bg: 'bg-yellow-100',
          description: 'Status desconhecido.',
        };
    }
  };

  const getJobTypeInfo = (jobType: string) => {
    const types = {
      FULL_ETL: {
        name: 'Atualização Completa',
        icon: <Database className='w-4 h-4' />,
        color: 'bg-blue-100 text-blue-800',
        description: 'Busca novos dados e recalcula tudo',
      },
      PARTIAL_RECALCULATION: {
        name: 'Recálculo Resultados',
        icon: <BarChart3 className='w-4 h-4' />,
        color: 'bg-green-100 text-green-800',
        description: 'Recalcula apenas os rankings',
      },
    };
    return (
      types[jobType as keyof typeof types] || {
        name: jobType,
        icon: <AlertCircle className='w-4 h-4' />,
        color: 'bg-gray-100 text-gray-800',
        description: 'Tipo desconhecido',
      }
    );
  };

  const getFrequencyText = (frequency: string) => {
    const map = {
      DAILY: 'Diário',
      WEEKLY: 'Semanal',
      MONTHLY: 'Mensal',
      MANUAL: 'Manual',
    };
    return map[frequency as keyof typeof map] || frequency;
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const formatUptime = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}min`;
  };

  const getLastExecutionText = (schedule: ScheduleConfig) => {
    if (!schedule.lastRunAt) return 'Nunca executado';

    const time = formatDateTime(schedule.lastRunAt);
    const status = schedule.lastRunStatus;

    switch (status) {
      case 'SUCCESS':
        return `✅ Sucesso em ${time}`;
      case 'FAILED':
        return `❌ Falha em ${time}`;
      case 'CANCELLED':
        return `⏹️ Cancelado em ${time}`;
      case 'TIMEOUT':
        return `⏱️ Timeout em ${time}`;
      default:
        return `📅 ${time}`;
    }
  };

  // Loading gerenciado pelo hook
  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <RefreshCw className='w-8 h-8 animate-spin text-blue-500' />
        <span className='ml-2'>Carregando agendamentos...</span>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50 p-6'>
      {/* ✨ HEADER MELHORADO */}
      <div className='mb-8'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold text-gray-900 mb-2'>
              <Calendar className='inline w-8 h-8 mr-3' />
              Agendamentos Automáticos
            </h1>
            <p className='text-gray-600'>
              Configure e monitore execuções automáticas do sistema
            </p>
          </div>

          <button
            onClick={() => setShowHelpModal(true)}
            className='flex items-center px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer'
          >
            <HelpCircle className='w-4 h-4 mr-2' />
            Como Funciona
          </button>
        </div>
      </div>

      {/* ✨ CARD EXPLICATIVO */}
      <div className='bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg p-4 mb-8'>
        <h2 className='text-lg font-semibold text-yellow-800 mb-4 flex items-center'>
          <Info className='w-5 h-5 mr-2 text-yellow-400' />
          Tipos de Agendamento
        </h2>

        <div className='grid md:grid-cols-2 gap-4'>
          <div className='flex items-start space-x-3'>
            <div className='p-2 bg-yellow-200 rounded-lg'>
              <Database className='w-5 h-5 text-yellow-600' />
            </div>
            <div>
              <h3 className='font-medium text-amber-900'>
                Atualização Completa dos Dados
              </h3>
              <p className='text-sm text-yellow-700 mt-1'>
                Busca novos dados de todas fontes de dados (Globus e negócio
                Perfeito) e recalcula todos os rankings e pontuações.
              </p>
            </div>
          </div>

          <div className='flex items-start space-x-3'>
            <div className='p-2 bg-green-100 rounded-lg'>
              <BarChart3 className='w-5 h-5 text-green-600' />
            </div>
            <div>
              <h3 className='font-medium text-green-900'>
                Recálculo dos Resultados
              </h3>
              <p className='text-sm text-green-700 mt-1'>
                Recalcula apenas os rankings e pontuações com os dados já
                disponíveis. Usado após expurgos. Processo rápido.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Status do Sistema */}
      {systemStatus && (
        <div className='bg-white rounded-lg shadow-sm border p-4 mb-8'>
          <h2 className='text-xl font-semibold mb-4 flex items-center'>
            <Activity className='w-5 h-5 mr-2' />
            Status do Sistema
          </h2>

          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            <div className='text-center p-4 bg-gray-50 rounded-lg'>
              <div className='text-2xl font-bold text-blue-600'>
                {systemStatus.activeSchedules}
              </div>
              <div className='text-sm text-gray-600'>Agendamentos Ativos</div>
            </div>

            <div className='text-center p-4 bg-gray-50 rounded-lg'>
              <div className='text-2xl font-bold text-green-600'>
                {systemStatus.totalExecutions}
              </div>
              <div className='text-sm text-gray-600'>Total Execuções</div>
            </div>

            <div className='text-center p-4 bg-gray-50 rounded-lg'>
              <div className='text-2xl font-bold text-red-600'>
                {systemStatus.failedExecutions}
              </div>
              <div className='text-sm text-gray-600'>Execuções Falharam</div>
            </div>

            <div className='text-center p-4 bg-gray-50 rounded-lg'>
              <div className='text-2xl font-bold text-purple-600'>
                {formatUptime(systemStatus.uptime)}
              </div>
              <div className='text-sm text-gray-600'>Tempo Ativo</div>
            </div>
          </div>

          {systemStatus.nextExecution && (
            <div className='mt-4 p-3 bg-blue-50 rounded-lg'>
              <span className='font-medium text-blue-900'>
                Próxima Execução:
              </span>
              <span className='ml-2 text-blue-700'>
                {formatDateTime(systemStatus.nextExecution)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Botões de Ação */}
      <div className='flex justify-between items-center mb-6'>
        {/* Botão de Novo Agendamento (permanece à esquerda) */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <button className='bg-yellow-300 hover:bg-yellow-500 text-black px-4 py-2 rounded-lg flex items-center cursor-pointer'>
              <Plus className='w-4 h-4 mr-2' />
              Novo Agendamento
            </button>
          </DialogTrigger>
          <DialogContent className='sm:max-w-md max-h-[90vh] overflow-y-auto p-6'>
            {/* 1. Título e estrutura interna replicando o layout original */}
            <h3 className='text-lg font-semibold mb-4'>Novo Agendamento</h3>
            <DialogTitle className='sr-only'>
              Criar um Novo Agendamento
            </DialogTitle>

            {/* 2. Formulário mantido dentro de uma div com o espaçamento original */}
            <div className='space-y-4'>
              {/* Nome */}
              <div>
                <label
                  className='block text-sm font-medium mb-1'
                  htmlFor='schedule-name'
                >
                  Nome
                </label>
                <input
                  id='schedule-name'
                  type='text'
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className='w-full border rounded-lg px-3 py-2'
                  placeholder='Ex: Atualização Diária Manhã'
                />
              </div>

              {/* Descrição */}
              <div>
                <label
                  className='block text-sm font-medium mb-1'
                  htmlFor='schedule-description'
                >
                  Descrição
                </label>
                <textarea
                  id='schedule-description'
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className='w-full border rounded-lg px-3 py-2'
                  rows={2}
                  placeholder='Opcional: Descreva o que este agendamento faz...'
                />
              </div>

              {/* Tipo de Execução */}
              <div>
                <label
                  className='block text-sm font-medium mb-1'
                  htmlFor='schedule-jobtype'
                >
                  Tipo de Execução
                </label>
                <select
                  id='schedule-jobtype'
                  value={formData.jobType}
                  onChange={(e) =>
                    setFormData({ ...formData, jobType: e.target.value as any })
                  }
                  className='w-full border rounded-lg px-3 py-2'
                >
                  <option value='FULL_ETL'>
                    Atualização Completa dos Dados
                  </option>
                  <option value='PARTIAL_RECALCULATION'>
                    Recálculo dos Resultados
                  </option>
                </select>
                <div className='mt-1 text-xs text-gray-500'>
                  {formData.jobType === 'FULL_ETL'
                    ? '🔄 Busca novos dados e recalcula tudo (mais demorado).'
                    : '📊 Recalcula apenas os rankings (mais rápido).'}
                </div>
              </div>

              {/* Frequência */}
              <div>
                <label
                  className='block text-sm font-medium mb-1'
                  htmlFor='schedule-frequency'
                >
                  Frequência
                </label>
                <select
                  id='schedule-frequency'
                  value={formData.frequency}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      frequency: e.target.value as any,
                    })
                  }
                  className='w-full border rounded-lg px-3 py-2'
                >
                  <option value='DAILY'>Diário</option>
                  <option value='WEEKLY'>Semanal</option>
                  <option value='MONTHLY'>Mensal</option>
                </select>
              </div>

              {/* Horário */}
              <div>
                <label
                  className='block text-sm font-medium mb-1'
                  htmlFor='schedule-time'
                >
                  Horário
                </label>
                <input
                  id='schedule-time'
                  type='time'
                  value={formData.timeOfDay}
                  onChange={(e) =>
                    setFormData({ ...formData, timeOfDay: e.target.value })
                  }
                  className='w-full border rounded-lg px-3 py-2'
                />
                <div className='mt-1 text-xs text-gray-500'>
                  💡 Recomendado: madrugada (01:00 - 05:00) para menor impacto.
                </div>
              </div>

              {/* Dias da Semana (Condicional) */}
              {formData.frequency === 'WEEKLY' && (
                <div>
                  <label className='block text-sm font-medium mb-2'>
                    Dias da Semana
                  </label>
                  <div className='grid grid-cols-2 gap-2'>
                    {Object.entries(formData.weekDays || {}).map(
                      ([day, checked]) => (
                        <label key={day} className='flex items-center'>
                          <input
                            type='checkbox'
                            checked={checked}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                weekDays: {
                                  ...formData.weekDays!,
                                  [day]: e.target.checked,
                                },
                              })
                            }
                            className='mr-2'
                          />
                          <span className='text-sm capitalize'>
                            {day
                              .replace('day', '')
                              .replace('nes', 's')
                              .replace('urs', 'int')}
                          </span>
                        </label>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Dia do Mês (Condicional) */}
              {formData.frequency === 'MONTHLY' && (
                <div>
                  <label
                    className='block text-sm font-medium mb-1'
                    htmlFor='schedule-dayofmonth'
                  >
                    Dia do Mês
                  </label>
                  <input
                    id='schedule-dayofmonth'
                    type='number'
                    min='1'
                    max='31'
                    value={formData.dayOfMonth}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dayOfMonth: parseInt(e.target.value),
                      })
                    }
                    className='w-full border rounded-lg px-3 py-2'
                  />
                  <div className='mt-1 text-xs text-gray-500'>
                    ⚠️ Cuidado com dias 29-31 em meses que não os têm.
                  </div>
                </div>
              )}
            </div>

            {/* 3. Rodapé com os botões alinhados à direita, como no original */}
            <div className='flex justify-end space-x-3 mt-6'>
              <button
                type='button'
                onClick={() => setShowCreateModal(false)}
                className='px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50'
              >
                Cancelar
              </button>
              <button
                type='button'
                onClick={handleCreateSchedule}
                disabled={loading.actions && loading.actions.has('new')}
                className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50'
              >
                {loading.actions && loading.actions.has('new')
                  ? 'Criando...'
                  : 'Criar Agendamento'}
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* NOVO BOTÃO CENTRAL DE EXECUÇÃO (à direita) */}
        <div className='relative'>
          <button
            onClick={() => setShowExecuteDropdown(!showExecuteDropdown)}
            disabled={loading.trigger}
            className='bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 px-4 py-2 rounded-lg flex items-center disabled:opacity-50 cursor-pointer'
          >
            {loading.trigger ? (
              <Loader2 className='w-4 h-4 mr-2 animate-spin' />
            ) : (
              <HardDriveDownload className='w-4 h-4 mr-2' />
            )}
            {loading.trigger ? 'Iniciando...' : 'Executar Agora'}
          </button>

          {showExecuteDropdown && (
            <div className='absolute right-0 top-full mt-1 w-64 bg-white border rounded-lg shadow-lg z-50'>
              <div className='py-1'>
                <button
                  onClick={() => setJobToExecute(JobType.FULL_ETL)}
                  className='w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center cursor-pointer'
                >
                  <Database className='w-4 h-4 mr-2 text-blue-600' />
                  Atualização Completa
                </button>
                <button
                  onClick={() => setJobToExecute(JobType.PARTIAL_RECALCULATION)}
                  className='w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center cursor-pointer'
                >
                  <BarChart3 className='w-4 h-4 mr-2 text-green-600' />
                  Recálculo dos Resultados
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* ✨ LISTA DE AGENDAMENTOS MELHORADA */}
      <div className='bg-white rounded-lg shadow-sm border'>
        <div className='p-6'>
          <h2 className='text-xl font-semibold mb-4'>
            Agendamentos Configurados
          </h2>

          {schedules.length === 0 ? (
            <div className='text-center py-8 text-gray-500'>
              <Calendar className='w-12 h-12 mx-auto mb-4 text-gray-300' />
              <p>Nenhum agendamento configurado</p>
              <p className='text-sm'>
                Clique em "Novo Agendamento" para começar
              </p>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr className='border-b'>
                    <th className='text-left py-3 px-4'>Nome</th>
                    <th className='text-left py-3 px-4'>Tipo</th>
                    <th className='text-left py-3 px-4'>Frequência</th>
                    <th className='text-left py-3 px-4'>Horário</th>
                    <th className='text-left py-3 px-4'>Status</th>
                    <th className='text-left py-3 px-4'>Próxima Execução</th>
                    <th className='text-left py-3 px-4'>Última Execução</th>
                    <th className='text-left py-3 px-4 relative'>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((schedule) => {
                    console.log('Dados do Agendamento:', schedule);
                    const statusInfo = getStatusInfo(schedule);
                    const jobTypeInfo = getJobTypeInfo(schedule.jobType);

                    return (
                      <tr
                        key={schedule.id}
                        className='border-b hover:bg-gray-50'
                      >
                        <td className='py-3 px-4'>
                          <div>
                            <div className='font-medium'>{schedule.name}</div>
                            {schedule.description && (
                              <div className='text-sm text-gray-500'>
                                {schedule.description}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className='py-3 px-4'>
                          <div
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${jobTypeInfo.color}`}
                            title={jobTypeInfo.description}
                          >
                            {jobTypeInfo.icon}
                            <span className='ml-1'>{jobTypeInfo.name}</span>
                          </div>
                        </td>

                        <td className='py-3 px-4'>
                          <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800'>
                            {getFrequencyText(schedule.frequency)}
                          </span>
                        </td>

                        <td className='py-3 px-4'>
                          <div className='flex items-center'>
                            <Clock className='w-4 h-4 mr-1 text-gray-400' />
                            {schedule.timeOfDay}
                          </div>
                        </td>

                        <td className='py-3 px-4'>
                          <div
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}
                            title={statusInfo.description}
                          >
                            {statusInfo.icon}
                            <span className='ml-1'>{statusInfo.text}</span>
                          </div>
                        </td>

                        <td className='py-3 px-4 text-sm'>
                          {/* A data só é mostrada se o status for 'ACTIVE' */}
                          {schedule.status === 'ACTIVE'
                            ? formatDateTime(schedule.nextRunAt)
                            : '-'}
                        </td>

                        <td className='py-3 px-4 text-sm'>
                          {getLastExecutionText(schedule)}
                        </td>

                        {/* AÇÕES SIMPLIFICADAS */}
                        <td className='py-3 px-4'>
                          <div className='flex space-x-2'>
                            <button
                              onClick={() => setEditingSchedule(schedule)}
                              className='p-1 text-gray-600 hover:text-gray-800 hover:scale-110 transition-transform'
                              title='Editar'
                            >
                              <Edit className='w-4 h-4' />
                            </button>
                            <button
                              onClick={() => setScheduleToDelete(schedule)}
                              className='p-1 text-red-600 hover:text-red-800 hover:scale-110 transition-transform'
                              title='Excluir'
                            >
                              <Trash2 className='w-4 h-4' />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ✨ MODAL DE AJUDA */}
      {showHelpModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto'>
            <h3 className='text-lg font-semibold mb-4 flex items-center'>
              <HelpCircle className='w-5 h-5 mr-2 text-blue-600' />
              Como Funcionam os Agendamentos
            </h3>

            <div className='space-y-6'>
              <div>
                <h4 className='font-medium text-gray-900 mb-2'>
                  📅 Tipos de Frequência
                </h4>
                <ul className='text-sm text-gray-600 space-y-1 ml-4'>
                  <li>
                    • <strong>Diário:</strong> Executa todos os dias no horário
                    definido
                  </li>
                  <li>
                    • <strong>Semanal:</strong> Executa nos dias da semana
                    selecionados
                  </li>
                  <li>
                    • <strong>Mensal:</strong> Executa no dia específico do mês
                  </li>
                </ul>
              </div>

              <div>
                <h4 className='font-medium text-gray-900 mb-2'>
                  🔄 Tipos de Execução
                </h4>
                <div className='space-y-3'>
                  <div className='flex items-start space-x-3'>
                    <Database className='w-5 h-5 text-blue-600 mt-0.5' />
                    <div>
                      <div className='font-medium'>
                        Atualização Completa dos Dados
                      </div>
                      <div className='text-sm text-gray-600'>
                        Conecta nos sistemas Globus e Negócio perfeito (será
                        retirado em breve) e dados da Transdata, busca todos os
                        dados atualizados, processa as informações e recalcula
                        rankings e pontuações.
                      </div>
                    </div>
                  </div>

                  <div className='flex items-start space-x-3'>
                    <BarChart3 className='w-5 h-5 text-green-600 mt-0.5' />
                    <div>
                      <div className='font-medium'>
                        Recálculo dos Resultados
                      </div>
                      <div className='text-sm text-gray-600'>
                        Usa os dados já disponíveis para recalcular apenas os
                        rankings e pontuações.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className='font-medium text-gray-900 mb-2'>
                  ⚡ Controles Disponíveis
                </h4>
                <ul className='text-sm text-gray-600 space-y-1 ml-4'>
                  <li>
                    • <strong>✏️ Editar:</strong> Modificar configurações
                  </li>
                  <li>
                    • <strong>🗑️ Excluir:</strong> Remover agendamento
                    permanentemente
                  </li>
                </ul>
              </div>

              <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4'>
                <h4 className='font-medium text-yellow-800 mb-2'>
                  ⚠️ Importante
                </h4>
                <ul className='text-sm text-yellow-700 space-y-1'>
                  <li>• Agendamentos pausados não executam automaticamente</li>
                  <li>• Apenas uma execução completa pode rodar por vez</li>
                  <li>• Execuções manuais têm prioridade sobre agendadas</li>
                  <li>
                    • Falhas consecutivas pausam o agendamento automaticamente
                  </li>
                </ul>
              </div>
            </div>

            <div className='flex justify-end mt-6'>
              <button
                onClick={() => setShowHelpModal(false)}
                className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700'
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição - Placeholder */}
      {editingSchedule && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg p-6 w-full max-w-md'>
            <h3 className='text-lg font-semibold mb-4'>Editar Agendamento</h3>
            <p className='text-sm text-gray-600 mb-4'>
              Editando: {editingSchedule.name}
            </p>

            <div className='text-center py-4'>
              <Settings className='w-12 h-12 mx-auto text-gray-400 mb-2' />
              <p className='text-gray-600'>
                Use updateSchedule() do hook para implementar a edição
              </p>
            </div>

            <div className='flex justify-end'>
              <button
                onClick={() => setEditingSchedule(null)}
                className='px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50'
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✨ FECHAR DROPDOWN AO CLICAR FORA */}
      {showExecuteDropdown && (
        <div
          className='fixed inset-0 z-0'
          onClick={() => setShowExecuteDropdown(null)}
        />
      )}
      {/* ✨ FECHAR DROPDOWN CENTRAL AO CLICAR FORA */}
      {showExecuteDropdown && (
        <div
          className='fixed inset-0 z-40' // z-index menor que o do dropdown
          onClick={() => setShowExecuteDropdown(false)}
        />
      )}

      {scheduleToDelete && (
        <AlertDialog
          open={!!scheduleToDelete}
          onOpenChange={() => setScheduleToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso irá deletar
                permanentemente o agendamento
                <strong className='text-destructive font-medium'>
                  {' '}
                  "{scheduleToDelete.name}"
                </strong>
                .
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setScheduleToDelete(null)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                onClick={() => {
                  if (scheduleToDelete) {
                    handleDeleteSchedule(scheduleToDelete.id);
                  }
                }}
              >
                Sim, deletar agendamento
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {jobToExecute && (
        <AlertDialog
          open={!!jobToExecute}
          onOpenChange={() => setJobToExecute(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Execução Manual</AlertDialogTitle>
              <AlertDialogDescription>
                Você está prestes a iniciar o processo de
                <strong className='text-foreground font-medium'>
                  {jobToExecute === JobType.FULL_ETL
                    ? ' Atualização Completa dos Dados'
                    : ' Recálculo dos Resultados'}
                </strong>
                .
                <br />
                Esta ação será adicionada à fila de execução. Deseja continuar?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setJobToExecute(null)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  handleTriggerJob(jobToExecute);
                  setJobToExecute(null); // Fecha o diálogo após confirmar
                }}
              >
                Sim, executar agora
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
