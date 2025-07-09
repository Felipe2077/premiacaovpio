// apps/web/src/components/users/UserForm.tsx - LAYOUT CORRIGIDO
'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useSectorsData } from '@/hooks/useSectorsData';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CreateUserDto,
  Role,
  UpdateUserDto,
  UserDetail,
} from '@sistema-premiacao/shared-types';
import { Loader2, Save, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// Schema de validação
const userFormSchema = z.object({
  nome: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  email: z
    .string()
    .email('Email deve ter formato válido')
    .max(255, 'Email deve ter no máximo 255 caracteres'),
  password: z
    .string()
    .optional()
    .refine((val) => {
      if (val && val.length > 0) {
        return val.length >= 8;
      }
      return true;
    }, 'Senha deve ter pelo menos 8 caracteres'),
  role: z.nativeEnum(Role, {
    errorMap: () => ({ message: 'Função é obrigatória' }),
  }),
  sectorId: z.number().optional().nullable(),
  ativo: z.boolean().default(true),
  sendWelcomeEmail: z.boolean().default(true),
  justification: z
    .string()
    .min(10, 'Justificativa deve ter pelo menos 10 caracteres')
    .max(500, 'Justificativa deve ter no máximo 500 caracteres'),
});

type UserFormData = z.infer<typeof userFormSchema>;

interface UserFormProps {
  user?: UserDetail;
  isEditing?: boolean;
  onSubmit: (data: CreateUserDto | UpdateUserDto) => Promise<void>;
  isLoading?: boolean;
}

export function UserForm({
  user,
  isEditing = false,
  onSubmit,
  isLoading,
}: UserFormProps) {
  const router = useRouter();
  const { data: sectors, isLoading: isLoadingSectors } = useSectorsData();

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      nome: user?.nome || '',
      email: user?.email || '',
      password: '',
      role: user?.role || Role.VISUALIZADOR,
      sectorId: user?.sectorId || null,
      ativo: user?.ativo ?? true,
      sendWelcomeEmail: !isEditing,
      justification: '',
    },
  });

  const handleSubmit = async (data: UserFormData) => {
    try {
      if (isEditing) {
        const { password, sendWelcomeEmail, justification, ...updateData } =
          data;
        await onSubmit(updateData as UpdateUserDto);
      } else {
        const { justification, ...createData } = data;
        await onSubmit(createData as CreateUserDto);
      }
      router.push('/admin/users');
    } catch (error) {
      console.error('Erro no formulário:', error);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const roleOptions = [
    {
      value: Role.DIRETOR,
      label: 'Diretor',
      description: 'Acesso total ao sistema, incluindo gestão de usuários',
    },
    {
      value: Role.GERENTE,
      label: 'Gerente',
      description:
        'Acesso operacional, pode gerenciar expurgos e visualizar relatórios',
    },
    {
      value: Role.VISUALIZADOR,
      label: 'Visualizador',
      description: 'Apenas visualização de rankings e relatórios públicos',
    },
  ];

  return (
    <div className='max-w-4xl mx-auto'>
      <Card>
        <CardHeader>
          <CardTitle className='text-2xl'>
            {isEditing ? 'Editar Usuário' : 'Novo Usuário'}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? 'Atualize as informações do usuário. Campos obrigatórios estão marcados com *'
              : 'Preencha as informações para criar um novo usuário. Campos obrigatórios estão marcados com *'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className='space-y-8'
            >
              {/* SEÇÃO 1: INFORMAÇÕES BÁSICAS */}
              <div className='space-y-6'>
                <div className='border-b border-gray-200 pb-2'>
                  <h3 className='text-lg font-semibold text-gray-900'>
                    Informações Básicas
                  </h3>
                  <p className='text-sm text-gray-600'>
                    Dados pessoais e de contato do usuário
                  </p>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  {/* Nome Completo */}
                  <FormField
                    control={form.control}
                    name='nome'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-sm font-medium'>
                          Nome Completo *
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder='Digite o nome completo'
                            {...field}
                            disabled={isLoading}
                            className='h-10'
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Email */}
                  <FormField
                    control={form.control}
                    name='email'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-sm font-medium'>
                          Email *
                        </FormLabel>
                        <FormControl>
                          <Input
                            type='email'
                            placeholder='usuario@empresa.com'
                            {...field}
                            disabled={isLoading}
                            className='h-10'
                          />
                        </FormControl>
                        <FormDescription className='text-xs'>
                          {isEditing
                            ? 'Alterar o email pode afetar o acesso do usuário'
                            : 'Email será usado para login no sistema'}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Senha (apenas na criação) */}
                {!isEditing && (
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    <FormField
                      control={form.control}
                      name='password'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='text-sm font-medium'>
                            Senha
                          </FormLabel>
                          <FormControl>
                            <Input
                              type='password'
                              placeholder='Deixe vazio para gerar automaticamente'
                              {...field}
                              disabled={isLoading}
                              className='h-10'
                            />
                          </FormControl>
                          <FormDescription className='text-xs'>
                            Se não informada, uma senha temporária será gerada
                            automaticamente
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div></div> {/* Espaço vazio para manter o grid */}
                  </div>
                )}
              </div>

              {/* SEÇÃO 2: PERMISSÕES E ACESSO */}
              <div className='space-y-6'>
                <div className='border-b border-gray-200 pb-2'>
                  <h3 className='text-lg font-semibold text-gray-900'>
                    Permissões e Acesso
                  </h3>
                  <p className='text-sm text-gray-600'>
                    Defina o nível de acesso e setor do usuário
                  </p>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  {/* Função */}
                  <FormField
                    control={form.control}
                    name='role'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-sm font-medium'>
                          Função *
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={isLoading}
                        >
                          <FormControl>
                            <SelectTrigger className='h-10'>
                              <SelectValue placeholder='Selecione a função' />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roleOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                <div className='space-y-1'>
                                  <div className='font-medium'>
                                    {option.label}
                                  </div>
                                  <div className='text-xs text-gray-600'>
                                    {option.description}
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Setor */}
                  <FormField
                    control={form.control}
                    name='sectorId'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-sm font-medium'>
                          Setor
                        </FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(
                              value && value !== 'none' ? parseInt(value) : null
                            )
                          }
                          defaultValue={field.value?.toString() || 'none'}
                          disabled={isLoading || isLoadingSectors}
                        >
                          <FormControl>
                            <SelectTrigger className='h-10'>
                              <SelectValue placeholder='Selecione o setor (opcional)' />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value='none'>Nenhum setor</SelectItem>
                            {sectors?.map((sector) => (
                              <SelectItem
                                key={sector.id}
                                value={sector.id.toString()}
                              >
                                {sector.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription className='text-xs'>
                          Gerentes são limitados ao setor selecionado
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* SEÇÃO 3: CONFIGURAÇÕES DA CONTA */}
              <div className='space-y-6'>
                <div className='border-b border-gray-200 pb-2'>
                  <h3 className='text-lg font-semibold text-gray-900'>
                    Configurações da Conta
                  </h3>
                  <p className='text-sm text-gray-600'>
                    Status e preferências do usuário
                  </p>
                </div>

                <div className='space-y-4'>
                  {/* Conta Ativa */}
                  <FormField
                    control={form.control}
                    name='ativo'
                    render={({ field }) => (
                      <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                        <div className='space-y-0.5'>
                          <FormLabel className='text-base font-medium'>
                            Conta Ativa
                          </FormLabel>
                          <FormDescription className='text-sm'>
                            {field.value
                              ? 'Usuário pode fazer login no sistema'
                              : 'Usuário não pode fazer login no sistema'}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isLoading}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* Enviar Email de Boas-vindas (apenas na criação) */}
                  {!isEditing && (
                    <FormField
                      control={form.control}
                      name='sendWelcomeEmail'
                      render={({ field }) => (
                        <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                          <div className='space-y-0.5'>
                            <FormLabel className='text-base font-medium'>
                              Enviar Email de Boas-vindas
                            </FormLabel>
                            <FormDescription className='text-sm'>
                              Enviar email com informações de acesso para o
                              usuário
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={isLoading}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>

              {/* SEÇÃO 4: JUSTIFICATIVA */}
              <div className='space-y-6'>
                <div className='border-b border-gray-200 pb-2'>
                  <h3 className='text-lg font-semibold text-gray-900'>
                    Justificativa
                  </h3>
                  <p className='text-sm text-gray-600'>
                    Descreva o motivo da {isEditing ? 'alteração' : 'criação'}{' '}
                    deste usuário
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name='justification'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-sm font-medium'>
                        Justificativa para {isEditing ? 'alteração' : 'criação'}{' '}
                        *
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={`Descreva o motivo da ${isEditing ? 'alteração' : 'criação'} deste usuário...`}
                          {...field}
                          disabled={isLoading}
                          rows={4}
                          className='resize-none'
                        />
                      </FormControl>
                      <FormDescription className='text-xs'>
                        Esta informação será registrada nos logs de auditoria
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div className='flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200'>
                <Button
                  type='submit'
                  disabled={isLoading}
                  className='flex-1 sm:flex-none sm:min-w-[120px]'
                >
                  {isLoading ? (
                    <>
                      <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                      {isEditing ? 'Salvando...' : 'Criando...'}
                    </>
                  ) : (
                    <>
                      <Save className='h-4 w-4 mr-2' />
                      {isEditing ? 'Salvar Alterações' : 'Criar Usuário'}
                    </>
                  )}
                </Button>

                <Button
                  type='button'
                  variant='outline'
                  onClick={handleCancel}
                  disabled={isLoading}
                  className='flex-1 sm:flex-none sm:min-w-[120px]'
                >
                  <X className='h-4 w-4 mr-2' />
                  Cancelar
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
