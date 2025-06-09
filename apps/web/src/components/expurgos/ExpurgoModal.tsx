// apps/web/src/components/expurgos/modals/ExpurgoModal.tsx (ATUALIZADO)
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useAvailablePeriods,
  useCreateExpurgo,
} from '@/hooks/useCreateExpurgo';
import ExpurgoForm from './ExpurgoForm';

interface ExpurgoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setores: Array<{ id: number; nome: string }>;
  criterios: Array<{ id: number; nome: string; unidade_medida?: string }>;
  isLoadingSetores?: boolean;
  isLoadingCriterios?: boolean;
}

interface CreateExpurgoFormData {
  competitionPeriodId: number;
  sectorId: number;
  criterionId: number;
  dataEvento: string;
  descricaoEvento: string;
  justificativaSolicitacao: string;
  valorSolicitado: number;
}

export default function ExpurgoModal({
  open,
  onOpenChange,
  setores,
  criterios,
  isLoadingSetores = false,
  isLoadingCriterios = false,
}: ExpurgoModalProps) {
  // Hooks para criação e dados
  const createExpurgoMutation = useCreateExpurgo();
  const { data: periodos = [], isLoading: isLoadingPeriodos } =
    useAvailablePeriods();

  // Handler para submissão do formulário
  const handleSubmit = async (data: CreateExpurgoFormData) => {
    try {
      await createExpurgoMutation.mutateAsync(data);
      onOpenChange(false); // Fechar modal após sucesso
    } catch (error) {
      // Erro já é tratado pelo hook useCreateExpurgo com toast
      console.error('Erro ao criar expurgo:', error);
    }
  };

  // Handler para cancelamento
  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[900px] max-h-[85vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            📝 Registrar Novo Expurgo
          </DialogTitle>
          <DialogDescription>
            Solicite a exclusão de um valor específico do cálculo da premiação.
            A solicitação será analisada pela diretoria.
          </DialogDescription>
        </DialogHeader>

        <ExpurgoForm
          setores={setores}
          criterios={criterios}
          periodos={periodos}
          isLoadingSetores={isLoadingSetores}
          isLoadingCriterios={isLoadingCriterios}
          isLoadingPeriodos={isLoadingPeriodos}
          onSubmit={handleSubmit}
          isLoading={createExpurgoMutation.isPending}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
}
