// apps/web/src/app/login/page.tsx (CORRIGIDO - REDIRECIONAMENTO)
'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

// Schema de validação
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido')
    .toLowerCase(),
  password: z
    .string()
    .min(1, 'Senha é obrigatória')
    .min(6, 'Senha deve ter pelo menos 6 caracteres'),
  rememberMe: z.boolean().default(false),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirecionar se já estiver autenticado
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      // Força redirecionamento para evitar problemas de hidratação
      window.location.href = '/admin';
    }
  }, [isAuthenticated, authLoading]);

  // Configurar formulário
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  // Manipular submit do formulário
  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);

    try {
      await login(data);

      toast.success('Login realizado com sucesso!', {
        description: 'Redirecionando para o painel administrativo...',
      });

      // 🎯 REDIRECIONAMENTO FORÇADO - SOLUÇÃO PRINCIPAL
      setTimeout(() => {
        window.location.href = '/admin';
      }, 1000);
    } catch (error: any) {
      console.error('Erro no login:', error);

      toast.error('Erro ao fazer login', {
        description:
          error.message || 'Verifique suas credenciais e tente novamente.',
      });

      // Limpar apenas o campo de senha em caso de erro
      form.setValue('password', '');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading inicial (verificando auth) - SIMPLIFICADO
  if (authLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100'>
        <div className='flex flex-col items-center space-y-4'>
          <Loader2 className='h-8 w-8 animate-spin text-blue-600' />
          <p className='text-sm text-gray-600'>Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Se já estiver autenticado, mostrar loading simples
  if (isAuthenticated) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100'>
        <div className='flex flex-col items-center space-y-4'>
          <Loader2 className='h-8 w-8 animate-spin text-green-600' />
          <p className='text-sm text-gray-600'>Redirecionando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4'>
      <Card className='w-full max-w-md shadow-xl border-0'>
        <CardHeader className='space-y-1 text-center'>
          <div className='flex justify-center mb-4'>
            <div className='bg-blue-600 p-3 rounded-full'>
              <Lock className='h-6 w-6 text-white' />
            </div>
          </div>
          <CardTitle className='text-2xl font-bold text-gray-900'>
            Sistema de Premiação
          </CardTitle>
          <CardDescription className='text-gray-600'>
            Entre com suas credenciais para acessar o sistema
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
              {/* Campo Email */}
              <FormField
                control={form.control}
                name='email'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-sm font-medium text-gray-700'>
                      Email
                    </FormLabel>
                    <FormControl>
                      <div className='relative'>
                        <Mail className='absolute left-3 top-3 h-4 w-4 text-gray-400' />
                        <Input
                          {...field}
                          type='email'
                          placeholder='seu.email@empresa.com'
                          className='pl-10'
                          disabled={isSubmitting}
                          autoComplete='email'
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campo Senha */}
              <FormField
                control={form.control}
                name='password'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-sm font-medium text-gray-700'>
                      Senha
                    </FormLabel>
                    <FormControl>
                      <div className='relative'>
                        <Lock className='absolute left-3 top-3 h-4 w-4 text-gray-400' />
                        <Input
                          {...field}
                          type={showPassword ? 'text' : 'password'}
                          placeholder='••••••••'
                          className='pl-10 pr-10'
                          disabled={isSubmitting}
                          autoComplete='current-password'
                        />
                        <button
                          type='button'
                          onClick={() => setShowPassword(!showPassword)}
                          className='absolute right-3 top-3 text-gray-400 hover:text-gray-600'
                          disabled={isSubmitting}
                        >
                          {showPassword ? (
                            <EyeOff className='h-4 w-4' />
                          ) : (
                            <Eye className='h-4 w-4' />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Checkbox Lembrar */}
              <FormField
                control={form.control}
                name='rememberMe'
                render={({ field }) => (
                  <FormItem className='flex items-center space-x-2 space-y-0'>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormLabel className='text-sm text-gray-600 cursor-pointer'>
                      Lembrar de mim
                    </FormLabel>
                  </FormItem>
                )}
              />

              {/* Botão de Submit */}
              <Button
                type='submit'
                className='w-full bg-blue-600 hover:bg-blue-700 text-white'
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Entrando...
                  </>
                ) : (
                  'Entrar no Sistema'
                )}
              </Button>
            </form>
          </Form>

          {/* Informações adicionais */}
          <div className='mt-6 text-center space-y-2'>
            <p className='text-xs text-gray-500'>
              Esqueceu sua senha? Entre em contato com o administrador do
              sistema.
            </p>
            <div className='text-xs text-gray-400'>
              Sistema de Premiação V1.7 • Via Premiações
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
