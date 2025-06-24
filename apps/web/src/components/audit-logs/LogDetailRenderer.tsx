// apps/web/src/components/audit-logs/LogDetailRenderer.tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertCircle,
  ArrowRight,
  Calculator,
  Calendar,
  Clock,
  Database,
  FileText,
  Hash,
  Info,
  MapPin,
  Percent,
  Target,
  Trash2,
  User,
} from 'lucide-react';

// Mapeamento de chaves para nomes amigáveis e ícones - CORRIGIDO
const fieldConfig: Record<
  string,
  {
    label: string;
    icon: React.ElementType;
    type:
      | 'text'
      | 'number'
      | 'percentage'
      | 'date'
      | 'boolean'
      | 'calculation'
      | 'status';
    category:
      | 'location'
      | 'numeric'
      | 'calculation'
      | 'meta'
      | 'user'
      | 'system'
      | 'status';
  }
> = {
  // Localização
  sectorName: {
    label: 'Setor',
    icon: MapPin,
    type: 'text',
    category: 'location',
  },
  setorNome: {
    label: 'Setor',
    icon: MapPin,
    type: 'text',
    category: 'location',
  },

  // ===  CAMPOS DE AGENDAMENTO E AUTOMAÇÃO ===
  scheduleName: {
    label: 'Nome do Agendamento',
    icon: FileText,
    type: 'text',
    category: 'system',
  },
  cronExpression: {
    label: 'Expressão Cron',
    icon: Clock,
    type: 'text',
    category: 'system',
  },
  nextRunAt: {
    label: 'Próxima Execução',
    icon: Calendar,
    type: 'date',
    category: 'system',
  },
  jobId: {
    label: 'ID do Job',
    icon: Hash,
    type: 'text',
    category: 'system',
  },
  executionCount: {
    label: 'Contador de Execuções',
    icon: Hash,
    type: 'number',
    category: 'system',
  },
  triggeredBy: {
    label: 'Disparado Por',
    icon: User,
    type: 'text',
    category: 'user',
  },
  rawRecords: {
    label: 'Registros Processados',
    icon: Database,
    type: 'number',
    category: 'numeric',
  },
  deletedRecords: {
    label: 'Registros Antigos Apagados',
    icon: Trash2,
    type: 'number',
    category: 'numeric',
  },
  executionTimeMs: {
    label: 'Tempo de Execução (ms)',
    icon: Clock,
    type: 'number',
    category: 'numeric',
  },

  // Critérios e Metas
  criterionName: {
    label: 'Critério',
    icon: Target,
    type: 'text',
    category: 'meta',
  },
  criterioNome: {
    label: 'Critério',
    icon: Target,
    type: 'text',
    category: 'meta',
  },
  nomeParametro: {
    label: 'Nome da Meta',
    icon: FileText,
    type: 'text',
    category: 'meta',
  },

  // Datas
  dataEvento: {
    label: 'Data do Evento',
    icon: Calendar,
    type: 'date',
    category: 'system',
  },
  periodMesAno: {
    label: 'Período',
    icon: Calendar,
    type: 'text',
    category: 'system',
  },

  // Valores Numéricos (SEM formatação de moeda)
  valorSolicitado: {
    label: 'Valor Solicitado',
    icon: Hash,
    type: 'number',
    category: 'numeric',
  },
  valorAprovado: {
    label: 'Valor Aprovado',
    icon: Hash,
    type: 'number',
    category: 'numeric',
  },
  valorNovo: {
    label: 'Novo Valor',
    icon: Hash,
    type: 'number',
    category: 'numeric',
  },
  valorAntigo: {
    label: 'Valor Anterior',
    icon: Hash,
    type: 'number',
    category: 'numeric',
  },
  finalValue: {
    label: 'Valor Final',
    icon: Hash,
    type: 'number',
    category: 'numeric',
  },
  savedValue: {
    label: 'Valor Salvo',
    icon: Hash,
    type: 'number',
    category: 'numeric',
  },
  baseValue: {
    label: 'Valor Base',
    icon: Calculator,
    type: 'number',
    category: 'calculation',
  },
  recalculatedValue: {
    label: 'Valor Recalculado',
    icon: Calculator,
    type: 'number',
    category: 'calculation',
  },
  valor: { label: 'Valor', icon: Hash, type: 'number', category: 'numeric' },

  // Novos campos identificados
  newVersion: {
    label: 'Nova Versão',
    icon: Info,
    type: 'number',
    category: 'meta',
  },
  oldVersion: {
    label: 'Versão Anterior',
    icon: Info,
    type: 'number',
    category: 'meta',
  },
  oldParameterId: {
    label: 'ID Meta Anterior',
    icon: Database,
    type: 'text',
    category: 'system',
  },
  changeTimestamp: {
    label: 'Timestamp da Mudança',
    icon: Clock,
    type: 'date',
    category: 'system',
  },
  criterionId: {
    label: 'ID do Critério',
    icon: Target,
    type: 'number',
    category: 'meta',
  },
  sectorId: {
    label: 'ID do Setor',
    icon: MapPin,
    type: 'number',
    category: 'location',
  },
  competitionPeriodId: {
    label: 'ID do Período',
    icon: Calendar,
    type: 'text',
    category: 'meta',
  },
  dataInicioEfetivo: {
    label: 'Início da Vigência',
    icon: Calendar,
    type: 'date',
    category: 'meta',
  },
  dataFimEfetivo: {
    label: 'Fim da Vigência',
    icon: Calendar,
    type: 'date',
    category: 'meta',
  },
  createdAt: {
    label: 'Criado em',
    icon: Clock,
    type: 'date',
    category: 'system',
  },
  versao: { label: 'Versão', icon: Info, type: 'number', category: 'meta' },

  // Flags booleanas
  wasRounded: {
    label: 'Foi Arredondado',
    icon: Calculator,
    type: 'boolean',
    category: 'calculation',
  },
  previewOnly: {
    label: 'Apenas Preview',
    icon: Info,
    type: 'boolean',
    category: 'system',
  },
  saveAsDefault: {
    label: 'Salvar como Padrão',
    icon: Info,
    type: 'boolean',
    category: 'system',
  },

  // Configurações de arredondamento
  roundingMethod: {
    label: 'Método de Arredondamento',
    icon: Calculator,
    type: 'text',
    category: 'calculation',
  },
  roundingDecimalPlaces: {
    label: 'Casas Decimais',
    icon: Hash,
    type: 'number',
    category: 'calculation',
  },

  // Percentuais
  percentualAprovacao: {
    label: '% de Aprovação',
    icon: Percent,
    type: 'percentage',
    category: 'numeric',
  },
  adjustmentPercentage: {
    label: 'Ajuste Aplicado',
    icon: Percent,
    type: 'percentage',
    category: 'calculation',
  },

  // Usuários
  originalSolicitante: {
    label: 'Solicitante Original',
    icon: User,
    type: 'text',
    category: 'user',
  },

  // Cálculos
  calculationMethod: {
    label: 'Método de Cálculo',
    icon: Calculator,
    type: 'calculation',
    category: 'calculation',
  },

  // Sistema
  fileName: {
    label: 'Nome do Arquivo',
    icon: FileText,
    type: 'text',
    category: 'system',
  },
  fileSize: {
    label: 'Tamanho (bytes)',
    icon: Info,
    type: 'number',
    category: 'system',
  },
  mimeType: {
    label: 'Tipo do Arquivo',
    icon: FileText,
    type: 'text',
    category: 'system',
  },
  expurgoId: {
    label: 'ID do Expurgo',
    icon: Database,
    type: 'text',
    category: 'system',
  },
  newVersion: {
    label: 'Nova Versão',
    icon: Info,
    type: 'text',
    category: 'system',
  },
  oldVersion: {
    label: 'Versão Anterior',
    icon: Info,
    type: 'text',
    category: 'system',
  },
};

