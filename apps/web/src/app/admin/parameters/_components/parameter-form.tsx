// apps/web/src/app/admin/parameters/_components/parameter-form.tsx (COMPLETO E CORRIGIDO)
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react'; // Importar useEffect e useMemo
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

// Interfaces locais para os dados dos dropdowns (podem vir de props ou ser buscadas aqui)
interface CompetitionPeriodOption {
  id: number;
  mesAno: string;
  status: string;
}
interface CriterionOption {
  id: number;
  nome: string;
}
interface SectorOption {
  id: number;
  nome: string;
}

// Schema de validação com Zod
const parameterFormSchema = z.object({
  nomeParametro: z.string().max(100).optional().or(z.literal('')), // Opcional, mas se fornecido, tem regras
  valor: z.string().min(1, { message: 'Valor é obrigatório.' }),
  dataInicioEfetivo: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Data de início inválida.',
  }), // YYYY-MM-DD
  criterionId: z.string().min(1, { message: 'Critério é obrigatório.' }),
  sectorId: z.string().nullable().optional(), // 'null' para geral, ID string, ou undefined
  competitionPeriodId: z.string().min(1, { message: 'Período é obrigatório.' }),
  justificativa: z
    .string()
    .min(5, {
      message: 'Justificativa obrigatória (mín. 5 caracteres).',
    })
    .max(500),
  // Apenas para UpdateDto, o backend espera isso opcionalmente
  dataFimEfetivoAnterior: z.string().optional().nullable(),
});

export type ParameterFormValues = z.infer<typeof parameterFormSchema>;

interface ParameterFormProps {
  isLoading: boolean;
  onSubmit: (data: CreateParameterDto | UpdateParameterDto) => Promise<void>;
  competitionPeriods: CompetitionPeriodOption[];
  criteria: CriterionOption[];
  sectors: SectorOption[];
  initialData?: Partial<
    ParameterFormValues & {
      id?: number;
      competitionPeriodId?: number | string; // Pode vir como number do ParameterValueAPI
      criterionId?: number | string; // Pode vir como number
      sectorId?: number | string | null; // Pode vir como number ou null
    }
  >;
  isUpdate?: boolean;
  onClose: () => void; // Para fechar o modal
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
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const form = useForm<ParameterFormValues>({
    resolver: zodResolver(parameterFormSchema),
    defaultValues: {
      nomeParametro: '',
      valor: '',
      dataInicioEfetivo: todayStr,
      criterionId: undefined,
      sectorId: 'null', // Default para "Nenhum (Geral)"
      competitionPeriodId: undefined,
      justificativa: '',
      dataFimEfetivoAnterior: undefined,
    },
  });

  useEffect(() => {
    if (isUpdate && initialData) {
      form.reset({
        nomeParametro: initialData.nomeParametro || '',
        valor: initialData.valor || '',
        dataInicioEfetivo: initialData.dataInicioEfetivo || todayStr, // Para edição, a data de início é da NOVA versão
        criterionId: initialData.criterionId?.toString() || undefined,
        sectorId: initialData.sectorId?.toString() || 'null',
        competitionPeriodId:
          initialData.competitionPeriodId?.toString() || undefined,
        justificativa: initialData.justificativa || '', // A justificativa no DTO de update é para a MUDANÇA
      });
    } else if (!isUpdate) {
      const planningPeriod = competitionPeriods?.find(
        (p) => p.status === 'PLANEJAMENTO'
      );
      form.reset({
        nomeParametro: '',
        valor: '',
        dataInicioEfetivo: todayStr,
        criterionId: undefined,
        sectorId: 'null',
        competitionPeriodId: planningPeriod?.id.toString() || undefined,
        justificativa: '',
        dataFimEfetivoAnterior: undefined,
      });
    }
  }, [initialData, isUpdate, form, competitionPeriods, todayStr]);

