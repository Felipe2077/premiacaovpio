// apps/web/src/components/expurgos/forms/ExpurgoForm.tsx (ATUALIZADO)
'use client';

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
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';

// Schema de validação atualizado
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
}: ExpurgoFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
    watch,
    reset,
  } = useForm<CreateExpurgoFormData>({
    resolver: zodResolver(createExpurgoSchema),
    mode: 'onChange',
    defaultValues: {
      dataEvento: new Date().toISOString().split('T')[0], // Data atual
      descricaoEvento: '',
      justificativaSolicitacao: '',
      valorSolicitado: 0,
    },
  });

  // Observar critério selecionado para mostrar unidade de medida
  const selectedCriterionId = watch('criterionId');
  const selectedCriterion = criterios.find(c => c.id === selectedCriterionId);

  // Filtrar apenas períodos em PLANEJAMENTO ou ATIVA
  const availablePeriods = periodos.filter(p => 
    p.status === 'PLANEJAMENTO' || p.status === 'ATIVA'
  );

  // Critérios elegíveis para expurgo (conforme backend)
  const eligibleCriteria = criterios.filter(c => 
    ['QUEBRA', 'DEFEITO', 'KM OCIOSA', 'FALTA FUNC', 'ATRASO', 'PEÇAS', 'PNEUS'].includes(
      c.nome.toUpperCase()
    )
  );

  const handleFormSubmit = async (data: CreateExpurgoFormData) => {
    try {
      await onSubmit(data);
      reset(); // Limpar formulário após sucesso
    } catch (error) {
      // Erro será tratado pelo componente pai
      console.error('Erro ao submeter formulário:', error);
    }
  };

  const handleCancel = () => {
    reset();
    onCancel?.();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Coluna Principal - Formulário */}
      <div className="lg:col-span-2">
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Período de Competição */}
          <div className="space-y-2">
            <Label htmlFor="competitionPeriodId">
              Período de Competição <span className="text-red-500">*</span>
            </Label>
            <Controller
              name="competitionPeriodId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(value) => field.onChange(parseInt(value, 10))}
                  disabled={isLoadingPeriodos || availablePeriods.length === 0}
                >
                  <SelectTrigger className={errors.competitionPeriodId ? 'border-red-500' : ''}>
                    <SelectValue
                      placeholder={
                        isLoadingPeriodos 
                          ? 'Carregando períodos...' 
                          : availablePeriods.length === 0
                            ? 'Nenhum período disponível'
                            : 'Selecione o período...'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePeriods.map((periodo) => (
                      <SelectItem key={periodo.id} value={String(periodo.id)}>
                        {periodo.mesAno} ({periodo.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.competitionPeriodId && (
              <p className="text-sm text-red-500">{errors.competitionPeriodId.message}</p>
            )}
          </div>

          {/* Grid para Setor e Critério */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Setor */}
            <div className="space-y-2">
              <Label htmlFor="sectorId">
                Setor/Filial <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="sectorId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(value) => field.onChange(parseInt(value, 10))}
                    disabled={isLoadingSetores || setores.length === 0}
                  >
                    <SelectTrigger className={errors.sectorId ? 'border-red-500' : ''}>
                      <SelectValue
                        placeholder={
                          isLoadingSetores 
                            ? 'Carregando...' 
                            : setores.length === 0
                              ? 'Nenhum setor disponível'
                              : 'Selecione o setor...'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {setores.map((setor) => (
                        <SelectItem key={setor.id} value={String(setor.id)}>
                          {setor.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.sectorId && (
                <p className="text-sm text-red-500">{errors.sectorId.message}</p>
              )}
            </div>

            {/* Critério */}
            <div className="space-y-2">
              <Label htmlFor="criterionId">
                Critério <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="criterionId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(value) => field.onChange(parseInt(value, 10))}
                    disabled={isLoadingCriterios || eligibleCriteria.length === 0}
                  >
                    <SelectTrigger className={errors.criterionId ? 'border-red-500' : ''}>
                      <SelectValue
                        placeholder={
                          isLoadingCriterios 
                            ? 'Carregando...' 
                            : eligibleCriteria.length === 0
                              ? 'Nenhum critério elegível'
                              : 'Selecione o critério...'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleCriteria.map((criterio) => (
                        <SelectItem key={criterio.id} value={String(criterio.id)}>
                          <div className="flex items-center justify-between w-full">
                            <span>{criterio.nome}</span>
                            {criterio.unidade_medida && (
                              <span className="text-xs text-muted-foreground ml-2">
                                ({criterio.unidade_medida})
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
                <p className="text-sm text-red-500">{errors.criterionId.message}</p>
              )}
              {eligibleCriteria.length === 0 && !isLoadingCriterios && (
                <p className="text-xs text-amber-600">
                  ⚠️ Apenas critérios específicos são elegíveis para expurgo
                </p>
              )}
            </div>
          </div>

          {/* Grid para Data e Valor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Data do Evento */}
            <div className="space-y-2">
              <Label htmlFor="dataEvento">
                Data do Evento <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dataEvento"
                type="date"
                {...register('dataEvento')}
                className={errors.dataEvento ? 'border-red-500' : ''}
                max={new Date().toISOString().split('T')[0]} // Não permitir datas futuras
              />
              {errors.dataEvento && (
                <p className="text-sm text-red-500">{errors.dataEvento.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Data em que ocorreu o evento
              </p>
            </div>

            {/* Valor Solicitado */}
            <div className="space-y-2">
              <Label htmlFor="valorSolicitado">
                Valor Solicitado <span className="text-red-500">*</span>
                {selectedCriterion?.unidade_medida && (
                  <span className="text-muted-foreground ml-1">
                    ({selectedCriterion.unidade_medida})
                  </span>
                )}
              </Label>
              <Input
                id="valorSolicitado"
                type="number"
                step="0.01"
                min="0.01"
                {...register('valorSolicitado', { valueAsNumber: true })}
                placeholder="Digite o valor"
                className={errors.valorSolicitado ? 'border-red-500' : ''}
              />
              {errors.valorSolicitado && (
                <p className="text-sm text-red-500">{errors.valorSolicitado.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Quantidade a ser expurgada
              </p>
            </div>
          </div>

          {/* Descrição do Evento */}
          <div className="space-y-2">
            <Label htmlFor="descricaoEvento">
              Descrição do Evento <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="descricaoEvento"
              {...register('descricaoEvento')}
              placeholder="Descreva o evento que justifica o expurgo..."
              rows={2}
              className={errors.descricaoEvento ? 'border-red-500' : ''}
            />
            {errors.descricaoEvento && (
              <p className="text-sm text-red-500">{errors.descricaoEvento.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Mínimo de 10 caracteres
            </p>
          </div>

          {/* Justificativa da Solicitação */}
          <div className="space-y-2">
            <Label htmlFor="justificativaSolicitacao">
              Justificativa da Solicitação <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="justificativaSolicitacao"
              {...register('justificativaSolicitacao')}
              placeholder="Explique por que este valor deve ser expurgado..."
              rows={3}
              className={errors.justificativaSolicitacao ? 'border-red-500' : ''}
            />
            {errors.justificativaSolicitacao && (
              <p className="text-sm text-red-500">{errors.justificativaSolicitacao.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Mínimo de 20 caracteres
            </p>
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={!isValid || isLoading}
              className="min-w-[140px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  📤 Enviar Solicitação
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </div>

      {/* Coluna Lateral - Informações e Avisos */}
      <div className="space-y-4">
        {/* Aviso Importante */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-2">
            <div className="text-amber-600 mt-1">⚠️</div>
            <div className="text-amber-800">
              <h4 className="font-medium">Importante</h4>
              <ul className="text-sm mt-2 space-y-1.5">
                <li>• A solicitação será enviada para análise da diretoria</li>
                <li>• Anexe documentos comprobatórios após criar a solicitação</li>
                <li>• Justificativas inadequadas resultarão em rejeição automática</li>
                <li>• O valor aprovado pode ser diferente do solicitado</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Informações do Critério Selecionado */}
        {selectedCriterion && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-2">
              <div className="text-blue-600 mt-1">ℹ️</div>
              <div className="text-blue-800">
                <h4 className="font-medium">Critério Selecionado</h4>
                <div className="text-sm mt-2 space-y-1">
                  <p><strong>Nome:</strong> {selectedCriterion.nome}</p>
                  {selectedCriterion.unidade_medida && (
                    <p><strong>Unidade:</strong> {selectedCriterion.unidade_medida}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dicas de Preenchimento */}
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-start gap-2">
            <div className="text-green-600 mt-1">💡</div>
            <div className="text-green-800">
              <h4 className="font-medium">Dicas</h4>
              <ul className="text-sm mt-2 space-y-1">
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