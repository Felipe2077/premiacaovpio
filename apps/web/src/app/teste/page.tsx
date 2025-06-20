import { Trophy } from 'lucide-react';

// Mock data baseado na imagem fornecida
const mockData = [
  {
    setor: 'SÃO SEBASTIÃO',
    posicao: 1,
    pontuacao: 20.5,
    criterios: {
      ATRASO: { realizado: 314, meta: 550, percent: 57.09, pontos: 1.0 },
      'FURO POR ATRASO': { realizado: 0, meta: 0, percent: 100, pontos: 1.0 },
      'FURO DE VIAGEM': { realizado: 0, meta: 0, percent: 100, pontos: 1.0 },
      QUEBRA: { realizado: 9, meta: 227, percent: 3.96, pontos: 1.0 },
      DEFEITO: { realizado: 39, meta: 255, percent: 15.29, pontos: 1.0 },
      'FALTA FUNC': { realizado: 4, meta: 11, percent: 36.36, pontos: 1.0 },
      'ATESTADO FUNC': {
        realizado: 176,
        meta: 125.33,
        percent: 140.43,
        pontos: 1.5,
      },
      COLISÃO: { realizado: 19, meta: 21.17, percent: 89.76, pontos: 1.0 },
      'FALTA FROTA': { realizado: 0, meta: 0, percent: 100, pontos: 1.0 },
      IPK: {
        realizado: 1.51,
        meta: 1.55,
        percent: 97.42,
        pontos: 2.5,
        tipo: 'maior',
      },
      'MÉDIA KM/L': { realizado: 3.0, meta: 3.0, percent: 100, pontos: 1.5 },
      'KM OCIOSA': { realizado: 4.92, meta: 7.0, percent: 70.29, pontos: 1.0 },
      PEÇAS: { realizado: 202.425, meta: 213.331, percent: 94.89, pontos: 1.0 },
      PNEUS: { realizado: 65.988, meta: 101.737, percent: 64.86, pontos: 2.0 },
      COMBUSTÍVEL: {
        realizado: 447.54,
        meta: 431.62,
        percent: 103.69,
        pontos: 2.5,
      },
    },
  },
  {
    setor: 'PARANOÁ',
    posicao: 2,
    pontuacao: 22.5,
    criterios: {
      ATRASO: { realizado: 242, meta: 283, percent: 85.51, pontos: 1.5 },
      'FURO POR ATRASO': { realizado: 0, meta: 0, percent: 100, pontos: 2.0 },
      'FURO DE VIAGEM': { realizado: 0, meta: 0, percent: 100, pontos: 1.5 },
      QUEBRA: { realizado: 11, meta: 130, percent: 8.46, pontos: 1.5 },
      DEFEITO: { realizado: 27, meta: 139, percent: 19.42, pontos: 1.5 },
      'FALTA FUNC': { realizado: 8, meta: 8, percent: 100, pontos: 1.0 },
      'ATESTADO FUNC': {
        realizado: 124,
        meta: 184.33,
        percent: 67.27,
        pontos: 2.5,
      },
      COLISÃO: { realizado: 14, meta: 32.33, percent: 43.3, pontos: 2.0 },
      'FALTA FROTA': { realizado: 0, meta: 0, percent: 100, pontos: 1.0 },
      IPK: {
        realizado: 1.45,
        meta: 1.49,
        percent: 97.32,
        pontos: 1.5,
        tipo: 'maior',
      },
      'MÉDIA KM/L': { realizado: 3.06, meta: 3.0, percent: 102, pontos: 1.0 },
      'KM OCIOSA': { realizado: 5.04, meta: 7.0, percent: 72, pontos: 1.0 },
      PEÇAS: { realizado: 228.912, meta: 180.68, percent: 126.69, pontos: 2.5 },
      PNEUS: { realizado: 819, meta: 427.638, percent: 191.5, pontos: 1.0 },
      COMBUSTÍVEL: {
        realizado: 381.425,
        meta: 374.799,
        percent: 101.77,
        pontos: 1.0,
      },
    },
  },
  {
    setor: 'GAMA',
    posicao: 3,
    pontuacao: 25.0,
    criterios: {
      ATRASO: { realizado: 131, meta: 303, percent: 43.23, pontos: 2.0 },
      'FURO POR ATRASO': { realizado: 0, meta: 0, percent: 100, pontos: 1.5 },
      'FURO DE VIAGEM': { realizado: 0, meta: 0, percent: 100, pontos: 2.0 },
      QUEBRA: { realizado: 15, meta: 128, percent: 11.72, pontos: 2.5 },
      DEFEITO: { realizado: 74, meta: 350, percent: 21.14, pontos: 2.0 },
      'FALTA FUNC': { realizado: 4, meta: 5, percent: 80, pontos: 1.0 },
      'ATESTADO FUNC': {
        realizado: 132,
        meta: 126.67,
        percent: 104.21,
        pontos: 1.0,
      },
      COLISÃO: { realizado: 6, meta: 16, percent: 37.5, pontos: 1.5 },
      'FALTA FROTA': { realizado: 0, meta: 0, percent: 100, pontos: 1.0 },
      IPK: {
        realizado: 1.48,
        meta: 1.49,
        percent: 99.33,
        pontos: 1.0,
        tipo: 'maior',
      },
      'MÉDIA KM/L': { realizado: 2.88, meta: 3.0, percent: 96, pontos: 2.5 },
      'KM OCIOSA': { realizado: 6.5, meta: 8.0, percent: 81.25, pontos: 2.0 },
      PEÇAS: { realizado: 193.39, meta: 197.777, percent: 97.78, pontos: 1.5 },
      PNEUS: { realizado: 30.646, meta: 93.931, percent: 32.63, pontos: 1.5 },
      COMBUSTÍVEL: {
        realizado: 374.743,
        meta: 364.104,
        percent: 102.92,
        pontos: 2.0,
      },
    },
  },
  {
    setor: 'SANTA MARIA',
    posicao: 4,
    pontuacao: 29.5,
    criterios: {
      ATRASO: { realizado: 348, meta: 309, percent: 112.62, pontos: 2.5 },
      'FURO POR ATRASO': { realizado: 0, meta: 0, percent: 100, pontos: 2.5 },
      'FURO DE VIAGEM': { realizado: 0, meta: 0, percent: 100, pontos: 1.0 },
      QUEBRA: { realizado: 37, meta: 216, percent: 17.13, pontos: 2.0 },
      DEFEITO: { realizado: 85, meta: 474, percent: 17.93, pontos: 2.5 },
      'FALTA FUNC': { realizado: 0, meta: 11, percent: 0, pontos: 1.0 },
      'ATESTADO FUNC': {
        realizado: 252,
        meta: 221.67,
        percent: 113.68,
        pontos: 2.0,
      },
      COLISÃO: { realizado: 12, meta: 35, percent: 34.29, pontos: 2.5 },
      'FALTA FROTA': { realizado: 0, meta: 0, percent: 100, pontos: 1.0 },
      IPK: {
        realizado: 1.75,
        meta: 1.82,
        percent: 96.15,
        pontos: 2.0,
        tipo: 'maior',
      },
      'MÉDIA KM/L': { realizado: 2.72, meta: 3.0, percent: 90.67, pontos: 2.0 },
      'KM OCIOSA': { realizado: 7.85, meta: 9.0, percent: 87.22, pontos: 2.5 },
      PEÇAS: {
        realizado: 383.498,
        meta: 304.583,
        percent: 125.91,
        pontos: 2.0,
      },
      PNEUS: {
        realizado: 185.195,
        meta: 127.594,
        percent: 145.14,
        pontos: 2.5,
      },
      COMBUSTÍVEL: {
        realizado: 702.733,
        meta: 683.712,
        percent: 102.78,
        pontos: 1.5,
      },
    },
  },
];

