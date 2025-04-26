// apps/web/src/app/visao-a/page.tsx (VERSÃO CORRIGIDA V2)
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
} from '@/components/ui/tooltip';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
// Importando os tipos corretos (já estavam ok)
import { EntradaResultadoDetalhado } from '@sistema-premiacao/shared-types';

// --- Função de Fetch ---
const fetchDetailedResults = async (): Promise<EntradaResultadoDetalhado[]> => {
  const res = await fetch('http://localhost:3001/api/results');
  if (!res.ok) {
    console.error('API Response Status (Results):', res.status, res.statusText);
    const errorBody = await res.text();
    console.error('API Response Body (Results):', errorBody);
    throw new Error(`Erro ${res.status} ao buscar resultados detalhados`);
  }
  return res.json();
};

// --- Estrutura para dados transformados ---
interface TransformedCriterionData {
  criterioId: number;
  criterioNome: string;
  // Adicionar aqui unidade, sentido_melhor se buscar os detalhes do critério na API ou shared-types
  resultsBySector: {
    [sectorId: number]: EntradaResultadoDetalhado | undefined; // Guarda o resultado detalhado para cada setor
  };
}

// Interface para Setores (simplificada para cabeçalho)
interface SimpleSector {
  id: number;
  name: string;
}

// --- Componente da Página ---
export default function ViewAPage() {
  const {
    data: detailedResults,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['detailedResults'],
    queryFn: fetchDetailedResults,
  });

  // --- Transformação dos Dados ---
  // Agrupa por Critério e extrai lista de Setores únicos para cabeçalho
  const { criteriaData, uniqueSectors } = useMemo(() => {
    if (!detailedResults) return { criteriaData: [], uniqueSectors: [] };

    const sectorsMap = new Map<number, SimpleSector>();
    const criteriaMap = new Map<number, TransformedCriterionData>();

    detailedResults.forEach((result) => {
      // Adiciona setor ao map de setores únicos
      if (!sectorsMap.has(result.setorId)) {
        sectorsMap.set(result.setorId, {
          id: result.setorId,
          name: result.setorNome,
        }); // <- Usa nomes corretos
      }

      // Adiciona critério ao map de critérios
      if (!criteriaMap.has(result.criterioId)) {
        criteriaMap.set(result.criterioId, {
          criterioId: result.criterioId,
          criterioNome: result.criterioNome, // <- Usa nomes corretos
          resultsBySector: {},
        });
      }

      // Adiciona o resultado ao critério correspondente, indexado pelo setorId
      const criterionEntry = criteriaMap.get(result.criterioId);
      if (criterionEntry) {
        criterionEntry.resultsBySector[result.setorId] = result; // <- Usa setorId correto
      }
    });

    // Converte maps para arrays e ordena
    const criteriaArray = Array.from(criteriaMap.values()).sort(
      (a, b) => a.criterioId - b.criterioId
    );
    const sectorsArray = Array.from(sectorsMap.values()).sort(
      (a, b) => a.id - b.id
    );

    return { criteriaData: criteriaArray, uniqueSectors: sectorsArray };
  }, [detailedResults]);
  // -----------------------------

  // --- Funções de Formatação COMPLETAS ---
  const formatNumber = (
    num: number | null | undefined,
    decimals = 2
  ): string => {
    if (num === null || num === undefined || !isFinite(num)) return '-';
    // Usar toLocaleString para formato PT-BR se desejar (ex: 1.500,50)
    // return num.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    return num.toFixed(decimals); // Simples com ponto decimal
  };

  const formatPercent = (ratio: number | null | undefined): string => {
    if (ratio === null || ratio === undefined || !isFinite(ratio)) return '-';
    // Mostra como porcentagem com uma casa decimal
    return `${(ratio * 100).toFixed(1)}%`;
  };
  // --------------------------------------

  return (
    <TooltipProvider>
      <main className='container mx-auto p-4'>
        <h1 className='text-2xl font-bold mb-4'>
          Visão Detalhada (Opção A: Critérios x Filiais)
        </h1>

        {isLoading && <p>Carregando dados detalhados...</p>}
        {error && (
          <p className='text-red-500'>
            Erro ao buscar dados:{' '}
            {error instanceof Error ? error.message : 'Erro desconhecido'}
          </p>
        )}

        {criteriaData && uniqueSectors.length > 0 && (
          <div className='overflow-x-auto border rounded-md'>
            {' '}
            {/* Adiciona borda e scroll */}
            <Table>
              <TableCaption>
                Desempenho por critério/filial. Passe o mouse sobre os pontos
                para detalhes.
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className='sticky left-0 bg-background z-10 font-semibold'>
                    Critério
                  </TableHead>{' '}
                  {/* Cabeçalho fixo */}
                  {uniqueSectors.map((sector) => (
                    <TableHead
                      key={sector.id}
                      className='text-center font-semibold'
                    >
                      {sector.name}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {criteriaData.length === 0 && (
                  <tr>
                    <TableCell
                      colSpan={uniqueSectors.length + 1}
                      className='text-center'
                    >
                      Nenhum critério encontrado.
                    </TableCell>
                  </tr>
                )}
                {criteriaData.map((criterionRow) => (
                  <TableRow key={criterionRow.criterioId}>
                    {/* Coluna fixa do critério */}
                    <TableCell className='font-medium sticky left-0 bg-background z-10'>
                      {criterionRow.criterioNome}
                    </TableCell>
                    {/* Mapeia as colunas dos setores */}
                    {uniqueSectors.map((sector) => {
                      // Busca o resultado específico
                      const result = criterionRow.resultsBySector[sector.id];
                      // Usa 'pontos' com 'p' minúsculo, conforme EntradaResultadoDetalhado
                      const pontos = result?.pontos;
                      return (
                        <TableCell
                          key={`${criterionRow.criterioId}-${sector.id}`} // Chave corrigida
                          className='text-center'
                        >
                          {/* Verifica se existe resultado para mostrar o tooltip */}
                          {result ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  className={`font-medium cursor-default ${pontos === null || pontos === undefined ? 'text-gray-400' : ''}`}
                                >
                                  {formatNumber(pontos)} {/* Usa 'pontos' */}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className='text-xs'>
                                {/* Usa nomes corretos das props */}
                                <p>
                                  Valor: {formatNumber(result.valorRealizado)}
                                </p>
                                <p>Meta: {formatNumber(result.valorMeta)}</p>
                                <p>
                                  % Ating.:{' '}
                                  {formatPercent(result.percentualAtingimento)}
                                </p>
                                {/* <p>Pontos: {formatNumber(pontos)}</p> */}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className='text-gray-400'>-</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </TooltipProvider>
  );
}
