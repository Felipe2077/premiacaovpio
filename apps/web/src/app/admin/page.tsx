// apps/web/src/app/admin/page.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
// Importa os componentes da Tabela Shadcn UI
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
// Importa nossos tipos compartilhados
import {
  EntradaLogAuditoria,
  ParametroValor,
} from '@sistema-premiacao/shared-types';

// --- Funções para buscar dados da API ---

// Busca Parâmetros Atuais
const fetchCurrentParameters = async (): Promise<ParametroValor[]> => {
  // Ajuste a URL/porta se sua API estiver rodando em outro lugar
  const res = await fetch('http://localhost:3001/api/parameters/current');
  if (!res.ok) {
    console.error(
      'API Response Status (Parameters):',
      res.status,
      res.statusText
    );
    const errorBody = await res.text();
    console.error('API Response Body (Parameters):', errorBody);
    throw new Error(`Erro ${res.status} ao buscar parâmetros da API`);
  }
  return res.json();
};

// Busca Logs de Auditoria Recentes
const fetchAuditLogs = async (): Promise<EntradaLogAuditoria[]> => {
  // Ajuste a URL/porta se sua API estiver rodando em outro lugar
  const res = await fetch('http://localhost:3001/api/audit-logs'); // Pega os últimos 50 por padrão (definido na API)
  if (!res.ok) {
    console.error('API Response Status (Logs):', res.status, res.statusText);
    const errorBody = await res.text();
    console.error('API Response Body (Logs):', errorBody);
    throw new Error(`Erro ${res.status} ao buscar logs da API`);
  }
  return res.json();
};

// --- Componente da Página ---

export default function AdminConceptPage() {
  // Query para buscar parâmetros
  const {
    data: parameters,
    isLoading: isLoadingParams,
    error: errorParams,
  } = useQuery<ParametroValor[]>({
    // Especifica o tipo esperado
    queryKey: ['currentParameters'],
    queryFn: fetchCurrentParameters,
  });

  // Query para buscar logs
  const {
    data: auditLogs,
    isLoading: isLoadingLogs,
    error: errorLogs,
  } = useQuery<EntradaLogAuditoria[]>({
    // Especifica o tipo esperado
    queryKey: ['auditLogs'],
    queryFn: fetchAuditLogs,
    // Pode adicionar opções como refetchInterval se quiser que atualize
  });

  // Função auxiliar para formatar data/hora
  const formatDateTime = (isoString: string | Date | undefined) => {
    if (!isoString) return '-';
    try {
      return new Date(isoString).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return String(isoString); // Retorna string original se falhar
    }
  };

  return (
    <main className='container mx-auto p-4'>
      <h1 className='text-2xl font-bold mb-4'>
        Área Gerencial - Visão Conceitual (MVP)
      </h1>
      <p className='mb-6 text-sm text-gray-600 italic'>
        Esta página demonstra a visibilidade planejada para parâmetros e logs de
        auditoria. A funcionalidade de edição de parâmetros e os controles de
        acesso completos serão implementados nas próximas fases do projeto. Os
        dados de log exibidos são exemplos (mock).
      </p>

      {/* Seção de Parâmetros */}
      <section className='mb-8'>
        <h2 className='text-xl font-semibold mb-3'>Parâmetros Atuais</h2>
        {isLoadingParams && <p>Carregando parâmetros...</p>}
        {errorParams && (
          <p className='text-red-500'>
            Erro ao buscar parâmetros: {errorParams.message}
          </p>
        )}
        {parameters && (
          <Table>
            <TableCaption>
              Parâmetros de negócio vigentes no momento.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Nome Parâmetro</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Critério ID</TableHead>
                <TableHead>Setor ID</TableHead>
                <TableHead>Início Vigência</TableHead>
                <TableHead>Fim Vigência</TableHead>
                {/* <TableHead>Justificativa</TableHead> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {parameters.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className='text-center'>
                    Nenhum parâmetro encontrado.
                  </TableCell>
                </TableRow>
              )}
              {parameters.map((param) => (
                <TableRow key={param.id}>
                  <TableCell className='font-medium'>
                    {param.nomeParametro}
                  </TableCell>
                  <TableCell>{param.valor}</TableCell>
                  <TableCell>{param.criterionId ?? '-'}</TableCell>
                  <TableCell>{param.sectorId ?? '-'}</TableCell>
                  <TableCell>
                    {formatDateTime(param.dataInicioEfetivo)}
                  </TableCell>
                  <TableCell>
                    {param.dataFimEfetivo
                      ? formatDateTime(param.dataFimEfetivo)
                      : 'Vigente'}
                  </TableCell>
                  {/* <TableCell>{param.justificativa ?? '-'}</TableCell> */}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {/* Seção de Logs */}
      <section>
        <h2 className='text-xl font-semibold mb-3'>
          Logs de Auditoria Recentes
        </h2>
        {isLoadingLogs && <p>Carregando logs...</p>}
        {errorLogs && (
          <p className='text-red-500'>
            Erro ao buscar logs: {errorLogs.message}
          </p>
        )}
        {auditLogs && (
          <Table>
            <TableCaption>
              Últimos eventos registrados no sistema (dados mock).
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Detalhes/Justificativa</TableHead>
                {/* <TableHead>IP</TableHead> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className='text-center'>
                    Nenhum log encontrado.
                  </TableCell>
                </TableRow>
              )}
              {auditLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{formatDateTime(log.timestamp)}</TableCell>
                  <TableCell>
                    {log.userName ?? `Sistema (ID: ${log.userId})`}
                  </TableCell>
                  <TableCell>{log.actionType}</TableCell>
                  <TableCell className='text-sm'>
                    {log.justification ||
                      (log.details ? JSON.stringify(log.details) : '-')}
                  </TableCell>
                  {/* <TableCell>{log.ipAddress ?? '-'}</TableCell> */}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </main>
  );
}
