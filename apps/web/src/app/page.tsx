// apps/web/src/app/page.tsx (VERSÃO REFATORADA COM HOOK)
'use client';

import FilterControls from '@/components/filters/FilterControls';
import { TooltipProvider } from '@/components/ui/tooltip';
import Link from 'next/link';

import DetailedResultsTable from '@/components/competition/DetailedResultsTable';
import RankingTable from '@/components/competition/RankingTable';
import { useCompetitionData } from '@/hooks/useCompetitionData'; // <-- IMPORTAR HOOK

export default function HomePage() {
  const {
    rankingData,
    // detailedResults, // Não precisamos passar para DetailedResultsTable se ele já está em resultsBySector
    activeCriteria,
    resultsBySector,
    uniqueCriteria,
    isLoading, // Estado de loading combinado
    error, // Estado de erro combinado
  } = useCompetitionData();

  // As funções de formatação e estilo agora estão em lib/utils ou dentro de DetailedResultsTable

  return (
    <TooltipProvider>
      <main className='container mx-auto px-4 lg:px-6 space-y-10'>
        <FilterControls />
        {/* Exibição de Erro Geral (vindo do hook) */}
        {error && (
          <p className='text-red-500 text-center font-semibold mb-4'>
            Erro ao carregar dados:
            {error instanceof Error ? error.message : 'Erro desconhecido'}
          </p>
        )}

        {/* Seção Ranking Final */}
        <section>
          <h2 className='text-2xl font-semibold mb-1'>🏆 Ranking Atual</h2>
          <p className='text-sm text-gray-600 dark:text-gray-400 italic mb-3'>
            Classificação final baseada na soma dos pontos por critério (Menor
            pontuação = Melhor posição).
          </p>
          {/* Passa os dados e estados do hook para o componente */}
          <RankingTable
            data={rankingData}
            isLoading={isLoading} // Usa isLoading combinado
            error={error} // Passa o erro combinado (componente pode decidir não mostrar)
          />
        </section>

        {/* Seção Detalhes por Critério */}
        <section>
          <h2 className='text-2xl font-semibold mb-3'>
            📊 Desempenho Detalhado por Critério
          </h2>
          {/* Passa os dados e estados do hook para o componente */}
          <DetailedResultsTable
            resultsBySector={resultsBySector}
            uniqueCriteria={uniqueCriteria}
            activeCriteria={activeCriteria} // Passa critérios ativos para lógica de cor
            isLoading={isLoading} // Usa isLoading combinado
            error={error} // Passa erro combinado
          />
        </section>

        {/* Link admin */}
        <div className='mt-10 text-center'>
          <Link
            href='/admin'
            className='text-sm text-blue-600 dark:text-blue-400 hover:underline'
          >
            Acessar Painel Gerencial (Conceitual)
          </Link>
        </div>
      </main>
    </TooltipProvider>
  );
}
