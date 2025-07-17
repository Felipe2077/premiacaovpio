// // apps/web/src/components/filters/FilterControls.tsx - REFATORADO DO ZERO
// 'use client';

// import { Badge } from '@/components/ui/badge';
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
// } from '@/components/ui/select';
// import { Skeleton } from '@/components/ui/skeleton';
// import { Period } from '@/hooks/useParametersData';
// import {
//   Calendar,
//   CheckCircle2,
//   ChevronDown,
//   Clock,
//   Settings,
// } from 'lucide-react';

// interface FilterControlsProps {
//   periods: Period[];
//   activePeriod: string | null;
//   onPeriodChange: (newPeriod: string) => void;
// }

// const formatMesAno = (mesAno: string) => {
//   if (!mesAno || !mesAno.includes('-')) return 'Data inválida';
//   const [ano, mes] = mesAno.split('-');
//   const date = new Date(Number(ano), Number(mes) - 1);
//   return date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
// };

// const getStatusIcon = (status: string) => {
//   switch (status) {
//     case 'FECHADA':
//       return <CheckCircle2 className='h-4 w-4 text-green-600' />;
//     case 'ATIVA':
//       return <Clock className='h-4 w-4 text-blue-600' />;
//     case 'PLANEJAMENTO':
//       return <Settings className='h-4 w-4 text-yellow-600' />;
//     default:
//       return <Calendar className='h-4 w-4 text-gray-400' />;
//   }
// };

// const getStatusColor = (status: string) => {
//   switch (status) {
//     case 'FECHADA':
//       return 'bg-green-100 text-green-700 border-green-200';
//     case 'ATIVA':
//       return 'bg-blue-100 text-blue-700 border-blue-200';
//     case 'PLANEJAMENTO':
//       return 'bg-yellow-100 text-yellow-700 border-yellow-200';
//     default:
//       return 'bg-gray-100 text-gray-700 border-gray-200';
//   }
// };

// const getStatusLabel = (status: string) => {
//   switch (status) {
//     case 'FECHADA':
//       return 'Finalizado';
//     case 'ATIVA':
//       return 'Em Andamento';
//     case 'PLANEJAMENTO':
//       return 'Planejamento';
//     case 'PRE_FECHADA':
//       return 'Pré-Fechado';
//     default:
//       return status;
//   }
// };

// // Função para formatar datas corretamente
// const formatDateRange = (dataInicio: string, dataFim: string) => {
//   const formatDate = (dateStr: string) => {
//     if (!dateStr) return 'Data inválida';

//     if (dateStr.includes('-')) {
//       const [year, month, day] = dateStr.split('-');
//       const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
//       return date.toLocaleDateString('pt-BR');
//     }

//     const date = new Date(dateStr + 'T00:00:00.000Z');
//     return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
//   };

//   return `${formatDate(dataInicio)} - ${formatDate(dataFim)}`;
// };

// export function FilterControls({
//   periods,
//   activePeriod,
//   onPeriodChange,
// }: FilterControlsProps) {
//   const isLoading = !activePeriod || periods.length === 0;
//   const selectedPeriod = periods.find((p) => p.mesAno === activePeriod);

//   // Ordenar períodos por data (mais recente primeiro)
//   const sortedPeriods = [...periods].sort((a, b) => {
//     const dateA = new Date(a.mesAno + '-01');
//     const dateB = new Date(b.mesAno + '-01');
//     return dateB.getTime() - dateA.getTime();
//   });

//   if (isLoading) {
//     return (
//       <div className='space-y-3'>
//         <div className='flex items-center space-x-2 text-sm font-medium text-slate-700'>
//           <Calendar className='h-4 w-4' />
//           <span>Carregando períodos...</span>
//         </div>
//         <Skeleton className='h-20 w-full' />
//       </div>
//     );
//   }

//   return (
//     <div className='space-y-3'>
//       <div className='flex items-center space-x-2 text-sm font-medium text-slate-700'>
//         <Calendar className='h-4 w-4' />
//         <span>Período de Competição:</span>
//       </div>

