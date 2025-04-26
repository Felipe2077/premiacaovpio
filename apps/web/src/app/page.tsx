// apps/web/src/app/page.tsx (VERSÃO REFATORADA COM HOOK)
'use client';

import { TooltipProvider } from '@/components/ui/tooltip';
import Link from 'next/link';
// Componentes Filhos
import DetailedResultsTable from '@/components/competition/DetailedResultsTable';
import RankingTable from '@/components/competition/RankingTable';
// Nosso Custom Hook!
import { useCompetitionData } from '@/hooks/useCompetitionData'; // <-- IMPORTAR HOOK

export default function HomePage() {
  // Chama o hook UMA VEZ para pegar TUDO!
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
      <main className='container mx-auto p-4 lg:p-6 space-y-10'>
        <h1 className='text-3xl font-bold mb-6 text-center'>
          Premiação Filiais - Desempenho
        </h1>

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
