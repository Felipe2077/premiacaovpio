// 'use client';
// import ExpurgoModal from '@/components/expurgos/ExpurgoModal';
// import ExpurgosTable from '@/components/expurgos/ExpurgosTable';
// import { Button } from '@/components/ui/button';
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from '@/components/ui/card';
// import { Input } from '@/components/ui/input';
// import { useExpurgosData } from '@/hooks/useExpurgosData';
// import { useState } from 'react';
// import { toast } from 'sonner';

// export default function ExpurgosPage() {
//   const [isExpurgoModalOpen, setIsExpurgoModalOpen] = useState(false);
//   const {
//     expurgos,
//     isLoadingExpurgos,
//     errorExpurgos,
//     criterios,
//     isLoadingCriterios,
//     setores,
//     isLoadingSetores,
//   } = useExpurgosData();

//   // Critérios elegíveis (exemplo conforme original)
//   const eligibleCriteria = criterios?.filter((c) => [3, 4, 11].includes(c.id));

//   const handleRegisterExpurgo = (event: React.FormEvent) => {
//     event.preventDefault();
//     toast.info('Registro de Expurgo enviado!');
//     setIsExpurgoModalOpen(false);
//   };

//   return (
//     <div>
//       <h1 className='text-2xl font-bold'>Gestão de Expurgos</h1>
//       {errorExpurgos && (
//         <p className='text-red-500 font-semibold mb-4'>
//           Erro:
//           {errorExpurgos instanceof Error
//             ? errorExpurgos.message
//             : 'Erro desconhecido'}
//         </p>
//       )}
//       <Card>
//         <CardHeader>
//           <div className='flex justify-between items-start sm:items-center flex-col sm:flex-row gap-2'>
//             <div>
//               <CardTitle>Expurgos Registrados </CardTitle>
//               <CardDescription>
//                 Demonstração do registro auditado de expurgos autorizados.
//               </CardDescription>
//             </div>
//             <Button
//               size='sm'
//               variant='outline'
//               className='cursor-pointer'
//               disabled={isLoadingExpurgos}
//               onClick={() => setIsExpurgoModalOpen(true)}
//             >
//               Registrar Novo Expurgo
//             </Button>
//             <ExpurgoModal
//               open={isExpurgoModalOpen}
//               onOpenChange={setIsExpurgoModalOpen}
//               setores={setores || []}
//               criterios={eligibleCriteria || []}
//               isLoadingSetores={isLoadingSetores}
//               isLoadingCriterios={isLoadingCriterios}
//               onSubmit={handleRegisterExpurgo}
//             />
//           </div>
//           {/* Filtros Placeholders */}
//           <div className='flex gap-2 pt-4'>
//             <Input placeholder='Filtrar...' className='max-w-xs' disabled />
//           </div>
//         </CardHeader>
//         <CardContent>
//           <ExpurgosTable expurgos={expurgos} loading={isLoadingExpurgos} />
//         </CardContent>
//       </Card>
//     </div>
//   );
// }
// apps/web/src/app/admin/expurgos/page.tsx - VERSÃO SIMPLES COM FILTRO POR VIGÊNCIA
'use client';
import ExpurgoModal from '@/components/expurgos/ExpurgoModal';
import ExpurgosTable from '@/components/expurgos/ExpurgosTable';
import { Badge } from '@/components/ui/badge';
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
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// Função para formatar período (ex: "2025-06" -> "Junho 2025")
const formatPeriod = (mesAno: string) => {
  if (!mesAno || !mesAno.includes('-')) return 'Data inválida';
  const [ano, mes] = mesAno.split('-');
  const date = new Date(Number(ano), Number(mes) - 1);
  return date.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
};

