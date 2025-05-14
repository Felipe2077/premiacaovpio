// apps/web/src/app/admin/parameters/_components/parameter-form.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  CreateParameterDto,
  UpdateParameterDto,
} from '@sistema-premiacao/shared-types';
import { useEffect } from 'react';

// Definir tipos para os dados dos dropdowns (idealmente viriam de shared-types ou de um arquivo de tipos)
interface CompetitionPeriod {
  id: number;
  mesAno: string;
  status: string;
}
interface Criterion {
  id: number;
  nome: string;
}
interface Sector {
  id: number;
  nome: string;
}

// Schema de validação com Zod
const parameterFormSchema = z.object({
  nomeParametro: z
    .string()
    .min(3, { message: 'Nome deve ter pelo menos 3 caracteres.' })
    .max(100)
    .optional()
    .or(z.literal('')), // Opcional, mas se fornecido, tem regras
  valor: z.string().min(1, { message: 'Valor é obrigatório.' }), // Validar como número se necessário após conversão
  dataInicioEfetivo: z.string().min(10, {
    message: 'Data de início é obrigatória no formato YYYY-MM-DD.',
  }), // YYYY-MM-DD
  criterionId: z.string().min(1, { message: 'Critério é obrigatório.' }), // Será string do Select, converter para number no submit
  sectorId: z.string().optional().nullable(), // Pode ser string 'null', ID numérico como string, ou undefined
  competitionPeriodId: z.string().min(1, { message: 'Período é obrigatório.' }), // Será string do Select
  justificativa: z
    .string()
    .min(5, {
      message:
        'Justificativa é obrigatória e deve ter pelo menos 5 caracteres.',
    })
    .max(500),
  // Para Update, o DTO no backend pode precisar de dataFimEfetivoAnterior
  dataFimEfetivoAnterior: z.string().optional(),
});

type ParameterFormValues = z.infer<typeof parameterFormSchema>;

interface ParameterFormProps {
  isLoading: boolean;
  onSubmit: (data: CreateParameterDto | UpdateParameterDto) => Promise<void>; // O submit recebe Create ou Update DTO
  competitionPeriods: CompetitionPeriod[] | undefined;
  criteria: Criterion[] | undefined;
  sectors: Sector[] | undefined;
  initialData?: Partial<
    ParameterFormValues & {
      id?: number;
      competitionPeriodId?: number;
      criterionId?: number;
      sectorId?: number | null;
    }
  >; // Para edição
  isUpdate?: boolean;
  onClose?: () => void; // Para fechar o modal
}

