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
import { CreateData, EditData } from '@/types/parameters.types';
import React from 'react';

interface EditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData: EditData | null;
  newMetaValue: string;
  onMetaValueChange: (value: string) => void;
  onSave: () => void;
}

export const EditDialog: React.FC<EditDialogProps> = ({
  open,
  onOpenChange,
  editData,
  newMetaValue,
  onMetaValueChange,
  onSave,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className='sm:max-w-[425px]'>
      <DialogHeader>
        <DialogTitle>Editar Meta</DialogTitle>
        <DialogDescription>
          Atualize o valor da meta para {editData?.criterioNome} no setor{' '}
          {editData?.setorNome}.
        </DialogDescription>
      </DialogHeader>
      <div className='grid gap-4 py-4'>
        <div className='grid grid-cols-4 items-center gap-4'>
          <Label htmlFor='meta' className='text-right'>
            Meta
          </Label>
          <Input
            id='meta'
            type='number'
            step='0.01'
            value={newMetaValue}
            onChange={(e) => onMetaValueChange(e.target.value)}
            className='col-span-3'
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant='outline' onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button onClick={onSave}>Salvar</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

interface CreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  createData: CreateData | null;
  newMetaValue: string;
  onMetaValueChange: (value: string) => void;
  onSave: () => void;
}

export const CreateDialog: React.FC<CreateDialogProps> = ({
  open,
  onOpenChange,
  createData,
  newMetaValue,
  onMetaValueChange,
  onSave,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className='sm:max-w-[425px]'>
      <DialogHeader>
        <DialogTitle>Criar Meta</DialogTitle>
        <DialogDescription>
          Defina o valor da meta para {createData?.criterioNome} no setor{' '}
          {createData?.setorNome}.
        </DialogDescription>
      </DialogHeader>
      <div className='grid gap-4 py-4'>
        <div className='grid grid-cols-4 items-center gap-4'>
          <Label htmlFor='newMeta' className='text-right'>
            Meta
          </Label>
          <Input
            id='newMeta'
            type='number'
            step='0.01'
            value={newMetaValue}
            onChange={(e) => onMetaValueChange(e.target.value)}
            className='col-span-3'
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant='outline' onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button onClick={onSave}>Criar</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
