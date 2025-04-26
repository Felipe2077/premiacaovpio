// apps/web/src/app/page.tsx
'use client';

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'; // Importar Tooltip
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react'; // Importar useMemo
// Importar nossos tipos compartilhados
import {
  EntradaRanking,
  EntradaResultadoDetalhado,
} from '@sistema-premiacao/shared-types';

// --- Funções de Fetch ---

const fetchRankingData = async (): Promise<EntradaRanking[]> => {
  const res = await fetch('http://localhost:3001/api/ranking'); // Endpoint do Ranking
  if (!res.ok) throw new Error(`Erro ${res.status} ao buscar ranking`);
  return res.json();
};

const fetchDetailedResults = async (): Promise<EntradaResultadoDetalhado[]> => {
  const res = await fetch('http://localhost:3001/api/results'); // Endpoint dos Detalhes
  if (!res.ok)
    throw new Error(`Erro ${res.status} ao buscar resultados detalhados`);
  return res.json();
};

// --- Componente da Página ---

export default function HomePage() {
  // Buscar Ranking
  const {
    data: rankingData,
    isLoading: isLoadingRanking,
    error: errorRanking,
  } = useQuery({
    queryKey: ['rankingData'],
    queryFn: fetchRankingData,
  });

  // Buscar Resultados Detalhados
  const {
    data: detailedResults,
    isLoading: isLoadingDetails,
    error: errorDetails,
  } = useQuery({
    queryKey: ['detailedResults'],
    queryFn: fetchDetailedResults,
  });

  // --- Processamento/Transformação dos Dados Detalhados ---
  // Vamos agrupar os resultados por SETOR para facilitar a renderização da tabela
  const resultsBySector = useMemo(() => {
    if (!detailedResults) return {}; // Retorna objeto vazio se não houver dados

    // Usamos reduce para criar um objeto onde a chave é setorId
    return detailedResults.reduce(
      (acc, result) => {
        const sectorId = result.setorId;
        if (!acc[sectorId]) {
          // Inicializa a entrada para este setor se for a primeira vez
          acc[sectorId] = {
            sectorName: result.setorNome,
            criteriaResults: {}, // Objeto para guardar resultados por criterioId
          };
        }
        // Adiciona o resultado detalhado indexado pelo criterionId
        acc[sectorId].criteriaResults[result.criterioId] = result;
        return acc;
      },
      {} as Record<
        number,
        {
          sectorName: string;
          criteriaResults: Record<number, EntradaResultadoDetalhado>;
        }
      >
    ); // Tipagem do acumulador
  }, [detailedResults]); // Recalcula apenas se detailedResults mudar

  // Extrai a lista de critérios únicos para usar como cabeçalho da tabela detalhada
  // Ordena pelo ID para manter a ordem consistente (idealmente viria ordenado da API ou teríamos uma ordem definida)
  const uniqueCriteria = useMemo(() => {
    if (!detailedResults) return [];
    const criteriaMap = new Map<number, { id: number; name: string }>();
    detailedResults.forEach((r) => {
      if (!criteriaMap.has(r.criterioId)) {
        criteriaMap.set(r.criterioId, {
          id: r.criterioId,
          name: r.criterioNome,
        });
      }
    });
    return Array.from(criteriaMap.values()).sort((a, b) => a.id - b.id);
  }, [detailedResults]);
  // -----------------------------------------------------

  // Combina isLoading e errors para simplificar o JSX
  const isLoading = isLoadingRanking || isLoadingDetails;
  const error = errorRanking || errorDetails;

  // Formatação auxiliar
  const formatNumber = (
    num: number | null | undefined,
    decimals = 2
  ): string => {
    if (num === null || num === undefined || !isFinite(num)) return '-';
    return num.toFixed(decimals);
  };
  const formatPercent = (ratio: number | null | undefined): string => {
    if (ratio === null || ratio === undefined || !isFinite(ratio)) return '-';
    return `${(ratio * 100).toFixed(1)}%`; // Exemplo simples de %
  };

  return (
    // Envolve tudo com TooltipProvider para os tooltips funcionarem
    <TooltipProvider>
      <main className='container mx-auto p-4 space-y-8'>
        <h1 className='text-3xl font-bold mb-6 text-center'>
          Premiação Filiais - Desempenho
        </h1>

        {/* Exibição de Erro Geral */}
        {error && (
          <p className='text-red-500 text-center font-semibold'>
            Erro ao carregar dados:
            {error instanceof Error ? error.message : 'Erro desconhecido'}
          </p>
        )}

        {/* Seção Ranking Final */}
        <section>
          <h2 className='text-2xl font-semibold mb-3'>🏆 Ranking Final</h2>
          {isLoadingRanking && <p>Carregando ranking...</p>}
          {rankingData && (
            <Table>
              <TableCaption>
                Classificação final (Menor pontuação = Melhor).
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[100px]'>Posição</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead className='text-right'>Pontuação Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankingData.length === 0 && (
                  <tr>
                    <TableCell colSpan={3} className='text-center'>
                      Nenhum dado de ranking.
                    </TableCell>
                  </tr>
                )}
                {rankingData.map((entry) => (
                  <TableRow key={entry.SETOR}>
                    <TableCell className='font-medium text-lg'>
                      {entry.RANK}º
                    </TableCell>
                    <TableCell className='text-lg'>{entry.SETOR}</TableCell>
                    <TableCell className='text-right text-lg font-semibold'>
                      {formatNumber(entry.PONTUACAO)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>

        {/* Seção Detalhes por Critério */}
        <section>
          <h2 className='text-2xl font-semibold mb-3'>
            📊 Desempenho Detalhado por Critério
          </h2>
          {isLoadingDetails && <p>Carregando detalhes...</p>}
          {detailedResults && uniqueCriteria.length > 0 && (
            <div className='overflow-x-auto'>
              {/* Habilita scroll horizontal se necessário */}
              <Table>
                <TableCaption>
                  Pontuação por critério. Passe o mouse sobre os pontos para ver
                  detalhes.
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className='sticky left-0 bg-background z-10'>
                      Setor
                    </TableHead>
                    {/* Coluna fixa */}
                    {/* Cria cabeçalhos dinâmicos para cada critério */}
                    {uniqueCriteria.map((criterion) => (
                      <TableHead key={criterion.id} className='text-center'>
                        {criterion.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.keys(resultsBySector).length === 0 && (
                    <tr>
                      <TableCell
                        colSpan={uniqueCriteria.length + 1}
                        className='text-center'
                      >
                        Nenhum dado detalhado.
                      </TableCell>
                    </tr>
                  )}
                  {/* Itera sobre os setores agrupados */}
                  {Object.entries(resultsBySector).map(
                    ([sectorId, sectorData]) => (
                      <TableRow key={sectorId}>
                        <TableCell className='font-semibold sticky left-0 bg-background z-10'>
                          {sectorData.sectorName}
                        </TableCell>
                        {/* Para cada critério, encontra o resultado correspondente deste setor */}
                        {uniqueCriteria.map((criterion) => {
                          const result =
                            sectorData.criteriaResults[criterion.id];
                          const points = result?.pontos;

                          return (
                            <TableCell
                              key={`${sectorId}-${criterion.id}`}
                              className='text-center'
                            >
                              {/* Tooltip para exibir detalhes ao passar o mouse */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  {/* Span é necessário para o Tooltip funcionar corretamente em conteúdo simples */}
                                  <span
                                    className={`font-medium ${points === null || points === undefined ? 'text-gray-400' : ''}`}
                                  >
                                    {formatNumber(points)}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className='text-xs'>
                                  <p>
                                    Critério:
                                    {result?.criterioId ?? criterion.name}
                                  </p>
                                  <p>
                                    Valor:
                                    {formatNumber(result?.valorRealizado)}
                                  </p>
                                  <p>Meta: {formatNumber(result?.valorMeta)}</p>
                                  <p>
                                    % Ating.:
                                    {formatPercent(
                                      result?.percentualAtingimento
                                    )}
                                  </p>
                                  <p>Pontos: {formatNumber(points)}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        {/* Link temporário para a área admin conceitual */}
        <div className='mt-8 text-center'>
          <a href='/admin' className='text-blue-600 hover:underline'>
            Ver Painel Admin Conceitual
          </a>
        </div>
      </main>
    </TooltipProvider>
  );
}
