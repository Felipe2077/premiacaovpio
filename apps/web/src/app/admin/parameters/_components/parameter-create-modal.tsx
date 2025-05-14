// src/app/admin/parameters/_components/parameter-create-modal.tsx
'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import type {
  CompetitionPeriod,
  CreateParameterDto,
  Criterio,
  Setor,
} from '@sistema-premiacao/shared-types';
import { PlusCircle } from 'lucide-react';
import { useState } from 'react';

interface ParameterCreateModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: CreateParameterDto) => Promise<void>;
  isCreating: boolean;
  competitionPeriods?: CompetitionPeriod[];
  criteria?: Pick<Criterio, 'id' | 'nome'>[];
  sectors?: Pick<Setor, 'id' | 'nome'>[];
  isLoading: boolean;
}

export function ParameterCreateModal({
  isOpen,
  onOpenChange,
  onCreate,
  isCreating,
  competitionPeriods,
  criteria,
  sectors,
  isLoading,
}: ParameterCreateModalProps) {
  // Estados para o formulário
  const [nomeParametro, setNomeParametro] = useState('');
  const [valor, setValor] = useState('');
  const [criterionId, setCriterionId] = useState<string | undefined>();
  const [sectorId, setSectorId] = useState<string | undefined>();
  const [competitionPeriodId, setCompetitionPeriodId] = useState<
    string | undefined
  >(
    competitionPeriods?.find((p) => p.status === 'PLANEJAMENTO')?.id.toString()
  );
  const [justificativa, setJustificativa] = useState('');
  const [dataInicio, setDataInicio] = useState(
    new Date().toISOString().split('T')[0]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const dataToSave: CreateParameterDto = {
      nomeParametro: nomeParametro || undefined,
      valor,
      dataInicioEfetivo: dataInicio,
      criterionId: criterionId ? parseInt(criterionId, 10) : undefined,
      sectorId:
        sectorId === 'null' || sectorId === undefined
          ? null
          : parseInt(sectorId, 10),
      competitionPeriodId: competitionPeriodId
        ? parseInt(competitionPeriodId, 10)
        : undefined,
      justificativa,
    };

    await onCreate(dataToSave);

    // Limpar formulário após sucesso é feito no componente parent após o await
  };

  const resetForm = () => {
    setNomeParametro('');
    setValor('');
    setCriterionId(undefined);
    setSectorId(undefined);
    setJustificativa('');
    setDataInicio(new Date().toISOString().split('T')[0]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size='sm' disabled={isLoading || isCreating}>
          <PlusCircle className='mr-2 h-4 w-4' /> Nova Meta
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>Definir Nova Meta</DialogTitle>
          <DialogDescription>
            Preencha os detalhes. A vigência começará na data de início
            informada.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className='grid gap-4 py-4'>
            {/* Período de Competição (Select) */}
            <div className='grid grid-cols-4 items-center gap-4'>
              <Label htmlFor='param-period' className='text-right'>
                Período
              </Label>
              <Select
                name='param-period'
                required
                value={competitionPeriodId}
                onValueChange={setCompetitionPeriodId}
                disabled={isLoading}
              >
                <SelectTrigger className='col-span-3'>
                  <SelectValue
                    placeholder={isLoading ? 'Carregando...' : 'Selecione...'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {competitionPeriods
                    ?.filter((p) => p.status === 'PLANEJAMENTO')
                    .map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.mesAno} ({p.status})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {/* Nome Parâmetro (Opcional, pode ser gerado) */}
            <div className='grid grid-cols-4 items-center gap-4'>
              <Label htmlFor='param-name' className='text-right'>
                Nome (Opc)
              </Label>
              <Input
                id='param-name'
                value={nomeParametro}
                onChange={(e) => setNomeParametro(e.target.value)}
                placeholder='Ex: META_IPK_GAMA'
                className='col-span-3'
              />
            </div>
            {/* Valor */}
            <div className='grid grid-cols-4 items-center gap-4'>
              <Label htmlFor='param-value' className='text-right'>
                Valor*
              </Label>
              <Input
                id='param-value'
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder='Ex: 3.1, 150'
                className='col-span-3'
                required
              />
            </div>
            {/* Critério (Select) */}
            <div className='grid grid-cols-4 items-center gap-4'>
              <Label htmlFor='param-crit' className='text-right'>
                Critério*
              </Label>
              <Select
                name='param-crit'
                required
                value={criterionId}
                onValueChange={setCriterionId}
                disabled={isLoading}
              >
                <SelectTrigger className='col-span-3'>
                  <SelectValue
                    placeholder={isLoading ? 'Carregando...' : 'Selecione...'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {criteria?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Setor (Select) */}
            <div className='grid grid-cols-4 items-center gap-4'>
              <Label htmlFor='param-setor' className='text-right'>
                Setor (Opc)
              </Label>
              <Select
                name='param-setor'
                value={sectorId}
                onValueChange={setSectorId}
                disabled={isLoading}
              >
                <SelectTrigger className='col-span-3'>
                  <SelectValue
                    placeholder={
                      isLoading ? 'Carregando...' : 'Geral ou Específico...'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='null'>Nenhum (Geral)</SelectItem>
                  {sectors?.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Início Vigência */}
            <div className='grid grid-cols-4 items-center gap-4'>
              <Label htmlFor='param-date' className='text-right'>
                Início Vigência*
              </Label>
              <Input
                id='param-date'
                type='date'
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className='col-span-3'
                required
              />
            </div>
            {/* Justificativa */}
            <div className='grid grid-cols-4 items-center gap-4'>
              <Label htmlFor='param-just' className='text-right'>
                Justificativa*
              </Label>
              <Textarea
                id='param-just'
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder='Detalhe o motivo...'
                className='col-span-3'
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              Cancelar
            </Button>
            <Button type='submit' disabled={isCreating}>
              {isCreating ? 'Salvando...' : 'Salvar Parâmetro'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
