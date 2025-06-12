// apps/web/src/app/login/page.tsx (CORRIGIDO - BASEADO NO SEU ORIGINAL)
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
import { useRouter, useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🎯 CORREÇÃO: Redirecionamento único - sem setTimeout
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      const redirectTo = searchParams.get('redirect') || '/admin';
      console.log(
        '✅ Usuário já autenticado, redirecionando para:',
        redirectTo
      );
      router.replace(redirectTo);
    }
  }, [isAuthenticated, authLoading, router, searchParams]);

  // Configurar formulário
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  // 🎯 CORREÇÃO: Submit sem setTimeout - deixar o useEffect cuidar do redirecionamento
  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);

    try {
      console.log('🔐 Tentando fazer login...');

      await login(data);

      toast.success('Login realizado com sucesso!', {
        description: 'Redirecionando para o painel administrativo...',
      });

      // 🎯 CORREÇÃO: REMOVER O setTimeout - o useEffect vai cuidar do redirecionamento
      // setTimeout(() => {
      //   window.location.href = '/admin';
      // }, 1000);
    } catch (error: any) {
      console.error('❌ Erro no login:', error);

      toast.error('Erro ao fazer login', {
        description:
          error.message || 'Verifique suas credenciais e tente novamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mostrar loading enquanto verifica autenticação inicial
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

  // Se já estiver autenticado, mostrar loading de redirecionamento
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
      <Card className='w-full max-w-md shadow-lg'>
        <CardHeader className='space-y-2 text-center'>
          <div className='mx-auto w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center'>
            <Lock className='h-6 w-6 text-white' />
          </div>
          <CardTitle className='text-2xl font-bold text-gray-900'>
            Entrar no Sistema
          </CardTitle>
          <CardDescription className='text-gray-600'>
            Digite suas credenciais para acessar o painel administrativo
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
                        <Mail className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
                        <Input
                          {...field}
                          type='email'
                          placeholder='seu@email.com'
                          className='pl-10 h-11'
                          disabled={isSubmitting}
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
                        <Lock className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
                        <Input
                          {...field}
                          type={showPassword ? 'text' : 'password'}
                          placeholder='Digite sua senha'
                          className='pl-10 pr-10 h-11'
                          disabled={isSubmitting}
                        />
                        <button
                          type='button'
                          onClick={() => setShowPassword(!showPassword)}
                          className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors'
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
                  <FormItem className='flex flex-row items-center space-x-2 space-y-0'>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormLabel className='text-sm text-gray-600 font-normal cursor-pointer'>
                      Manter-me conectado
                    </FormLabel>
                  </FormItem>
                )}
              />

              {/* Botão Submit */}
              <Button
                type='submit'
                className='w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors'
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
          </Form>

          {/* Links adicionais */}
          <div className='mt-6 text-center'>
            <a
              href='#'
              className='text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors'
            >
              Esqueceu sua senha?
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
