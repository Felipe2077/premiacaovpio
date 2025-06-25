// src/components/parameters/ParameterDialogs.tsx - VERSÃO OTIMIZADA FASE 1
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CreateData, EditData } from '@/types/parameters.types';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

// Tipos para o payload de salvamento
type EditPayload = {
  id: number;
  valor: string;
  justificativa: string;
  nomeParametro: string;
  dataInicioEfetivo: string;
};

type CreatePayload = {
  valor: string;
  justificativa: string;
  nomeParametro: string;
  dataInicioEfetivo: string;
};

interface EditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData: EditData | null;
  onSave: (payload: EditPayload) => void; // Assinatura do onSave alterada
}

export const EditDialog: React.FC<EditDialogProps> = ({
  open,
  onOpenChange,
  editData,
  onSave,
}) => {
  // ✅ ESTADO AGORA É LOCAL DO COMPONENTE
  const [valor, setValor] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [nomeParametro, setNomeParametro] = useState('');
  const [dataInicioEfetivo, setDataInicioEfetivo] = useState('');

  // Efeito para popular o formulário quando os dados de edição mudam
  useEffect(() => {
    if (open && editData) {
      setValor(editData.valor?.toString() || '');
      setNomeParametro(editData.nomeParametro || '');
      setDataInicioEfetivo(
        editData.dataInicioEfetivo || new Date().toISOString().split('T')[0]
      );
      setJustificativa(''); // Limpa a justificativa a cada abertura
    }
  }, [open, editData]);

  const handleSave = () => {
    if (!justificativa.trim() || !valor.trim() || !editData?.id) {
      toast.error('Valor e Justificativa são obrigatórios.');
      return;
    }
    // ✅ Envia um payload completo ao invés de apenas a justificativa
    onSave({
      id: editData.id,
      valor,
      justificativa,
      nomeParametro,
      dataInicioEfetivo,
    });
  };

  const isFormValid =
    justificativa.trim().length > 0 && valor.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>Editar Meta</DialogTitle>
          <DialogDescription>
            Atualize o valor da meta para {editData?.criterionName} no setor{' '}
            {editData?.sectorName}.
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <div className='grid grid-cols-4 items-center gap-4'>
            <Label htmlFor='nomeParametro' className='text-right'>
              Nome da Meta
            </Label>
            <Input
              id='nomeParametro'
              value={nomeParametro}
              onChange={(e) => setNomeParametro(e.target.value)}
              className='col-span-3'
            />
          </div>
          <div className='grid grid-cols-4 items-center gap-4'>
            <Label htmlFor='meta' className='text-right'>
              Valor da Meta
            </Label>
            {/* ✅ Input agora usa o estado local */}
            <Input
              id='meta'
              type='number'
              step='0.01'
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className='col-span-3'
            />
          </div>
          <div className='grid grid-cols-4 items-center gap-4'>
            <Label htmlFor='dataInicio' className='text-right'>
              Data de Início
            </Label>
            <Input
              id='dataInicio'
              type='date'
              value={dataInicioEfetivo}
              onChange={(e) => setDataInicioEfetivo(e.target.value)}
              className='col-span-3'
            />
          </div>
          <div className='grid grid-cols-4 items-start gap-4'>
            <Label htmlFor='justificativa' className='text-right mt-2'>
              Justificativa <span className='text-red-500'>*</span>
            </Label>
            <Textarea
              id='justificativa'
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder='Informe o motivo da alteração da meta...'
              className='col-span-3'
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!isFormValid}>
            Atualizar Meta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface CreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  createData: CreateData | null;
  onSave: (payload: CreatePayload) => void; // Assinatura do onSave alterada
}

export const CreateDialog: React.FC<CreateDialogProps> = ({
  open,
  onOpenChange,
  createData,
  onSave,
}) => {
  // ✅ ESTADO AGORA É LOCAL DO COMPONENTE
  const [valor, setValor] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [nomeParametro, setNomeParametro] = useState('');
  const [dataInicioEfetivo, setDataInicioEfetivo] = useState(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    if (open && createData) {
      // Reseta os campos ao abrir
      setValor('');
      setJustificativa('');
      setDataInicioEfetivo(new Date().toISOString().split('T')[0]);
      setNomeParametro(
        `Meta ${createData.criterionName} - ${createData.sectorName}`
      );
    }
  }, [open, createData]);

  const handleSave = () => {
    if (!justificativa.trim() || !valor.trim()) {
      toast.error('Valor e Justificativa são obrigatórios.');
      return;
    }
    // ✅ Envia um payload completo ao invés de apenas a justificativa
    onSave({
      valor,
      justificativa,
      nomeParametro,
      dataInicioEfetivo,
    });
  };

  const isFormValid =
    justificativa.trim().length > 0 &&
    valor.trim().length > 0 &&
    nomeParametro.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>Criar Meta</DialogTitle>
          <DialogDescription>
            Defina o valor da meta para {createData?.criterionName} no setor{' '}
            {createData?.sectorName}.
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <div className='grid grid-cols-4 items-center gap-4'>
            <Label htmlFor='nomeParametroCreate' className='text-right'>
              Nome da Meta
            </Label>
            <Input
              id='nomeParametroCreate'
              value={nomeParametro}
              onChange={(e) => setNomeParametro(e.target.value)}
              className='col-span-3'
            />
          </div>
          <div className='grid grid-cols-4 items-center gap-4'>
            <Label htmlFor='newMeta' className='text-right'>
              Valor da Meta
            </Label>
            {/* ✅ Input agora usa o estado local */}
            <Input
              id='newMeta'
              type='number'
              step='0.01'
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className='col-span-3'
            />
          </div>
          <div className='grid grid-cols-4 items-center gap-4'>
            <Label htmlFor='dataInicioCreate' className='text-right'>
              Data de Início
            </Label>
            <Input
              id='dataInicioCreate'
              type='date'
              value={dataInicioEfetivo}
              onChange={(e) => setDataInicioEfetivo(e.target.value)}
              className='col-span-3'
            />
          </div>
          <div className='grid grid-cols-4 items-start gap-4'>
            <Label htmlFor='justificativaCreate' className='text-right mt-2'>
              Justificativa <span className='text-red-500'>*</span>
            </Label>
            <Textarea
              id='justificativaCreate'
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder='Informe o motivo da criação da meta...'
              className='col-span-3'
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!isFormValid}>
            Criar Meta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
