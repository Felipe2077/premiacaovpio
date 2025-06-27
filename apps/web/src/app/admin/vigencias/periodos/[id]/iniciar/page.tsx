// apps/web/src/app/admin/vigencias/periodos/[id]/iniciar/page.tsx - VERSÃO COMPLETA
'use client';

import { useAuth, usePermissions } from '@/components/providers/AuthProvider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { PeriodStatusBadge } from '@/components/vigencias/PeriodStatusBadge';
import { formatDate } from '@/lib/utils';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Info,
  PlayCircle,
  Shield,
  Target,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// Interface para dados do período
interface PeriodData {
  id: number;
  mesAno: string;
  dataInicio: string;
  dataFim: string;
  status: 'PLANEJAMENTO' | 'ATIVA' | 'PRE_FECHADA' | 'FECHADA';
  metasDefinidas: number;
  totalMetas: number;
  createdAt: string;
  updatedAt: string;
}

export default function StartPeriodPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { isDirector } = usePermissions();
  const periodId = parseInt(params.id as string);

  const [justification, setJustification] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [periodData, setPeriodData] = useState<PeriodData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verificar se usuário tem permissão
  useEffect(() => {
    if (!isDirector()) {
      toast.error('Acesso negado: Apenas diretores podem iniciar períodos');
      router.push('/admin/vigencias');
    }
  }, [isDirector, router]);

  // Buscar dados do período
  useEffect(() => {
    const fetchPeriodData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Simular chamada à API - você deve substituir pela API real
        const response = await fetch(`/api/periods/${periodId}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Validar se período está em PLANEJAMENTO
        if (data.status !== 'PLANEJAMENTO') {
          throw new Error('Este período não está disponível para início');
        }

        setPeriodData({
          ...data,
          metasDefinidas: data.metasDefinidas || 14, // Dados simulados
          totalMetas: data.totalMetas || 15,
        });
      } catch (err: any) {
        console.error('Erro ao buscar dados do período:', err);
        setError(err.message || 'Erro ao carregar dados do período');
      } finally {
        setIsLoading(false);
      }
    };

    if (periodId && !isNaN(periodId)) {
      fetchPeriodData();
    } else {
      setError('ID do período inválido');
      setIsLoading(false);
    }
  }, [periodId]);

  const handleSubmit = async () => {
    if (!justification.trim()) {
      toast.error('Forneça uma justificativa para o início do período');
      return;
    }

    if (justification.trim().length < 10) {
      toast.error('Justificativa deve ter pelo menos 10 caracteres');
      return;
    }

    setShowConfirmDialog(true);
  };

  const handleConfirmStart = async () => {
    if (!periodData) return;

    setIsSubmitting(true);
    try {
      // Chamada à API para iniciar período
      const response = await fetch(`/api/periods/${periodId}/start`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          justification: justification.trim(),
          startedBy: user?.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Erro ${response.status}: ${response.statusText}`
        );
      }

      const result = await response.json();

      toast.success(`Período ${periodData.mesAno} iniciado com sucesso!`);
      router.push('/admin/vigencias');
    } catch (error: any) {
      console.error('Erro ao iniciar período:', error);
      toast.error(`Erro ao iniciar período: ${error.message}`);
    } finally {
      setIsSubmitting(false);
      setShowConfirmDialog(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className='space-y-6'>
        <div className='flex items-center gap-4'>
          <Skeleton className='h-10 w-20' />
          <Skeleton className='h-8 w-64' />
        </div>
        <Skeleton className='h-48 w-full' />
        <Skeleton className='h-64 w-full' />
        <Skeleton className='h-32 w-full' />
      </div>
    );
  }

  // Error state
  if (error || !periodData) {
    return (
      <div className='space-y-6'>
        <Button variant='ghost' onClick={() => router.back()} className='gap-2'>
          <ArrowLeft className='h-4 w-4' />
          Voltar
        </Button>

        <Alert className='border-red-200 bg-red-50'>
          <AlertTriangle className='h-4 w-4 text-red-600' />
          <AlertDescription className='text-red-800'>
            {error || 'Dados do período não encontrados'}
          </AlertDescription>
        </Alert>

        <div className='text-center py-8'>
          <Button
            variant='outline'
            onClick={() => router.push('/admin/vigencias')}
          >
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const metasCompletas = periodData.metasDefinidas >= periodData.totalMetas;
  const progressoMetas =
    (periodData.metasDefinidas / periodData.totalMetas) * 100;

  return (
    <div className='space-y-6 max-w-4xl'>
      {/* Header com navegação */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Button
            variant='ghost'
            onClick={() => router.back()}
            className='gap-2'
          >
            <ArrowLeft className='h-4 w-4' />
            Voltar
          </Button>

          <div>
            <h1 className='text-3xl font-bold tracking-tight'>
              Iniciar Período
            </h1>
            <p className='text-muted-foreground'>
              Ativação oficial do período de competição
            </p>
          </div>
        </div>

        <div className='flex items-center gap-3'>
          <Shield className='h-5 w-5 text-green-600' />
          <span className='text-sm font-medium text-green-700'>
            Ação Exclusiva do Diretor
          </span>
        </div>
      </div>

      {/* Informações do período */}
      <Card className='border-blue-200 bg-blue-50'>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-xl'>
              Período {periodData.mesAno}
            </CardTitle>
            <PeriodStatusBadge status={periodData.status} size='lg' />
          </div>
          <CardDescription className='grid grid-cols-2 gap-4 mt-4'>
            <div className='flex items-center gap-2'>
              <Calendar className='h-4 w-4' />
              <span>Início: {formatDate(periodData.dataInicio)}</span>
            </div>
            <div className='flex items-center gap-2'>
              <Clock className='h-4 w-4' />
              <span>Fim: {formatDate(periodData.dataFim)}</span>
            </div>
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Status das metas */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Target className='h-5 w-5' />
            Status das Metas
          </CardTitle>
          <CardDescription>
            Progresso da definição de metas para o período
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <span className='text-sm font-medium'>Metas definidas:</span>
              <Badge
                variant={metasCompletas ? 'default' : 'outline'}
                className={
                  metasCompletas
                    ? 'bg-green-100 text-green-700 border-green-200'
                    : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                }
              >
                {periodData.metasDefinidas} / {periodData.totalMetas}
              </Badge>
            </div>

            <div className='w-full bg-gray-200 rounded-full h-3'>
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  metasCompletas ? 'bg-green-500' : 'bg-yellow-500'
                }`}
                style={{ width: `${Math.min(progressoMetas, 100)}%` }}
              />
            </div>

            {metasCompletas ? (
              <Alert className='border-green-200 bg-green-50'>
                <CheckCircle className='h-4 w-4 text-green-600' />
                <AlertDescription className='text-green-800'>
                  <strong>Todas as metas foram definidas!</strong> O período
                  está pronto para ser iniciado.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className='border-yellow-200 bg-yellow-50'>
                <AlertTriangle className='h-4 w-4 text-yellow-600' />
                <AlertDescription className='text-yellow-800'>
                  <strong>Atenção:</strong> Ainda há{' '}
                  {periodData.totalMetas - periodData.metasDefinidas} meta(s)
                  pendente(s) de definição. Recomenda-se completar todas antes
                  de iniciar.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Formulário de início */}
      <Card className='border-green-200'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-green-700'>
            <PlayCircle className='h-5 w-5' />
            Iniciar Período de Competição
          </CardTitle>
          <CardDescription>
            Ative oficialmente o período para que os dados comecem a ser
            processados
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          {/* Justificativa */}
          <div className='space-y-2'>
            <Label htmlFor='justification'>Justificativa para Início *</Label>
            <Textarea
              id='justification'
              placeholder='Descreva os motivos para iniciar este período...'
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={4}
              className='resize-none'
            />
            <div className='flex justify-between text-sm text-muted-foreground'>
              <span>Mínimo 10 caracteres</span>
              <span
                className={justification.length > 500 ? 'text-red-500' : ''}
              >
                {justification.length}/500
              </span>
            </div>
          </div>

          {/* Alertas importantes */}
          <Alert className='border-blue-200 bg-blue-50'>
            <Info className='h-4 w-4 text-blue-600' />
            <AlertDescription className='text-blue-800'>
              <strong>Importante:</strong> Ao iniciar o período, o sistema
              começará a processar automaticamente os dados de performance. Esta
              ação não pode ser desfeita.
            </AlertDescription>
          </Alert>

          {/* Botões de ação */}
          <div className='flex justify-end gap-3 pt-4 border-t'>
            <Button
              variant='outline'
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                justification.trim().length < 10 ||
                justification.length > 500 ||
                isSubmitting
              }
              className='bg-green-600 hover:bg-green-700 text-white gap-2'
            >
              <PlayCircle className='h-4 w-4' />
              Iniciar Período
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de confirmação */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-green-700'>
              <PlayCircle className='h-5 w-5' />
              Confirmar Início do Período
            </DialogTitle>
            <DialogDescription className='space-y-2'>
              <p>
                Você está prestes a iniciar o período{' '}
                <strong>{periodData.mesAno}</strong>. O sistema começará a
                processar os dados automaticamente.
              </p>

              {!metasCompletas && (
                <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3'>
                  <p className='text-sm text-yellow-800'>
                    <strong>Atenção:</strong> Nem todas as metas foram definidas
                    ({periodData.metasDefinidas}/{periodData.totalMetas}). Você
                    pode prosseguir, mas recomenda-se completar a configuração.
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='gap-2'>
            <Button
              variant='outline'
              onClick={() => setShowConfirmDialog(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmStart}
              disabled={isSubmitting}
              className='bg-green-600 hover:bg-green-700 text-white'
            >
              {isSubmitting ? (
                <>
                  <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2' />
                  Iniciando...
                </>
              ) : (
                <>
                  <CheckCircle className='h-4 w-4 mr-2' />
                  Confirmar Início
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
