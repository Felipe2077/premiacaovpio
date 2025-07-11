import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Calendar, Copy, Download, Loader2, Share, Trophy } from 'lucide-react';
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

// Componente da imagem para compartilhamento
function ShareableRankingImage({ period, rankingData }: ShareRankingProps) {
  // Estilos inline para evitar conflitos com Tailwind e oklch
  const styles = {
    container: {
      fontFamily: 'Inter, system-ui, sans-serif',
      backgroundColor: '#ffffff',
      color: '#111827',
      width: '600px',
      margin: '0 auto',
      padding: '32px',
    },
    header: {
      textAlign: 'center' as const,
      marginBottom: '32px',
      paddingBottom: '24px',
      borderBottom: '2px solid #fbbf24',
    },
    logoContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      marginBottom: '16px',
    },
    logo: {
      width: '48px',
      height: '48px',
      backgroundColor: '#fbbf24',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoText: {
      color: '#ffffff',
      fontWeight: 'bold',
      fontSize: '20px',
    },
    title: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#111827',
      margin: '0',
    },
    subtitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#374151',
      margin: '8px 0',
    },
    period: {
      color: '#6b7280',
      textTransform: 'capitalize' as const,
      margin: '0',
    },
    infoBox: {
      backgroundColor: '#fefce8',
      border: '1px solid #fde047',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '24px',
    },
    infoGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px',
      fontSize: '14px',
    },
    infoItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    infoText: {
      color: '#374151',
    },
    table: {
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      overflow: 'hidden',
    },
    tableHeader: {
      backgroundColor: '#f9fafb',
      borderBottom: '1px solid #d1d5db',
      padding: '12px 16px',
    },
    tableTitle: {
      fontWeight: '600',
      color: '#111827',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      margin: '0',
    },
    footer: {
      marginTop: '24px',
      textAlign: 'center' as const,
      fontSize: '12px',
      color: '#9ca3af',
      borderTop: '1px solid #f3f4f6',
      paddingTop: '16px',
    },
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
            <Calendar
              style={{ height: '16px', width: '16px', color: '#d97706' }}
            />
            <span style={styles.infoText}>
              {formatDate(period.dataInicio)} - {formatDate(period.dataFim)}
            </span>
          </div>
          <div style={styles.infoItem}>
            <Trophy
              style={{ height: '16px', width: '16px', color: '#d97706' }}
            />
            <span style={styles.infoText}>Status: Finalizada</span>
          </div>
        </div>
      </div>

      {/* Ranking Table */}
      <div style={styles.table}>
        <div style={styles.tableHeader}>
          <h3 style={styles.tableTitle}>
            <Trophy
              style={{ height: '20px', width: '20px', color: '#d97706' }}
            />
            Classificação Final
          </h3>
        </div>

        <div>
          {rankingData.map((item, index) => {
            const isWinner = item.isWinner;
            const positionColors = {
              1: { bg: '#fbbf24', color: '#ffffff' },
              2: { bg: '#d1d5db', color: '#374151' },
              3: { bg: '#fed7aa', color: '#ea580c' },
              default: { bg: '#f3f4f6', color: '#6b7280' },
            };

            const positionStyle =
              positionColors[item.position as keyof typeof positionColors] ||
              positionColors.default;

            const rowStyle = {
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: isWinner ? '#fefce8' : '#ffffff',
              borderLeft: isWinner ? '4px solid #fbbf24' : 'none',
              borderBottom:
                index < rankingData.length - 1 ? '1px solid #f3f4f6' : 'none',
            };

            const positionBadgeStyle = {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              fontWeight: 'bold',
              fontSize: '14px',
              backgroundColor: positionStyle.bg,
              color: positionStyle.color,
            };

            const leftSideStyle = {
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            };

            const sectorNameStyle = {
              fontWeight: '500',
              color: isWinner ? '#b45309' : '#111827',
              margin: '0 0 4px 0',
            };

            const winnerBadgeStyle = {
              fontSize: '12px',
              fontWeight: '500',
              color: '#d97706',
              margin: '0',
            };

            const rightSideStyle = {
              textAlign: 'right' as const,
            };

            const pointsStyle = {
              fontSize: '18px',
              fontWeight: 'bold',
              color:
                item.position === 1
                  ? '#d97706'
                  : item.position === 2
                    ? '#6b7280'
                    : item.position === 3
                      ? '#ea580c'
                      : '#dc2626',
              margin: '0',
            };

            const pointsLabelStyle = {
              fontSize: '12px',
              color: '#9ca3af',
              margin: '0',
            };

            return (
              <div key={index} style={rowStyle}>
                <div style={leftSideStyle}>
                  <div style={positionBadgeStyle}>{item.position}°</div>

                  <div>
                    <div style={sectorNameStyle}>{item.setor}</div>
                    {isWinner && (
                      <div style={winnerBadgeStyle}>🏆 Vencedor</div>
                    )}
                  </div>
                </div>

                <div style={rightSideStyle}>
                  <div style={pointsStyle}>{item.pontos.toFixed(2)}</div>
                  <div style={pointsLabelStyle}>pontos</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <p>
          Gerado em {new Date().toLocaleDateString('pt-BR')} às{' '}
          {new Date().toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
        <p style={{ marginTop: '4px' }}>
          Sistema de Premiação - Viação Pioneira
        </p>
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

  const generateImage = async () => {
    setIsGenerating(true);

    try {
      console.log('🎯 Iniciando geração de imagem...');

      // Carregar html2canvas dinamicamente se não estiver disponível
      if (!window.html2canvas) {
        console.log('📦 Carregando html2canvas...');
        const html2canvas = await import('html2canvas');
        window.html2canvas = html2canvas.default;
      }

      const element = document.getElementById('ranking-share-image');
      if (!element) {
        throw new Error('Elemento não encontrado');
      }

      console.log('📋 Elemento encontrado:', element);
      console.log(
        '🎨 Estilos computados do elemento:',
        window.getComputedStyle(element)
      );

      // Log para verificar se há cores oklch
      const allElements = element.querySelectorAll('*');
      console.log(
        '🔍 Verificando cores oklch em',
        allElements.length,
        'elementos...'
      );

      let oklchFound = false;
      allElements.forEach((el, index) => {
        const styles = window.getComputedStyle(el);
        const colorProps = [
          'color',
          'backgroundColor',
          'borderColor',
          'borderTopColor',
          'borderRightColor',
          'borderBottomColor',
          'borderLeftColor',
        ];

        colorProps.forEach((prop) => {
          const value = styles.getPropertyValue(prop);
          if (value && value.includes('oklch')) {
            console.warn(`⚠️ OKLCH encontrado no elemento ${index}:`, {
              element: el.tagName,
              property: prop,
              value: value,
              className: el.className,
            });
            oklchFound = true;
          }
        });
      });

      if (oklchFound) {
        console.error('❌ Cores oklch foram encontradas! Tentando corrigir...');

        // Forçar re-render com um delay para garantir que os estilos sejam aplicados
        element.style.display = 'none';
        await new Promise((resolve) => setTimeout(resolve, 100));
        element.style.display = 'block';
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      console.log('🖼️ Iniciando captura com html2canvas...');

      const canvas = await window.html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2, // Alta qualidade
        useCORS: true,
        allowTaint: true,
        width: 600,
        height: element.scrollHeight,
        logging: true, // Ativar logs do html2canvas
        ignoreElements: (el) => {
          // Ignorar elementos que possam ter cores problemáticas
          const styles = window.getComputedStyle(el);
          const hasOklch = ['color', 'backgroundColor', 'borderColor'].some(
            (prop) => {
              const value = styles.getPropertyValue(prop);
              return value && value.includes('oklch');
            }
          );

          if (hasOklch) {
            console.warn('🚫 Ignorando elemento com oklch:', el);
            return true;
          }
          return false;
        },
        onclone: (clonedDoc) => {
          console.log('📄 Documento clonado para captura');

          // Forçar substituição de cores oklch no documento clonado
          const clonedElement = clonedDoc.getElementById('ranking-share-image');
          if (clonedElement) {
            // Aplicar estilos seguros recursivamente
            const applyFallbackStyles = (el: Element) => {
              if (el instanceof HTMLElement) {
                // Forçar cores seguras
                el.style.setProperty('color', '#111827', 'important');
                el.style.setProperty(
                  'background-color',
                  'transparent',
                  'important'
                );

                // Processar filhos
                Array.from(el.children).forEach(applyFallbackStyles);
              }
            };

            applyFallbackStyles(clonedElement);
          }
        },
      });

      console.log('✅ Imagem gerada com sucesso!', canvas);
      return canvas;
    } catch (error) {
      console.error('❌ Erro detalhado ao gerar imagem:', {
        error: error,
        message: error.message,
        stack: error.stack,
      });
      toast.error(`Erro ao gerar imagem: ${error.message}`);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  // Função para desenhar diretamente no canvas (sem CSS) - CORRIGIDA
  const generateImageDirectCanvas = async () => {
    setIsGenerating(true);

    try {
      console.log('🎨 Gerando imagem com canvas nativo...');
      console.log('📊 Dados do ranking:', rankingData);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Não foi possível criar contexto do canvas');
      }

      // Configurações do canvas (tamanho fixo inicial)
      const width = 600;
      const height = 400 + rankingData.length * 60; // Altura dinâmica

      canvas.width = width;
      canvas.height = height;

      console.log(`📐 Canvas criado: ${width}x${height}`);

      // Fundo branco
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      let y = 40;

      // LOGO E HEADER
      console.log('🎨 Desenhando header...');

      // Logo circular amarelo
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(300, y, 24, 0, 2 * Math.PI);
      ctx.fill();

      // Texto "VP" na logo
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('VP', 300, y);
      y += 50;

      // Título principal
      ctx.font = 'bold 28px Arial, sans-serif';
      ctx.fillStyle = '#111827';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('Viação Pioneira', 300, y);
      y += 35;

      // Subtítulo
      ctx.font = '20px Arial, sans-serif';
      ctx.fillStyle = '#374151';
      ctx.fillText('Resultado da Premiação por Desempenho', 300, y);
      y += 25;

      // Período
      ctx.font = '16px Arial, sans-serif';
      ctx.fillStyle = '#6b7280';
      ctx.fillText(formatPeriod(period.mesAno), 300, y);
      y += 30;

      // Linha separadora dourada
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(50, y);
      ctx.lineTo(550, y);
      ctx.stroke();
      y += 30;

      console.log('📋 Desenhando box de informações...');

      // BOX DE INFORMAÇÕES
      // Fundo do box
      ctx.fillStyle = '#fefce8';
      ctx.fillRect(50, y, 500, 50);

      // Borda do box
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1;
      ctx.strokeRect(50, y, 500, 50);

      // Informações do período
      ctx.textAlign = 'left';
      ctx.font = '14px Arial, sans-serif';
      ctx.fillStyle = '#374151';
      ctx.fillText(
        `📅 Período: ${formatDate(period.dataInicio)} - ${formatDate(period.dataFim)}`,
        70,
        y + 20
      );
      ctx.fillText('🏆 Status: Finalizada', 70, y + 35);
      y += 70;

      // TÍTULO DA TABELA
      ctx.font = 'bold 20px Arial, sans-serif';
      ctx.fillStyle = '#111827';
      ctx.textAlign = 'left';
      ctx.fillText('🏆 Classificação Final', 50, y);
      y += 35;

      console.log('📊 Desenhando tabela de ranking...');

      // HEADER DA TABELA
      ctx.fillStyle = '#f9fafb';
      ctx.fillRect(50, y, 500, 40);
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.strokeRect(50, y, 500, 40);

      ctx.font = 'bold 14px Arial, sans-serif';
      ctx.fillStyle = '#374151';
      ctx.textAlign = 'left';
      ctx.fillText('Pos.', 70, y + 25);
      ctx.fillText('Setor', 150, y + 25);
      ctx.textAlign = 'right';
      ctx.fillText('Pontuação', 520, y + 25);
      y += 40;

      // LINHAS DO RANKING
      rankingData.forEach((item, index) => {
        console.log(
          `🏅 Desenhando linha ${index + 1}: ${item.setor} - ${item.pontos.toFixed(2)} pontos`
        );

        const rowHeight = 55;
        const rowY = y + index * rowHeight;

        // Fundo da linha
        if (item.isWinner) {
          // Destaque para vencedor
          ctx.fillStyle = '#fefce8';
          ctx.fillRect(50, rowY, 500, rowHeight);

          // Borda esquerda dourada
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(50, rowY, 4, rowHeight);
        } else {
          // Fundo alternado
          ctx.fillStyle = index % 2 === 0 ? '#ffffff' : '#f9fafb';
          ctx.fillRect(50, rowY, 500, rowHeight);
        }

        // Borda inferior
        ctx.strokeStyle = '#f3f4f6';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(50, rowY + rowHeight);
        ctx.lineTo(550, rowY + rowHeight);
        ctx.stroke();

        // CÍRCULO DA POSIÇÃO
        const positionColors = {
          1: '#fbbf24',
          2: '#d1d5db',
          3: '#fed7aa',
          default: '#f3f4f6',
        };

        const textColors = {
          1: '#ffffff',
          2: '#374151',
          3: '#ea580c',
          default: '#6b7280',
        };

        const circleColor =
          positionColors[item.position as keyof typeof positionColors] ||
          positionColors.default;
        const circleTextColor =
          textColors[item.position as keyof typeof textColors] ||
          textColors.default;

        ctx.fillStyle = circleColor;
        ctx.beginPath();
        ctx.arc(85, rowY + 27, 18, 0, 2 * Math.PI);
        ctx.fill();

        // Número da posição
        ctx.fillStyle = circleTextColor;
        ctx.font = 'bold 14px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${item.position}°`, 85, rowY + 27);

        // NOME DO SETOR
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = 'bold 16px Arial, sans-serif';
        ctx.fillStyle = item.isWinner ? '#b45309' : '#111827';
        ctx.fillText(item.setor, 120, rowY + 18);

        // Badge "Vencedor" para o primeiro lugar
        if (item.isWinner) {
          ctx.font = '12px Arial, sans-serif';
          ctx.fillStyle = '#d97706';
          ctx.fillText('🏆 Vencedor', 120, rowY + 38);
        }

        // PONTUAÇÃO
        ctx.textAlign = 'right';
        ctx.font = 'bold 20px Arial, sans-serif';
        const pointColors = {
          1: '#d97706',
          2: '#6b7280',
          3: '#ea580c',
          default: '#dc2626',
        };
        ctx.fillStyle =
          pointColors[item.position as keyof typeof pointColors] ||
          pointColors.default;
        ctx.fillText(item.pontos.toFixed(2), 520, rowY + 22);

        // Label "pontos"
        ctx.font = '12px Arial, sans-serif';
        ctx.fillStyle = '#9ca3af';
        ctx.fillText('pontos', 520, rowY + 40);
      });

      console.log('📄 Desenhando footer...');

      // FOOTER
      const footerY = y + rankingData.length * 55 + 30;

      // Linha separadora
      ctx.strokeStyle = '#f3f4f6';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(50, footerY);
      ctx.lineTo(550, footerY);
      ctx.stroke();

      // Texto do footer
      ctx.textAlign = 'center';
      ctx.font = '12px Arial, sans-serif';
      ctx.fillStyle = '#9ca3af';
      ctx.textBaseline = 'top';
      const now = new Date();
      ctx.fillText(
        `Gerado em ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
        300,
        footerY + 15
      );
      ctx.fillText('Sistema de Premiação - Viação Pioneira', 300, footerY + 30);

      console.log('✅ Canvas desenhado com sucesso!');
      console.log(`📐 Tamanho final: ${canvas.width}x${canvas.height}`);

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

    // Usar diretamente o método que funciona
    const canvas = await generateImageDirectCanvas();

    if (!canvas) {
      toast.error('Não foi possível gerar a imagem');
      return;
    }

    // Converter para blob e fazer download
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
      1.0
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

      <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Share className='h-5 w-5 text-yellow-600' />
            Compartilhar Resultado da Premiação
          </DialogTitle>
          <DialogDescription>
            Gere uma imagem com o ranking final para compartilhar
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-6'>
          {/* Preview da imagem */}
          <div className='border rounded-lg overflow-hidden bg-gray-50'>
            <ShareableRankingImage period={period} rankingData={rankingData} />
          </div>

          {/* Botões de ação */}
          <div className='flex flex-wrap gap-3 justify-center'>
            <Button
              onClick={handleDownload}
              disabled={isGenerating}
              className='bg-yellow-600 hover:bg-yellow-700 text-white'
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
            >
              <Copy className='h-4 w-4 mr-2' />
              Copiar Imagem
            </Button>

            <Button
              variant='outline'
              onClick={handleShare}
              disabled={isGenerating}
            >
              <Share className='h-4 w-4 mr-2' />
              Compartilhar
            </Button>
          </div>

          {isGenerating && (
            <div className='text-center text-sm text-gray-600'>
              Gerando imagem...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
