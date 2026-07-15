/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useRdoStore } from "../context/RdoContext";
import { motion } from "motion/react";
import { HardHat, LogIn, Mail, Lock, UserPlus, Info, AlertTriangle, CheckCircle } from "lucide-react";

export const AuthScreen: React.FC = () => {
  const { 
    login, 
    signup, 
    loginWithGoogle, 
    isFirebase, 
    isLocalFallback, 
    setIsLocalFallback 
  } = useRdoStore();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor, preencha todos os campos.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve conter no mínimo 6 caracteres.");
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
        setSuccess("Login efetuado com sucesso!");
      } else {
        await signup(email, password);
        setSuccess("Conta criada com sucesso! Bem-vindo!");
      }
    } catch (err: any) {
      console.error(err);
      
      const isNotAllowedError = 
        err?.code === "auth/operation-not-allowed" || 
        err?.message?.includes("operation-not-allowed");

      if (isNotAllowedError) {
        setError(
          "O provedor 'E-mail/senha' está desativado no Firebase para este projeto. " +
          "Para ativá-lo, acesse o Console do Firebase (Authentication -> Sign-in Method) e ative o provedor de E-mail/Senha. " +
          "Como alternativa, você pode Entrar com o Google ou continuar no Modo Offline Local abaixo."
        );
      } else {
        setError(
          err?.message || "Ocorreu um erro ao processar. Verifique os dados inseridos."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await loginWithGoogle();
      setSuccess("Login com Google realizado com sucesso!");
    } catch (err: any) {
      console.error(err);
      setError(
        "Falha ao entrar com Google. Se estiver no preview do AI Studio, você precisa abrir o app em uma nova guia (botão no canto superior direito). Se estiver no seu GitHub Pages, certifique-se de adicionar o domínio 'fgama-seel.github.io' em 'Authentication > Settings > Authorized domains' no Console do Firebase."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute top-4 right-4 max-w-sm">
        {isFirebase ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex gap-2 text-xs text-emerald-800 shadow-sm">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Nuvem Firestore Ativa</p>
              <p className="text-emerald-600 font-normal">Seus diários de obras são salvos na nuvem do Firebase com segurança.</p>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2 text-xs text-amber-800 shadow-sm">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Modo Offline Local Ativo</p>
              <p className="text-amber-600 font-normal">Armazenamento local ativo. Seus relatórios são salvos temporariamente no seu navegador!</p>
            </div>
          </div>
        )}
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand visual header */}
        <div className="flex justify-center">
          <div className="bg-[#004899] text-white p-3 pr-4 rounded-xl flex items-center justify-center gap-2 shadow-md">
            <HardHat className="w-8 h-8 " />
            <div className="text-left font-sans leading-none">
              <span className="font-bold text-lg tracking-wide block">RDO</span>
              <span className="text-[9px] uppercase tracking-wider text-blue-200">Diário de Obras</span>
            </div>
          </div>
        </div>
        <h2 className="mt-6 text-2xl font-extrabold text-gray-900 tracking-tight">
          {isLogin ? "Acesse sua conta Diário de Obras" : "Cadastre sua conta de Engenharia"}
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {isLogin ? "Ou " : "Já possui cadastro? "}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setSuccess(null);
            }}
            className="font-semibold text-blue-600 hover:text-blue-500 transition-colors focus:outline-none"
          >
            {isLogin ? "crie uma conta de acesso rápida" : "faça o login na conta existente"}
          </button>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white py-8 px-4 shadow-xl shadow-slate-200 border border-slate-100 rounded-2xl sm:px-10"
        >
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-800 text-sm p-4 rounded-lg flex gap-2 leading-relaxed">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-4 rounded-lg flex gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Endereço de E-mail
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#004899] focus:border-[#004899] sm:text-sm"
                  placeholder="exemplo@empresa.com.br"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Senha de Acesso
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#004899] focus:border-[#004899] sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                Sua senha garante a privacidade do seu histórico.
              </span>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 flex justify-center items-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#004899] hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#004899] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <span className="inline-block animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : isLogin ? (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Entrar com E-mail
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Criar Conta com E-mail
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500 text-xs uppercase tracking-wider">Acesso Rápido</span>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-11 flex justify-center items-center py-2 px-4 border border-gray-300 rounded-lg shadow-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.99 5.99 0 0 1 8 12.5a5.99 5.99 0 0 1 5.99-6.013c1.47 0 2.8.513 3.84 1.51l3.011-3.013C18.95 3.19 16.59 2 13.99 2 8.18 2 3.5 6.7 3.5 12.5S8.18 23 13.99 23c5.78 0 10.51-4.7 10.51-10.5 0-.74-.067-1.465-.214-2.215H12.24z"
                />
              </svg>
              Entrar com o Google
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col gap-3">
            {!isFirebase ? (
              <button
                type="button"
                onClick={() => {
                  setIsLocalFallback(false);
                  setError(null);
                  setSuccess(null);
                }}
                className="w-full py-2.5 px-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#004899] text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5 text-[#004899]" />
                Reconectar com Nuvem (Firebase)
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsLocalFallback(true);
                  setError(null);
                  setSuccess(null);
                }}
                className="w-full py-2.5 px-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Entrar no Modo Offline Local (Sem Conta)
              </button>
            )}
          </div>
        </motion.div>
      </div>

      <div className="text-center mt-8 text-xs text-gray-400">
        RDO Web Diário de Obras — SEEL Serviços Especiais de Engenharia &copy; {new Date().getFullYear()}
      </div>
    </div>
  );
};