// Função para formatar valores baseado no tipo - CORRIGIDA
const formatValue = (value: any, type: string): string => {
  if (value === null || value === undefined) return 'N/A';

  switch (type) {
    case 'number':
      // Formatação numérica simples, sem moeda, sem decimais desnecessários
      const num = Number(value);
      return num % 1 === 0
        ? num.toLocaleString('pt-BR')
        : num.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
    case 'percentage':
      return `${Number(value).toFixed(2)}%`;
    case 'date':
      try {
        return new Date(value).toLocaleDateString('pt-BR');
      } catch {
        return String(value);
      }
    case 'boolean':
      return value ? 'Sim' : 'Não';
    case 'calculation':
      const methodLabels: Record<string, string> = {
        media3: 'Média dos últimos 3 meses',
        media6: 'Média dos últimos 6 meses',
        ultimo: 'Último valor realizado',
        melhor3: 'Melhor valor dos últimos 3 meses',
        manual: 'Valor definido manualmente',
      };
      return methodLabels[value] || String(value);
    default:
      return String(value);
  }
};

// Função para obter cor da categoria - SIMPLIFICADA
const getCategoryColor = (category: string): string => {
  const colors = {
    location: 'bg-blue-50 text-blue-700 border-blue-200',
    numeric: 'bg-green-50 text-green-700 border-green-200',
    calculation: 'bg-purple-50 text-purple-700 border-purple-200',
    meta: 'bg-orange-50 text-orange-700 border-orange-200',
    user: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    system: 'bg-gray-50 text-gray-700 border-gray-200',
    status: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  };
  return colors[category as keyof typeof colors] || colors.system;
};

