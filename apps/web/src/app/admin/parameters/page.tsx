// apps/web/src/app/admin/parameters/page.tsx
'use client';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'; // Importar Select
import {
  Table,
  TableBody,
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
import type { ParameterValueEntity } from '@/entity/parameter-value.entity'; // Usando entidade por enquanto
import { formatDate } from '@/lib/utils'; // Importar formatDate
import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';

// Fetch function (poderia vir de um arquivo api/ ou lib/)
const fetchCurrentParameters = async (): Promise<ParameterValueEntity[]> => {
  const res = await fetch('http://localhost:3001/api/parameters/current');
  if (!res.ok) throw new Error(`Erro ${res.status} ao buscar parâmetros`);
  try {
    return await res.json();
  } catch {
    throw new Error('Resposta inválida da API de parâmetros');
  }
};

// Componente da Página
export default function ParametersPage() {
  const {
    data: parameters,
    isLoading: isLoadingParams,
    error: errorParams,
  } = useQuery<ParameterValueEntity[]>({
    queryKey: ['currentParameters'],
    queryFn: fetchCurrentParameters,
  });

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    // Provider necessário para tooltips nesta página
    <TooltipProvider>
      <div className='space-y-6'>
        {' '}
        {/* Espaçamento entre cards/elementos */}
        <h1 className='text-2xl font-bold'>Gerenciamento de Parâmetros</h1>
        {/* Card de Parâmetros */}
        <Card>
          <CardHeader>
            <div className='flex justify-between items-start sm:items-center flex-col sm:flex-row gap-2'>
              <div>
                <CardTitle>Parâmetros Atuais</CardTitle>
                <CardDescription>
                  Regras de negócio e metas vigentes para a premiação.
                </CardDescription>
              </div>
              {/* Botão para Novo Parâmetro virá aqui depois */}
            </div>
            {/* Filtros Placeholders */}
            <div className='flex gap-2 pt-4'>
              <Input
                placeholder='Buscar parâmetro...'
                className='max-w-xs'
                disabled
              />
              <Select disabled>
                <SelectTrigger className='w-[180px]'>
                  {' '}
                  <SelectValue placeholder='Filtrar...' />{' '}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='null'>...</SelectItem>
                </SelectContent>
              </Select>
              {/* Adicionar botão "Adicionar" aqui depois */}
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingParams && <p>Carregando parâmetros...</p>}
            {errorParams && (
              <p className='text-red-500'>
                Erro ao carregar: {errorParams.message}
              </p>
            )}
            {!isLoadingParams &&
              !errorParams &&
              parameters && ( // Verifica se tem 'parameters' antes de usar
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parâmetro</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Critério</TableHead>
                      <TableHead>Setor</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Fim</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Justificativa</TableHead>
                      <TableHead>Hist.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parameters.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className='text-center h-24'>
                          Nenhum parâmetro encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                    {parameters.map((param) => {
                      // Lógica para determinar se está vigente
                      const isVigente =
                        !param.dataFimEfetivo ||
                        new Date(param.dataFimEfetivo) >= new Date(todayStr);
                      return (
                        <TableRow key={param.id}>
                          <TableCell className='font-medium'>
                            {param.nomeParametro}
                          </TableCell>
                          <TableCell>{param.valor}</TableCell>
                          {/* Acessa nomes das relações com optional chaining */}
                          <TableCell>{param.criterio?.nome ?? '-'}</TableCell>
                          <TableCell>{param.setor?.nome ?? '-'}</TableCell>
                          <TableCell>
                            {formatDate(param.dataInicioEfetivo)}
                          </TableCell>
                          <TableCell>
                            {param.dataFimEfetivo
                              ? formatDate(param.dataFimEfetivo)
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={isVigente ? 'default' : 'outline'}
                              className={
                                isVigente
                                  ? 'bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:text-green-100'
                                  : ''
                              }
                            >
                              {isVigente ? 'Vigente' : 'Expirado'}
                            </Badge>
                          </TableCell>
                          <TableCell className='max-w-[150px] truncate'>
                            {' '}
                            {/* Trunca justificativa longa */}
                            <Tooltip>
                              <TooltipTrigger className='hover:underline cursor-help'>
                                {param.justificativa ?? '-'}
                              </TooltipTrigger>
                              <TooltipContent>
                                {param.justificativa}
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger>
                                <History className='h-4 w-4 text-gray-400 cursor-pointer hover:text-primary' />
                              </TooltipTrigger>{' '}
                              {/* Adicionado cursor */}
                              <TooltipContent>
                                Ver histórico (Em breve)
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
