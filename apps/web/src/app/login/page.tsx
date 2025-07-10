// apps/web/src/app/login/page.tsx (REDESIGN COMPLETO)
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
import {
  ArrowRight,
  Award,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  Shield,
  TrendingUp,
  Zap,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

// Schema de validação (mantido igual)
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

  // Redirecionamento (mantido igual)
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

  // Configurar formulário (mantido igual)
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  // Submit handler (mantido igual)
  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);

    try {
      await login(data);

      toast.success('Login realizado com sucesso!', {
        description: 'Redirecionando para o painel administrativo...',
      });
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

  // Loading states (atualizados com nova identidade visual)
  if (authLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50'>
        <div className='flex flex-col items-center space-y-4'>
          <div className='relative'>
            <div className='w-12 h-12 border-4 border-amber-200 rounded-full animate-spin border-t-amber-500'></div>
            <div className='absolute inset-0 flex items-center justify-center'>
              <Award className='h-5 w-5 text-amber-600 animate-pulse' />
            </div>
          </div>
          <p className='text-sm text-amber-700 font-medium'>
            Verificando autenticação...
          </p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50'>
        <div className='flex flex-col items-center space-y-4'>
          <div className='relative'>
            <div className='w-12 h-12 border-4 border-green-200 rounded-full animate-spin border-t-green-500'></div>
            <div className='absolute inset-0 flex items-center justify-center'>
              <TrendingUp className='h-5 w-5 text-green-600 animate-pulse' />
            </div>
          </div>
          <p className='text-sm text-green-700 font-medium'>
            Redirecionando...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen relative overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900'>
      {/* Background Pattern */}
      <div className='absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-amber-500/10 to-orange-500/5'></div>

      {/* Animated Background Elements */}
      <div className='absolute top-20 left-20 w-72 h-72 bg-yellow-500/10 rounded-full blur-3xl animate-pulse'></div>
      <div className='absolute bottom-20 right-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse delay-1000'></div>
      <div className='absolute top-1/2 left-1/3 w-48 h-48 bg-orange-500/10 rounded-full blur-2xl animate-pulse delay-500'></div>

      {/* Floating Icons */}
      <div className='absolute top-32 right-32 opacity-20'>
        <Award
          className='h-8 w-8 text-yellow-400 animate-bounce'
          style={{ animationDelay: '0s' }}
        />
      </div>
      <div className='absolute bottom-40 left-40 opacity-20'>
        <Zap
          className='h-6 w-6 text-amber-400 animate-bounce'
          style={{ animationDelay: '1s' }}
        />
      </div>
      <div className='absolute top-40 left-20 opacity-20'>
        <TrendingUp
          className='h-7 w-7 text-orange-400 animate-bounce'
          style={{ animationDelay: '2s' }}
        />
      </div>

      <div className='relative min-h-screen flex items-center justify-center p-4'>
        <div className='w-full max-w-md'>
          {/* Logo e Header */}
          <div className='text-center mb-6'>
            <div className='flex justify-center mb-4'>
              <div className='relative'>
                <div className='absolute inset-0 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-2xl blur-xl opacity-30 animate-pulse'></div>
                <div className='relative bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 shadow-2xl'>
                  <Image
                    src='/logo.png'
                    alt='Viação Pioneira'
                    width={160}
                    height={45}
                    className='h-10 w-auto mx-auto'
                    priority
                  />
                </div>
              </div>
            </div>

            <div className='space-y-1'>
              <h1 className='text-2xl font-bold text-white bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent'>
                Sistema de Premiação
              </h1>
              <p className='text-neutral-300 text-sm'>
                Viação Pioneira - Gestão de Performance
              </p>
            </div>
          </div>

          {/* Card de Login */}
          <Card className='bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl shadow-black/20'>
            <CardHeader className='space-y-2 text-center pb-4'>
              <div className='mx-auto w-12 h-12 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/25'>
                <Shield className='h-6 w-6 text-neutral-900' />
              </div>
              <div>
                <CardTitle className='text-xl font-bold text-white'>
                  Acesso Administrativo
                </CardTitle>
                <CardDescription className='text-neutral-300 text-sm'>
                  Digite suas credenciais para acessar o painel
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className='space-y-4'>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className='space-y-4'
                >
                  {/* Campo Email */}
                  <FormField
                    control={form.control}
                    name='email'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-sm font-medium text-neutral-200'>
                          Email
                        </FormLabel>
                        <FormControl>
                          <div className='relative group'>
                            <Mail className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400 group-focus-within:text-yellow-400 transition-colors' />
                            <Input
                              {...field}
                              type='email'
                              placeholder='seu.email@exemplo.com'
                              className='pl-10 bg-white/10 border-white/20 text-white placeholder:text-neutral-400 focus:border-yellow-400 focus:ring-yellow-400/20 h-11 backdrop-blur-sm'
                              disabled={isSubmitting}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className='text-red-300' />
                      </FormItem>
                    )}
                  />

                  {/* Campo Senha */}
                  <FormField
                    control={form.control}
                    name='password'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-sm font-medium text-neutral-200'>
                          Senha
                        </FormLabel>
                        <FormControl>
                          <div className='relative group'>
                            <KeyRound className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400 group-focus-within:text-yellow-400 transition-colors' />
                            <Input
                              {...field}
                              type={showPassword ? 'text' : 'password'}
                              placeholder='Digite sua senha'
                              className='pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-neutral-400 focus:border-yellow-400 focus:ring-yellow-400/20 h-11 backdrop-blur-sm'
                              disabled={isSubmitting}
                            />
                            <Button
                              type='button'
                              variant='ghost'
                              size='sm'
                              className='absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 text-neutral-400 hover:text-yellow-400 hover:bg-white/10'
                              onClick={() => setShowPassword(!showPassword)}
                              disabled={isSubmitting}
                            >
                              {showPassword ? (
                                <EyeOff className='h-4 w-4' />
                              ) : (
                                <Eye className='h-4 w-4' />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage className='text-red-300' />
                      </FormItem>
                    )}
                  />

                  {/* Checkbox Lembrar-me */}
                  <FormField
                    control={form.control}
                    name='rememberMe'
                    render={({ field }) => (
                      <FormItem className='flex flex-row items-center space-x-3 space-y-0'>
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className='border-white/30 data-[state=checked]:bg-yellow-400 data-[state=checked]:border-yellow-400 data-[state=checked]:text-neutral-900'
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormLabel className='text-sm text-neutral-300 font-normal'>
                          Manter-me conectado
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  {/* Botão de Submit */}
                  <Button
                    type='submit'
                    className='w-full h-11 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-neutral-900 font-semibold shadow-lg shadow-yellow-500/25 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className='flex items-center space-x-2'>
                        <Loader2 className='h-4 w-4 animate-spin' />
                        <span>Entrando...</span>
                      </div>
                    ) : (
                      <div className='flex items-center space-x-2 cursor-pointer'>
                        <span>Entrar no Sistema</span>
                        <ArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-1' />
                      </div>
                    )}
                  </Button>

                  {/* Botão Esqueci a Senha */}
                  <div className='text-center'>
                    <Button
                      type='button'
                      variant='ghost'
                      className='text-sm text-neutral-300 hover:text-yellow-400 hover:bg-white/5 transition-all duration-300 font-medium'
                      onClick={() => {
                        toast.info('Funcionalidade em desenvolvimento', {
                          description:
                            'Entre em contato com o suporte para recuperar sua senha.',
                        });
                      }}
                      disabled={isSubmitting}
                    >
                      Esqueci minha senha
                    </Button>
                  </div>
                </form>
              </Form>

              {/* Rodapé */}
              <div className='text-center space-y-2 pt-3 border-t border-white/10'>
                <p className='text-xs text-neutral-400'>
                  Problemas com acesso? Entre em contato com o suporte técnico
                </p>
                <div className='flex items-center justify-center space-x-2 text-xs text-neutral-500'>
                  <Shield className='h-3 w-3' />
                  <span>Conexão segura e criptografada</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className='text-center mt-6 space-y-1'>
            <p className='text-xs text-neutral-400'>
              © 2025 Viação Pioneira - Sistema de Gestão de Performance
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
