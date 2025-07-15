import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Copy, Download, Loader2, Share, Trophy } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

// Simulação do html2canvas - em produção você instalaria: npm install html2canvas
declare global {
  interface Window {
    html2canvas: any;
  }
}

interface Period {
  id: number;
  mesAno: string;
  status: 'PLANEJAMENTO' | 'ATIVA' | 'PRE_FECHADA' | 'FECHADA';
  dataInicio: string;
  dataFim: string;
  setorVencedor?: {
    id: number;
    nome: string;
  };
  oficializadaEm?: string;
}

interface RankingData {
  position: number;
  setor: string;
  pontos: number;
  isWinner?: boolean;
}

interface ShareRankingProps {
  period: Period;
  rankingData: RankingData[];
}

// Função para formatar período
const formatPeriod = (mesAno: string) => {
  if (!mesAno || !mesAno.includes('-')) return 'Período Indisponível';
  const [ano, mes] = mesAno.split('-');
  const date = new Date(Number(ano), Number(mes) - 1);
  return date.toLocaleString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
};

// Função para formatar data
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// ✅ COMPONENTE RESPONSIVO DA IMAGEM PARA COMPARTILHAMENTO
function ShareableRankingImage({ period, rankingData }: ShareRankingProps) {
  // ✅ Estilos responsivos que funcionam bem em mobile
  const styles = {
    container: {
      fontFamily: 'Inter, system-ui, sans-serif',
      backgroundColor: '#ffffff',
      color: '#111827',
      width: '100%',
      maxWidth: '500px', // ✅ Reduzido para mobile
      margin: '0 auto',
      padding: '24px', // ✅ Reduzido para mobile
      boxSizing: 'border-box' as const,
    },
    header: {
      textAlign: 'center' as const,
      marginBottom: '24px', // ✅ Reduzido
      paddingBottom: '16px', // ✅ Reduzido
      borderBottom: '2px solid #fbbf24',
    },
    logoContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      marginBottom: '12px', // ✅ Reduzido
      flexWrap: 'wrap' as const, // ✅ Para mobile
    },
    logo: {
      width: '40px', // ✅ Reduzido para mobile
      height: '40px',
      backgroundColor: '#fbbf24',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    logoText: {
      color: '#ffffff',
      fontWeight: 'bold',
      fontSize: '16px', // ✅ Reduzido
    },
    title: {
      fontSize: '20px', // ✅ Reduzido para mobile
      fontWeight: 'bold',
      color: '#111827',
      margin: '0',
    },
    subtitle: {
      fontSize: '16px', // ✅ Reduzido
      fontWeight: '600',
      color: '#374151',
      margin: '8px 0',
    },
    period: {
      color: '#6b7280',
      textTransform: 'capitalize' as const,
      margin: '0',
      fontSize: '14px', // ✅ Reduzido
    },
    infoBox: {
      backgroundColor: '#fefce8',
      border: '1px solid #fde047',
      borderRadius: '8px',
      padding: '12px', // ✅ Reduzido
      marginBottom: '16px', // ✅ Reduzido
    },
    infoGrid: {
      display: 'flex', // ✅ Mudou para flex para melhor responsividade
      flexDirection: 'column' as const,
      gap: '8px',
      fontSize: '12px', // ✅ Reduzido
    },
    infoItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      justifyContent: 'space-between', // ✅ Para alinhar melhor
    },
    infoText: {
      color: '#374151',
    },
    table: {
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      overflow: 'hidden',
      width: '100%',
    },
    tableHeader: {
      backgroundColor: '#f9fafb',
      borderBottom: '1px solid #d1d5db',
      padding: '12px',
    },
    tableTitle: {
      fontWeight: '600',
      color: '#111827',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      margin: '0',
      fontSize: '14px', // ✅ Reduzido
    },
    rankingItem: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px',
      borderBottom: '1px solid #f3f4f6',
    },
    rankingLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      flex: 1,
    },
    position: {
      width: '28px', // ✅ Reduzido
      height: '28px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px', // ✅ Reduzido
      fontWeight: 'bold',
      flexShrink: 0,
    },
    sectorInfo: {
      flex: 1,
      minWidth: 0, // ✅ Para permitir quebra de texto
    },
    sectorName: {
      fontWeight: '600',
      fontSize: '14px', // ✅ Reduzido
      marginBottom: '2px',
    },
    winnerBadge: {
      color: '#d97706',
      fontSize: '10px', // ✅ Reduzido
      fontWeight: '500',
    },
    points: {
      textAlign: 'right' as const,
      flexShrink: 0,
    },
    pointsValue: {
      fontWeight: 'bold',
      fontSize: '14px', // ✅ Reduzido
    },
    pointsLabel: {
      fontSize: '10px', // ✅ Reduzido
      color: '#9ca3af',
    },
    footer: {
      marginTop: '16px', // ✅ Reduzido
      textAlign: 'center' as const,
      fontSize: '10px', // ✅ Reduzido
      color: '#9ca3af',
      borderTop: '1px solid #f3f4f6',
      paddingTop: '12px', // ✅ Reduzido
    },
  };

  const getPositionStyle = (position: number) => {
    const baseStyle = styles.position;
    switch (position) {
      case 1:
        return { ...baseStyle, backgroundColor: '#fbbf24', color: '#ffffff' };
      case 2:
        return { ...baseStyle, backgroundColor: '#e5e7eb', color: '#374151' };
      case 3:
        return { ...baseStyle, backgroundColor: '#fed7aa', color: '#9a3412' };
      default:
        return { ...baseStyle, backgroundColor: '#f3f4f6', color: '#6b7280' };
    }
  };

  return (
    <div id='ranking-share-image' style={styles.container}>
      {/* Header da empresa */}
      <div style={styles.header}>
        <div style={styles.logoContainer}>
          <div style={styles.logo}>
            <span style={styles.logoText}>VP</span>
          </div>
          <h1 style={styles.title}>Viação Pioneira</h1>
        </div>
        <h2 style={styles.subtitle}>Resultado da Premiação por Desempenho</h2>
        <p style={styles.period}>{formatPeriod(period.mesAno)}</p>
      </div>

      {/* Informações do período */}
      <div style={styles.infoBox}>
        <div style={styles.infoGrid}>
          <div style={styles.infoItem}>
            <div style={styles.infoText}>
              📅 {formatDate(period.dataInicio)} - {formatDate(period.dataFim)}
            </div>
          </div>
          <div style={styles.infoItem}>
            <div style={styles.infoText}>🏆 Status: Finalizada</div>
          </div>
        </div>
      </div>

      {/* Tabela de classificação */}
      <div style={styles.table}>
        <div style={styles.tableHeader}>
          <h3 style={styles.tableTitle}>
            <Trophy size={16} />
            Classificação Final
          </h3>
        </div>

        {/* Lista de ranking */}
        {rankingData.map((item, index) => (
          <div
            key={`${item.setor}-${item.position}`}
            style={{
              ...styles.rankingItem,
              borderBottom:
                index === rankingData.length - 1 ? 'none' : '1px solid #f3f4f6',
            }}
          >
            <div style={styles.rankingLeft}>
              <div style={getPositionStyle(item.position)}>
                {item.position}°
              </div>
              <div style={styles.sectorInfo}>
                <div style={styles.sectorName}>{item.setor}</div>
                {item.isWinner && (
                  <div style={styles.winnerBadge}>🏆 Vencedor</div>
                )}
              </div>
            </div>
            <div style={styles.points}>
              <div style={styles.pointsValue}>{item.pontos.toFixed(2)}</div>
              <div style={styles.pointsLabel}>pontos</div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <p style={{ margin: '0 0 4px 0' }}>
          Gerado em {new Date().toLocaleDateString('pt-BR')} às{' '}
          {new Date().toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
        <p style={{ margin: '0' }}>Sistema de Premiação - Viação Pioneira</p>
      </div>
    </div>
  );
}

export default function ShareRankingButton({
  period,
  rankingData,
}: ShareRankingProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);

  // Só mostra o botão se o período estiver FECHADO
  if (period.status !== 'FECHADA') {
    return null;
  }

  // ✅ FUNÇÃO DE GERAÇÃO MELHORADA PARA MOBILE COM HIGH DPI
  const generateImageDirectCanvas = async () => {
    setIsGenerating(true);

    try {
      console.log('🎨 Gerando imagem com canvas nativo (High DPI)...');
      console.log('📊 Dados do ranking:', rankingData);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Não foi possível criar contexto do canvas');
      }

      // ✅ HIGH DPI/RETINA SUPPORT - Principal correção para qualidade
      const devicePixelRatio = window.devicePixelRatio || 1;
      const scaleFactor = Math.max(devicePixelRatio, 2); // Mínimo 2x para qualidade

      // Dimensões lógicas (o que vemos)
      const logicalWidth = 500;
      const logicalHeight = 300 + rankingData.length * 50;

      // Dimensões físicas (resolução real do canvas)
      const physicalWidth = logicalWidth * scaleFactor;
      const physicalHeight = logicalHeight * scaleFactor;

      // Configurar canvas para alta resolução
      canvas.width = physicalWidth;
      canvas.height = physicalHeight;
      canvas.style.width = `${logicalWidth}px`;
      canvas.style.height = `${logicalHeight}px`;

      // Escalar o contexto para desenhar em alta resolução
      ctx.scale(scaleFactor, scaleFactor);

      console.log(
        `📐 Canvas criado: ${logicalWidth}x${logicalHeight} (${physicalWidth}x${physicalHeight} físico, escala ${scaleFactor}x)`
      );

      // ✅ MELHORAR QUALIDADE DE RENDERIZAÇÃO
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.textRenderingOptimization = 'optimizeQuality';

      // Fundo branco
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, logicalWidth, logicalHeight);

      let y = 30;

      // LOGO E HEADER
      console.log('🎨 Desenhando header...');

      // Logo circular amarelo
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(250, y, 20, 0, 2 * Math.PI);
      ctx.fill();

      // Texto "VP" na logo
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Inter, Arial, sans-serif'; // ✅ Font stack melhor
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('VP', 250, y);
      y += 40;

      // Título principal
      ctx.font = 'bold 22px Inter, Arial, sans-serif';
      ctx.fillStyle = '#111827';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('Viação Pioneira', 250, y);
      y += 28;

      // Subtítulo
      ctx.font = '16px Inter, Arial, sans-serif';
      ctx.fillStyle = '#374151';
      ctx.fillText('Resultado da Premiação por Desempenho', 250, y);
      y += 20;

      // Período
      ctx.font = '14px Inter, Arial, sans-serif';
      ctx.fillStyle = '#6b7280';
      ctx.fillText(formatPeriod(period.mesAno), 250, y);
      y += 25;

      // Linha separadora dourada - ✅ Com anti-aliasing
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(460, y);
      ctx.stroke();
      y += 25;

      console.log('🏆 Desenhando ranking...');

      // RANKING
      rankingData.forEach((item, index) => {
        const rowY = y + index * 50;

        // ✅ Círculo da posição com anti-aliasing
        const colors = {
          1: '#fbbf24',
          2: '#e5e7eb',
          3: '#e5e7eb',
          default: '#e5e7eb',
        };

        ctx.fillStyle =
          colors[item.position as keyof typeof colors] || colors.default;
        ctx.beginPath();
        ctx.arc(65, rowY + 15, 14, 0, 2 * Math.PI);
        ctx.fill();

        // Número da posição
        ctx.fillStyle = item.position === 1 ? '#ffffff' : '#374151';
        ctx.font = 'bold 12px Inter, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${item.position}°`, 65, rowY + 15);

        // Nome do setor
        ctx.textAlign = 'left';
        ctx.font = 'bold 14px Inter, Arial, sans-serif';
        ctx.fillStyle = item.isWinner ? '#b45309' : '#111827';
        ctx.fillText(item.setor, 90, rowY + 12);

        // Badge "Vencedor" para o primeiro lugar
        if (item.isWinner) {
          ctx.font = '10px Inter, Arial, sans-serif';
          ctx.fillStyle = '#d97706';
          ctx.fillText('🏆 Vencedor', 90, rowY + 28);
        }

        // PONTUAÇÃO
        ctx.textAlign = 'right';
        ctx.font = 'bold 16px Inter, Arial, sans-serif';
        const pointColors = {
          1: '#d97706',
          2: '#6b7280',
          3: '#ea580c',
          default: '#dc2626',
        };
        ctx.fillStyle =
          pointColors[item.position as keyof typeof pointColors] ||
          pointColors.default;
        ctx.fillText(item.pontos.toFixed(2), 440, rowY + 15);

        // Label "pontos"
        ctx.font = '10px Inter, Arial, sans-serif';
        ctx.fillStyle = '#9ca3af';
        ctx.fillText('pontos', 440, rowY + 30);
      });

      console.log('📄 Desenhando footer...');

      // FOOTER
      const footerY = y + rankingData.length * 50 + 20;

      // Linha separadora
      ctx.strokeStyle = '#f3f4f6';
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(40, footerY);
      ctx.lineTo(460, footerY);
      ctx.stroke();

      // Texto do footer
      ctx.textAlign = 'center';
      ctx.font = '10px Inter, Arial, sans-serif';
      ctx.fillStyle = '#9ca3af';
      ctx.textBaseline = 'top';
      const now = new Date();
      ctx.fillText(
        `Gerado em ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
        250,
        footerY + 10
      );
      ctx.fillText('Sistema de Premiação - Viação Pioneira', 250, footerY + 22);

      console.log('✅ Canvas desenhado com sucesso!');
      console.log(
        `📐 Tamanho final: ${canvas.width}x${canvas.height} (escala ${scaleFactor}x)`
      );

      return canvas;
    } catch (error) {
      console.error('❌ Erro no canvas nativo:', error);
      toast.error(`Erro ao gerar imagem: ${error.message}`);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    console.log('📥 Gerando imagem com canvas nativo...');

    const canvas = await generateImageDirectCanvas();

    if (!canvas) {
      toast.error('Não foi possível gerar a imagem');
      return;
    }

    // ✅ CONFIGURAÇÃO DE ALTA QUALIDADE PARA DOWNLOAD
    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ranking-premiacao-${period.mesAno.replace('-', '_')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success('Imagem baixada com sucesso!');
      },
      'image/png',
      1.0 // ✅ Qualidade máxima
    );
  };

  const handleCopyImage = async () => {
    console.log('📋 Gerando imagem para copiar...');

    const canvas = await generateImageDirectCanvas();

    if (!canvas) {
      toast.error('Não foi possível gerar a imagem');
      return;
    }

    try {
      canvas.toBlob(
        async (blob) => {
          if (!blob) return;

          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);

          toast.success('Imagem copiada para a área de transferência!');
        },
        'image/png',
        1.0
      );
    } catch (error) {
      toast.error('Erro ao copiar imagem. Tente fazer o download.');
    }
  };

  const handleShare = async () => {
    console.log('📤 Gerando imagem para compartilhar...');

    const canvas = await generateImageDirectCanvas();

    if (!canvas) {
      toast.error('Não foi possível gerar a imagem');
      return;
    }

    try {
      canvas.toBlob(
        async (blob) => {
          if (!blob) return;

          const file = new File(
            [blob],
            `ranking-premiacao-${period.mesAno}.png`,
            { type: 'image/png' }
          );

          if (navigator.share && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `Resultado da Premiação - ${formatPeriod(period.mesAno)}`,
              text: `Confira o resultado da premiação por desempenho da Viação Pioneira!`,
            });
          } else {
            // Fallback para download se não suportar Web Share API
            handleDownload();
          }
        },
        'image/png',
        1.0
      );
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      handleDownload(); // Fallback para download
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          className='bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100 hover:border-yellow-400 transition-colors'
        >
          <Share className='h-4 w-4 mr-2' />
          Compartilhar
        </Button>
      </DialogTrigger>

      {/* ✅ MODAL RESPONSIVO - Principal mudança aqui */}
      <DialogContent className='w-full max-w-[95vw] sm:max-w-lg md:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6'>
        <DialogHeader className='pb-4'>
          <DialogTitle className='flex items-center gap-2 text-base sm:text-lg'>
            <Share className='h-4 w-4 sm:h-5 sm:w-5 text-yellow-600' />
            Compartilhar Resultado da Premiação
          </DialogTitle>
          <DialogDescription className='text-sm'>
            Gere uma imagem com o ranking final para compartilhar
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          {/* ✅ Preview da imagem - Responsivo */}
          <div className='border rounded-lg overflow-hidden bg-gray-50 w-full'>
            <div className='overflow-x-auto'>
              <ShareableRankingImage
                period={period}
                rankingData={rankingData}
              />
            </div>
          </div>

          {/* ✅ Botões de ação - Layout responsivo */}
          <div className='flex flex-col sm:flex-row gap-2 sm:gap-3'>
            <Button
              onClick={handleDownload}
              disabled={isGenerating}
              className='bg-yellow-600 hover:bg-yellow-700 text-white flex-1'
              size='sm'
            >
              {isGenerating ? (
                <Loader2 className='h-4 w-4 mr-2 animate-spin' />
              ) : (
                <Download className='h-4 w-4 mr-2' />
              )}
              Baixar Imagem
            </Button>

            <Button
              variant='outline'
              onClick={handleCopyImage}
              disabled={isGenerating}
              className='flex-1'
              size='sm'
            >
              <Copy className='h-4 w-4 mr-2' />
              Copiar
            </Button>

            <Button
              variant='outline'
              onClick={handleShare}
              disabled={isGenerating}
              className='flex-1'
              size='sm'
            >
              <Share className='h-4 w-4 mr-2' />
              Compartilhar
            </Button>
          </div>

          {/* ✅ Indicador de loading */}
          {isGenerating && (
            <div className='text-center text-sm text-gray-600 py-2'>
              <div className='flex items-center justify-center gap-2'>
                <Loader2 className='h-4 w-4 animate-spin' />
                <span>Gerando imagem...</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