// Função para obter cor baseada na pontuação
const getPontuacaoColor = (pontos) => {
  if (pontos === 1.0) return 'bg-green-500';
  if (pontos === 1.5) return 'bg-green-400';
  if (pontos === 2.0) return 'bg-yellow-500';
  if (pontos === 2.5) return 'bg-red-500';
  return 'bg-gray-400';
};

// Função para obter ícone de posição
const getPosicaoIcon = (posicao) => {
  if (posicao === 1) return <Trophy className='w-4 h-4 text-yellow-500' />;
  if (posicao === 2)
    return <span className='w-4 h-4 text-gray-400 font-bold'>2°</span>;
  if (posicao === 3)
    return <span className='w-4 h-4 text-amber-600 font-bold'>3°</span>;
  return <span className='w-4 h-4 text-gray-600 font-bold'>{posicao}°</span>;
};

// Função para formatar números
const formatNumber = (num) => {
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  if (num % 1 === 0) return num.toString();
  return num.toFixed(2);
};

// Componente de célula compacta
const CompactCell = ({ criterio, dados }) => {
  const colorClass = getPontuacaoColor(dados.pontos);

  return (
    <div className='text-center p-1'>
      {/* Valores principais */}
      <div className='mb-1 flex flex-row'>
        <div className='font-semibold'>
          <p className='text-[10px]'>Realizado:</p>
          {formatNumber(dados.realizado)}
        </div>
        <div className='text-gray-500 text-[10px]'>
          {formatNumber(dados.meta)}
        </div>
      </div>

      {/* Barra de progresso mini */}
      <div className='w-full bg-gray-200 rounded-full h-1 mb-1'>
        <div
          className={`h-1 rounded-full ${colorClass}`}
          style={{ width: `${Math.min(dados.pontos * 25, 100)}%` }}
        />
      </div>

      {/* Percentual e pontos */}
      <div className='text-[10px] space-y-0.5'>
        <div className='font-medium'>{dados.percent.toFixed(1)}%</div>
        <div
          className={`px-1 py-0.5 rounded text-white text-[9px] ${colorClass}`}
        >
          {dados.pontos}
        </div>
      </div>
    </div>
  );
};

