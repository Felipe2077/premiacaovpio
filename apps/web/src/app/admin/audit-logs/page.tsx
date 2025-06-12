'use client';

// Mantenha apenas os imports que a PÁGINA usa
import { AuditLogDetailsModal } from '@/components/audit-logs/AuditLogDetailsModal';
import { AuditLogTable } from '@/components/audit-logs/AuditLogTable';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import type { AuditLogEntity } from '@/entity/audit-log.entity';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { useState } from 'react';

// A função de fetch continua a mesma
const fetchAuditLogs = async (): Promise<AuditLogEntity[]> => {
  const url = 'http://localhost:3001/api/audit-logs';
  try {
    const res = await fetch(url, {
      // 🎯 ADICIONAR ESTAS LINHAS CRÍTICAS:
      credentials: 'include', // Para enviar cookies automaticamente
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      // Se a resposta não for OK, lança um erro que o react-query vai capturar
      throw new Error(`Erro ${res.status} ao buscar os logs de auditoria`);
    }
    const data = await res.json();
    // Garante que sempre retornamos um array, mesmo que a API retorne algo inesperado
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`Falha na requisição para ${url}:`, error);
    // Re-lança o erro para que o react-query possa identificá-lo e popular o estado de 'error'
    if (error instanceof Error) throw error;
    throw new Error('Um erro desconhecido ocorreu ao buscar os logs.');
  }
};

export default function AuditLogsPage() {
  const [detailLog, setDetailLog] = useState<AuditLogEntity | null>(null);

  const {
    data: auditLogs,
    isLoading: isLoadingLogs,
    error: errorLogs,
  } = useQuery<AuditLogEntity[]>({
    queryKey: ['auditLogs'],
    queryFn: fetchAuditLogs,
    select: (data) =>
      data.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
  });

  return (
    <div className='space-y-6'>
      <h1 className='text-2xl font-bold'>Histórico de Eventos</h1>

      {errorLogs && !isLoadingLogs && (
        <Alert variant='destructive' className='mb-4'>
          <AlertCircle className='h-4 w-4' />
          <AlertTitle>Erro ao Carregar Logs</AlertTitle>
          <AlertDescription>
            {errorLogs instanceof Error
              ? errorLogs.message
              : 'Erro desconhecido'}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Eventos Recentes</CardTitle>
          <CardDescription>
            Últimas ações registradas no sistema. Clique em uma linha para ver
            os detalhes.
          </CardDescription>
          <div className='flex gap-2 pt-4'>
            <Input
              placeholder='Filtrar por Ação...'
              className='max-w-xs'
              disabled
            />
            <Input
              placeholder='Filtrar por Usuário...'
              className='max-w-xs'
              disabled
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingLogs ? (
            <div className='space-y-2'>
              {[...Array(9)].map((_, i) => (
                <Skeleton key={i} className='h-9 w-full' />
              ))}
            </div>
          ) : (
            auditLogs && (
              <AuditLogTable logs={auditLogs} onRowClick={setDetailLog} />
            )
          )}
        </CardContent>
      </Card>

      {/* A renderização do Modal agora é uma única linha, limpa e declarativa */}
      <AuditLogDetailsModal
        log={detailLog}
        onClose={() => setDetailLog(null)}
      />
    </div>
  );
}