export default function ExpurgosPage() {
  const [isExpurgoModalOpen, setIsExpurgoModalOpen] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState<string>('');
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Buscar período ativo na inicialização
  useEffect(() => {
    const fetchActivePeriod = async () => {
      try {
        const response = await fetch('/api/periods/active');
        if (response.ok) {
          const period = await response.json();
          setCurrentPeriod(period.mesAno);
        } else {
          // Se não há período ativo, buscar todos os períodos
          const allPeriodsResponse = await fetch('/api/periods');
          if (allPeriodsResponse.ok) {
            const allPeriods = await allPeriodsResponse.json();
            const sortedPeriods = allPeriods
              .map((p: any) => p.mesAno)
              .sort()
              .reverse(); // Mais recente primeiro

            setAvailablePeriods(sortedPeriods);
            if (sortedPeriods.length > 0) {
              setCurrentPeriod(sortedPeriods[0]);
            }
          }
        }
      } catch (error) {
        console.error('Erro ao buscar período ativo:', error);
      }
    };

    fetchActivePeriod();
  }, []);

  // Buscar todos os períodos disponíveis
  useEffect(() => {
    const fetchAllPeriods = async () => {
      try {
        const response = await fetch('/api/periods');
        if (response.ok) {
          const periods = await response.json();
          const sortedPeriods = periods
            .map((p: any) => p.mesAno)
            .sort()
            .reverse(); // Mais recente primeiro

          setAvailablePeriods(sortedPeriods);

          // Encontrar o índice do período atual
          if (currentPeriod) {
            const index = sortedPeriods.indexOf(currentPeriod);
            setCurrentIndex(index >= 0 ? index : 0);
          }
        }
      } catch (error) {
        console.error('Erro ao buscar períodos:', error);
      }
    };

    if (currentPeriod) {
      fetchAllPeriods();
    }
  }, [currentPeriod]);

  // Hook para dados dos expurgos - filtrado pelo período atual
  const {
    expurgos,
    isLoadingExpurgos,
    errorExpurgos,
    criterios,
    isLoadingCriterios,
    setores,
    isLoadingSetores,
  } = useExpurgosData(currentPeriod ? { periodMesAno: currentPeriod } : {});

  // Critérios elegíveis (exemplo conforme original)
  const eligibleCriteria = criterios?.filter((c) => [3, 4, 11].includes(c.id));

  // Navegação entre períodos
  const goToPreviousMonth = () => {
    if (currentIndex < availablePeriods.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setCurrentPeriod(availablePeriods[newIndex]);
    }
  };

  const goToNextMonth = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      setCurrentPeriod(availablePeriods[newIndex]);
    }
  };

  const handleRegisterExpurgo = (event: React.FormEvent) => {
    event.preventDefault();
    toast.success('Expurgo registrado com sucesso!');
    setIsExpurgoModalOpen(false);
  };

  return (
    <div>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-2xl font-bold'>Gestão de Expurgos</h1>
          {currentPeriod && (
            <p className='text-gray-600 mt-1'>
              {formatPeriod(currentPeriod)}
              {currentIndex === 0 && (
                <Badge variant='default' className='ml-2'>
                  Vigência Atual
                </Badge>
              )}
            </p>
          )}
        </div>

        {/* Navegação entre períodos */}
        {availablePeriods.length > 1 && (
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={goToPreviousMonth}
              disabled={currentIndex >= availablePeriods.length - 1}
            >
              <ChevronLeft className='h-4 w-4' />
              Anterior
            </Button>

            <Button
              variant='outline'
              size='sm'
              onClick={goToNextMonth}
              disabled={currentIndex <= 0}
            >
              Próximo
              <ChevronRight className='h-4 w-4' />
            </Button>
          </div>
        )}
      </div>

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
              <CardTitle>Expurgos Registrados</CardTitle>
              <CardDescription className='mt-1'>
                Demonstração do registro auditado de expurgos autorizados.
              </CardDescription>
            </div>
            <Button
              size='sm'
              variant='outline'
              className='cursor-pointer bg-amber-400 text-neutral-900'
              disabled={isLoadingExpurgos}
              onClick={() => setIsExpurgoModalOpen(true)}
            >
              <Plus className='h-4 w-4 mr-2' />
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