const PerformanceTableOptimized = () => {
  // Extrair critérios únicos
  const criterios = Object.keys(mockData[0].criterios);

  return (
    <div className='w-full'>
      {/* Header */}
      <div className='mb-4'>
        <h2 className='text-xl font-bold text-gray-900 mb-2'>
          📈 Desempenho vs Meta - Competição por Setores
        </h2>
        <p className='text-sm text-gray-600'>
          Período: Abril/2025 - Dia 1° à 30° • Menor pontuação = Melhor posição
        </p>
      </div>

      {/* Tabela principal - layout fixo sem scroll */}
      <div className='border rounded-lg bg-white overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full min-w-max'>
            {/* Cabeçalho */}
            <thead className='bg-gray-50'>
              <tr>
                <th className='sticky left-0 bg-gray-50 px-3 py-2 text-left text-xs font-semibold text-gray-900 border-r'>
                  <div className='w-24'>SETOR</div>
                </th>
                {criterios.map((criterio) => (
                  <th
                    key={criterio}
                    className='px-1 py-2 text-center text-[10px] font-semibold text-gray-900 border-r min-w-[60px]'
                  >
                    <div className='transform -rotate-45 origin-center w-12 h-12 flex items-center justify-center'>
                      <span className='whitespace-nowrap'>{criterio}</span>
                    </div>
                  </th>
                ))}
                <th className='px-3 py-2 text-center text-xs font-semibold text-gray-900 bg-blue-50'>
                  <div className='w-16'>TOTAL</div>
                </th>
              </tr>
            </thead>

            {/* Corpo da tabela */}
            <tbody className='divide-y divide-gray-200'>
              {mockData.map((setor) => (
                <tr
                  key={setor.setor}
                  className={`${setor.posicao === 1 ? 'bg-green-50' : ''} hover:bg-gray-50`}
                >
                  {/* Coluna do setor (fixa) */}
                  <td className='sticky left-0 bg-white px-3 py-2 border-r'>
                    <div className='flex items-center gap-2'>
                      {getPosicaoIcon(setor.posicao)}
                      <div>
                        <div className='font-semibold text-sm'>
                          {setor.setor}
                        </div>
                        <div className='text-xs text-gray-500'>
                          {setor.posicao}° lugar
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Colunas dos critérios */}
                  {criterios.map((criterio) => (
                    <td key={criterio} className='px-1 py-2 border-r'>
                      <CompactCell
                        criterio={criterio}
                        dados={setor.criterios[criterio]}
                      />
                    </td>
                  ))}

                  {/* Coluna de pontuação total */}
                  <td className='px-3 py-2 text-center bg-blue-50'>
                    <div className='font-bold text-lg'>{setor.pontuacao}</div>
                    <div className='text-xs text-gray-600'>pontos</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legenda compacta */}
      <div className='mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs'>
        <div className='flex items-center gap-2'>
          <div className='w-3 h-3 bg-green-500 rounded'></div>
          <span>1.0 pts - Excelente</span>
        </div>
        <div className='flex items-center gap-2'>
          <div className='w-3 h-3 bg-green-400 rounded'></div>
          <span>1.5 pts - Bom</span>
        </div>
        <div className='flex items-center gap-2'>
          <div className='w-3 h-3 bg-yellow-500 rounded'></div>
          <span>2.0 pts - Atenção</span>
        </div>
        <div className='flex items-center gap-2'>
          <div className='w-3 h-3 bg-red-500 rounded'></div>
          <span>2.5 pts - Crítico</span>
        </div>
      </div>

      {/* Nota sobre a estrutura */}
      <div className='mt-2 text-xs text-gray-600 bg-gray-50 p-3 rounded'>
        <strong>Formato:</strong> Realizado / Meta • % Atingimento • Pontos
        (menor = melhor)
      </div>
    </div>
  );
};

export default PerformanceTableOptimized;