  const handleSubmit = async (values: ParameterFormValues) => {
    const commonData = {
      nomeParametro: values.nomeParametro || undefined,
      valor: values.valor,
      dataInicioEfetivo: values.dataInicioEfetivo,
      justificativa: values.justificativa,
    };

    if (isUpdate) {
      // Para Update, não enviamos criterionId, sectorId, competitionPeriodId
      // pois eles não mudam ao versionar uma meta.
      // O backend já tem essa informação da meta original.
      const updateData: UpdateParameterDto = {
        ...commonData,
        // Opcional: se o usuário puder definir quando a meta antiga expira
        ...(values.dataFimEfetivoAnterior && {
          dataFimEfetivoAnterior: values.dataFimEfetivoAnterior,
        }),
      };
      await onSubmit(updateData);
    } else {
      // Para Create, todos os IDs são necessários
      if (!values.competitionPeriodId || !values.criterionId) {
        // Zod já deve ter pego isso, mas uma checagem extra.
        console.error('Período ou Critério não selecionado para nova meta.');
        return;
      }
      const createData: CreateParameterDto = {
        ...commonData,
        criterionId: parseInt(values.criterionId, 10),
        sectorId:
          values.sectorId === 'null' || !values.sectorId
            ? null
            : parseInt(values.sectorId, 10),
        competitionPeriodId: parseInt(values.competitionPeriodId, 10),
      };
      await onSubmit(createData);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className='space-y-4 md:space-y-6 py-4'
      >
        <FormField
          control={form.control}
          name='competitionPeriodId'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Período da Premiação*</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={
                  isUpdate ||
                  !competitionPeriods ||
                  competitionPeriods.length === 0
                }
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !competitionPeriods || competitionPeriods.length === 0
                          ? 'Nenhum período adequado'
                          : 'Selecione o período...'
                      }
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {isUpdate &&
                    initialData?.competitionPeriodId &&
                    (() => {
                      const currentPeriod = competitionPeriods.find(
                        (p) =>
                          p.id.toString() ===
                          initialData.competitionPeriodId?.toString()
                      );
                      return currentPeriod ? (
                        <SelectItem
                          key={currentPeriod.id}
                          value={currentPeriod.id.toString()}
                        >
                          {currentPeriod.mesAno} ({currentPeriod.status})
                        </SelectItem>
                      ) : (
                        <SelectItem value='' disabled>
                          Período não encontrado
                        </SelectItem>
                      );
                    })()}
                  {!isUpdate &&
                    competitionPeriods?.map((p) => (
                      <SelectItem
                        key={p.id}
                        value={String(p.id)}
                        disabled={p.status !== 'PLANEJAMENTO'}
                      >
                        {p.mesAno} ({p.status})
                        {p.status !== 'PLANEJAMENTO' ? '(Não editável)' : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='nomeParametro'
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Nome do Parâmetro
                <span className='text-xs text-muted-foreground'>
                  (Opcional)
                </span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder='Ex: META_ATRASO_GAMA_MAI25'
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormDescription>
                Se em branco, será gerado automaticamente.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

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

        <FormField
          control={form.control}
          name='criterionId'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Critério*</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
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

        <FormField
          control={form.control}
          name='sectorId'
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Setor
                <span className='text-xs text-muted-foreground'>
                  (Opcional)
                </span>
              </FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value || 'null'}
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

        <FormField
          control={form.control}
          name='dataInicioEfetivo'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Início da Vigência*</FormLabel>
              <FormControl>
                <Input type='date' {...field} />
              </FormControl>
              <FormDescription>
                {isUpdate
                  ? 'Data de início para esta NOVA VERSÃO da meta.'
                  : 'Data em que esta meta começa a valer.'}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {isUpdate && ( // Campo para definir a data de fim da meta anterior, se necessário
          <FormField
            control={form.control}
            name='dataFimEfetivoAnterior'
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Expirar Versão Anterior em
                  <span className='text-xs text-muted-foreground'>
                    (Opcional)
                  </span>
                </FormLabel>
                <FormControl>
                  <Input type='date' {...field} value={field.value || ''} />
                </FormControl>
                <FormDescription>
                  Se não informado, a versão anterior expira um dia antes do
                  `&quot;`Início da Vigência `&quot;` acima.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name='justificativa'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Justificativa*</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={
                    isUpdate
                      ? 'Motivo da ALTERAÇÃO desta meta...'
                      : 'Motivo da CRIAÇÃO desta meta...'
                  }
                  {...field}
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter className='pt-6'>
          <Button type='button' variant='outline' onClick={onClose}>
            Cancelar
          </Button>
          <Button type='submit' disabled={isLoading}>
            {isLoading
              ? isUpdate
                ? 'Atualizando Meta...'
                : 'Criando Meta...'
              : isUpdate
                ? 'Salvar Alterações'
                : 'Criar Meta'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
