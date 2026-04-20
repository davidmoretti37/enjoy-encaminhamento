/**
 * Login Page - Example implementation with Supabase Auth
 *
 * This is a basic login/signup form that integrates with Supabase Authentication.
 * You can customize this to match your design system.
 */

import { useState, useEffect } from 'react';
import { useLocation, useSearch } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { signIn, signUp, getSession, resetPassword } from '@/lib/auth-helpers';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Briefcase, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { refresh } = useAuth();
  const [loading, setLoading] = useState(false);

  // Parse URL params for pre-selection
  const urlParams = new URLSearchParams(searchString);
  const initialTab = urlParams.get('tab') === 'signup' ? 'signup' : 'login';
  const initialRole = urlParams.get('role') === 'company' ? 'company' : 'candidate';

  // Tab state
  const [activeTab, setActiveTab] = useState(initialTab);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await resetPassword(resetEmail);
      setResetSent(true);
      toast.success('Email de recuperação enviado!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar email de recuperação');
    } finally {
      setLoading(false);
    }
  };

  // Signup form state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupRole, setSignupRole] = useState<'company' | 'candidate'>(initialRole);
  const [signupAgencyId, setSignupAgencyId] = useState('');

  // Fetch agencies (regions) for registration dropdown
  const { data: agencies } = trpc.agency.getAllPublic.useQuery() as {
    data: Array<{ id: string; agency_name: string; city: string; state: string }> | undefined;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signIn(loginEmail, loginPassword);

      // Wait a moment for auth to propagate
      await new Promise(resolve => setTimeout(resolve, 300));

      // Refresh user to get role information with retry logic
      let user = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 400 * (attempt + 1)));

        try {
          const result = await refresh();
          user = result.data;
          console.log(`[Login] Refresh attempt ${attempt + 1}:`, user);
          if (user?.role) break;
        } catch (refreshError) {
          console.warn(`[Login] Refresh attempt ${attempt + 1} failed:`, refreshError);
        }
      }

      toast.success('Login bem-sucedido!');

      // Role-based dashboard redirect using window.location for clean navigation
      if (user?.role === 'super_admin' || user?.role === 'admin') {
        window.location.href = '/admin/dashboard';
      } else if (user?.role === 'agency') {
        window.location.href = '/agency/dashboard';
      } else if (user?.role === 'company') {
        // Check if company has completed onboarding before redirecting
        try {
          const session = await getSession();
          const res = await fetch('/api/trpc/company.checkOnboarding', {
            headers: {
              'Authorization': `Bearer ${session?.access_token}`,
            },
          });
          const json = await res.json();
          if (json?.result?.data?.json?.completed === false) {
            window.location.href = '/company/onboarding';
          } else {
            window.location.href = '/company/portal';
          }
        } catch {
          window.location.href = '/company/portal';
        }
      } else if (user?.role === 'candidate') {
        // Check if candidate has completed onboarding before redirecting
        try {
          const session = await getSession();
          const res = await fetch('/api/trpc/candidate.checkOnboarding', {
            headers: {
              'Authorization': `Bearer ${session?.access_token}`,
            },
          });
          const json = await res.json();
          if (json?.result?.data?.json?.completed === false) {
            window.location.href = '/candidate/onboarding';
          } else {
            window.location.href = '/candidate';
          }
        } catch {
          window.location.href = '/candidate';
        }
      } else {
        // User is logged in but we couldn't determine role yet
        // Go to a neutral page that will redirect properly once role is known
        console.warn('[Login] Could not determine user role, will let dashboard handle it');
        // Force a page reload to let the app re-check auth state
        window.location.href = '/settings';
      }
    } catch (error: any) {
      const msg = typeof error === 'string' ? error : error?.message || 'Email ou senha incorretos';
      toast.error(msg);
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!signupAgencyId) {
      toast.error('Selecione uma região');
      setLoading(false);
      return;
    }

    try {
      await signUp(signupEmail, signupPassword, {
        name: signupName,
        role: signupRole,
        agency_id: signupAgencyId,
      });
      toast.success('Conta criada com sucesso!');

      // Wait a moment for the auth to propagate
      await new Promise(resolve => setTimeout(resolve, 500));

      // Full page reload so Supabase session is picked up fresh from localStorage
      // (setLocation would hit AuthGuard before the auth query cache updates)
      if (signupRole === 'company') {
        window.location.href = '/company/onboarding';
      } else {
        window.location.href = '/candidate/onboarding';
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar conta');
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
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      'Entrar'
                    )}
                  </Button>

                  <button
                    type="button"
                    onClick={() => { setShowForgotPassword(true); setResetEmail(loginEmail); }}
                    className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors mt-2"
                  >
                    Esqueci minha senha
                  </button>
                </form>

                {showForgotPassword && (
                  <div className="mt-4 p-4 rounded-lg border bg-slate-50 space-y-3">
                    {resetSent ? (
                      <div className="text-center space-y-2">
                        <p className="text-sm font-medium text-green-700">Email enviado!</p>
                        <p className="text-xs text-muted-foreground">
                          Verifique sua caixa de entrada e siga o link para redefinir sua senha.
                        </p>
                        <button
                          type="button"
                          onClick={() => { setShowForgotPassword(false); setResetSent(false); }}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          Voltar ao login
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleResetPassword} className="space-y-3">
                        <p className="text-sm font-medium">Recuperar senha</p>
                        <p className="text-xs text-muted-foreground">
                          Digite seu email e enviaremos um link para redefinir sua senha.
                        </p>
                        <Input
                          type="email"
                          placeholder="seu@email.com"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          required
                        />
                        <div className="flex gap-2">
                          <Button type="submit" size="sm" disabled={loading} className="flex-1">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowForgotPassword(false)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

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

                  {/* Agency field is required only in agency-context signup flows.
                     Candidates who sign up independently may have agency_id = NULL. */}
                  <div className="space-y-2">
                    <Label htmlFor="signup-region">Região</Label>
                    <select
                      id="signup-region"
                      value={signupAgencyId}
                      onChange={(e) => setSignupAgencyId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="" disabled>Selecione a região</option>
                      {agencies?.map(agency => (
                        <option key={agency.id} value={agency.id}>
                          {agency.city} - {agency.state}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      {signupRole === 'company'
                        ? 'Selecione a região onde sua empresa está localizada'
                        : 'Selecione a região onde você busca oportunidades'}
                    </p>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
