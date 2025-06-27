// apps/web/src/app/admin/vigencias/periodos/[id]/oficializar/page.tsx - CORRIGIDO
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
import { formatDate, formatPeriodName } from '@/lib/utils'; // 🎯 CORREÇÃO: Importar formatPeriodName
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
  const { hasRole, hasPermission } = usePermissions();
  const periodId = parseInt(params.id as string);

  const [justification, setJustification] = useState('');
  const [selectedWinnerId, setSelectedWinnerId] = useState<number | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🎯 CORREÇÃO: Verificações de permissão baseadas no sistema real
  const isDirector = hasRole('DIRETOR');
  const canClosePeriods = hasPermission('CLOSE_PERIODS');

  const { officializePeriod } = useVigencias();

  const {
    data: analysisData,
    isLoading,
    error,
    refetch,
  } = usePeriodRankingAnalysis(periodId);

  // Verificar se usuário tem permissão
  useEffect(() => {
    if (!isDirector && !canClosePeriods) {
      toast.error('Acesso negado: Apenas diretores podem oficializar períodos');
      router.back();
    }
  }, [isDirector, canClosePeriods, router]);

  const handleSubmit = () => {
    if (!selectedWinnerId) {
      toast.error('Selecione o setor vencedor');
      return;
    }

    // 🎯 CORREÇÃO: Validação de justificativa com mínimo de 10 caracteres
    const justificationText = justification.trim();

    if (hasWinnerTie && justificationText.length < 10) {
      toast.error(
        'Para empates, a justificativa deve ter pelo menos 10 caracteres'
      );
      return;
    }

    if (
      !hasWinnerTie &&
      justificationText.length > 0 &&
      justificationText.length < 10
    ) {
      toast.error(
        'Se informar justificativa, ela deve ter pelo menos 10 caracteres'
      );
      return;
    }

    setShowConfirmDialog(true);
  };

  const handleConfirmOfficialize = async () => {
    if (!selectedWinnerId || !analysisData) return;

    setIsSubmitting(true);
    try {
      // 🎯 CORREÇÃO: Buscar o setor selecionado pelo índice
      const sectorIdNumber =
        typeof selectedWinnerId === 'string'
          ? parseInt(selectedWinnerId)
          : selectedWinnerId;

      if (isNaN(sectorIdNumber)) {
        throw new Error('ID do setor inválido');
      }

      const sectorIndex = sectorIdNumber - 1;
      const selectedSector = ranking[sectorIndex];

      if (!selectedSector) {
        throw new Error('Setor selecionado não encontrado');
      }

      const winnerSectorName = selectedSector?.SETOR || selectedSector?.nome;

      if (!winnerSectorName) {
        throw new Error('Nome do setor não encontrado');
      }

      console.log('🔍 Dados para oficialização:', {
        periodId,
        sectorIndex,
        selectedSector,
        winnerSectorName,
        sectorIdNumber,
      });

      // 🎯 CORREÇÃO: Tentar tanto com ID quanto com nome
      // A API precisa do winnerSectorId, mas só temos o nome do setor
      // Vamos tentar buscar o ID do setor baseado no ranking position

      // Como alternativa, vamos usar uma abordagem que funcione com a API atual
      // 🎯 CORREÇÃO: Garantir justificativa com pelo menos 10 caracteres
      const finalJustification =
        justification.trim() ||
        `${formatPeriodName(period.mesAno)} oficializado com vencedor definido como ${winnerSectorName}${
          analysisData.tieAnalysis.hasGlobalTies
            ? ' por decisão diretorial para resolução de empate'
            : ' conforme ranking calculado automaticamente'
        }.`;

      const payload = {
        winnerSectorId: sectorIdNumber, // Tentar com índice primeiro
        winnerSectorName, // Fallback com nome
        tieResolvedBy: analysisData.tieAnalysis.hasGlobalTies
          ? user?.id // ID do usuário diretor que está resolvendo
          : undefined,
        justification: finalJustification, // Garantir que tem pelo menos 10 caracteres
      };

      console.log('🔍 Payload final para API:', payload);

      await officializePeriod({
        periodId,
        payload,
      });

      // 🎯 CORREÇÃO: Toast personalizado com nome do setor
      toast.success(
        `${formatPeriodName(period.mesAno)} oficializado com sucesso! Vencedor: ${winnerSectorName}`,
        {
          duration: 5000,
          description: analysisData.tieAnalysis.hasGlobalTies
            ? 'Empate resolvido por decisão diretorial'
            : 'Resultado confirmado pelo ranking automático',
        }
      );

      router.push('/admin/vigencias');
    } catch (error) {
      toast.error('Erro ao oficializar período');
      console.error('Erro na oficialização:', error);
    } finally {
      setIsSubmitting(false);
      setShowConfirmDialog(false);
    }
  };

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <div className='flex items-center gap-4'>
          <Skeleton className='h-10 w-20' />
          <Skeleton className='h-8 w-64' />
        </div>
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
          <AlertDescription className='text-red-700'>
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

        <Alert>
          <Info className='h-4 w-4' />
          <AlertDescription>
            Dados de análise não encontrados para este período.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { period, ranking, tieAnalysis, metadata } = analysisData;

  // Verificar se período pode ser oficializado
  if (period.status !== 'PRE_FECHADA') {
    return (
      <div className='space-y-6'>
        <Button variant='ghost' onClick={() => router.back()} className='gap-2'>
          <ArrowLeft className='h-4 w-4' />
          Voltar
        </Button>

        <Alert className='border-orange-200 bg-orange-50'>
          <AlertTriangle className='h-4 w-4 text-orange-600' />
          <AlertDescription className='text-orange-700'>
            Este período não está disponível para oficialização. Status atual:{' '}
            <PeriodStatusBadge status={period.status} size='sm' />
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const winnerSector = ranking[0];
  const hasWinnerTie =
    tieAnalysis.hasGlobalTies && !!tieAnalysis.winnerTieGroup;

  return (
    <div className='space-y-6'>
      {/* Header */}
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
              Definição oficial do setor vencedor
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
              {formatPeriodName(period.mesAno)}
            </CardTitle>{' '}
            {/* 🎯 CORREÇÃO: Título amigável */}
            <PeriodStatusBadge status={period.status} size='lg' />
          </div>
          <CardDescription className='grid grid-cols-2 md:grid-cols-4 gap-4 mt-4'>
            <div className='flex items-center gap-2'>
              <Calendar className='h-4 w-4' />
              <span>Início: {formatDate(period.dataInicio)}</span>
            </div>
            <div className='flex items-center gap-2'>
              <Clock className='h-4 w-4' />
              <span>Fim: {formatDate(period.dataFim)}</span>
            </div>
            <div className='flex items-center gap-2'>
              <Users className='h-4 w-4' />
              <span>Setores: {metadata.totalSectors}</span>
            </div>
            <div className='flex items-center gap-2'>
              <Trophy className='h-4 w-4' />
              <span>Vencedor: {winnerSector?.nome || 'A definir'}</span>
            </div>
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Indicador de empates */}
      <TieIndicator tieData={tieAnalysis} />

      {/* Formulário de oficialização */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Gavel className='h-5 w-5' />
            Definir Vencedor
          </CardTitle>
          <CardDescription>
            {hasWinnerTie
              ? 'Selecione o setor vencedor entre os empatados na primeira posição'
              : 'Confirme o setor vencedor baseado no ranking calculado'}
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          {/* Seleção do vencedor */}
          <div className='space-y-3'>
            <Label htmlFor='winner-select'>Setor Vencedor *</Label>
            <Select
              value={selectedWinnerId?.toString() || ''}
              onValueChange={(value) => setSelectedWinnerId(parseInt(value))}
            >
              <SelectTrigger id='winner-select'>
                <SelectValue placeholder='Selecione o setor vencedor' />
              </SelectTrigger>
              <SelectContent>
                {hasWinnerTie && tieAnalysis.winnerTieGroup
                  ? // Se há empate na primeira posição, mostrar apenas os empatados
                    tieAnalysis.winnerTieGroup.sectors
                      .filter(
                        (sector) => sector && (sector.SETOR || sector.nome)
                      ) // 🎯 CORREÇÃO: Filtrar por nome válido
                      .map((sector, index) => (
                        <SelectItem
                          key={sector.SETOR || sector.nome || index}
                          value={(index + 1).toString()}
                        >
                          <div className='flex items-center gap-2'>
                            <Trophy className='h-4 w-4 text-yellow-600' />
                            <span>
                              {sector.SETOR || sector.nome || 'Setor sem nome'}{' '}
                              (
                              {(
                                sector.PONTUACAO ||
                                sector.pontuacao ||
                                0
                              ).toFixed(2)}{' '}
                              pts)
                            </span>
                            <Badge variant='destructive' className='text-xs'>
                              Empate 1º
                            </Badge>
                          </div>
                        </SelectItem>
                      ))
                  : // Se não há empate, mostrar todo o ranking
                    ranking
                      .filter(
                        (sector) => sector && (sector.SETOR || sector.nome)
                      ) // 🎯 CORREÇÃO: Filtrar por nome válido
                      .slice(0, 5)
                      .map((sector, index) => (
                        <SelectItem
                          key={sector.SETOR || sector.nome || index}
                          value={(index + 1).toString()}
                        >
                          <div className='flex items-center gap-2'>
                            {index === 0 && (
                              <Trophy className='h-4 w-4 text-yellow-600' />
                            )}
                            <span>
                              {sector.RANK || sector.rank || index + 1}º -{' '}
                              {sector.SETOR || sector.nome || 'Setor sem nome'}{' '}
                              (
                              {(
                                sector.PONTUACAO ||
                                sector.pontuacao ||
                                0
                              ).toFixed(2)}{' '}
                              pts)
                            </span>
                            {index === 0 && (
                              <Badge
                                variant='default'
                                className='text-xs bg-green-600'
                              >
                                Vencedor
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
              </SelectContent>
            </Select>
          </div>

          {/* Justificativa */}
          <div className='space-y-3'>
            <Label htmlFor='justification'>
              Justificativa{' '}
              {hasWinnerTie ? '(obrigatória para empates)' : '(opcional)'}
            </Label>
            <Textarea
              id='justification'
              placeholder={
                hasWinnerTie
                  ? 'Explique os critérios usados para desempate (mínimo 10 caracteres)...'
                  : 'Justificativa para a oficialização (opcional, mínimo 10 caracteres se preenchida)...'
              }
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={4}
              className='resize-none'
            />
            <div className='flex justify-between items-center'>
              <p className='text-xs text-muted-foreground'>
                {hasWinnerTie
                  ? 'Obrigatório explicar como o empate foi resolvido (mínimo 10 caracteres)'
                  : 'Esta justificativa será registrada no log de auditoria (mínimo 10 caracteres se preenchida)'}
              </p>
              <span
                className={`text-xs ${justification.length < 10 && justification.length > 0 ? 'text-red-500' : 'text-muted-foreground'}`}
              >
                {justification.length}/500{' '}
                {justification.length > 0 &&
                  justification.length < 10 &&
                  '(mín. 10)'}
              </span>
            </div>
          </div>

          {/* Resumo da seleção */}
          {selectedWinnerId && (
            <div className='bg-green-50 rounded-lg p-4 border border-green-200'>
              <h4 className='font-semibold text-green-800 mb-2'>
                Resumo da Oficialização
              </h4>
              <div className='text-sm text-green-700 space-y-1'>
                <p>
                  <span className='font-medium'>Período:</span>{' '}
                  {formatPeriodName(period.mesAno)}{' '}
                  {/* 🎯 CORREÇÃO: Nome amigável */}
                </p>
                <p>
                  <span className='font-medium'>Vencedor:</span>{' '}
                  {(() => {
                    // 🎯 CORREÇÃO: Verificação de nulidade antes de usar
                    if (!selectedWinnerId) return 'Selecione um setor';

                    const sectorIndex =
                      parseInt(selectedWinnerId.toString()) - 1;
                    const winner = ranking[sectorIndex];
                    return (
                      winner?.SETOR ||
                      winner?.nome ||
                      `Setor #${selectedWinnerId}`
                    );
                  })()}
                </p>
                <p>
                  <span className='font-medium'>Pontuação:</span>{' '}
                  {(() => {
                    // 🎯 CORREÇÃO: Verificação de nulidade antes de usar
                    if (!selectedWinnerId) return '0.00';

                    const sectorIndex =
                      parseInt(selectedWinnerId.toString()) - 1;
                    const winner = ranking[sectorIndex];
                    return (
                      winner?.PONTUACAO ||
                      winner?.pontuacao ||
                      0
                    ).toFixed(2);
                  })()}{' '}
                  pts
                </p>
                <p>
                  <span className='font-medium'>Método:</span>{' '}
                  {hasWinnerTie
                    ? 'Decisão diretorial (empate resolvido)'
                    : 'Ranking automático'}
                </p>
              </div>
            </div>
          )}

          {/* Botões de ação */}
          <div className='flex justify-end gap-3 pt-4'>
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
                isSubmitting ||
                (justification.trim().length > 0 &&
                  justification.trim().length < 10) // 🎯 CORREÇÃO: Desabilitar se justificativa for muito curta
              }
              className='gap-2'
            >
              <Gavel className='h-4 w-4' />
              Oficializar Período
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de confirmação */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <AlertTriangle className='h-5 w-5 text-orange-600' />
              Confirmar Oficialização
            </DialogTitle>
            <DialogDescription>
              Esta ação é irreversível. O período será oficialmente encerrado e
              o vencedor será definido.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4'>
            <div className='bg-gray-50 rounded-lg p-4 space-y-2'>
              <p className='text-sm'>
                <span className='font-medium'>Período:</span>{' '}
                {formatPeriodName(period.mesAno)}{' '}
                {/* 🎯 CORREÇÃO: Nome amigável */}
              </p>
              <p className='text-sm'>
                <span className='font-medium'>Vencedor:</span>{' '}
                {(() => {
                  // 🎯 CORREÇÃO: Verificação de nulidade segura
                  if (!selectedWinnerId) return 'Nenhum setor selecionado';

                  const sectorIndex = parseInt(selectedWinnerId.toString()) - 1;
                  const winner = ranking[sectorIndex];
                  return (
                    winner?.SETOR ||
                    winner?.nome ||
                    `Setor #${selectedWinnerId}`
                  );
                })()}
              </p>
              <p className='text-sm'>
                <span className='font-medium'>Usuário:</span> {user?.nome}
              </p>
              {justification && (
                <p className='text-sm'>
                  <span className='font-medium'>Justificativa:</span>{' '}
                  {justification}
                </p>
              )}
            </div>

            <Alert>
              <Info className='h-4 w-4' />
              <AlertDescription>
                Após a oficialização, este resultado será permanente e aparecerá
                nos relatórios públicos.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
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
              className='gap-2'
            >
              {isSubmitting ? (
                <>
                  <Clock className='h-4 w-4 animate-spin' />
                  Oficializando...
                </>
              ) : (
                <>
                  <CheckCircle className='h-4 w-4' />
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
