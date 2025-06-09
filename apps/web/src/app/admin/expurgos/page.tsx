'use client';
import ExpurgoModal from '@/components/expurgos/ExpurgoModal';
import ExpurgosTable from '@/components/expurgos/ExpurgosTable';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useExpurgosData } from '@/hooks/useExpurgosData';
import { useState } from 'react';
import { toast } from 'sonner';

export default function ExpurgosPage() {
  const [isExpurgoModalOpen, setIsExpurgoModalOpen] = useState(false);
  const {
    expurgos,
    isLoadingExpurgos,
    errorExpurgos,
    criterios,
    isLoadingCriterios,
    setores,
    isLoadingSetores,
  } = useExpurgosData();

  // Critérios elegíveis (exemplo conforme original)
  const eligibleCriteria = criterios?.filter((c) => [3, 4, 11].includes(c.id));

  const handleRegisterExpurgo = (event: React.FormEvent) => {
    event.preventDefault();
    toast.info('Registro de Expurgo enviado! (Simulação MVP)');
    setIsExpurgoModalOpen(false);
  };

  return (
    <div>
      <h1 className='text-2xl font-bold'>Gestão de Expurgos</h1>
      {errorExpurgos && (
        <p className='text-red-500 font-semibold mb-4'>
          Erro:
          {errorExpurgos instanceof Error
            ? errorExpurgos.message
            : 'Erro desconhecido'}
        </p>
      )}
      <Card>
        <CardHeader>
          <div className='flex justify-between items-start sm:items-center flex-col sm:flex-row gap-2'>
            <div>
              <CardTitle>Expurgos Registrados (MVP)</CardTitle>
              <CardDescription>
                Demonstração do registro auditado de expurgos autorizados.
              </CardDescription>
            </div>
            <Button
              size='sm'
              variant='outline'
              className='cursor-pointer'
              disabled={isLoadingExpurgos}
              onClick={() => setIsExpurgoModalOpen(true)}
            >
              Registrar Novo Expurgo
            </Button>
            <ExpurgoModal
              open={isExpurgoModalOpen}
              onOpenChange={setIsExpurgoModalOpen}
              setores={setores || []}
              criterios={eligibleCriteria || []}
              isLoadingSetores={isLoadingSetores}
              isLoadingCriterios={isLoadingCriterios}
              onSubmit={handleRegisterExpurgo}
            />
          </div>
          {/* Filtros Placeholders */}
          <div className='flex gap-2 pt-4'>
            <Input placeholder='Filtrar...' className='max-w-xs' disabled />
          </div>
        </CardHeader>
        <CardContent>
          <ExpurgosTable expurgos={expurgos} loading={isLoadingExpurgos} />
        </CardContent>
      </Card>
    </div>
  );
}