// Componente compacto para renderizar um campo - OTIMIZADO
const CompactField = ({
  fieldKey,
  value,
  config,
}: {
  fieldKey: string;
  value: any;
  config: (typeof fieldConfig)[string];
}) => {
  const Icon = config.icon;
  const formattedValue = formatValue(value, config.type);

  return (
    <div className='flex items-center gap-2 py-1'>
      <Icon className='h-3 w-3 text-muted-foreground flex-shrink-0' />
      <span className='text-xs text-muted-foreground min-w-0 flex-shrink-0'>
        {config.label}:
      </span>
      <span className='text-sm font-mono bg-muted/50 px-1.5 py-0.5 rounded text-foreground font-medium'>
        {formattedValue}
      </span>
    </div>
  );
};

// Componente para comparação otimizada
const CompactComparison = ({
  label,
  oldValue,
  newValue,
  type = 'number',
}: {
  label: string;
  oldValue: any;
  newValue: any;
  type?: string;
}) => {
  const formattedOld = formatValue(oldValue, type);
  const formattedNew = formatValue(newValue, type);

  return (
    <div className='bg-orange-50 border border-orange-200 rounded-lg p-3'>
      <h4 className='text-sm font-medium mb-2 flex items-center gap-2'>
        <ArrowRight className='h-4 w-4' />
        {label}
      </h4>
      <div className='flex items-center gap-3'>
        <div className='text-center flex-1'>
          <span className='font-mono text-xs bg-red-100 text-red-700 px-2 py-1 rounded'>
            {formattedOld}
          </span>
        </div>
        <ArrowRight className='h-3 w-3 text-muted-foreground flex-shrink-0' />
        <div className='text-center flex-1'>
          <span className='font-mono text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold'>
            {formattedNew}
          </span>
        </div>
      </div>
    </div>
  );
};

interface LogDetailRendererProps {
  details?: Record<string, any>;
}

