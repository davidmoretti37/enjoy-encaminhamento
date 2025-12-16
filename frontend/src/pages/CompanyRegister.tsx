import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Loader2, XCircle, Building2, Eye, EyeOff } from "lucide-react";

export default function CompanyRegister() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "ready" | "submitting" | "success" | "error">("loading");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [tokenType, setTokenType] = useState<"registration" | "contract" | null>(null);
  const [companyData, setCompanyData] = useState<{ company_name: string; email: string } | null>(null);

  // Try old registration token first
  const { data: registrationCompany, isLoading: isLoadingRegistration, error: registrationError } =
    trpc.outreach.getCompanyByRegistrationToken.useQuery(
      { token: token! },
      { enabled: !!token && tokenType === null, retry: false }
    );

  // If registration token fails, try contract token
  const { data: contractCompany, isLoading: isLoadingContract, error: contractError } =
    trpc.outreach.getCompanyDataByContractToken.useQuery(
      { token: token! },
      { enabled: !!token && tokenType === null && !!registrationError, retry: false }
    );

  // Old registration mutation
  const registerMutation = trpc.outreach.completeRegistration.useMutation({
    onSuccess: () => {
      setStatus("success");
    },
    onError: (err) => {
      setErrorMessage(err.message || "Erro ao criar conta");
      setStatus("error");
    },
  });

  // New contract-token registration mutation
  const registerByContractMutation = trpc.outreach.completeRegistrationByContractToken.useMutation({
    onSuccess: () => {
      setStatus("success");
    },
    onError: (err) => {
      setErrorMessage(err.message || "Erro ao criar conta");
      setStatus("error");
    },
  });

  useEffect(() => {
    if (isLoadingRegistration) {
      setStatus("loading");
      return;
    }

    // Registration token worked
    if (registrationCompany) {
      setTokenType("registration");
      setCompanyData({
        company_name: registrationCompany.company_name,
        email: registrationCompany.email,
      });
      setStatus("ready");
      return;
    }

    // Registration token failed, waiting for contract token query
    if (registrationError && isLoadingContract) {
      setStatus("loading");
      return;
    }

    // Contract token worked
    if (contractCompany) {
      setTokenType("contract");
      setCompanyData({
        company_name: contractCompany.company_name,
        email: contractCompany.email,
      });
      setStatus("ready");
      return;
    }

    // Both failed
    if (registrationError && contractError) {
      setErrorMessage("Link de registro inválido ou expirado");
      setStatus("error");
    }
  }, [registrationCompany, registrationError, isLoadingRegistration, contractCompany, contractError, isLoadingContract]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      setErrorMessage("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("As senhas não coincidem");
      return;
    }

    setErrorMessage("");
    setStatus("submitting");

    if (tokenType === "registration") {
      registerMutation.mutate({
        registrationToken: token!,
        password,
      });
    } else {
      registerByContractMutation.mutate({
        contractToken: token!,
        password,
      });
    }
  };

  const goToLogin = () => {
    setLocation("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-xl">
        <CardHeader className="text-center">
          {status === "loading" && (
            <>
              <div className="flex justify-center mb-4">
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
              </div>
              <CardTitle>Carregando...</CardTitle>
              <CardDescription>Aguarde um momento</CardDescription>
            </>
          )}

          {status === "success" && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-green-700">Conta Criada com Sucesso!</CardTitle>
              <CardDescription>
                Sua conta foi criada. Agora você pode acessar o sistema.
              </CardDescription>
            </>
          )}

          {status === "error" && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="h-10 w-10 text-red-600" />
                </div>
              </div>
              <CardTitle className="text-red-700">Erro</CardTitle>
              <CardDescription>{errorMessage || "Não foi possível criar sua conta."}</CardDescription>
            </>
          )}

          {(status === "ready" || status === "submitting") && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Building2 className="h-10 w-10 text-blue-600" />
                </div>
              </div>
              <CardTitle>Criar Conta</CardTitle>
              <CardDescription>
                Configure sua senha para acessar o sistema
              </CardDescription>
            </>
          )}
        </CardHeader>

        {(status === "ready" || status === "submitting") && companyData && (
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Company Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Dados da Empresa</h3>
                <div className="text-sm space-y-1">
                  <div><strong>Nome:</strong> {companyData.company_name}</div>
                  <div><strong>E-mail:</strong> {companyData.email}</div>
                </div>
              </div>

              {/* Email (readonly) */}
              <div className="space-y-2">
                <Label htmlFor="email">E-mail de Acesso</Label>
                <Input
                  id="email"
                  type="email"
                  value={companyData.email}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-muted-foreground">
                  Você usará este e-mail para fazer login
                </p>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={status === "submitting"}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={status === "submitting"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Digite a senha novamente"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={status === "submitting"}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={status === "submitting"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <p className="text-sm text-red-600 text-center">{errorMessage}</p>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={status === "submitting"}
              >
                {status === "submitting" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  "Criar Conta"
                )}
              </Button>
            </form>
          </CardContent>
        )}

        {status === "success" && (
          <CardContent>
            <Button onClick={goToLogin} className="w-full" size="lg">
              Ir para o Login
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
