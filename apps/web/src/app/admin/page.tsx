// apps/web/src/app/admin/page.tsx (SIMPLIFICADO)
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table } from '@/components/ui/table';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { AuditLogEntity } from '@/entity/audit-log.entity'; // Apenas o que usa
import { useQuery } from '@tanstack/react-query';

// Fetch Logs continua aqui (ou movemos para um hook depois)
const fetchAuditLogs = async (): Promise<AuditLogEntity[]> => {
  /* ... como antes ... */
};
// Poderia ter fetch para Stats da Visão Geral aqui

export default function AdminDashboardPage() {
  // Renomeado para clareza
  const {
    data: auditLogs,
    isLoading: isLoadingLogs,
    error: errorLogs,
  } = useQuery<AuditLogEntity[]>({
    queryKey: ['auditLogs'],
    queryFn: fetchAuditLogs,
  });
  // Query para Stats da Visão Geral viria aqui

  return (
    <TooltipProvider>
      {/* Removi o container/main daqui pois o layout.tsx já tem */}
      <div className='space-y-6'>
        <h1 className='text-2xl font-bold'>Visão Geral - Admin</h1>
        <p className='mb-6 text-sm text-gray-600 italic dark:text-gray-400'>
          Status rápido do sistema de premiação.
        </p>

        {/* Card de Visão Geral (Stats Mock - A IMPLEMENTAR) */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              (Stats como # Params Ativos, # Logs Recentes, etc. virão aqui)
            </p>
          </CardContent>
        </Card>

        {/* Layout em Grid */}
        <div className='grid grid-cols-1 lg:grid-cols-1 gap-6'>
          {' '}
          {/* Ajustado para 1 coluna por enquanto */}
          {/* Card de Logs (mantido aqui) */}
          <Card>
            <CardHeader>
              <CardTitle>Logs de Auditoria Recentes</CardTitle>
              <CardDescription>
                Últimas ações importantes registradas.
              </CardDescription>
              {/* Filtros Placeholders */}
              <div className='flex gap-2 pt-4'>
                {' '}
                <Input placeholder='Filtrar...' disabled />{' '}
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingLogs && <p>Carregando logs...</p>}
              {errorLogs && (
                <p className='text-red-500'>Erro: {errorLogs.message}</p>
              )}
              {auditLogs && <Table> {/* Tabela de logs aqui */} </Table>}
            </CardContent>
          </Card>
          {/* Card de Expurgos (placeholder) */}
          <Card>
            <CardHeader>
              <CardTitle>Expurgos</CardTitle>
            </CardHeader>
            <CardContent>
              <p>(Tabela de Expurgos virá para /admin/expurgos)</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
