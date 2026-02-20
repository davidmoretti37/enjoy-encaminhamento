// @ts-nocheck
import { useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import ClassicLoader from "@/components/ui/ClassicLoader";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import SignatureCanvas from "react-signature-canvas";
import {
  FileText,
  CheckCircle,
  Clock,
  Building2,
  Briefcase,
  Calendar,
  Loader2,
  Eraser,
  PenLine,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function CandidateSignContract() {
  const { user, loading: authLoading } = useAuth();
  const [selectedProcess, setSelectedProcess] = useState<any>(null);
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [signerCpf, setSignerCpf] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const sigRef = useRef<SignatureCanvas>(null);

  const utils = trpc.useUtils();

  // Fetch candidate's hiring processes
  const processesQuery = trpc.hiring.getCandidateHiringProcesses.useQuery(undefined, {
    enabled: !!user,
  });

  // Sign mutation
  const signMutation = trpc.hiring.signAsCandidate.useMutation({
    onSuccess: () => {
      toast.success("Contrato assinado com sucesso!");
      setShowSignDialog(false);
      setSelectedProcess(null);
      setSignerCpf("");
      setAcceptedTerms(false);
      setErrorMessage("");
      utils.hiring.getCandidateHiringProcesses.invalidate();
    },
    onError: (error) => {
      setErrorMessage(error.message || "Erro ao assinar contrato");
    },
  });

  const isLoading = authLoading || processesQuery.isLoading;
  const processes = processesQuery.data || [];

  // Separate pending and signed
  const pendingSignature = processes.filter((p: any) => !p.candidate_signed && p.hiring_type === "estagio");
  const signed = processes.filter((p: any) => p.candidate_signed || p.hiring_type === "clt");

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

  const getAutentiqueSignUrl = (process: any): string | null => {
    const invitations = process.signing_invitations || [];
    const candidateInvitation = invitations.find(
      (inv: any) => inv.signer_role === "candidate" && inv.autentique_sign_url
    );
    return candidateInvitation?.autentique_sign_url || null;
  };

  const handleOpenSign = (process: any) => {
    // If Autentique URL available, redirect directly
    const autentiqueUrl = getAutentiqueSignUrl(process);
    if (autentiqueUrl) {
      window.open(autentiqueUrl, "_blank");
      return;
    }

    setSelectedProcess(process);
    setShowSignDialog(true);
    setSignerCpf("");
    setAcceptedTerms(false);
    setErrorMessage("");
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
    const signature = sigRef.current.toDataURL();

    signMutation.mutate({
      hiringProcessId: selectedProcess.id,
      signerCpf: signerCpf.replace(/\D/g, ""),
      signature,
    });
  };

  const getSignatureProgress = (process: any) => {
    if (process.hiring_type !== "estagio") return null;

    const signed = [
      process.company_signed,
      process.candidate_signed,
      process.parent_signed,
      process.school_signed,
    ].filter(Boolean).length;

    return { signed, total: 4 };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ClassicLoader />
      </div>
    );
  }

  if (!user || user.role !== "candidate") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Esta página é exclusiva para candidatos.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center py-4">
          <h1 className="text-3xl font-bold text-gray-900">Meus Contratos</h1>
          <p className="text-gray-500 mt-1">Assine seus contratos de estágio</p>
        </div>

        {/* Pending Signatures */}
        {pendingSignature.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/30">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <CardTitle className="text-lg">Contratos Pendentes de Assinatura</CardTitle>
              </div>
              <CardDescription>
                Assine os contratos abaixo para concluir sua contratação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingSignature.map((process: any) => {
                const progress = getSignatureProgress(process);
                const hasAutentique = !!getAutentiqueSignUrl(process);

                return (
                  <div key={process.id} className="bg-white rounded-lg p-4 border border-amber-200">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="space-y-2">
                        <h4 className="font-semibold">{process.job?.title || "Vaga de Estágio"}</h4>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-4 w-4" />
                            {process.company?.company_name || "Empresa"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Início: {process.start_date && format(new Date(process.start_date), "dd/MM/yyyy")}
                          </span>
                          {progress && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <PenLine className="h-3 w-3" />
                              {progress.signed}/{progress.total} assinaturas
                            </Badge>
                          )}
                        </div>
                        {hasAutentique && (
                          <div className="flex items-center gap-1 text-xs text-green-600">
                            <ShieldCheck className="h-3 w-3" />
                            Assinatura digital certificada via Autentique
                          </div>
                        )}
                      </div>

                      <Button onClick={() => handleOpenSign(process)}>
                        {hasAutentique ? (
                          <>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Assinar na Autentique
                          </>
                        ) : (
                          <>
                            <PenLine className="h-4 w-4 mr-2" />
                            Assinar Contrato
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Signed Contracts */}
        {signed.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <CardTitle className="text-lg">Contratos Assinados</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {signed.map((process: any) => {
                const progress = getSignatureProgress(process);

                return (
                  <div key={process.id} className="bg-gray-50 rounded-lg p-4 border">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{process.job?.title || "Vaga"}</h4>
                          <Badge variant="outline" className="text-xs">
                            {process.hiring_type === "estagio" ? "Estágio" : "CLT"}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-4 w-4" />
                            {process.company?.company_name || "Empresa"}
                          </span>
                          {process.candidate_signed_at && (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              Assinado em {format(new Date(process.candidate_signed_at), "dd/MM/yyyy")}
                            </span>
                          )}
                        </div>
                      </div>

                      {progress && (
                        <div className="flex items-center gap-2">
                          {progress.signed === progress.total ? (
                            <Badge className="bg-green-100 text-green-800">
                              Todas assinaturas coletadas
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Aguardando {progress.total - progress.signed} assinatura(s)
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {processes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-24 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50 flex flex-col items-center justify-center gap-2 mb-6">
              <FileText className="h-8 w-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-medium text-gray-500 mb-1">
              Nenhum contrato pendente
            </h3>
            <p className="text-gray-400 text-sm">
              Quando você for selecionado para uma vaga, o contrato aparecerá aqui.
            </p>
          </div>
        )}

        {/* Sign Dialog */}
        <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Assinar Contrato de Estágio
              </DialogTitle>
              <DialogDescription>
                Leia os termos e assine digitalmente
              </DialogDescription>
            </DialogHeader>

            {selectedProcess && (
              <div className="space-y-6 py-4">
                {/* Contract Info */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{selectedProcess.job?.title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-gray-500" />
                    <span>{selectedProcess.company?.company_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>
                      Início: {selectedProcess.start_date && format(new Date(selectedProcess.start_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </span>
                  </div>
                </div>

                {/* Contract Terms */}
                <div className="border rounded-lg p-4 max-h-48 overflow-y-auto text-sm text-gray-600 space-y-2">
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

                {/* CPF Input */}
                <div className="space-y-2">
                  <Label htmlFor="signerCpf">Confirme seu CPF</Label>
                  <Input
                    id="signerCpf"
                    placeholder="000.000.000-00"
                    value={signerCpf}
                    onChange={handleCpfChange}
                    disabled={signMutation.isPending}
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
                      disabled={signMutation.isPending}
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
                    disabled={signMutation.isPending}
                  />
                  <label htmlFor="terms" className="text-sm leading-tight cursor-pointer">
                    Li e concordo com os termos do contrato de estágio. Declaro que as informações são verdadeiras.
                  </label>
                </div>

                {/* Error Message */}
                {errorMessage && (
                  <p className="text-sm text-red-600 text-center">{errorMessage}</p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowSignDialog(false)}
                disabled={signMutation.isPending}
              >
                Cancelar
              </Button>
              <Button onClick={handleSign} disabled={signMutation.isPending}>
                {signMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Assinando...
                  </>
                ) : (
                  "Assinar Contrato"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
