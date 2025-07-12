// apps/web/src/components/expurgos/ExpurgoForm.tsx - CORREÇÃO DO SELECT DE SETOR
'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

// Schema de validação (mantido igual)
const createExpurgoSchema = z.object({
  competitionPeriodId: z
    .number({ required_error: 'Período é obrigatório' })
    .min(1, 'Período inválido'),
  sectorId: z
    .number({ required_error: 'Setor é obrigatório' })
    .min(1, 'Setor inválido'),
  criterionId: z
    .number({ required_error: 'Critério é obrigatório' })
    .min(1, 'Critério inválido'),
  dataEvento: z
    .string({ required_error: 'Data do evento é obrigatória' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido'),
  descricaoEvento: z
    .string({ required_error: 'Descrição é obrigatória' })
    .min(10, 'Descrição deve ter pelo menos 10 caracteres')
    .max(500, 'Descrição muito longa'),
  justificativaSolicitacao: z
    .string({ required_error: 'Justificativa é obrigatória' })
    .min(20, 'Justificativa deve ter pelo menos 20 caracteres')
    .max(1000, 'Justificativa muito longa'),
  valorSolicitado: z
    .number({ required_error: 'Valor é obrigatório' })
    .min(0.01, 'Valor deve ser maior que zero')
    .max(999999, 'Valor muito alto'),
});

type CreateExpurgoFormData = z.infer<typeof createExpurgoSchema>;

interface ExpurgoFormProps {
  setores?: Array<{ id: number; nome: string }>;
  criterios?: Array<{ id: number; nome: string; unidade_medida?: string }>;
  periodos?: Array<{ id: number; mesAno: string; status: string }>;
  isLoadingSetores?: boolean;
  isLoadingCriterios?: boolean;
  isLoadingPeriodos?: boolean;
  onSubmit: (data: CreateExpurgoFormData) => Promise<void>;
  isLoading?: boolean;
  onCancel?: () => void;
  defaultPeriod?: { id: number; mesAno: string; status: string } | null;
}

export default function ExpurgoForm({
  setores = [],
  criterios = [],
  periodos = [],
  isLoadingSetores = false,
  isLoadingCriterios = false,
  isLoadingPeriodos = false,
  onSubmit,
  isLoading = false,
  onCancel,
  defaultPeriod,
}: ExpurgoFormProps) {
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
    watch,
    reset,
    setValue,
  } = useForm<CreateExpurgoFormData>({
    resolver: zodResolver(createExpurgoSchema),
    mode: 'onChange',
    defaultValues: {
      dataEvento: new Date().toISOString().split('T')[0],
      descricaoEvento: '',
      justificativaSolicitacao: '',
      valorSolicitado: 0,
    },
  });

  // Verificar se é gerente
  const isManager = user?.roles?.includes('GERENTE');

  // Encontrar setor do usuário se for gerente
  const userSector =
    isManager && user?.sectorId
      ? setores.find((s) => s.id === user.sectorId)
      : null;

  // Filtrar apenas períodos ATIVA (mudança de regra)
  const availablePeriods = periodos.filter((p) => p.status === 'ATIVA');

  // Período ativo padrão
  const defaultActivePeriod =
    defaultPeriod && defaultPeriod.status === 'ATIVA'
      ? defaultPeriod
      : availablePeriods[0] || null;

  // Observar critério selecionado para mostrar unidade de medida
  const selectedCriterionId = watch('criterionId');
  const selectedCriterion = criterios.find((c) => c.id === selectedCriterionId);

  // Critérios elegíveis para expurgo (conforme backend)
  const eligibleCriteria = criterios.filter((c) =>
    ['QUEBRA', 'DEFEITO', 'KM OCIOSA'].includes(c.nome.toUpperCase())
  );

  // 🎯 CORREÇÃO: Efeito para pré-selecionar valores de forma mais robusta
  useEffect(() => {
    // Pré-selecionar período ativo
    if (defaultActivePeriod && !watch('competitionPeriodId')) {
      setValue('competitionPeriodId', defaultActivePeriod.id);
    }

    // 🎯 CORREÇÃO: Pré-selecionar setor do gerente de forma mais assertiva
    if (isManager && userSector) {
      const currentSectorId = watch('sectorId');
      if (!currentSectorId || currentSectorId !== userSector.id) {
        setValue('sectorId', userSector.id, {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true,
        });
      }
    }
  }, [defaultActivePeriod, isManager, userSector, setValue, watch, setores]);

  const handleFormSubmit = async (data: CreateExpurgoFormData) => {
    try {
      await onSubmit(data);
      reset();
    } catch (error) {
      console.error('Erro ao submeter formulário:', error);
    }
  };

  const handleCancel = () => {
    reset();
    onCancel?.();
  };

  return (
    <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
      {/* Coluna Principal - Formulário */}
      <div className='lg:col-span-2'>
        <form onSubmit={handleSubmit(handleFormSubmit)} className='space-y-4'>
          {/* Período de Competição */}
          <div className='space-y-2'>
            <Label htmlFor='competitionPeriodId'>
              Período de Competição <span className='text-red-500'>*</span>
            </Label>
            <Controller
              name='competitionPeriodId'
              control={control}
              render={({ field }) => (
                <Select
                  value={
                    field.value
                      ? String(field.value)
                      : defaultActivePeriod
                        ? String(defaultActivePeriod.id)
                        : ''
                  }
                  onValueChange={(value) => field.onChange(parseInt(value, 10))}
                  disabled={true} // SEMPRE READONLY - só período ativo
                >
                  <SelectTrigger
                    className={`${errors.competitionPeriodId ? 'border-red-500' : ''} bg-gray-50`}
                  >
                    <SelectValue>
                      {defaultActivePeriod
                        ? `${defaultActivePeriod.mesAno} (Vigência Ativa)`
                        : 'Nenhum período ativo encontrado'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {defaultActivePeriod ? (
                      <SelectItem
                        key={defaultActivePeriod.id}
                        value={String(defaultActivePeriod.id)}
                      >
                        {defaultActivePeriod.mesAno} (Vigência Ativa)
                      </SelectItem>
                    ) : (
                      <SelectItem value='none' disabled>
                        Nenhum período ativo
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.competitionPeriodId && (
              <p className='text-sm text-red-500'>
                {errors.competitionPeriodId.message}
              </p>
            )}
          </div>

          {/* Grid para Setor e Critério */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {/* Setor - 🎯 CORREÇÃO APLICADA AQUI */}
            <div className='space-y-2'>
              <Label htmlFor='sectorId'>
                Setor/Filial <span className='text-red-500'>*</span>
                {isManager && (
                  <span className='text-xs text-amber-600 ml-2'>
                    (Limitado ao seu setor)
                  </span>
                )}
              </Label>
              <Controller
                name='sectorId'
                control={control}
                render={({ field }) => {
                  // 🎯 CORREÇÃO: Lógica mais robusta para o valor do select
                  const selectValue = (() => {
                    // Se há um valor no formulário, use-o
                    if (field.value) {
                      return String(field.value);
                    }

                    // Se é gerente e tem setor, use o setor do usuário
                    if (isManager && userSector) {
                      return String(userSector.id);
                    }

                    // Caso contrário, valor vazio
                    return '';
                  })();

                  return (
                    <Select
                      value={selectValue}
                      onValueChange={(value) => {
                        // Para gerentes, não permitir mudança
                        if (!isManager) {
                          field.onChange(parseInt(value, 10));
                        }
                      }}
                      disabled={
                        isManager || isLoadingSetores || setores.length === 0
                      }
                    >
                      <SelectTrigger
                        className={`${errors.sectorId ? 'border-red-500' : ''} ${
                          isManager ? 'bg-gray-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <SelectValue>
                          {isLoadingSetores
                            ? 'Carregando...'
                            : isManager && userSector
                              ? userSector.nome
                              : setores.length === 0
                                ? 'Nenhum setor disponível'
                                : selectValue
                                  ? setores.find(
                                      (s) => s.id === parseInt(selectValue)
                                    )?.nome || 'Setor selecionado'
                                  : 'Selecione o setor...'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {isManager && userSector ? (
                          // Mostrar apenas o setor do gerente
                          <SelectItem
                            key={userSector.id}
                            value={String(userSector.id)}
                          >
                            {userSector.nome}
                          </SelectItem>
                        ) : (
                          // Mostrar todos os setores (para diretores)
                          setores.map((setor) => (
                            <SelectItem key={setor.id} value={String(setor.id)}>
                              {setor.nome}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  );
                }}
              />
              {errors.sectorId && (
                <p className='text-sm text-red-500'>
                  {errors.sectorId.message}
                </p>
              )}
            </div>

            {/* Critério */}
            <div className='space-y-2'>
              <Label htmlFor='criterionId'>
                Critério <span className='text-red-500'>*</span>
              </Label>
              <Controller
                name='criterionId'
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ''}
                    onValueChange={(value) =>
                      field.onChange(parseInt(value, 10))
                    }
                    disabled={
                      isLoadingCriterios || eligibleCriteria.length === 0
                    }
                  >
                    <SelectTrigger
                      className={errors.criterionId ? 'border-red-500' : ''}
                    >
                      <SelectValue
                        placeholder={
                          isLoadingCriterios
                            ? 'Carregando...'
                            : eligibleCriteria.length === 0
                              ? 'Nenhum critério disponível'
                              : 'Selecione o critério...'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleCriteria.map((criterio) => (
                        <SelectItem
                          key={criterio.id}
                          value={String(criterio.id)}
                        >
                          <div className='flex flex-col'>
                            <span className='font-medium'>{criterio.nome}</span>
                            {criterio.unidade_medida && (
                              <span className='text-xs text-gray-500'>
                                Unidade: {criterio.unidade_medida}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.criterionId && (
                <p className='text-sm text-red-500'>
                  {errors.criterionId.message}
                </p>
              )}
            </div>
          </div>

          {/* Data do Evento */}
          <div className='space-y-2'>
            <Label htmlFor='dataEvento'>
              Data do Evento <span className='text-red-500'>*</span>
            </Label>
            <Input
              type='date'
              {...register('dataEvento')}
              className={errors.dataEvento ? 'border-red-500' : ''}
              max={new Date().toISOString().split('T')[0]} // Não permitir datas futuras
            />
            {errors.dataEvento && (
              <p className='text-sm text-red-500'>
                {errors.dataEvento.message}
              </p>
            )}
          </div>

          {/* Descrição do Evento */}
          <div className='space-y-2'>
            <Label htmlFor='descricaoEvento'>
              Descrição do Evento <span className='text-red-500'>*</span>
            </Label>
            <Textarea
              {...register('descricaoEvento')}
              placeholder='Descreva o evento que motivou a solicitação de expurgo...'
              className={`min-h-[80px] ${errors.descricaoEvento ? 'border-red-500' : ''}`}
            />
            {errors.descricaoEvento && (
              <p className='text-sm text-red-500'>
                {errors.descricaoEvento.message}
              </p>
            )}
          </div>

          {/* Valor Solicitado */}
          <div className='space-y-2'>
            <Label htmlFor='valorSolicitado'>
              Valor a ser Expurgado <span className='text-red-500'>*</span>
              {selectedCriterion?.unidade_medida && (
                <span className='text-sm text-gray-600 ml-2'>
                  ({selectedCriterion.unidade_medida})
                </span>
              )}
            </Label>
            <Input
              type='number'
              step='0.01'
              min='0.01'
              max='999999'
              {...register('valorSolicitado', { valueAsNumber: true })}
              placeholder='0.00'
              className={errors.valorSolicitado ? 'border-red-500' : ''}
            />
            {errors.valorSolicitado && (
              <p className='text-sm text-red-500'>
                {errors.valorSolicitado.message}
              </p>
            )}
          </div>

          {/* Justificativa */}
          <div className='space-y-2'>
            <Label htmlFor='justificativaSolicitacao'>
              Justificativa da Solicitação{' '}
              <span className='text-red-500'>*</span>
            </Label>
            <Textarea
              {...register('justificativaSolicitacao')}
              placeholder='Explique detalhadamente os motivos que justificam a solicitação de expurgo...'
              className={`min-h-[120px] ${errors.justificativaSolicitacao ? 'border-red-500' : ''}`}
            />
            {errors.justificativaSolicitacao && (
              <p className='text-sm text-red-500'>
                {errors.justificativaSolicitacao.message}
              </p>
            )}
          </div>

          <DialogFooter className='flex justify-between gap-3'>
            <Button
              type='button'
              variant='outline'
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type='submit'
              disabled={!isValid || isLoading}
              className='bg-blue-600 hover:bg-blue-700'
            >
              {isLoading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Enviando...
                </>
              ) : (
                <>📤 Enviar Solicitação</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </div>

      {/* Coluna Lateral - Informações e Avisos */}
      <div className='space-y-4'>
        {/* Aviso Importante */}
        <div className='rounded-lg border border-amber-200 bg-amber-50 p-4'>
          <div className='flex items-start gap-2'>
            <div className='text-amber-600 mt-1'>⚠️</div>
            <div className='text-amber-800'>
              <h4 className='font-medium'>Importante</h4>
              <ul className='text-sm mt-2 space-y-1.5'>
                <li>• A solicitação será enviada para análise da diretoria</li>
                <li>
                  • Anexe documentos comprobatórios após criar a solicitação
                </li>
                <li>
                  • Justificativas inadequadas resultarão em rejeição automática
                </li>
                <li>• O valor aprovado pode ser diferente do solicitado</li>
                {isManager && (
                  <li>• Gerentes só podem solicitar para seu setor</li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Dicas de Preenchimento */}
        <div className='rounded-lg border border-green-200 bg-green-50 p-4'>
          <div className='flex items-start gap-2'>
            <div className='text-green-600 mt-1'>💡</div>
            <div className='text-green-800'>
              <h4 className='font-medium'>Dicas</h4>
              <ul className='text-sm mt-2 space-y-1'>
                <li>• Seja específico na descrição do evento</li>
                <li>• Forneça argumentos sólidos na justificativa</li>
                <li>• Mantenha documentos de apoio organizados</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