export function LogDetailRenderer({ log }: LogDetailRendererProps) {
  // Extraímos 'details' e 'actionType' do log
  const { details, actionType } = log;

  if (!details || Object.keys(details).length === 0) {
    return (
      <div className='text-center py-4 text-muted-foreground'>
        <Info className='h-6 w-6 mx-auto mb-2 opacity-50' />
        <p className='text-sm'>
          Nenhum detalhe técnico disponível para este evento.
        </p>
      </div>
    );
  }

  // --- INÍCIO DO BLOCO DE RENDERIZAÇÃO CUSTOMIZADA ---
  // Um 'switch' para tratar os casos especiais antes da lógica genérica.
  switch (actionType) {
    // --- Casos de Gestão de Usuário ---
    case 'DELETE_USER': {
      const user = details.userDeactivated; // Nome do campo conforme o log
      return (
        <p>
          O usuário <strong>{user.nome}</strong> (Email: {user.email}) foi
          permanentemente removido do sistema.
        </p>
      );
    }
    case 'UPDATE_USER': {
      return (
        <div className='space-y-3'>
          <p>
            Foram submetidos os seguintes dados para atualização do usuário:
          </p>
          <Card>
            <CardContent className='pt-4 space-y-1'>
              {Object.entries(details.newData).map(([key, value]) => {
                const config = fieldConfig[key];
                const displayConfig = config || {
                  label: key.charAt(0).toUpperCase() + key.slice(1),
                  icon: Info,
                  type: 'text',
                };
                return (
                  <CompactField
                    key={key}
                    fieldKey={key}
                    value={value}
                    config={displayConfig}
                  />
                );
              })}
            </CardContent>
          </Card>
        </div>
      );
    }
    case 'CREATE_USER': {
      const user = details.userCreated;
      return (
        <div className='space-y-2'>
          <p>Um novo usuário foi criado no sistema:</p>
          <ul className='list-disc list-inside pl-4 text-sm text-muted-foreground'>
            {user.nome && (
              <li>
                <strong>Nome:</strong> {user.nome}
              </li>
            )}
            {user.email && (
              <li>
                <strong>Email:</strong> {user.email}
              </li>
            )}
            {user.role && (
              <li>
                <strong>Função:</strong> {user.role}
              </li>
            )}
          </ul>
        </div>
      );
    }
    case 'RESET_USER_PASSWORD': {
      const user = details.targetUser;
      return (
        <p>
          A senha do usuário <strong>{user.nome}</strong> foi resetada.
        </p>
      );
    }
    case 'DEACTIVATE_USER':
    case 'ACTIVATE_USER': {
      const user = details.targetUser;
      const actionText =
        actionType === 'ACTIVATE_USER' ? 'ativada' : 'desativada';
      return (
        <p>
          A conta do usuário <strong>{user.nome}</strong> foi{' '}
          <strong
            className={
              actionText === 'ativada' ? 'text-green-600' : 'text-red-600'
            }
          >
            {actionText}
          </strong>
          .
        </p>
      );
    }

    // --- Casos de Agendamento ---
    case 'SCHEDULE_DELETED':
      return (
        <p>
          O agendamento chamado{' '}
          <strong>"{details.scheduleName || `ID ${log.entityId}`}"</strong> foi
          removido do sistema.
        </p>
      );
    case 'SCHEDULE_CREATED':
      return (
        <div className='space-y-2'>
          <p>Um novo agendamento foi criado:</p>
          <ul className='list-disc list-inside pl-4 text-sm text-muted-foreground'>
            {details.scheduleName && (
              <li>
                <strong>Nome:</strong> {details.scheduleName}
              </li>
            )}
            {details.jobType && (
              <li>
                <strong>Tipo:</strong> {details.jobType}
              </li>
            )}
          </ul>
        </div>
      );
    case 'SCHEDULED_JOB_EXECUTED':
      return (
        <p>
          O job agendado <strong>"{details.scheduleName}"</strong> foi
          executado.
        </p>
      );

    // --- Casos de Automação ---
    case 'ETL_INICIADO':
    case 'RECALCULO_INICIADO': {
      const isEtl = actionType === 'ETL_INICIADO';
      const title = isEtl ? 'Atualização Completa' : 'Recálculo';
      return (
        <p>
          O processo de <strong>{title}</strong> foi iniciado para a vigência{' '}
          <strong>{details.periodMesAno}</strong>.
        </p>
      );
    }
    case 'ETL_CONCLUIDO': {
      const etlSeconds = (details.executionTimeMs / 1000)
        .toFixed(2)
        .replace('.', ',');
      return (
        <p>
          A <strong>Atualização Completa</strong> foi concluída em{' '}
          <strong>{etlSeconds} segundos</strong>.
        </p>
      );
    }
    case 'RECALCULO_CONCLUIDO': {
      const recalcSeconds = (details.executionTimeMs / 1000)
        .toFixed(2)
        .replace('.', ',');
      return (
        <p>
          O <strong>Recálculo</strong> foi concluído em{' '}
          <strong>{recalcSeconds} segundos</strong>.
        </p>
      );
    }

    default:
      break;
  }
  // --- FIM DO BLOCO DE RENDERIZAÇÃO CUSTOMIZADA ---

  // ▼ LÓGICA ORIGINAL (PARA TODOS OS OUTROS EVENTOS) ▼
  const hasComparison =
    details.valorAntigo !== undefined && details.valorNovo !== undefined;
  const comparisonFields = hasComparison ? ['valorAntigo', 'valorNovo'] : [];

  const categorizedFields: Record<
    string,
    Array<{ key: string; value: any; config: (typeof fieldConfig)[string] }>
  > = {
    location: [],
    numeric: [],
    calculation: [],
    meta: [],
    user: [],
    system: [],
  };

  Object.entries(details).forEach(([key, value]) => {
    if (comparisonFields.includes(key)) return;
    const config = fieldConfig[key];
    if (config) {
      categorizedFields[config.category].push({ key, value, config });
    } else {
      categorizedFields.system.push({
        key,
        value,
        config: {
          label:
            key.charAt(0).toUpperCase() +
            key.slice(1).replace(/([A-Z])/g, ' $1'),
          icon: Info,
          type: 'text',
          category: 'system',
        },
      });
    }
  });

  const nonEmptyCategories = Object.entries(categorizedFields).filter(
    ([, fields]) => fields.length > 0
  );
  const totalFields = nonEmptyCategories.reduce(
    (acc, [, fields]) => acc + fields.length,
    0
  );
  const isCompact = totalFields <= 6;

  return (
    <div className='space-y-3'>
      {hasComparison && (
        <CompactComparison
          label='Alteração de Valor'
          oldValue={details.valorAntigo}
          newValue={details.valorNovo}
        />
      )}
      {isCompact ? (
        <div className='space-y-2'>
          {nonEmptyCategories.map(([, fields]) =>
            fields.map(({ key, value, config }) => (
              <CompactField
                key={key}
                fieldKey={key}
                value={value}
                config={config}
              />
            ))
          )}
        </div>
      ) : (
        nonEmptyCategories.map(([category, fields]) => {
          const categoryLabels: Record<
            string,
            { title: string; description: string; icon: React.ElementType }
          > = {
            location: {
              title: 'Localização',
              description: 'Setor e localização',
              icon: MapPin,
            },
            numeric: {
              title: 'Valores',
              description: 'Valores numéricos',
              icon: Hash,
            },
            calculation: {
              title: 'Cálculo',
              description: 'Métodos e processamento',
              icon: Calculator,
            },
            meta: {
              title: 'Meta',
              description: 'Metas e critérios',
              icon: Target,
            },
            user: {
              title: 'Usuários',
              description: 'Informações de usuários',
              icon: User,
            },
            system: {
              title: 'Sistema',
              description: 'Dados técnicos',
              icon: Database,
            },
          };
          const categoryInfo = categoryLabels[category];
          if (!categoryInfo) return null;
          const CategoryIcon = categoryInfo.icon;
          return (
            <Card key={category} className='border-l-4'>
              <CardHeader className='pb-2'>
                <CardTitle className='text-sm flex items-center gap-2'>
                  <CategoryIcon className='h-4 w-4' />
                  {categoryInfo.title}
                </CardTitle>
                <CardDescription className='text-xs'>
                  {categoryInfo.description}
                </CardDescription>
              </CardHeader>
              <CardContent className='pt-0'>
                <div className='space-y-1'>
                  {fields.map(({ key, value, config }) => (
                    <CompactField
                      key={key}
                      fieldKey={key}
                      value={value}
                      config={config}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
      {process.env.NODE_ENV === 'development' &&
        Object.keys(details).some(
          (key) => !fieldConfig[key] && !comparisonFields.includes(key)
        ) && (
          <Card className='border-dashed border-gray-300'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm flex items-center gap-2'>
                <AlertCircle className='h-4 w-4' />
                Debug - Campos Não Mapeados
              </CardTitle>
            </CardHeader>
            <CardContent className='pt-0'>
              <pre className='text-xs bg-muted/50 p-2 rounded overflow-auto max-h-20 font-mono'>
                {JSON.stringify(
                  Object.fromEntries(
                    Object.entries(details).filter(
                      ([key]) =>
                        !fieldConfig[key] && !comparisonFields.includes(key)
                    )
                  ),
                  null,
                  2
                )}
              </pre>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
