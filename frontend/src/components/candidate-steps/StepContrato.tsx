import { useRef, useState } from "react";
import { useCandidateFunnel } from "@/contexts/CandidateFunnelContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CardEntrance } from "@/components/funnel";
import {
  FileText,
  PenTool,
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  Eraser,
  Users,
  GraduationCap,
  Building2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const hiringTypeLabels: Record<string, string> = {
  estagio: "Estágio",
  clt: "CLT",
  "menor-aprendiz": "Jovem Aprendiz",
};

export default function StepContrato() {
  const { selectedApplication, refreshData } = useCandidateFunnel();
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [signerName, setSignerName] = useState("");
  const [signerCpf, setSignerCpf] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const sigRef = useRef<any>(null);

  // Get hiring process for this application
  const { data: hiringProcesses = [] } = trpc.hiring.getCandidateHiringProcesses.useQuery(
    undefined,
    { enabled: !!selectedApplication }
  );

  const hiringProcess = (hiringProcesses as any[]).find(
    (hp: any) => hp.application_id === selectedApplication?.id
  ) || (hiringProcesses as any[]).find(
    (hp: any) => hp.job?.id === selectedApplication?.job_id
  ) || (hiringProcesses as any[])[0] || null;

  // Get agency documents for this hiring process
  const utils = trpc.useUtils();
  const { data: documentsData, isLoading: isDocsLoading } = trpc.contract.getCandidateContractDocuments.useQuery(
    { hiringProcessId: hiringProcess?.id },
    { enabled: !!hiringProcess?.id }
  );

  const signDocMutation = trpc.contract.signDocumentAsCandidate.useMutation({
    onSuccess: (result) => {
      toast.success("Documento assinado com sucesso!");
      setExpandedDoc(null);
      setSignerName("");
      setSignerCpf("");
      setAcceptedTerms(false);
      setErrorMessage("");
      sigRef.current?.clear?.();
      utils.contract.getCandidateContractDocuments.invalidate({ hiringProcessId: hiringProcess?.id });
      refreshData();
    },
    onError: (error) => {
      setErrorMessage(error.message || "Erro ao assinar documento");
    },
  });

  // Keep the old hiring process sign mutation for the main contract signature
  const signContractMutation = trpc.hiring.signAsCandidate.useMutation({
    onSuccess: () => {
      toast.success("Contrato assinado com sucesso!");
      refreshData();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao assinar contrato");
    },
  });

  if (!selectedApplication) {
    return <EmptyState />;
  }

  // If no hiring process, show waiting state
  if (!hiringProcess) {
    return (
      <div className="space-y-6">
        <CardEntrance>
          <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-[#FF6B35]/20 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-[#FF6B35]" />
            </div>
            <h2 className="text-xl font-bold text-[#0A2342] mb-2">Aguardando contrato</h2>
            <p className="text-slate-600 max-w-md mx-auto">
              O contrato está sendo preparado. Você será notificado quando estiver pronto para assinatura.
            </p>
          </div>
        </CardEntrance>
      </div>
    );
  }

  // If already signed
  if (hiringProcess.candidate_signed) {
    return (
      <div className="space-y-6">
        <CardEntrance>
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h2 className="text-[#0A2342] font-semibold text-lg">Contrato Assinado</h2>
                <p className="text-green-400 text-sm mt-0.5">
                  Você assinou em {hiringProcess.candidate_signed_at && format(new Date(hiringProcess.candidate_signed_at), "dd/MM/yyyy")}
                </p>
              </div>
            </div>
          </div>
        </CardEntrance>

        {/* Signature progress */}
        {hiringProcess.hiring_type === "estagio" && (
          <CardEntrance delay={0.1}>
            <SignatureProgress hiringProcess={hiringProcess} />
          </CardEntrance>
        )}
      </div>
    );
  }

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const handleSignDocument = (templateId: string) => {
    if (!signerName.trim()) {
      setErrorMessage("Preencha o nome completo");
      return;
    }
    if (signerCpf.replace(/\D/g, "").length !== 11) {
      setErrorMessage("Por favor, informe um CPF válido");
      return;
    }
    if (!acceptedTerms) {
      setErrorMessage("Por favor, aceite os termos");
      return;
    }

    setErrorMessage("");
    signDocMutation.mutate({
      templateId,
      hiringProcessId: hiringProcess.id,
      signerName: signerName.trim(),
      signerCpf: signerCpf.replace(/\D/g, ""),
      signature: "candidate-signature", // placeholder since document signing doesn't use canvas here
    });
  };

  const typeLabel = hiringTypeLabels[hiringProcess.hiring_type] || hiringProcess.hiring_type;

  // Show contract documents
  return (
    <div className="space-y-6">
      {/* Header */}
      <CardEntrance>
        <div className="bg-gradient-to-r from-[#FF6B35]/10 to-[#FF6B35]/5 rounded-xl border border-[#FF6B35]/20 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#FF6B35]/20 flex items-center justify-center">
              <FileText className="w-6 h-6 text-[#FF6B35]" />
            </div>
            <div className="flex-1">
              <h2 className="text-[#0A2342] font-semibold text-lg">Documentos para assinatura</h2>
              <p className="text-slate-600 text-sm mt-0.5">
                Contrato de {typeLabel} — assine os documentos abaixo
              </p>
            </div>
            {documentsData && (
              <span className="text-sm font-medium text-[#0A2342] bg-white px-3 py-1 rounded-full border border-slate-200">
                {documentsData.signedCount}/{documentsData.total}
              </span>
            )}
          </div>
        </div>
      </CardEntrance>

      {/* Start date */}
      {hiringProcess.start_date && (
        <CardEntrance delay={0.05}>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-slate-600 text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Início previsto: {format(new Date(hiringProcess.start_date), "dd/MM/yyyy")}
            </p>
          </div>
        </CardEntrance>
      )}

      {/* Document list */}
      {isDocsLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-[#FF6B35]" />
        </div>
      ) : documentsData && documentsData.templates.length > 0 ? (
        <div className="space-y-3">
          {documentsData.templates.map((template: any, index: number) => {
            const isExpanded = expandedDoc === template.id;

            return (
              <CardEntrance key={template.id} delay={0.1 + index * 0.05}>
                <div className={`rounded-xl border ${template.isSigned ? "border-green-500/30 bg-green-500/5" : "border-slate-200"} overflow-hidden`}>
                  {/* Document header */}
                  <button
                    onClick={() => {
                      if (!template.isSigned && !template.autentiqueSignUrl) {
                        setExpandedDoc(isExpanded ? null : template.id);
                        setErrorMessage("");
                        setAcceptedTerms(false);
                      }
                    }}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50/50 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      template.isSigned ? "bg-green-500/20" : "bg-slate-100"
                    }`}>
                      {template.isSigned ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <FileText className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${template.isSigned ? "text-green-700" : "text-[#0A2342]"}`}>
                        {template.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {template.isSigned ? "Assinado" : template.autentiqueSignUrl ? "Pendente (Autentique)" : "Pendente"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {template.isSigned ? (
                        <span className="text-xs font-medium text-green-600 bg-green-500/10 px-2.5 py-1 rounded-full">
                          Assinado
                        </span>
                      ) : (
                        <>
                          <span className="text-xs font-medium text-[#FF6B35] bg-[#FF6B35]/10 px-2.5 py-1 rounded-full">
                            Pendente
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </>
                      )}
                    </div>
                  </button>

                  {/* Autentique signing */}
                  {!template.isSigned && template.autentiqueSignUrl && (
                    <div className="border-t border-slate-200 p-4 space-y-3 bg-slate-50/50">
                      <p className="text-sm text-slate-600">
                        A assinatura deste documento será realizada pela plataforma Autentique com validade jurídica.
                      </p>
                      <button
                        onClick={() => window.open(template.autentiqueSignUrl, '_blank')}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-[#0A2342] text-white hover:bg-[#1B4D7A] transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Assinar na Autentique
                      </button>
                    </div>
                  )}

                  {/* Expanded signing form (fallback when no Autentique) */}
                  {isExpanded && !template.isSigned && !template.autentiqueSignUrl && (
                    <div className="border-t border-slate-200 p-4 space-y-4 bg-slate-50/50">
                      {/* View PDF link */}
                      {template.file_url && (
                        <a
                          href={template.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-[#FF6B35] hover:text-[#0A2342] transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Visualizar documento completo
                        </a>
                      )}

                      {/* Signer info */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-slate-600 block mb-1.5">
                            Nome Completo
                          </label>
                          <input
                            type="text"
                            placeholder="Seu nome completo"
                            value={signerName}
                            onChange={(e) => setSignerName(e.target.value)}
                            disabled={signDocMutation.isPending}
                            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-[#0A2342] text-sm placeholder-slate-400 focus:border-[#FF6B35]/50 focus:ring-2 focus:ring-[#FF6B35]/20 focus:outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-600 block mb-1.5">
                            CPF
                          </label>
                          <input
                            type="text"
                            placeholder="000.000.000-00"
                            value={signerCpf}
                            onChange={(e) => setSignerCpf(formatCpf(e.target.value))}
                            disabled={signDocMutation.isPending}
                            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-[#0A2342] text-sm placeholder-slate-400 focus:border-[#FF6B35]/50 focus:ring-2 focus:ring-[#FF6B35]/20 focus:outline-none transition-all"
                          />
                        </div>
                      </div>

                      {/* Terms */}
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          id={`terms-${template.id}`}
                          checked={acceptedTerms}
                          onChange={(e) => setAcceptedTerms(e.target.checked)}
                          disabled={signDocMutation.isPending}
                          className="mt-0.5 w-4 h-4 rounded border-slate-200 text-[#FF6B35] focus:ring-[#FF6B35]/20"
                        />
                        <label htmlFor={`terms-${template.id}`} className="text-xs text-slate-600 cursor-pointer">
                          Li e concordo com os termos deste documento
                        </label>
                      </div>

                      {/* Error */}
                      {errorMessage && (
                        <p className="text-red-500 text-xs">{errorMessage}</p>
                      )}

                      {/* Sign button */}
                      <button
                        onClick={() => handleSignDocument(template.id)}
                        disabled={signDocMutation.isPending}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-[#1B4D7A] to-[#FF6B35] text-white font-medium text-sm shadow-lg shadow-[#FF6B35]/25 hover:shadow-[#FF6B35]/40 transition-all disabled:opacity-50"
                      >
                        {signDocMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Assinando...
                          </>
                        ) : (
                          <>
                            <PenTool className="w-4 h-4" />
                            Assinar Documento
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </CardEntrance>
            );
          })}

          {/* All signed message */}
          {documentsData.allSigned && documentsData.total > 0 && (
            <CardEntrance delay={0.2}>
              <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-green-700">Todos os documentos foram assinados!</span>
              </div>
            </CardEntrance>
          )}
        </div>
      ) : (
        <CardEntrance delay={0.1}>
          <div className="rounded-xl border border-slate-200 p-6 text-center">
            <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">Nenhum documento disponível para esta categoria.</p>
          </div>
        </CardEntrance>
      )}

      {/* Signature progress for estágio */}
      {hiringProcess.hiring_type === "estagio" && (
        <CardEntrance delay={0.3}>
          <SignatureProgress hiringProcess={hiringProcess} />
        </CardEntrance>
      )}
    </div>
  );
}

function SignatureProgress({ hiringProcess }: { hiringProcess: any }) {
  const signatures = [
    { label: "Empresa", icon: Building2, signed: hiringProcess.company_signed },
    { label: "Você", icon: Users, signed: hiringProcess.candidate_signed },
    { label: "Responsável", icon: Users, signed: hiringProcess.parent_signed },
    { label: "Escola", icon: GraduationCap, signed: hiringProcess.school_signed },
  ];

  const signedCount = signatures.filter((s) => s.signed).length;

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6">
      <h3 className="text-[#0A2342] font-semibold mb-4">Progresso das Assinaturas</h3>
      <div className="grid grid-cols-2 gap-3">
        {signatures.map((sig, index) => (
          <div
            key={index}
            className={`flex items-center gap-2 p-3 rounded-lg border ${
              sig.signed
                ? "bg-green-500/10 border-green-500/30"
                : "bg-slate-100 border-slate-200"
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              sig.signed ? "bg-green-500/20" : "bg-[#2A2A2D]"
            }`}>
              {sig.signed ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <sig.icon className="w-4 h-4 text-slate-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className={`text-sm font-medium ${sig.signed ? "text-green-400" : "text-[#0A2342]"}`}>
                {sig.label}
              </span>
              <p className="text-xs text-slate-600">
                {sig.signed ? "Assinado" : "Pendente"}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Total</span>
          <span className="text-[#0A2342] font-medium">{signedCount}/4 assinaturas</span>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center mb-4">
        <FileText className="w-8 h-8 text-slate-600" />
      </div>
      <h3 className="text-lg font-medium text-[#0A2342] mb-2">Nenhuma candidatura selecionada</h3>
      <p className="text-slate-600 max-w-sm">Selecione uma candidatura para ver os detalhes</p>
    </div>
  );
}
