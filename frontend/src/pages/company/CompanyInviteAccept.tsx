import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Building2,
  CheckCircle,
  XCircle,
  Lock,
  Briefcase,
  Eye,
  EyeOff,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Step = 'validating' | 'create-password' | 'submitting' | 'success' | 'error';

export default function CompanyInviteAccept() {
  const [, setLocation] = useLocation();
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [step, setStep] = useState<Step>('validating');
  const [errorMessage, setErrorMessage] = useState("");

  // Password
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Validate invitation
  const { data: invitation, isLoading: validating, error: validationError } = trpc.companyInvitation.validateToken.useQuery(
    { token: token || "" },
    {
      enabled: !!token,
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  // Handle validation result
  useEffect(() => {
    if (validating) return;

    if (validationError) {
      const message = (validationError as any)?.message || "Convite não encontrado ou expirado";
      setErrorMessage(message);
      setStep('error');
      return;
    }

    if (invitation) {
      setStep('create-password');
    }
  }, [invitation, validating, validationError]);

  // Accept invitation mutation
  const acceptMutation = trpc.companyInvitation.acceptInvitation.useMutation({
    onSuccess: () => {
      setStep('success');
      toast.success("Conta criada com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao criar conta: ${error.message}`);
      setStep('create-password');
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    setStep('submitting');
    acceptMutation.mutate({
      token: token!,
      password,
    });
  };

  const goToLogin = () => {
    setLocation("/login");
  };

  // Loading state
  if (step === 'validating') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Validando convite...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-red-600">Convite Inválido</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={goToLogin} className="w-full">
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-green-600">Conta Criada!</CardTitle>
            <CardDescription>
              Sua conta foi criada com sucesso. Você já pode acessar a plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={goToLogin} className="w-full">
              Fazer Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Password creation form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Bem-vindo à Plataforma</CardTitle>
          <CardDescription>
            Crie uma senha para acessar sua conta
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Company Info Preview */}
          {invitation && (
            <div className="mb-6 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold">{invitation.companyName}</span>
              </div>

              {invitation.jobs && invitation.jobs.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Vagas cadastradas:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {invitation.jobs.map((job, idx) => (
                      <Badge key={idx} variant="secondary">
                        {job.title}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-sm text-muted-foreground mt-3">
                Email: {invitation.email}
              </p>
            </div>
          )}

          {/* Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Digite a senha novamente"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-red-500">As senhas não coincidem</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={step === 'submitting' || password.length < 6 || password !== confirmPassword}
            >
              {step === 'submitting' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                "Criar Conta e Acessar"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Já tem uma conta?{" "}
            <button onClick={goToLogin} className="text-primary hover:underline">
              Fazer login
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
