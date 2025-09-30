'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LogIn, UserPlus, Mail, Lock, Zap } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const senha = formData.get('senha');

    try {
      if (isLogin) {
        // Login
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: senha,
        });

        if (error) {
          alert('Falha no login. Verifique seus dados.');
        } else {
          if (data.session && data.session.access_token) {
            document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=86400`;
          }
          alert('Login realizado com sucesso!');
          router.push('/dashboard');
        }
      } else {
        // Registro
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
        });

        if (error) {
          alert('Erro ao criar conta. Tente novamente.');
        } else {
          // Criar registro na tabela saldos
          const { error: saldoError } = await supabase
            .from('saldos')
            .insert([
              {
                email: email,
                saldo: 0,
                plano: 'start'
              }
            ]);

          if (saldoError) {
            console.error('Erro ao criar registro de saldo:', saldoError);
          }

          alert('Conta criada com sucesso! Faça login para continuar.');
          setIsLogin(true);
        }
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao processar solicitação.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl mb-4">
            <span className="text-3xl">🐕</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">SHIB Mining</h1>
          <p className="text-zinc-400 text-sm">Comece a minerar SHIB agora</p>
        </div>

        {/* Form Card */}
        <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800 shadow-2xl">
          {/* Tabs */}
          <div className="flex gap-2 mb-8 bg-zinc-800/50 p-1 rounded-lg">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                isLogin
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <LogIn className="w-4 h-4" />
                Login
              </div>
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                !isLogin
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <UserPlus className="w-4 h-4" />
                Registro
              </div>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-400 mb-2">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  placeholder="seu@email.com"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-11 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="senha" className="block text-sm font-medium text-zinc-400 mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="password"
                  id="senha"
                  name="senha"
                  required
                  placeholder="••••••••"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-11 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
              </div>
              {!isLogin && (
                <p className="text-xs text-zinc-500 mt-2">Mínimo de 6 caracteres</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-lg font-semibold text-white shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Processando...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  {isLogin ? 'Entrar' : 'Criar Conta'}
                </>
              )}
            </button>
          </form>

          {/* Info Text */}
          <div className="mt-6 text-center">
            <p className="text-sm text-zinc-500">
              {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}{' '}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-orange-500 hover:text-orange-400 font-medium transition-colors"
              >
                {isLogin ? 'Registre-se' : 'Faça login'}
              </button>
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800/50">
            <div className="text-2xl mb-1">⚡</div>
            <p className="text-xs text-zinc-400">Mineração Rápida</p>
          </div>
          <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800/50">
            <div className="text-2xl mb-1">🔒</div>
            <p className="text-xs text-zinc-400">100% Seguro</p>
          </div>
          <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800/50">
            <div className="text-2xl mb-1">💰</div>
            <p className="text-xs text-zinc-400">Saques Fáceis</p>
          </div>
        </div>
      </div>
    </div>
  );
}