export function ParameterForm({
  isLoading,
  onSubmit,
  competitionPeriods,
  criteria,
  sectors,
  initialData,
  isUpdate = false,
  onClose,
}: ParameterFormProps) {
  const form = useForm<ParameterFormValues>({
    resolver: zodResolver(parameterFormSchema),
    defaultValues: {
      nomeParametro: initialData?.nomeParametro || '',
      valor: initialData?.valor || '',
      dataInicioEfetivo:
        initialData?.dataInicioEfetivo ||
        new Date().toISOString().split('T')[0],
      criterionId: initialData?.criterionId?.toString() || undefined,
      sectorId: initialData?.sectorId?.toString() || 'null', // 'null' para "Nenhum (Geral)"
      competitionPeriodId:
        initialData?.competitionPeriodId?.toString() ||
        competitionPeriods
          ?.find((p) => p.status === 'PLANEJAMENTO')
          ?.id.toString() || // Tenta pré-selecionar
        undefined,
      justificativa: initialData?.justificativa || '',
      dataFimEfetivoAnterior: undefined, // Só para update, se necessário
    },
  });

  useEffect(() => {
    // Para resetar o formulário se initialData mudar (ao abrir modal de edição)
    if (initialData) {
      form.reset({
        nomeParametro: initialData.nomeParametro || '',
        valor: initialData.valor || '',
        dataInicioEfetivo:
          initialData.dataInicioEfetivo ||
          new Date().toISOString().split('T')[0],
        criterionId: initialData.criterionId?.toString() || undefined,
        sectorId: initialData.sectorId?.toString() || 'null',
        competitionPeriodId:
          initialData.competitionPeriodId?.toString() || undefined,
        justificativa: initialData.justificativa || '',
      });
    } else {
      // Reset para criação
      form.reset({
        nomeParametro: '',
        valor: '',
        dataInicioEfetivo: new Date().toISOString().split('T')[0],
        criterionId: undefined,
        sectorId: 'null',
        competitionPeriodId:
          competitionPeriods
            ?.find((p) => p.status === 'PLANEJAMENTO')
            ?.id.toString() || undefined,
        justificativa: '',
      });
    }
  }, [initialData, form, competitionPeriods]);

  const handleSubmit = async (values: ParameterFormValues) => {
    const dtoData: CreateParameterDto | UpdateParameterDto = {
      nomeParametro: values.nomeParametro || undefined, // Opcional, serviço pode gerar
      valor: values.valor,
      dataInicioEfetivo: values.dataInicioEfetivo,
      criterionId: parseInt(values.criterionId!, 10), // ! pois é required no schema
      sectorId:
        values.sectorId === 'null' || !values.sectorId
          ? null
          : parseInt(values.sectorId, 10),
      competitionPeriodId: parseInt(values.competitionPeriodId!, 10), // ! pois é required
      justificativa: values.justificativa,
      ...(isUpdate &&
        values.dataFimEfetivoAnterior && {
          dataFimEfetivoAnterior: values.dataFimEfetivoAnterior,
        }),
    };
    await onSubmit(dtoData);
    // A lógica de fechar o modal e mostrar toast pode ficar no componente pai (page.tsx)
    // ou ser chamada aqui se `onClose` for passado.
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-6'>
        {/* Período de Competição (Select) */}
        <FormField
          control={form.control}
          name='competitionPeriodId'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Período da Premiação*</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isUpdate || !competitionPeriods}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder='Selecione o período...' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {competitionPeriods?.map((p) => (
                    <SelectItem
                      key={p.id}
                      value={String(p.id)}
                      disabled={
                        isUpdate
                          ? p.id !== initialData?.competitionPeriodId
                          : p.status !== 'PLANEJAMENTO'
                      }
                    >
                      {p.mesAno} ({p.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Nome do Parâmetro */}
        <FormField
          control={form.control}
          name='nomeParametro'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Parâmetro (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder='Ex: META_ATRASO_GAMA_ABR25' {...field} />
              </FormControl>
              <FormDescription>
                Se deixado em branco, um nome será gerado.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Valor */}
        <FormField
          control={form.control}
          name='valor'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor da Meta*</FormLabel>
              <FormControl>
                <Input placeholder='Ex: 150 ou 2.75' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Critério */}
        <FormField
          control={form.control}
          name='criterionId'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Critério*</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isUpdate || !criteria}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder='Selecione o critério...' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {criteria?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Setor */}
        <FormField
          control={form.control}
          name='sectorId'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Setor (Opcional)</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value || 'null'}
                disabled={isUpdate || !sectors}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder='Geral ou selecione o setor...' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value='null'>Nenhum (Meta Geral)</SelectItem>
                  {sectors?.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Data de Início Efetivo */}
        <FormField
          control={form.control}
          name='dataInicioEfetivo'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Início da Vigência*</FormLabel>
              <FormControl>
                <Input type='date' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Apenas para Update: Data Fim Efetivo Anterior */}
        {isUpdate && (
          <FormField
            control={form.control}
            name='dataFimEfetivoAnterior'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expirar Meta Anterior em (Opcional)</FormLabel>
                <FormControl>
                  <Input type='date' {...field} />
                </FormControl>
                <FormDescription>
                  Se não informado, a meta anterior expira um dia antes do
                  início desta.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Justificativa */}
        <FormField
          control={form.control}
          name='justificativa'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Justificativa*</FormLabel>
              <FormControl>
                <Textarea
                  placeholder='Motivo da criação ou alteração desta meta...'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter className='pt-4'>
          {onClose && (
            <Button type='button' variant='outline' onClick={onClose}>
              Cancelar
            </Button>
          )}
          <Button type='submit' disabled={isLoading}>
            {isLoading
              ? isUpdate
                ? 'Atualizando...'
                : 'Salvando...'
              : isUpdate
                ? 'Salvar Alterações'
                : 'Criar Parâmetro'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
