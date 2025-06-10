import { ArrowRight } from 'lucide-react';

// Mapeamento de chaves para nomes amigáveis
const friendlyNames: Record<string, string> = {
  sectorName: 'Setor',
  criterionName: 'Critério',
  dataEvento: 'Data do Evento',
  valorSolicitado: 'Valor Solicitado',
  valorAprovado: 'Valor Aprovado',
  originalSolicitante: 'Solicitante Original',
  percentualAprovacao: '% de Aprovação',
  periodMesAno: 'Período',
  valorNovo: 'Novo Valor',
  valorAntigo: 'Valor Antigo',
  nomeParametro: 'Nome do Parâmetro',
  baseValue: 'Valor Base',
  adjustmentPercentage: 'Ajuste',
  recalculatedValue: 'Valor Recalculado',
  finalValue: 'Valor Final',
  savedValue: 'Valor Salvo',
  calculationMethod: 'Método de Cálculo',
  fileName: 'Nome do Arquivo',
  fileSize: 'Tamanho (bytes)',
  mimeType: 'Tipo do Arquivo',
  expurgoId: 'ID do Expurgo',
  newVersion: 'Nova Versão',
  oldVersion: 'Versão Anterior',
};

// --- Componentes de Renderização Específicos ---

const DetailRow = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div className='text-sm grid grid-cols-10 gap-2 items-start py-2 border-b'>
    <strong className='col-span-4 lg:col-span-3 text-muted-foreground break-words'>
      {label}:
    </strong>
    <div className='col-span-6 lg:col-span-7 font-mono text-xs break-words bg-muted/50 p-1.5 rounded'>
      {String(value)}
    </div>
  </div>
);

const DiffRow = ({
  label,
  oldValue,
  newValue,
}: {
  label: string;
  oldValue: any;
  newValue: any;
}) => (
  <div className='text-sm grid grid-cols-10 gap-2 items-center py-2 border-b'>
    <strong className='col-span-4 lg:col-span-3 text-muted-foreground break-words'>
      {label}:
    </strong>
    <div className='col-span-6 lg:col-span-7 flex items-center gap-2 flex-wrap'>
      <span className='font-mono text-xs bg-red-100 text-red-800 p-1 rounded line-through'>
        {String(oldValue)}
      </span>
      <ArrowRight className='h-4 w-4 text-muted-foreground' />
      <span className='font-mono text-xs bg-green-100 text-green-800 p-1 rounded font-bold'>
        {String(newValue)}
      </span>
    </div>
  </div>
);

// Para logs simples (Expurgo, Anexo, etc.)
const SimpleLogRenderer = ({ data }: { data: any }) => (
  <div className='space-y-1'>
    {Object.entries(data).map(([key, value]) => (
      <DetailRow
        key={key}
        label={friendlyNames[key] || key}
        value={String(value)}
      />
    ))}
  </div>
);

// Para PARAMETRO_ALTERADO
const ParamChangeRenderer = ({ data }: { data: any }) => (
  <>
    <DetailRow label='Parâmetro' value={data.nomeParametro} />
    <DiffRow
      label='Valor'
      oldValue={data.valorAntigo}
      newValue={data.valorNovo}
    />
  </>
);

// Para META_VERSIONADA_TIMESTAMP
const MetaVersionRenderer = ({ data }: { data: any }) => (
  <div className='space-y-3'>
    <DiffRow
      label='Versão do Parâmetro'
      oldValue={data.oldVersion}
      newValue={data.newVersion}
    />
    <DetailRow
      label='Nome do Parâmetro'
      value={data.newParameter.nomeParametro}
    />
    <DiffRow
      label='Valor'
      oldValue={Number(data.newParameter.metadata.baseValue).toFixed(2)}
      newValue={data.newParameter.valor}
    />
    <DetailRow
      label='Método de Cálculo'
      value={data.newParameter.metadata.calculationMethod}
    />
    <DetailRow
      label='Ajuste Aplicado'
      value={`${data.newParameter.metadata.adjustmentPercentage}%`}
    />
  </div>
);

// Para todos os tipos de META_... com cálculo
const MetaCalculoRenderer = ({ data }: { data: any }) => {
  const finalValue =
    data.savedValue ?? data.recalculatedValue ?? data.appliedData?.finalValue;
  const baseValue =
    data.savedMetadata?.baseValue ?? data.newParameter?.metadata?.baseValue;
  const adjustment =
    data.savedMetadata?.adjustmentPercentage ??
    data.appliedData?.adjustmentPercentage;
  const method =
    data.savedMetadata?.calculationMethod ??
    data.appliedData?.calculationMethod;
  const justification =
    data.justification ||
    data.appliedData?.justificativa ||
    data.inputValue?.justificativa;

  return (
    <div className='space-y-3'>
      {justification && (
        <p className='text-sm bg-blue-50 p-3 rounded-md border border-blue-200'>
          {justification}
        </p>
      )}
      <DiffRow
        label='Cálculo do Valor'
        oldValue={Number(baseValue).toFixed(2)}
        newValue={finalValue}
      />
      <DetailRow label='Método Utilizado' value={method} />
      <DetailRow label='Ajuste Aplicado' value={`${adjustment}%`} />
    </div>
  );
};

// Fallback para qualquer outro formato
const DefaultLogRenderer = ({ data }: { data: any }) => (
  <pre className='text-xs bg-muted p-3 rounded-md max-w-full overflow-x-auto'>
    {JSON.stringify(data, null, 2)}
  </pre>
);

// --- Componente Principal "O Despachante" ---
export function LogDetailRenderer({ details }: { details: any }) {
  if (!details) {
    return (
      <p className='text-sm text-muted-foreground'>
        Sem detalhes técnicos para este evento.
      </p>
    );
  }

  // Etapa 1: Garantir que temos um objeto para trabalhar
  let parsedDetails = details;
  if (typeof details === 'string') {
    try {
      parsedDetails = JSON.parse(details);
    } catch (e) {
      return <DetailRow label='Dado Bruto (inválido)' value={details} />;
    }
  }

  // Etapa 2: "Despachante" - Decide qual renderizador usar com base no formato do JSON
  if (parsedDetails.valorNovo && parsedDetails.valorAntigo) {
    return <ParamChangeRenderer data={parsedDetails} />;
  }
  if (parsedDetails.newParameter && parsedDetails.oldVersion) {
    return <MetaVersionRenderer data={parsedDetails} />;
  }
  if (parsedDetails.savedMetadata || parsedDetails.inputValue) {
    return <MetaCalculoRenderer data={parsedDetails} />;
  }
  if (
    parsedDetails.sectorName ||
    parsedDetails.criterionName ||
    parsedDetails.fileName
  ) {
    return <SimpleLogRenderer data={parsedDetails} />;
  }

  // Se nenhum formato especial for detectado, mostra o JSON cru
  return <DefaultLogRenderer data={parsedDetails} />;
}
