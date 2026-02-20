import { useState, useEffect, useRef } from "react";
import ClassicLoader from "@/components/ui/ClassicLoader";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Building2,
  CheckCircle,
  XCircle,
  Lock,
  FileUp,
  ArrowRight,
  ArrowLeft,
  Upload,
  FileText,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

type Step = 'validating' | 'agency-info' | 'password' | 'contract' | 'submitting' | 'success' | 'error';

export default function AgencyRegistration() {
  const [, setLocation] = useLocation();

  // Get token from URL query params
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const [step, setStep] = useState<Step>('validating');
  const [errorMessage, setErrorMessage] = useState("");

  // Agency Info
  const [agencyName, setAgencyName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  // Password
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Contract Upload
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate invitation
  const { data: invitation, isLoading: validating, error: validationError } = trpc.agency.validateInvitation.useQuery(
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
      setErrorMessage("Convite não encontrado ou expirado");
      setStep('error');
      return;
    }

    if (invitation) {
      if (invitation.isValid) {
        setEmail(invitation.email);
        setStep('agency-info');
      } else {
        setErrorMessage(invitation.reason || "Convite inválido");
        setStep('error');
      }
    }
  }, [invitation, validating, validationError]);

  // Accept invitation mutation
  const acceptInvitationMutation = trpc.agency.acceptInvitation.useMutation({
    onSuccess: () => {
      setStep('success');
      toast.success("Agência cadastrada com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao cadastrar: ${error.message}`);
      setStep('contract'); // Go back to contract step
    }
  });

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error("Por favor, selecione um arquivo PDF");
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error("O arquivo deve ter no máximo 10MB");
        return;
      }
      setContractFile(file);
    }
  };

  // Upload contract to Supabase Storage
  const uploadContract = async (): Promise<string | null> => {
    if (!contractFile) return null;

    setUploading(true);
    try {
      const fileExt = contractFile.name.split('.').pop();
      const fileName = `${token}-${Date.now()}.${fileExt}`;
      const filePath = `agency-contracts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(filePath, contractFile);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('contracts')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error("Erro ao fazer upload do contrato");
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Final submission
  const handleFinalSubmit = async () => {
    setStep('submitting');

    // Upload contract if provided
    let contractUrl: string | undefined;
    if (contractFile) {
      const url = await uploadContract();
      if (url) {
        contractUrl = url;
      }
    }

    // Submit registration
    try {
      await acceptInvitationMutation.mutateAsync({
        token: token!,
        password,
        agencyData: {
          agency_name: agencyName,
          cnpj: cnpj || undefined,
          email,
          phone: phone || undefined,
          city: city || undefined,
          state: state || undefined,
        },
        contractUrl,
      });
    } catch (err) {
      // Error handled by onError callback
      console.error('[AgencyRegistration] Submit error:', err);
    }
  };

  // Validation for each step
  const validateAgencyInfo = () => {
    if (!city.trim()) {
      toast.error("Digite a cidade");
      return false;
    }
    if (!state.trim()) {
      toast.error("Digite o estado");
      return false;
    }
    if (!agencyName.trim()) {
      toast.error("Digite o nome da agência");
      return false;
    }
    if (!email.trim()) {
      toast.error("Email é obrigatório");
      return false;
    }
    return true;
  };

  const validatePassword = () => {
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return false;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return false;
    }
    return true;
  };

  // Get current step number for progress
  const getStepNumber = () => {
    switch (step) {
      case 'agency-info': return 1;
      case 'password': return 2;
      case 'contract': return 3;
      default: return 0;
    }
  };

  // No token
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

  // Validating
  if (step === 'validating' || validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <ClassicLoader />
          <p className="text-muted-foreground mt-4">Validando convite...</p>
        </div>
      </div>
    );
  }

  // Error
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

  // Success
  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Cadastro Concluído!
            </CardTitle>
            <CardDescription>
              Sua agência foi cadastrada com sucesso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Você já pode fazer login com seu email e senha para acessar a plataforma.
            </p>
            <Button className="w-full" onClick={() => setLocation("/login")}>
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Submitting
  if (step === 'submitting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <ClassicLoader />
          <p className="text-muted-foreground mt-4">
            {uploading ? "Fazendo upload do contrato..." : "Finalizando cadastro..."}
          </p>
        </div>
      </div>
    );
  }

  // Multi-step form
  const steps = [
    { key: 'agency-info', label: 'Dados', icon: Building2 },
    { key: 'password', label: 'Senha', icon: Lock },
    { key: 'contract', label: 'Contrato', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 py-8">
      <div className="max-w-xl mx-auto">
        {/* Progress Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((s, index) => {
              const StepIcon = s.icon;
              const stepNum = index + 1;
              const currentStepNum = getStepNumber();
              const isCompleted = stepNum < currentStepNum;
              const isCurrent = stepNum === currentStepNum;

              return (
                <div key={s.key} className="flex items-center flex-1">
                  {/* Step Circle */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`
                        w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
                        ${isCompleted
                          ? 'bg-green-500 text-white shadow-lg shadow-green-200'
                          : isCurrent
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 ring-4 ring-blue-100'
                            : 'bg-gray-200 text-gray-400'
                        }
                      `}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-6 w-6" />
                      ) : (
                        <StepIcon className="h-5 w-5" />
                      )}
                    </div>
                    <span
                      className={`
                        mt-2 text-sm font-medium transition-colors
                        ${isCompleted ? 'text-green-600' : isCurrent ? 'text-blue-600' : 'text-gray-400'}
                      `}
                    >
                      {s.label}
                    </span>
                  </div>

                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className="flex-1 mx-3 h-1 rounded-full overflow-hidden bg-gray-200">
                      <div
                        className={`h-full transition-all duration-500 ${
                          stepNum < currentStepNum ? 'w-full bg-green-500' : 'w-0 bg-blue-600'
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Card>
          {/* Step 1: Agency Info */}
          {step === 'agency-info' && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Dados da Agência
                </CardTitle>
                <CardDescription>
                  Preencha as informações da sua agência
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (validateAgencyInfo()) {
                      setStep('password');
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="city">Cidade *</Label>
                      <Input
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Ex: São Paulo"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">Estado *</Label>
                      <Input
                        id="state"
                        value={state}
                        onChange={(e) => setState(e.target.value.toUpperCase())}
                        placeholder="Ex: SP"
                        maxLength={2}
                        required
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground -mt-2">
                    Empresas e candidatos desta cidade serão direcionados para sua agência
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="agencyName">Nome da Agência *</Label>
                    <Input
                      id="agencyName"
                      value={agencyName}
                      onChange={(e) => setAgencyName(e.target.value)}
                      placeholder="Ex: Agência de Recrutamento ABC"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Este será seu email de login
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ <span className="text-muted-foreground font-normal">(Opcional)</span></Label>
                    <Input
                      id="cnpj"
                      value={cnpj}
                      onChange={(e) => setCnpj(e.target.value)}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    Próximo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </>
          )}

          {/* Step 2: Password */}
          {step === 'password' && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Criar Senha
                </CardTitle>
                <CardDescription>
                  Crie uma senha segura para acessar sua conta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (validatePassword()) {
                      setStep('contract');
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                      minLength={6}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Digite a senha novamente"
                      required
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep('agency-info')}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Voltar
                    </Button>
                    <Button type="submit" className="flex-1">
                      Próximo
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </CardContent>
            </>
          )}

          {/* Step 3: Contract Upload */}
          {step === 'contract' && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileUp className="h-5 w-5" />
                  Upload do Contrato
                </CardTitle>
                <CardDescription>
                  Faça upload do contrato assinado (opcional)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf"
                    className="hidden"
                  />

                  {!contractFile ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                    >
                      <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                      <p className="text-sm text-muted-foreground mb-1">
                        Clique para selecionar um arquivo PDF
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Máximo 10MB
                      </p>
                    </div>
                  ) : (
                    <div className="border rounded-lg p-4 flex items-center gap-3 bg-green-50 border-green-200">
                      <FileText className="h-8 w-8 text-green-600" />
                      <div className="flex-1">
                        <p className="font-medium text-green-800">{contractFile.name}</p>
                        <p className="text-xs text-green-600">
                          {(contractFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setContractFile(null)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground">
                    Você pode pular esta etapa e enviar o contrato depois.
                  </p>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep('password')}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Voltar
                    </Button>
                    <Button
                      onClick={handleFinalSubmit}
                      className="flex-1"
                      disabled={acceptInvitationMutation.isPending}
                    >
                      {acceptInvitationMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Cadastrando...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Finalizar Cadastro
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
