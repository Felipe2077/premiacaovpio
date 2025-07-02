// apps/web/src/app/admin/users/components/UserForm.tsx
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

// Schema de validação baseado nos DTOs do sistema
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
        // Para edição, remover campos não necessários
        const { password, sendWelcomeEmail, justification, ...updateData } =
          data;
        await onSubmit(updateData as UpdateUserDto);
      } else {
        // Para criação, incluir todos os campos necessários
        const { justification, ...createData } = data;
        await onSubmit(createData as CreateUserDto);
      }

      // Navegar de volta após sucesso
      router.push('/admin/users');
    } catch (error) {
      // Erro já tratado pelos hooks de mutação
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
    <div className='max-w-2xl mx-auto space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Editar Usuário' : 'Novo Usuário'}</CardTitle>
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
              className='space-y-6'
            >
              {/* Informações básicas */}
              <div className='space-y-4'>
                <h3 className='text-lg font-medium'>Informações Básicas</h3>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name='nome'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder='Digite o nome completo'
                            {...field}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='email'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input
                            type='email'
                            placeholder='usuario@empresa.com'
                            {...field}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormDescription>
                          {isEditing
                            ? 'Alterar o email pode afetar o acesso do usuário'
                            : 'Email será usado para login no sistema'}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {!isEditing && (
                  <FormField
                    control={form.control}
                    name='password'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <Input
                            type='password'
                            placeholder='Deixe vazio para gerar automaticamente'
                            {...field}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormDescription>
                          Se não informada, uma senha temporária será gerada
                          automaticamente
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Permissões e acesso */}
              <div className='space-y-4'>
                <h3 className='text-lg font-medium'>Permissões e Acesso</h3>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name='role'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Função *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={isLoading}
                        >
                          <FormControl>
                            <SelectTrigger>
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

                  <FormField
                    control={form.control}
                    name='sectorId'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Setor</FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(value ? parseInt(value) : null)
                          }
                          defaultValue={field.value?.toString() || ''}
                          disabled={isLoading || isLoadingSectors}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder='Selecione o setor (opcional)' />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value=''>Nenhum setor</SelectItem>
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
                        <FormDescription>
                          Gerentes são limitados ao setor selecionado
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name='ativo'
                  render={({ field }) => (
                    <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                      <div className='space-y-0.5'>
                        <FormLabel className='text-base'>Conta Ativa</FormLabel>
                        <FormDescription>
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

                {!isEditing && (
                  <FormField
                    control={form.control}
                    name='sendWelcomeEmail'
                    render={({ field }) => (
                      <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                        <div className='space-y-0.5'>
                          <FormLabel className='text-base'>
                            Enviar Email de Boas-vindas
                          </FormLabel>
                          <FormDescription>
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

              {/* Justificativa */}
              <div className='space-y-4'>
                <h3 className='text-lg font-medium'>Justificativa</h3>

                <FormField
                  control={form.control}
                  name='justification'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Justificativa para {isEditing ? 'alteração' : 'criação'}{' '}
                        *
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={`Descreva o motivo da ${isEditing ? 'alteração' : 'criação'} deste usuário...`}
                          className='min-h-[100px]'
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormDescription>
                        Esta justificativa ficará registrada nos logs de
                        auditoria
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Botões de ação */}
              <div className='flex flex-col sm:flex-row gap-3 pt-6 border-t'>
                <Button
                  type='submit'
                  disabled={isLoading}
                  className='flex-1 sm:flex-none'
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
                  className='flex-1 sm:flex-none'
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
