import { useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import SignatureCanvas from "react-signature-canvas";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, Loader2, XCircle, FileText, Eraser, ExternalLink, Copy, Mail } from "lucide-react";
import { toast } from "sonner";

export default function ContractSign() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<"loading" | "ready" | "signing" | "success" | "error" | "already_signed">("loading");
  const [signerName, setSignerName] = useState("");
  const [signerCpf, setSignerCpf] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [registrationUrl, setRegistrationUrl] = useState<string | null>(null);
  const [signedCompanyEmail, setSignedCompanyEmail] = useState<string | null>(null);
  const sigRef = useRef<SignatureCanvas>(null);

  const { data: company, isLoading, error } = trpc.outreach.getCompanyByContractToken.useQuery(
    { token: token! },
    { enabled: !!token }
  );

  const signMutation = trpc.outreach.signContract.useMutation({
    onSuccess: (data) => {
      setStatus("success");
      if (data.registrationUrl) {
        setRegistrationUrl(data.registrationUrl);
      }
      if (data.companyEmail) {
        setSignedCompanyEmail(data.companyEmail);
      }
    },
    onError: (err) => {
      setErrorMessage(err.message || "Erro ao assinar contrato");
      setStatus("error");
    },
  });

  useEffect(() => {
    if (isLoading) {
      setStatus("loading");
    } else if (error) {
      setErrorMessage("Link de contrato inválido ou expirado");
      setStatus("error");
    } else if (company) {
      if (company.contract_signed_at) {
        setStatus("already_signed");
        // Set registration URL if available (for already signed contracts)
        if (company.registrationUrl) {
          setRegistrationUrl(company.registrationUrl);
        }
        if (company.company_email) {
          setSignedCompanyEmail(company.company_email);
        }
      } else {
        setStatus("ready");
      }
    }
  }, [company, isLoading, error]);

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const formatCnpj = (cnpj: string) => {
    const digits = cnpj.replace(/\D/g, "");
    if (digits.length !== 14) return cnpj;
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
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
    if (!signerName.trim()) {
      setErrorMessage("Por favor, informe seu nome completo");
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
      contractToken: token!,
      signature,
      signerName: signerName.trim(),
      signerCpf: signerCpf.replace(/\D/g, ""),
    });
  };

  // Build company name and address from form data if available
  const companyName = company?.formData?.legal_name || company?.formData?.business_name || company?.company_name || "[Nome da Empresa]";
  const companyCnpj = company?.formData?.cnpj ? formatCnpj(company.formData.cnpj) : "[CNPJ]";
  const companyAddress = company?.formData?.address
    ? [
        company.formData.address,
        company.formData.neighborhood,
        company.formData.city,
        company.formData.state,
        company.formData.cep,
      ].filter(Boolean).join(", ")
    : "[Endereço]";
  const companyCity = company?.formData?.city || "[Cidade]";

  const contractText = `
CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE INTERMEDIAÇÃO DE MÃO DE OBRA

Pelo presente instrumento particular, as partes:

CONTRATANTE: ${companyName}
CNPJ: ${companyCnpj}
Endereço: ${companyAddress}
Email: ${company?.company_email || "[Email]"}
Contato: ${company?.formData?.contact_person || company?.contact_name || "[Nome do Contato]"}

CONTRATADA: Currículos MVP Intermediação de Mão de Obra LTDA

Têm entre si justo e contratado o seguinte:

CLÁUSULA PRIMEIRA - DO OBJETO
O presente contrato tem por objeto a prestação de serviços de intermediação de mão de obra,
consistindo na captação, seleção e encaminhamento de profissionais qualificados para
atendimento às necessidades da CONTRATANTE.

CLÁUSULA SEGUNDA - DAS OBRIGAÇÕES DA CONTRATADA
I. Realizar a captação de candidatos através de sua rede de escolas parceiras;
II. Efetuar a pré-seleção dos candidatos conforme perfil solicitado;
III. Encaminhar os candidatos selecionados para entrevista com a CONTRATANTE;
IV. Manter cadastro atualizado dos candidatos disponíveis.

CLÁUSULA TERCEIRA - DAS OBRIGAÇÕES DA CONTRATANTE
I. Fornecer informações claras sobre as vagas disponíveis;
II. Comunicar a CONTRATADA sobre o resultado das entrevistas;
III. Efetuar o pagamento dos valores acordados;
IV. Respeitar as normas trabalhistas vigentes.

CLÁUSULA QUARTA - DA REMUNERAÇÃO
A CONTRATANTE pagará à CONTRATADA, a título de intermediação, o valor equivalente
a um salário do profissional contratado, a ser pago em até 30 (trinta) dias após o
início das atividades do profissional.

CLÁUSULA QUINTA - DA VIGÊNCIA
O presente contrato vigorará por prazo indeterminado, podendo ser rescindido por
qualquer das partes mediante comunicação prévia de 30 (trinta) dias.

CLÁUSULA SEXTA - DO FORO
Fica eleito o foro da Comarca de ${companyCity}, para dirimir quaisquer dúvidas oriundas
do presente contrato.

E, por estarem assim justas e contratadas, as partes assinam o presente instrumento
em duas vias de igual teor e forma, na presença de duas testemunhas.
  `.trim();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full shadow-xl">
        <CardHeader className="text-center">
          {status === "loading" && (
            <>
              <div className="flex justify-center mb-4">
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
              </div>
              <CardTitle>Carregando contrato...</CardTitle>
              <CardDescription>Aguarde um momento</CardDescription>
            </>
          )}

          {status === "already_signed" && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-green-700">Contrato Já Assinado</CardTitle>
              <CardDescription>
                {registrationUrl
                  ? "Este contrato já foi assinado. Clique abaixo para criar sua conta e acessar o Portal da Empresa."
                  : "Este contrato já foi assinado anteriormente. Aguarde a aprovação para criar sua conta."}
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
              <CardTitle className="text-green-700">Contrato Assinado com Sucesso!</CardTitle>
              <CardDescription>
                {registrationUrl
                  ? "Seu contrato foi assinado. Agora você pode criar sua conta para acessar o Portal da Empresa."
                  : "Seu contrato foi assinado digitalmente. Você receberá um e-mail com o link para criar sua conta em breve."}
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
              <CardDescription>{errorMessage || "Não foi possível processar o contrato."}</CardDescription>
            </>
          )}

          {(status === "ready" || status === "signing") && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText className="h-10 w-10 text-blue-600" />
                </div>
              </div>
              <CardTitle>Contrato de Prestação de Serviços</CardTitle>
              <CardDescription>
                Leia o contrato abaixo e assine digitalmente para formalizar nossa parceria
              </CardDescription>
            </>
          )}
        </CardHeader>

        {/* Already signed state with registration link */}
        {status === "already_signed" && registrationUrl && (
          <CardContent className="space-y-6">
            {/* Registration Link - Prominent CTA */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700 mb-3 text-center">
                Clique no botão abaixo para criar sua conta:
              </p>
              <a href={registrationUrl} className="block">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6">
                  Criar Minha Conta
                </Button>
              </a>
            </div>

            {/* Copy link option */}
            <div className="space-y-2">
              <Label className="text-sm text-gray-600">Ou copie o link:</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={registrationUrl}
                  readOnly
                  className="text-sm bg-gray-50"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(registrationUrl);
                    toast.success("Link copiado!");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Email notice */}
            <div className="flex items-center gap-2 text-sm text-gray-500 justify-center">
              <Mail className="h-4 w-4" />
              <span>
                Email de cadastro: {signedCompanyEmail || "seu endereço cadastrado"}.
              </span>
            </div>
          </CardContent>
        )}

        {/* Success state with registration link */}
        {status === "success" && registrationUrl && (
          <CardContent className="space-y-6">
            {/* Registration Link - Prominent CTA */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700 mb-3 text-center">
                Clique no botão abaixo para criar sua conta:
              </p>
              <a href={registrationUrl} className="block">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6">
                  Criar Minha Conta
                </Button>
              </a>
            </div>

            {/* Copy link option */}
            <div className="space-y-2">
              <Label className="text-sm text-gray-600">Ou copie o link:</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={registrationUrl}
                  readOnly
                  className="text-sm bg-gray-50"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(registrationUrl);
                    toast.success("Link copiado!");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Email notice */}
            <div className="flex items-center gap-2 text-sm text-gray-500 justify-center">
              <Mail className="h-4 w-4" />
              <span>
                Um email também foi enviado para {signedCompanyEmail || "seu endereço cadastrado"}.
              </span>
            </div>
          </CardContent>
        )}

        {(status === "ready" || status === "signing") && company && (
          <CardContent className="space-y-6">
            {/* Company Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Dados da Empresa</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><strong>Nome:</strong> {companyName}</div>
                {company.formData?.cnpj && <div><strong>CNPJ:</strong> {companyCnpj}</div>}
                {company.company_email && <div><strong>E-mail:</strong> {company.company_email}</div>}
                {(company.formData?.contact_person || company.contact_name) && (
                  <div><strong>Contato:</strong> {company.formData?.contact_person || company.contact_name}</div>
                )}
                {(company.formData?.mobile_phone || company.formData?.contact_phone || company.contact_phone) && (
                  <div><strong>Telefone:</strong> {company.formData?.mobile_phone || company.formData?.contact_phone || company.contact_phone}</div>
                )}
                {company.formData?.address && (
                  <div className="col-span-2"><strong>Endereço:</strong> {companyAddress}</div>
                )}
              </div>
            </div>

            {/* Contract Content */}
            <div className="border rounded-lg bg-white overflow-hidden">
              {company.schoolContract?.type === "pdf" ? (
                // PDF Contract - Full height viewer
                <div className="space-y-2">
                  <div className="bg-gray-100 p-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Contrato PDF</span>
                    <a
                      href={company.schoolContract.pdfUrl || ""}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Abrir em nova aba
                    </a>
                  </div>
                  <iframe
                    src={`${company.schoolContract.pdfUrl}#toolbar=1&navpanes=0&view=FitH`}
                    className="w-full border-0"
                    style={{ height: "70vh", minHeight: "500px" }}
                    title="Contrato PDF"
                  />
                </div>
              ) : company.schoolContract?.type === "html" ? (
                // HTML Contract
                <div className="p-4 max-h-96 overflow-y-auto">
                  <div
                    className="prose prose-sm max-w-none whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: company.schoolContract.html || "" }}
                  />
                </div>
              ) : (
                // Default Contract Text
                <div className="p-4 max-h-64 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed text-gray-700">
                    {contractText}
                  </pre>
                </div>
              )}
            </div>

            {/* Signer Info */}
            <div className="space-y-4">
              <h3 className="font-semibold">Dados do Assinante</h3>

              <div className="space-y-2">
                <Label htmlFor="signerName">Nome Completo</Label>
                <Input
                  id="signerName"
                  placeholder="Digite seu nome completo"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  disabled={status === "signing"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signerCpf">CPF</Label>
                <Input
                  id="signerCpf"
                  placeholder="000.000.000-00"
                  value={signerCpf}
                  onChange={handleCpfChange}
                  disabled={status === "signing"}
                />
              </div>
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
              <label
                htmlFor="terms"
                className="text-sm leading-tight cursor-pointer"
              >
                Li e aceito os termos do contrato acima. Declaro que as informações fornecidas são verdadeiras e que tenho autorização para assinar em nome da empresa.
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
                "Assinar Contrato"
              )}
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
