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
import { signIn, signUp, signInWithOAuth } from '@/lib/auth-helpers';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Briefcase, Loader2, MapPin } from 'lucide-react';
import ClassicLoader from "@/components/ui/ClassicLoader";
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
      for (let attempt = 0; attempt < 5; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)));

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
        window.location.href = '/company/portal';
      } else if (user?.role === 'candidate') {
        window.location.href = '/candidate';
      } else {
        // User is logged in but we couldn't determine role yet
        // Go to a neutral page that will redirect properly once role is known
        console.warn('[Login] Could not determine user role, will let dashboard handle it');
        // Force a page reload to let the app re-check auth state
        window.location.href = '/settings';
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer login');
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
        agency_id: signupAgencyId || null,
      });
      toast.success('Conta criada com sucesso!');

      // Wait a moment for the auth to propagate
      await new Promise(resolve => setTimeout(resolve, 500));

      // Redirect based on the role we just signed up with (we know it from state)
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

                  <div className="space-y-2">
                    <Label>Região</Label>
                    <Select value={signupAgencyId} onValueChange={setSignupAgencyId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a região" />
                      </SelectTrigger>
                      <SelectContent>
                        {agencies?.map(agency => (
                          <SelectItem key={agency.id} value={agency.id}>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>{agency.city} - {agency.state}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {signupRole === 'company'
                        ? 'Selecione a região onde sua empresa está localizada'
                        : 'Selecione a região onde você busca oportunidades'}
                    </p>
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
