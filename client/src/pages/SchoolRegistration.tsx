import { useState, useEffect } from "react";
import ClassicLoader from "@/components/ui/ClassicLoader";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Building2, CheckCircle, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export default function SchoolRegistration() {
  const [, params] = useRoute("/register/school/:token");
  const [, setLocation] = useLocation();
  const token = params?.token;

  const [step, setStep] = useState<'validating' | 'password-form' | 'success' | 'error'>('validating');
  const [errorMessage, setErrorMessage] = useState("");

  // Password
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // tRPC queries
  const { data: invitation, isLoading: validating, error: validationError } = trpc.invitation.validate.useQuery(
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
      setErrorMessage("Convite não encontrado");
      setStep('error');
      return;
    }

    if (invitation) {
      if (invitation.isValid) {
        setStep('password-form');
      } else {
        setErrorMessage(invitation.reason || "Convite inválido");
        setStep('error');
      }
    }
  }, [invitation, validating, validationError]);

  const acceptInvitationMutation = trpc.invitation.acceptWithPassword.useMutation({
    onSuccess: () => {
      setStep('success');
      toast.success("Conta criada com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao criar conta: ${error.message}`);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (!invitation) {
      toast.error("Convite inválido");
      return;
    }

    // The school data is stored in the invitation notes field or we just use placeholder data
    // since the affiliate already filled everything
    await acceptInvitationMutation.mutateAsync({
      token: token!,
      password,
      schoolData: {
        school_name: invitation.affiliates?.name || "Escola",
        cnpj: "00000000000000", // Placeholder - already stored in invitation
        email: invitation.email,
      }
    });
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Link Inválido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Este link de convite é inválido ou está incorreto.
            </p>
            <Button onClick={() => setLocation("/")}>Voltar para Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'validating' || validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <ClassicLoader />
          <p className="text-muted-foreground">Validando convite...</p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Convite Inválido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{errorMessage}</p>
            <Button onClick={() => setLocation("/")}>Voltar para Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Conta Criada com Sucesso!
            </CardTitle>
            <CardDescription>
              Sua conta foi criada e está pronta para usar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Você já pode fazer login e começar a usar a plataforma.
            </p>
            <Button className="w-full" onClick={() => setLocation("/login")}>
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'password-form') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Criar Conta de Escola
            </CardTitle>
            <CardDescription>
              Você foi convidado por {invitation?.affiliates?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={invitation?.email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Este será seu email de login
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Digite a senha novamente"
                />
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  Os dados da escola já foram preenchidos pelo franqueado.
                  Você só precisa criar uma senha para acessar sua conta.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={acceptInvitationMutation.isLoading}
              >
                {acceptInvitationMutation.isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  "Criar Conta"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Remove old school-form step
  if (step === 'school-form-old') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Cadastro da Escola
              </CardTitle>
              <CardDescription>
                Preencha os dados da sua escola - Franquia: {invitation?.franchises?.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSchoolSubmit} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Informações Básicas</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="schoolName">Nome da Escola *</Label>
                      <Input
                        id="schoolName"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        required
                        placeholder="Nome fantasia"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tradeName">Nome Comercial</Label>
                      <Input
                        id="tradeName"
                        value={tradeName}
                        onChange={(e) => setTradeName(e.target.value)}
                        placeholder="Nome comercial"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="legalName">Razão Social</Label>
                      <Input
                        id="legalName"
                        value={legalName}
                        onChange={(e) => setLegalName(e.target.value)}
                        placeholder="Razão social"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cnpj">CNPJ *</Label>
                      <Input
                        id="cnpj"
                        value={cnpj}
                        onChange={(e) => setCnpj(e.target.value)}
                        required
                        placeholder="00.000.000/0000-00"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Contato</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="schoolEmail">Email *</Label>
                      <Input
                        id="schoolEmail"
                        type="email"
                        value={schoolEmail}
                        onChange={(e) => setSchoolEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(00) 0000-0000"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        type="url"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Endereço</h3>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="address">Endereço</Label>
                      <Input
                        id="address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Rua, número"
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="city">Cidade</Label>
                        <Input
                          id="city"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">Estado</Label>
                        <Input
                          id="state"
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          placeholder="UF"
                          maxLength={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="postalCode">CEP</Label>
                        <Input
                          id="postalCode"
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          placeholder="00000-000"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('signup')}
                  >
                    Voltar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={acceptInvitationMutation.isLoading}
                  >
                    {acceptInvitationMutation.isLoading ? (
                      <>
                        <ClassicLoader />
                        Cadastrando...
                      </>
                    ) : (
                      "Finalizar Cadastro"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}
