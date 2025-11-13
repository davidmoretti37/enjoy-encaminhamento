/**
 * Login Page - Example implementation with Supabase Auth
 *
 * This is a basic login/signup form that integrates with Supabase Authentication.
 * You can customize this to match your design system.
 */

import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { signIn, signUp, signInWithOAuth } from '@/lib/auth-helpers';
import { useAuth } from '@/_core/hooks/useAuth';
import { Briefcase, Loader2 } from 'lucide-react';
import ClassicLoader from "@/components/ui/ClassicLoader";
import { toast } from 'sonner';

export default function Login() {
  const [, setLocation] = useLocation();
  const { refresh } = useAuth();
  const [loading, setLoading] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupRole, setSignupRole] = useState<'company' | 'candidate'>('candidate');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signIn(loginEmail, loginPassword);

      // Refresh user to get role information
      const result = await refresh();
      const user = result.data;

      toast.success('Login bem-sucedido!');

      // Role-based dashboard redirect
      if (user?.role === 'affiliate') {
        setLocation('/affiliate/dashboard');
      } else if (user?.role === 'super_admin' || user?.role === 'admin') {
        setLocation('/admin/dashboard');
      } else if (user?.role === 'school') {
        setLocation('/school/dashboard');
      } else if (user?.role === 'company') {
        setLocation('/company/dashboard');
      } else {
        setLocation('/');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signUp(signupEmail, signupPassword, {
        name: signupName,
        role: signupRole,
      });
      toast.success('Conta criada com sucesso! Verifique seu email.');

      // Refresh user to get role information
      const result = await refresh();
      const user = result.data;

      // Role-based dashboard redirect
      if (user?.role === 'affiliate') {
        setLocation('/affiliate/dashboard');
      } else if (user?.role === 'super_admin' || user?.role === 'admin') {
        setLocation('/admin/dashboard');
      } else if (user?.role === 'school') {
        setLocation('/school/dashboard');
      } else if (user?.role === 'company') {
        setLocation('/company/dashboard');
      } else {
        setLocation('/');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    setLoading(true);
    try {
      await signInWithOAuth(provider);
      // User will be redirected to OAuth provider
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer login com OAuth');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <Briefcase className="h-12 w-12 text-slate-900 mr-3" />
          <h1 className="text-3xl font-bold text-slate-900">Recrutamento</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Bem-vindo</CardTitle>
            <CardDescription>
              Entre na sua conta ou crie uma nova
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Cadastrar</TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <ClassicLoader />
                        Entrando...
                      </>
                    ) : (
                      'Entrar'
                    )}
                  </Button>
                </form>

                <div className="mt-4">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Ou continue com
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => handleOAuthLogin('google')}
                      disabled={loading}
                    >
                      Google
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleOAuthLogin('github')}
                      disabled={loading}
                    >
                      GitHub
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Signup Tab */}
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome Completo</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="João Silva"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <p className="text-xs text-muted-foreground">
                      Mínimo de 6 caracteres
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de Conta</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        type="button"
                        variant={signupRole === 'candidate' ? 'default' : 'outline'}
                        onClick={() => setSignupRole('candidate')}
                      >
                        Candidato
                      </Button>
                      <Button
                        type="button"
                        variant={signupRole === 'company' ? 'default' : 'outline'}
                        onClick={() => setSignupRole('company')}
                      >
                        Empresa
                      </Button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <ClassicLoader />
                        Criando conta...
                      </>
                    ) : (
                      'Criar Conta'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          <a href="/" className="hover:text-foreground transition-colors">
            Voltar para home
          </a>
        </div>
      </div>
    </div>
  );
}
