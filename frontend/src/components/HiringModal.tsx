import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar,
  User,
  Building2,
  GraduationCap,
  Loader2,
  CheckCircle2,
  Clock,
  FileText,
  DollarSign,
  AlertCircle,
  PenLine,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import SignaturePad from "@/components/SignaturePad";

interface HiringModalProps {
  open: boolean;
  onClose: () => void;
  applicationId: string;
  batchId?: string;
  onSuccess: () => void;
}

type Step = "preview" | "details" | "sign" | "status";

export function HiringModal({
  open,
  onClose,
  applicationId,
  batchId,
  onSuccess,
}: HiringModalProps) {
  const [step, setStep] = useState<Step>("preview");
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [monthlySalary, setMonthlySalary] = useState<string>("");

  // Parent info (for estágio)
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentCpf, setParentCpf] = useState("");
  const [parentPhone, setParentPhone] = useState("");

  // School info (for estágio)
  const [schoolName, setSchoolName] = useState("");
  const [schoolEmail, setSchoolEmail] = useState("");
  const [schoolContact, setSchoolContact] = useState("");

  // Signature
  const [signature, setSignature] = useState<string>("");
  const [signerName, setSignerName] = useState("");
  const [signerCpf, setSignerCpf] = useState("");

  // Hiring process ID (set after initiateHiring succeeds)
  const [hiringProcessId, setHiringProcessId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  // Get hiring preview
  const { data: preview, isLoading: previewLoading } = trpc.hiring.getHiringPreview.useQuery(
    { applicationId },
    { enabled: open && !!applicationId }
  );

  // Initiate hiring mutation
  const initiateHiringMutation = trpc.hiring.initiateHiring.useMutation({
    onSuccess: (data) => {
      setHiringProcessId(data.hiringProcessId);
      if (data.requiresCompanySignature) {
        setStep("sign");
      } else {
        toast.success("Contratação iniciada!");
        onSuccess();
        onClose();
      }
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao iniciar contratação");
    },
  });

  // Sign as company mutation
  const signAsCompanyMutation = trpc.hiring.signAsCompany.useMutation({
    onSuccess: (data) => {
      if (data.signatureStatus.complete) {
        toast.success("Contrato assinado! Todas as assinaturas coletadas.");
        onSuccess();
        onClose();
      } else {
        toast.success("Assinatura registrada!");
        setStep("status");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao assinar contrato");
    },
  });

  // Pre-fill from candidate profile if available
  useEffect(() => {
    if (preview?.candidate) {
      if (preview.candidate.parentGuardianName) setParentName(preview.candidate.parentGuardianName);
      if (preview.candidate.parentGuardianEmail) setParentEmail(preview.candidate.parentGuardianEmail);
      if (preview.candidate.parentGuardianCpf) setParentCpf(preview.candidate.parentGuardianCpf);
      if (preview.candidate.parentGuardianPhone) setParentPhone(preview.candidate.parentGuardianPhone);
      if (preview.candidate.educationalInstitutionName) setSchoolName(preview.candidate.educationalInstitutionName);
      if (preview.candidate.educationalInstitutionEmail) setSchoolEmail(preview.candidate.educationalInstitutionEmail);
      if (preview.candidate.educationalInstitutionContact) setSchoolContact(preview.candidate.educationalInstitutionContact);
    }
    if (preview?.job?.salary) {
      setMonthlySalary(String(preview.job.salary / 100));
    }
  }, [preview]);

  const resetForm = () => {
    setStep("preview");
    setStartDate(new Date());
    setMonthlySalary("");
    setParentName("");
    setParentEmail("");
    setParentCpf("");
    setParentPhone("");
    setSchoolName("");
    setSchoolEmail("");
    setSchoolContact("");
    setSignature("");
    setSignerName("");
    setSignerCpf("");
    setHiringProcessId(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleInitiateHiring = () => {
    if (!startDate) {
      toast.error("Selecione a data de início");
      return;
    }

    const isEstagio = preview?.hiringType === "estagio";

    // Validate parent/school info for estágio
    if (isEstagio) {
      if (!parentName || !parentEmail || !parentCpf) {
        toast.error("Preencha os dados do responsável");
        return;
      }
      if (!schoolName || !schoolEmail) {
        toast.error("Preencha os dados da instituição de ensino");
        return;
      }
    }

    initiateHiringMutation.mutate({
      applicationId,
      batchId,
      startDate: startDate.toISOString().split("T")[0],
      monthlySalary: monthlySalary ? Math.round(parseFloat(monthlySalary) * 100) : undefined,
      parentInfo: isEstagio ? {
        name: parentName,
        email: parentEmail,
        cpf: parentCpf,
        phone: parentPhone || undefined,
      } : undefined,
      schoolInfo: isEstagio ? {
        name: schoolName,
        email: schoolEmail,
        contact: schoolContact || undefined,
      } : undefined,
    });
  };

  const handleSign = () => {
    if (!signature) {
      toast.error("Assine o documento");
      return;
    }
    if (!signerName || !signerCpf) {
      toast.error("Preencha seu nome e CPF");
      return;
    }
    if (!hiringProcessId) {
      toast.error("Erro interno: processo não encontrado");
      return;
    }

    signAsCompanyMutation.mutate({
      hiringProcessId,
      signerName: signerName.trim(),
      signerCpf: signerCpf.replace(/\D/g, ""),
      signature,
    });
  };

  const contractTypeLabels: Record<string, string> = {
    estagio: "Estágio",
    clt: "CLT",
    "menor-aprendiz": "Jovem Aprendiz",
  };
  const contractTypeLabel = contractTypeLabels[preview?.hiringType || ""] || preview?.hiringType;

  if (previewLoading) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === "preview" && "Contratar Candidato"}
            {step === "details" && "Dados da Contratação"}
            {step === "sign" && "Assinar Contrato"}
            {step === "status" && "Status das Assinaturas"}
          </DialogTitle>
          <DialogDescription>
            {step === "preview" && "Revise os dados antes de prosseguir"}
            {step === "details" && "Complete as informações necessárias"}
            {step === "sign" && "Assine o contrato digitalmente"}
            {step === "status" && "Acompanhe as assinaturas pendentes"}
          </DialogDescription>
        </DialogHeader>

        {/* Step: Preview */}
        {step === "preview" && preview && (
          <div className="space-y-4 py-4">
            {/* Candidate Info */}
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-medium">
                {preview.candidate.fullName?.charAt(0)?.toUpperCase()}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{preview.candidate.fullName}</h3>
                <p className="text-sm text-gray-500">{preview.candidate.email}</p>
                <p className="text-sm text-gray-500">{preview.candidate.phone}</p>
              </div>
            </div>

            {/* Job & Contract Type */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">{preview.job.title}</p>
                <Badge variant="outline" className="mt-1">
                  {contractTypeLabel}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Taxa</p>
                <p className="font-semibold text-lg">{preview.feeDisplay}</p>
              </div>
            </div>

            {/* Fee explanation */}
            {preview.hiringType === "estagio" && (
              <Alert>
                <DollarSign className="h-4 w-4" />
                <AlertDescription>
                  {preview.isFirstIntern
                    ? "Primeiro estagiário da empresa - taxa promocional R$ 150/mês"
                    : "Taxa mensal recorrente durante a vigência do estágio (12 meses)"}
                </AlertDescription>
              </Alert>
            )}

            {preview.hiringType === "clt" && (
              <Alert>
                <DollarSign className="h-4 w-4" />
                <AlertDescription>
                  Taxa única de 50% do salário. A empresa é responsável pelo contrato CLT.
                </AlertDescription>
              </Alert>
            )}

            {/* Multi-signature info for estágio */}
            {preview.requiresMultipleSignatures && (
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  O contrato de estágio requer 4 assinaturas: Empresa, Candidato, Responsável Legal e Instituição de Ensino.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Step: Details */}
        {step === "details" && preview && (
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {/* Start Date */}
            <div className="space-y-2">
              <Label>Data de Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    disabled={(date) => date < new Date()}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Monthly Salary (for CLT) */}
            {preview.hiringType === "clt" && (
              <div className="space-y-2">
                <Label>Salário Mensal (R$)</Label>
                <Input
                  type="number"
                  value={monthlySalary}
                  onChange={(e) => setMonthlySalary(e.target.value)}
                  placeholder="Ex: 2500.00"
                />
                {monthlySalary && (
                  <p className="text-sm text-gray-500">
                    Taxa: R$ {(parseFloat(monthlySalary) * 0.5).toFixed(2)} (50%)
                  </p>
                )}
              </div>
            )}

            {/* Parent/School info for estágio */}
            {preview.hiringType === "estagio" && (
              <>
                {/* Parent/Guardian Info */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <h4 className="font-medium">Responsável Legal</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label>Nome Completo *</Label>
                      <Input
                        value={parentName}
                        onChange={(e) => setParentName(e.target.value)}
                        placeholder="Nome do responsável"
                      />
                    </div>
                    <div>
                      <Label>CPF *</Label>
                      <Input
                        value={parentCpf}
                        onChange={(e) => setParentCpf(e.target.value)}
                        placeholder="000.000.000-00"
                      />
                    </div>
                    <div>
                      <Label>Telefone</Label>
                      <Input
                        value={parentPhone}
                        onChange={(e) => setParentPhone(e.target.value)}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>E-mail *</Label>
                      <Input
                        type="email"
                        value={parentEmail}
                        onChange={(e) => setParentEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                      />
                    </div>
                  </div>
                </div>

                {/* School Info */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <GraduationCap className="h-4 w-4 text-gray-500" />
                    <h4 className="font-medium">Instituição de Ensino</h4>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label>Nome da Instituição *</Label>
                      <Input
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        placeholder="Nome da escola/faculdade"
                      />
                    </div>
                    <div>
                      <Label>E-mail Institucional *</Label>
                      <Input
                        type="email"
                        value={schoolEmail}
                        onChange={(e) => setSchoolEmail(e.target.value)}
                        placeholder="contato@instituicao.edu.br"
                      />
                    </div>
                    <div>
                      <Label>Contato (Nome do Responsável)</Label>
                      <Input
                        value={schoolContact}
                        onChange={(e) => setSchoolContact(e.target.value)}
                        placeholder="Nome do coordenador/secretário"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step: Sign */}
        {step === "sign" && (
          <div className="space-y-4 py-4">
            <Alert>
              <PenLine className="h-4 w-4" />
              <AlertDescription>
                Assine abaixo para confirmar a contratação. Sua assinatura terá validade jurídica.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div>
                <Label>Seu Nome Completo</Label>
                <Input
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Nome como aparece no documento"
                />
              </div>
              <div>
                <Label>Seu CPF</Label>
                <Input
                  value={signerCpf}
                  onChange={(e) => setSignerCpf(e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <Label className="mb-2 block">Assinatura</Label>
              <SignaturePad
                onSave={setSignature}
              />
            </div>
          </div>
        )}

        {/* Step: Status */}
        {step === "status" && (
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>Empresa</span>
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Candidato</span>
                </div>
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Responsável Legal</span>
                </div>
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  <span>Instituição de Ensino</span>
                </div>
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                E-mails foram enviados para todas as partes. Você será notificado quando todas as assinaturas forem coletadas.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={() => setStep("details")}>
                Continuar
              </Button>
            </>
          )}

          {step === "details" && (
            <>
              <Button variant="outline" onClick={() => setStep("preview")}>
                Voltar
              </Button>
              <Button
                onClick={handleInitiateHiring}
                disabled={initiateHiringMutation.isPending}
              >
                {initiateHiringMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {preview?.hiringType === "estagio" ? "Gerar Contrato" : "Confirmar Contratação"}
              </Button>
            </>
          )}

          {step === "sign" && (
            <>
              <Button variant="outline" onClick={() => setStep("details")}>
                Voltar
              </Button>
              <Button
                onClick={handleSign}
                disabled={signAsCompanyMutation.isPending || !signature}
              >
                {signAsCompanyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Assinar Contrato
              </Button>
            </>
          )}

          {step === "status" && (
            <Button onClick={handleClose}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