//       {/* Card Integrado com Select */}
//       <div className='relative'>
//         <Select value={activePeriod ?? ''} onValueChange={onPeriodChange}>
//           <SelectTrigger className='hidden' />
//           <SelectContent className='max-h-60'>
//             {sortedPeriods.map((period) => (
//               <SelectItem
//                 key={period.id}
//                 value={period.mesAno}
//                 className='cursor-pointer'
//               >
//                 <div className='flex items-center justify-between w-full'>
//                   <div className='flex items-center space-x-2'>
//                     {getStatusIcon(period.status)}
//                     <span className='capitalize font-medium'>
//                       {formatMesAno(period.mesAno)}
//                     </span>
//                   </div>
//                   <Badge
//                     variant='outline'
//                     className={`ml-2 text-xs ${getStatusColor(period.status)}`}
//                   >
//                     {getStatusLabel(period.status)}
//                   </Badge>
//                 </div>
//               </SelectItem>
//             ))}
//           </SelectContent>
//         </Select>

//         {/* Card Visual que funciona como trigger do select */}
//         <div
//           className='p-4 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-slate-300 cursor-pointer transition-colors group'
//           onClick={() => {
//             // Trigger do select programaticamente
//             const selectTrigger = document.querySelector(
//               '[role="combobox"]'
//             ) as HTMLElement;
//             selectTrigger?.click();
//           }}
//         >
//           {selectedPeriod ? (
//             <div className='flex items-center justify-between'>
//               <div className='flex-1'>
//                 <div className='flex items-center space-x-3'>
//                   {getStatusIcon(selectedPeriod.status)}
//                   <div>
//                     <div className='font-semibold text-slate-900 text-lg capitalize'>
//                       {formatMesAno(selectedPeriod.mesAno)}
//                     </div>
//                     <div className='text-sm text-slate-600'>
//                       {formatDateRange(
//                         selectedPeriod.dataInicio,
//                         selectedPeriod.dataFim
//                       )}
//                     </div>
//                   </div>
//                 </div>

//                 {/* Informações extras para períodos finalizados */}
//                 {selectedPeriod.status === 'FECHADA' &&
//                   selectedPeriod.setorVencedor && (
//                     <div className='mt-3 pt-3 border-t border-slate-200'>
//                       <div className='flex items-center space-x-2 text-sm'>
//                         <span className='text-yellow-600'>🏆</span>
//                         <span className='text-slate-600'>Vencedor:</span>
//                         <span className='font-semibold text-slate-900'>
//                           {selectedPeriod.setorVencedor.nome}
//                         </span>
//                       </div>
//                     </div>
//                   )}
//               </div>

//               <div className='flex items-center space-x-3'>
//                 <Badge className={getStatusColor(selectedPeriod.status)}>
//                   {getStatusLabel(selectedPeriod.status)}
//                 </Badge>
//                 <ChevronDown className='h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors' />
//               </div>
//             </div>
//           ) : (
//             <div className='flex items-center justify-between text-slate-500'>
//               <div className='flex items-center space-x-2'>
//                 <Calendar className='h-5 w-5' />
//                 <span>Selecione um período...</span>
//               </div>
//               <ChevronDown className='h-4 w-4' />
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Dica de uso */}
//       <div className='text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200'>
//         💡 <strong>Dica:</strong> Clique no card acima para escolher um período.
//         Períodos "Finalizados" possuem rankings oficiais.
//       </div>
//     </div>
//   );
// }

// export default FilterControls;
// Arquivo: src/components/filters/FilterControls.tsx

'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Period } from '@/hooks/useParametersData';

interface FilterControlsProps {
  periods: Period[];
  activePeriod: string | null;
  onPeriodChange: (newPeriod: string) => void;
}

const formatMesAno = (mesAno: string) => {
  if (!mesAno || !mesAno.includes('-')) return 'Data inválida';
  const [ano, mes] = mesAno.split('-');
  const date = new Date(Number(ano), Number(mes) - 1);
  return date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
};

export function FilterControls({
  periods,
  activePeriod,
  onPeriodChange,
}: FilterControlsProps) {
  const isLoading = !activePeriod || periods.length === 0;

  return (
    <div className='flex flex-wrap gap-4 justify-center items-end'>
      <div>
        <label
          htmlFor='period-select'
          className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
        >
          Período:
        </label>
        {isLoading ? (
          <Skeleton className='h-10 w-[180px]' />
        ) : (
          <Select value={activePeriod ?? ''} onValueChange={onPeriodChange}>
            <SelectTrigger id='period-select' className='w-[180px]'>
              <SelectValue placeholder='Selecione...' />
            </SelectTrigger>
            <SelectContent>
              {periods.map((period) => (
                <SelectItem key={period.id} value={period.mesAno}>
                  <span className='capitalize'>
                    {formatMesAno(period.mesAno)}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      {/* O filtro "Filial" foi removido conforme solicitado */}
    </div>
  );
}

export default FilterControls;
