// apps/web/src/app/admin/parameters/_components/create-edit-parameter-modal.tsx
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ParameterValueAPI } from '@/hooks/useParameters'; // Do seu hook
import {
  CreateParameterDto,
  UpdateParameterDto,
} from '@sistema-premiacao/shared-types';
import { useMemo } from 'react';
import { ParameterForm } from '../parameter-form'; // Seu componente de formulário

// Tipos para os dados dos dropdowns que o ParameterForm espera
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

interface CreateEditParameterModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  isUpdate: boolean;
  isLoadingSubmit: boolean;
  onSubmit: (data: CreateParameterDto | UpdateParameterDto) => Promise<void>; // O handler da página
  initialData?: ParameterValueAPI | null; // Para pré-preencher no modo de edição
  // Dados para os dropdowns do ParameterForm
  competitionPeriods: CompetitionPeriodOption[];
  criteria: CriterionOption[];
  sectors: SectorOption[];
  todayStr: string; // Para default da data de início na edição
}

export function CreateEditParameterModal({
  isOpen,
  onOpenChange,
  isUpdate,
  isLoadingSubmit,
  onSubmit,
  initialData,
  competitionPeriods,
  criteria,
  sectors,
  todayStr,
}: CreateEditParameterModalProps) {
  const dialogTitle = isUpdate
    ? `Editar Meta: ${initialData?.nomeParametro || ''}`
    : 'Cadastrar Nova Meta';
  const dialogDescription = isUpdate
    ? 'Altere os dados abaixo. Uma nova versão da meta será criada e a atual expirada. Justificativa é obrigatória.'
    : 'Defina os valores para a nova meta. A justificativa é obrigatória.';

  // Mapeia ParameterValueAPI para o formato que ParameterForm espera para initialData
  // ParameterForm internamente usa react-hook-form e seu próprio schema/valores
  const formInitialData = useMemo(() => {
    if (isUpdate && initialData) {
      return {
        id: initialData.id,
        nomeParametro: initialData.nomeParametro,
        valor: initialData.valor,
        // Para edição, a data de início é da NOVA versão, pode defaultar para hoje
        dataInicioEfetivo: todayStr, // Ou initialData.dataInicioEfetivo se quiser manter
        criterionId: initialData.criterionId, // Passa o ID numérico
        sectorId: initialData.sectorId, // Passa o ID numérico ou null
        competitionPeriodId: initialData.competitionPeriodId, // Passa o ID numérico
        justificativa: '', // Justificativa da ALTERAÇÃO começa vazia
      };
    }
    // Para criação, o ParameterForm lida com seus próprios defaults
    return undefined;
  }, [initialData, isUpdate, todayStr]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[550px]'>
        {/* Ajuste a largura se necessário */}
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <ParameterForm
          isLoading={isLoadingSubmit}
          onSubmit={onSubmit} // Passa o handler da página (handleCreateParameter ou handleUpdateParameter)
          competitionPeriods={
            isUpdate
              ? competitionPeriods // Na edição, pode mostrar o período original (mas será desabilitado no form)
              : competitionPeriods?.filter(
                  (p) => p.status === 'PLANEJAMENTO'
                ) || []
          }
          criteria={criteria}
          sectors={sectors}
          initialData={formInitialData} // Passa os dados iniciais para o formulário
          isUpdate={isUpdate}
          onClose={() => onOpenChange(false)} // Função para o formulário fechar o modal
        />
        {/* O DialogFooter (botões de Salvar/Cancelar) agora está DENTRO do ParameterForm */}
      </DialogContent>
    </Dialog>
  );
}
