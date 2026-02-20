import { useRef, useState, useEffect } from "react";
import { useParams } from "wouter";
import SignatureCanvas from "react-signature-canvas";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, Loader2, XCircle, FileText, Eraser, Calendar, Building2, Briefcase, User, ExternalLink, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Status = "loading" | "ready" | "autentique" | "signing" | "success" | "error" | "already_signed" | "expired";

export default function ExternalSigningPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<Status>("loading");
  const [signerCpf, setSignerCpf] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const sigRef = useRef<SignatureCanvas>(null);

  const { data, isLoading, error } = trpc.publicSigning.getSigningDetails.useQuery(
    { token: token! },
    { enabled: !!token }
  );

  const signMutation = trpc.publicSigning.signByToken.useMutation({
    onSuccess: () => {
      setStatus("success");
    },
    onError: (err) => {
      setErrorMessage(err.message || "Erro ao assinar documento");
      setStatus("error");
    },
  });

  useEffect(() => {
    if (isLoading) {
      setStatus("loading");
    } else if (error) {
      if (error.message.includes("expirou")) {
        setStatus("expired");
      } else {
        setErrorMessage(error.message || "Link inválido ou expirado");
        setStatus("error");
      }
    } else if (data) {
      if (data.alreadySigned) {
        setStatus("already_signed");
      } else if ((data as any).autentiqueSignUrl) {
        setStatus("autentique");
      } else {
        setStatus("ready");
      }
    }
  }, [data, isLoading, error]);

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSignerCpf(formatCpf(e.target.value));
  };

  const clearSignature = () => {
    sigRef.current?.clear();
  };

  const handleSign = async () => {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      setErrorMessage("Por favor, faça sua assinatura");
      return;
    }
    if (signerCpf.replace(/\D/g, "").length !== 11) {
      setErrorMessage("Por favor, informe um CPF válido");
      return;
    }
    if (!acceptedTerms) {
      setErrorMessage("Por favor, aceite os termos do contrato");
      return;
    }

    setErrorMessage("");
    setStatus("signing");

    const signature = sigRef.current.toDataURL();

    signMutation.mutate({
      token: token!,
      signerCpf: signerCpf.replace(/\D/g, ""),
      signature,
    });
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "parent_guardian":
        return "Responsável Legal";
      case "educational_institution":
        return "Instituição de Ensino";
      case "candidate":
        return "Candidato";
      default:
        return "Assinante";
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case "parent_guardian":
        return "Você está sendo solicitado a assinar este contrato como responsável legal do candidato.";
      case "educational_institution":
        return "Você está sendo solicitado a assinar este contrato em nome da instituição de ensino.";
      case "candidate":
        return "Você está sendo solicitado a assinar este contrato como candidato à vaga de estágio.";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full shadow-xl">
        <CardHeader className="text-center">
          {status === "loading" && (
            <>
              <div className="flex justify-center mb-4">
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
              </div>
              <CardTitle>Carregando documento...</CardTitle>
              <CardDescription>Aguarde um momento</CardDescription>
            </>
          )}

          {status === "expired" && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                  <XCircle className="h-10 w-10 text-amber-600" />
                </div>
              </div>
              <CardTitle className="text-amber-700">Link Expirado</CardTitle>
              <CardDescription>
                Este link de assinatura expirou. Entre em contato com a empresa para solicitar um novo convite.
              </CardDescription>
            </>
          )}

          {status === "already_signed" && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-green-700">Documento Já Assinado</CardTitle>
              <CardDescription>
                Este documento já foi assinado anteriormente em{" "}
                {data?.signedAt && format(new Date(data.signedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}.
              </CardDescription>
            </>
          )}

          {status === "success" && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-green-700">Assinatura Concluída!</CardTitle>
              <CardDescription>
                Sua assinatura foi registrada com sucesso. Você pode fechar esta página.
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
              <CardDescription>{errorMessage || "Não foi possível processar o documento."}</CardDescription>
            </>
          )}

          {status === "autentique" && data && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <ShieldCheck className="h-10 w-10 text-blue-600" />
                </div>
              </div>
              <CardTitle>Contrato de {data.hiringType === "clt" ? "Trabalho (CLT)" : data.hiringType === "menor-aprendiz" ? "Menor Aprendiz" : "Estágio"}</CardTitle>
              <CardDescription>{getRoleDescription(data.signerRole)}</CardDescription>
            </>
          )}

          {(status === "ready" || status === "signing") && data && !data.alreadySigned && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText className="h-10 w-10 text-blue-600" />
                </div>
              </div>
              <CardTitle>Contrato de {data.hiringType === "clt" ? "Trabalho (CLT)" : data.hiringType === "menor-aprendiz" ? "Menor Aprendiz" : "Estágio"}</CardTitle>
              <CardDescription>{getRoleDescription(data.signerRole)}</CardDescription>
            </>
          )}
        </CardHeader>

        {/* Autentique signing flow */}
        {status === "autentique" && data && (
          <CardContent className="space-y-6">
            {/* Signer Info */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <p className="text-sm text-indigo-700 font-medium mb-1">
                Assinando como: {getRoleLabel(data.signerRole)}
              </p>
              <p className="text-lg font-semibold text-indigo-900">{data.signerName}</p>
              <p className="text-sm text-indigo-600">{data.signerEmail}</p>
            </div>

            {/* Contract Details */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-gray-900">Detalhes do Contrato</h3>

              {data.candidate?.name && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Candidato:</span>
                  <span className="font-medium">{data.candidate.name}</span>
                </div>
              )}

              {data.company?.name && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Empresa:</span>
                  <span className="font-medium">{data.company.name}</span>
                </div>
              )}

              {data.job?.title && (
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Vaga:</span>
                  <span className="font-medium">{data.job.title}</span>
                </div>
              )}

              {data.startDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Início:</span>
                  <span className="font-medium">
                    {format(new Date(data.startDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                </div>
              )}
            </div>

            {/* Autentique signing info */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800">Assinatura Digital Certificada</span>
              </div>
              <p className="text-sm text-green-700">
                A assinatura será realizada pela plataforma Autentique, garantindo validade jurídica
                conforme a Lei 14.063/2020, com registro de IP, geolocalização e carimbo de tempo.
              </p>
            </div>

            {/* Sign on Autentique Button */}
            <Button
              className="w-full"
              size="lg"
              onClick={() => window.open((data as any).autentiqueSignUrl, "_blank")}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Assinar na Autentique
            </Button>

            <p className="text-xs text-gray-500 text-center">
              Você será redirecionado para a plataforma Autentique para realizar a assinatura digital.
            </p>
          </CardContent>
        )}

        {/* Legacy canvas signing flow */}
        {(status === "ready" || status === "signing") && data && !data.alreadySigned && (
          <CardContent className="space-y-6">
            {/* Signer Info */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <p className="text-sm text-indigo-700 font-medium mb-1">
                Assinando como: {getRoleLabel(data.signerRole)}
              </p>
              <p className="text-lg font-semibold text-indigo-900">{data.signerName}</p>
              <p className="text-sm text-indigo-600">{data.signerEmail}</p>
            </div>

            {/* Contract Details */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-gray-900">Detalhes do Contrato</h3>

              {data.candidate?.name && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Candidato:</span>
                  <span className="font-medium">{data.candidate.name}</span>
                </div>
              )}

              {data.company?.name && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Empresa:</span>
                  <span className="font-medium">{data.company.name}</span>
                </div>
              )}

              {data.job?.title && (
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Vaga:</span>
                  <span className="font-medium">{data.job.title}</span>
                </div>
              )}

              {data.startDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Início:</span>
                  <span className="font-medium">
                    {format(new Date(data.startDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                </div>
              )}
            </div>

            {/* Contract Content */}
            {data.contractTemplates && data.contractTemplates.length > 0 ? (
              <div className="space-y-4">
                {data.contractTemplates.map((template: any, index: number) => (
                  <div key={index} className="border rounded-lg bg-white overflow-hidden">
                    <div className="bg-gray-100 p-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{template.name}</span>
                      <a
                        href={template.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Abrir em nova aba
                      </a>
                    </div>
                    <iframe
                      src={`${template.fileUrl}#toolbar=1&navpanes=0&view=FitH`}
                      className="w-full border-0"
                      style={{ height: "70vh", minHeight: "500px" }}
                      title={template.name}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="border rounded-lg bg-white p-4">
                <h4 className="font-medium text-gray-900 mb-2">Termos do Contrato de {data.hiringType === "clt" ? "Trabalho (CLT)" : data.hiringType === "menor-aprendiz" ? "Menor Aprendiz" : "Estágio"}</h4>
                <div className="text-sm text-gray-600 space-y-2">
                  <p>
                    O presente Contrato de Estágio é celebrado de acordo com a Lei nº 11.788/2008, tendo por objeto
                    a realização de estágio supervisionado pelo período de 12 (doze) meses.
                  </p>
                  <p>
                    O estágio será realizado em conformidade com as atividades previstas no plano de atividades,
                    compatíveis com o curso do estagiário.
                  </p>
                  <p>
                    A jornada de atividades será compatível com o horário escolar do estagiário, não excedendo
                    6 (seis) horas diárias e 30 (trinta) horas semanais.
                  </p>
                  <p>
                    O estagiário terá direito a recesso remunerado de 30 (trinta) dias, a ser gozado
                    preferencialmente durante as férias escolares.
                  </p>
                </div>
              </div>
            )}

            {/* CPF Input */}
            <div className="space-y-2">
              <Label htmlFor="signerCpf">CPF do Assinante</Label>
              <Input
                id="signerCpf"
                placeholder="000.000.000-00"
                value={signerCpf}
                onChange={handleCpfChange}
                disabled={status === "signing"}
              />
            </div>

            {/* Signature Canvas */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Assinatura Digital</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSignature}
                  disabled={status === "signing"}
                >
                  <Eraser className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white">
                <SignatureCanvas
                  ref={sigRef}
                  penColor="black"
                  canvasProps={{
                    className: "w-full h-32 rounded-lg",
                    style: { width: "100%", height: "128px" },
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Use o mouse ou dedo para assinar acima
              </p>
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                disabled={status === "signing"}
              />
              <label htmlFor="terms" className="text-sm leading-tight cursor-pointer">
                Li e concordo com os termos do contrato. Declaro que as informações fornecidas são
                verdadeiras e que tenho autorização para assinar este documento.
              </label>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <p className="text-sm text-red-600 text-center">{errorMessage}</p>
            )}

            {/* Sign Button */}
            <Button
              className="w-full"
              size="lg"
              onClick={handleSign}
              disabled={status === "signing"}
            >
              {status === "signing" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assinando...
                </>
              ) : (
                "Assinar Documento"
              )}
            </Button>

            {/* Legal Notice */}
            <p className="text-xs text-gray-500 text-center">
              Esta assinatura eletrônica é válida de acordo com a Lei 14.063/2020.
              Ao assinar, você concorda que esta assinatura tem o mesmo efeito legal de uma assinatura física.
            </p>
          </CardContent>
        )}

        {/* Success state content */}
        {status === "success" && (
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              A empresa será notificada sobre sua assinatura. O processo de contratação prosseguirá assim que
              todas as assinaturas forem coletadas.
            </p>
            <Button variant="outline" onClick={() => window.close()}>
              Fechar Página
            </Button>
          </CardContent>
        )}

        {/* Already signed state content */}
        {status === "already_signed" && (
          <CardContent className="text-center">
            <p className="text-gray-600">
              Não é necessário realizar nenhuma ação adicional.
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
