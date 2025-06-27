// apps/web/src/app/admin/vigencias/periodos/[id]/oficializar/page.tsx
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { PeriodStatusBadge } from '@/components/vigencias/PeriodStatusBadge';
import { TieIndicator } from '@/components/vigencias/TieIndicator';
import { usePeriodRankingAnalysis, useVigencias } from '@/hooks/useVigencias';
import { formatDate } from '@/lib/utils';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Gavel,
  Info,
  Shield,
  Trophy,
  Users,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function OfficializePeriodPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { isDirector, permissions } = usePermissions();
  const periodId = parseInt(params.id as string);

  const [justification, setJustification] = useState('');
  const [selectedWinnerId, setSelectedWinnerId] = useState<number | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { officializePeriod } = useVigencias();

  const {
    data: analysisData,
    isLoading,
    error,
    refetch,
  } = usePeriodRankingAnalysis(periodId);

  // Verificar se usuário tem permissão
  useEffect(() => {
    if (!isDirector()) {
      toast.error('Acesso negado: Apenas diretores podem oficializar períodos');
      router.push('/admin/vigencias');
    }
  }, [isDirector, router]);

  // Redirecionar se período não está em PRE_FECHADA
  useEffect(() => {
    if (analysisData && analysisData.period.status !== 'PRE_FECHADA') {
      toast.error('Este período não está disponível para oficialização');
      router.push('/admin/vigencias');
    }
  }, [analysisData, router]);

  const handleSubmit = async () => {
    if (!selectedWinnerId || !justification.trim()) {
      toast.error('Selecione o vencedor e forneça uma justificativa');
      return;
    }

    if (justification.trim().length < 10) {
      toast.error('Justificativa deve ter pelo menos 10 caracteres');
      return;
    }

    setShowConfirmDialog(true);
  };

  const handleConfirmOfficialize = async () => {
    if (!selectedWinnerId || !analysisData) return;

    setIsSubmitting(true);
    try {
      await officializePeriod({
        periodId,
        payload: {
          winnerSectorId: selectedWinnerId,
          justification: justification.trim(),
          tieResolvedBy: analysisData.tieAnalysis.hasGlobalTies
            ? user?.id
            : undefined,
        },
      });

      toast.success('Período oficializado com sucesso!');
      router.push('/admin/vigencias');
    } catch (error: any) {
      toast.error(`Erro na oficialização: ${error.message}`);
    } finally {
      setIsSubmitting(false);
      setShowConfirmDialog(false);
    }
  };

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <Skeleton className='h-8 w-64' />
        <Skeleton className='h-48 w-full' />
        <Skeleton className='h-64 w-full' />
      </div>
    );
  }

  if (error) {
    return (
      <div className='space-y-6'>
        <Button variant='ghost' onClick={() => router.back()} className='gap-2'>
          <ArrowLeft className='h-4 w-4' />
          Voltar
        </Button>

        <Alert className='border-red-200 bg-red-50'>
          <AlertTriangle className='h-4 w-4 text-red-600' />
          <AlertDescription className='text-red-800'>
            Erro ao carregar dados do período: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className='space-y-6'>
        <Button variant='ghost' onClick={() => router.back()} className='gap-2'>
          <ArrowLeft className='h-4 w-4' />
          Voltar
        </Button>
        <div className='text-center py-8 text-muted-foreground'>
          <Info className='h-12 w-12 mx-auto mb-4 opacity-50' />
          <p>Dados do período não encontrados</p>
        </div>
      </div>
    );
  }

  const { period, ranking, tieAnalysis, metadata } = analysisData;
  const hasWinnerTie = tieAnalysis.hasGlobalTies && tieAnalysis.winnerTieGroup;
  const eligibleWinners = hasWinnerTie
    ? tieAnalysis.winnerTieGroup.sectors
    : ranking.filter((s) => s.rank === 1);

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
              Oficializar Período
            </h1>
            <p className='text-muted-foreground'>
              Finalização oficial e definição do vencedor
            </p>
          </div>
        </div>

        <div className='flex items-center gap-3'>
          <Shield className='h-5 w-5 text-red-600' />
          <span className='text-sm font-medium text-red-700'>
            Ação Exclusiva do Diretor
          </span>
        </div>
      </div>

      {/* Informações do período */}
      <Card className='border-blue-200 bg-blue-50'>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-xl'>Período {period.mesAno}</CardTitle>
            <PeriodStatusBadge status={period.status} size='lg' />
          </div>
          <CardDescription className='grid grid-cols-2 gap-4 mt-4'>
            <div className='flex items-center gap-2'>
              <Calendar className='h-4 w-4' />
              <span>Início: {formatDate(period.dataInicio)}</span>
            </div>
            <div className='flex items-center gap-2'>
              <Clock className='h-4 w-4' />
              <span>Fim: {formatDate(period.dataFim)}</span>
            </div>
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Análise de empates */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Users className='h-5 w-5' />
            Análise de Empates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TieIndicator tieData={tieAnalysis} />

          {hasWinnerTie && (
            <Alert className='mt-4 border-yellow-200 bg-yellow-50'>
              <AlertTriangle className='h-4 w-4 text-yellow-600' />
              <AlertDescription className='text-yellow-800'>
                <strong>Resolução manual necessária:</strong> Foi detectado
                empate na primeira posição. Como diretor, você deve escolher o
                vencedor e fornecer justificativa.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Ranking atual */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Trophy className='h-5 w-5' />
            Ranking Final
          </CardTitle>
          <CardDescription>
            Posições finais calculadas em {formatDate(metadata.calculatedAt)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            {ranking.slice(0, 10).map((sector, index) => (
              <div
                key={sector.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  sector.rank === 1
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className='flex items-center gap-3'>
                  <Badge
                    variant={sector.rank === 1 ? 'default' : 'outline'}
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      sector.rank === 1 ? 'bg-yellow-500 text-white' : ''
                    }`}
                  >
                    {sector.rank}º
                  </Badge>
                  <span className='font-medium'>{sector.nome}</span>
                </div>
                <div className='text-right'>
                  <div className='font-bold'>{sector.pontuacao} pts</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Formulário de oficialização */}
      <Card className='border-red-200'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-red-700'>
            <Gavel className='h-5 w-5' />
            Oficialização do Período
          </CardTitle>
          <CardDescription>
            Defina o vencedor oficial e forneça justificativa para a decisão
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          {/* Seleção do vencedor */}
          <div className='space-y-2'>
            <Label htmlFor='winner-select'>
              Setor Vencedor *
              {hasWinnerTie && (
                <span className='text-sm text-muted-foreground ml-2'>
                  (Resolução de empate necessária)
                </span>
              )}
            </Label>
            <Select
              value={selectedWinnerId?.toString() || ''}
              onValueChange={(value) => setSelectedWinnerId(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder='Selecione o setor vencedor' />
              </SelectTrigger>
              <SelectContent>
                {eligibleWinners.map((sector) => (
                  <SelectItem key={sector.id} value={sector.id.toString()}>
                    <div className='flex items-center gap-2'>
                      <Badge variant='outline' className='text-xs'>
                        {sector.rank}º
                      </Badge>
                      <span>{sector.nome}</span>
                      <span className='text-muted-foreground'>
                        ({sector.pontuacao} pts)
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasWinnerTie && (
              <p className='text-sm text-muted-foreground'>
                Apenas setores empatados na primeira posição estão disponíveis
                para seleção.
              </p>
            )}
          </div>

          {/* Justificativa */}
          <div className='space-y-2'>
            <Label htmlFor='justification'>Justificativa da Decisão *</Label>
            <Textarea
              id='justification'
              placeholder='Descreva os critérios e motivos para esta decisão...'
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={4}
              className='resize-none'
            />
            <div className='flex justify-between text-sm text-muted-foreground'>
              <span>Mínimo 10 caracteres</span>
              <span>{justification.length}/500</span>
            </div>
          </div>

          {/* Botão de submit */}
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
                !selectedWinnerId ||
                justification.trim().length < 10 ||
                isSubmitting
              }
              className='bg-red-600 hover:bg-red-700 text-white gap-2'
            >
              <Gavel className='h-4 w-4' />
              Oficializar Período
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de confirmação */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-red-700'>
              <Shield className='h-5 w-5' />
              Confirmar Oficialização
            </DialogTitle>
            <DialogDescription className='space-y-2'>
              <p>
                Você está prestes a oficializar o período{' '}
                <strong>{period.mesAno}</strong>. Esta ação é{' '}
                <strong>irreversível</strong> e será registrada no log de
                auditoria.
              </p>

              {selectedWinnerId && (
                <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3'>
                  <p className='text-sm'>
                    <strong>Vencedor selecionado:</strong>{' '}
                    {ranking.find((s) => s.id === selectedWinnerId)?.nome}
                  </p>
                  {hasWinnerTie && (
                    <p className='text-sm text-yellow-700 mt-1'>
                      <strong>Empate resolvido</strong> por decisão diretorial
                    </p>
                  )}
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
              onClick={handleConfirmOfficialize}
              disabled={isSubmitting}
              className='bg-red-600 hover:bg-red-700 text-white'
            >
              {isSubmitting ? (
                <>
                  <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2' />
                  Oficializando...
                </>
              ) : (
                <>
                  <CheckCircle className='h-4 w-4 mr-2' />
                  Confirmar Oficialização
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
