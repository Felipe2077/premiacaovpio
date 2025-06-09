// src/components/parameters/ParameterDialogs.tsx
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
import React, { useState } from 'react';

interface EditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData: EditData | null;
  newMetaValue: string;
  onMetaValueChange: (value: string) => void;
  onSave: (
    justificativa: string,
    nomeParametro?: string,
    dataInicioEfetivo?: string
  ) => void;
}

export const EditDialog: React.FC<EditDialogProps> = ({
  open,
  onOpenChange,
  editData,
  newMetaValue,
  onMetaValueChange,
  onSave,
}) => {
  const [justificativa, setJustificativa] = useState('');
  const [nomeParametro, setNomeParametro] = useState(
    editData?.nomeParametro || ''
  );
  const [dataInicioEfetivo, setDataInicioEfetivo] = useState(
    editData?.dataInicioEfetivo || ''
  );

  // Reset fields when dialog opens/closes
  React.useEffect(() => {
    if (open && editData) {
      setNomeParametro(editData.nomeParametro || '');
      setDataInicioEfetivo(editData.dataInicioEfetivo || '');
      setJustificativa('');
    } else if (!open) {
      setJustificativa('');
      setNomeParametro('');
      setDataInicioEfetivo('');
    }
  }, [open, editData]);

  const handleSave = () => {
    if (!justificativa.trim()) {
      return; // Validação básica - poderia mostrar toast de erro
    }
    onSave(justificativa, nomeParametro, dataInicioEfetivo);
  };

  const isFormValid =
    justificativa.trim().length > 0 && (newMetaValue || '').trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>Editar Meta</DialogTitle>
          <DialogDescription>
            Atualize o valor da meta para {editData?.criterioNome} no setor
            {editData?.setorNome}. Uma justificativa é obrigatória para a
            alteração.
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4 py-4'>
          {/* Nome do Parâmetro */}
          <div className='grid grid-cols-4 items-center gap-4'>
            <Label htmlFor='nomeParametro' className='text-right'>
              Nome da Meta
            </Label>
            <Input
              id='nomeParametro'
              value={nomeParametro}
              onChange={(e) => setNomeParametro(e.target.value)}
              className='col-span-3'
              placeholder='Nome do parâmetro'
            />
          </div>

          {/* Valor da Meta */}
          <div className='grid grid-cols-4 items-center gap-4'>
            <Label htmlFor='meta' className='text-right'>
              Valor da Meta
            </Label>
            <Input
              id='meta'
              type='number'
              step='0.01'
              value={newMetaValue || ''}
              onChange={(e) => onMetaValueChange(e.target.value)}
              className='col-span-3'
              placeholder='Valor da meta'
            />
          </div>

          {/* Data de Início */}
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

          {/* Justificativa - Campo Obrigatório */}
          <div className='grid grid-cols-4 items-start gap-4'>
            <Label htmlFor='justificativa' className='text-right mt-2'>
              Justificativa <span className='text-red-500'>*</span>
            </Label>
            <div className='col-span-3'>
              <Textarea
                id='justificativa'
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder='Informe o motivo da alteração da meta...'
                rows={3}
                className='resize-none'
              />
              {justificativa.trim().length === 0 && (
                <p className='text-sm text-red-500 mt-1'>
                  Justificativa é obrigatória
                </p>
              )}
            </div>
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
  newMetaValue: string;
  onMetaValueChange: (value: string) => void;
  onSave: (
    justificativa: string,
    nomeParametro?: string,
    dataInicioEfetivo?: string
  ) => void;
}

export const CreateDialog: React.FC<CreateDialogProps> = ({
  open,
  onOpenChange,
  createData,
  newMetaValue,
  onMetaValueChange,
  onSave,
}) => {
  const [justificativa, setJustificativa] = useState('');
  const [nomeParametro, setNomeParametro] = useState('');
  const [dataInicioEfetivo, setDataInicioEfetivo] = useState('');

  // Reset fields when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      // Auto-gerar nome do parâmetro baseado no critério e setor
      if (createData) {
        const autoName = `META_${createData.criterioNome.replace(/\s+/g, '_').toUpperCase()}_SETOR${createData.setorId}`;
        setNomeParametro(autoName);
      }
      setJustificativa('');
      setDataInicioEfetivo('');
    } else {
      setJustificativa('');
      setNomeParametro('');
      setDataInicioEfetivo('');
    }
  }, [open, createData]);

  const handleSave = () => {
    if (!justificativa.trim()) {
      return; // Validação básica
    }
    onSave(justificativa, nomeParametro, dataInicioEfetivo);
  };

  const isFormValid =
    justificativa.trim().length > 0 &&
    (newMetaValue || '').trim().length > 0 &&
    nomeParametro.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>Criar Meta</DialogTitle>
          <DialogDescription>
            Defina o valor da meta para {createData?.criterioNome} no setor
            {createData?.setorNome}. Uma justificativa é obrigatória.
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4 py-4'>
          {/* Nome do Parâmetro */}
          <div className='grid grid-cols-4 items-center gap-4'>
            <Label htmlFor='nomeParametroCreate' className='text-right'>
              Nome da Meta
            </Label>
            <Input
              id='nomeParametroCreate'
              value={nomeParametro}
              onChange={(e) => setNomeParametro(e.target.value)}
              className='col-span-3'
              placeholder='Nome do parâmetro'
            />
          </div>

          {/* Valor da Meta */}
          <div className='grid grid-cols-4 items-center gap-4'>
            <Label htmlFor='newMeta' className='text-right'>
              Valor da Meta
            </Label>
            <Input
              id='newMeta'
              type='number'
              step='0.01'
              value={newMetaValue || ''}
              onChange={(e) => onMetaValueChange(e.target.value)}
              className='col-span-3'
              placeholder='Valor da meta'
            />
          </div>

          {/* Data de Início */}
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

          {/* Justificativa - Campo Obrigatório */}
          <div className='grid grid-cols-4 items-start gap-4'>
            <Label htmlFor='justificativaCreate' className='text-right mt-2'>
              Justificativa <span className='text-red-500'>*</span>
            </Label>
            <div className='col-span-3'>
              <Textarea
                id='justificativaCreate'
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder='Informe o motivo da criação da meta...'
                rows={3}
                className='resize-none'
              />
              {justificativa.trim().length === 0 && (
                <p className='text-sm text-red-500 mt-1'>
                  Justificativa é obrigatória
                </p>
              )}
            </div>
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
