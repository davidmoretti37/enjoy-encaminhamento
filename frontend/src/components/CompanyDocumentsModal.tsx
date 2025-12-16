import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Building2,
  Mail,
  FileSignature,
  Clock,
  CheckCircle2,
  Loader2,
  FileText,
  Users,
  Eye,
  Calendar,
  FileCheck,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Upload,
  Download,
  ExternalLink,
  PenLine,
  Phone,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { trpc } from "@/lib/trpc";
import { getDocumentTypeLabel } from "@/lib/excelParser";

interface Meeting {
  id: string;
  company_name: string | null;
  company_email: string;
  contact_name: string | null;
  scheduled_at: string;
  status: string;
  contract_sent_at: string | null;
  contract_signed_at: string | null;
  contract_signer_name: string | null;
}

interface CompanyDocumentsModalProps {
  meeting: Meeting | null;
  open: boolean;
  onClose: () => void;
}

export default function CompanyDocumentsModal({
  meeting,
  open,
  onClose,
}: CompanyDocumentsModalProps) {
  const [showFormPreview, setShowFormPreview] = useState(false);
  const [showContractPreview, setShowContractPreview] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    contract: false,
    form: false,
    employees: false,
    emails: false,
  });
  const [isUploading, setIsUploading] = useState(false);

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const utils = trpc.useUtils();

  const { data: historyData, isLoading, refetch } = trpc.outreach.getCompanyFullHistory.useQuery(
    { companyEmail: meeting?.company_email || "" },
    { enabled: !!meeting?.company_email && open }
  );

  const uploadMutation = trpc.outreach.uploadSignedContract.useMutation({
    onSuccess: () => {
      toast.success("Contrato enviado com sucesso!");
      refetch();
      setIsUploading(false);
    },
    onError: (error) => {
      toast.error(`Erro ao enviar contrato: ${error.message}`);
      setIsUploading(false);
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !meeting) return;

    if (file.type !== 'application/pdf') {
      toast.error("Por favor, selecione um arquivo PDF");
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error("Arquivo muito grande. Máximo 10MB");
      return;
    }

    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      uploadMutation.mutate({
        companyEmail: meeting.company_email,
        fileBase64: base64,
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  if (!meeting) return null;

  const formData = historyData?.form;
  const companyData = historyData?.company;
  const contracts = historyData?.contracts || [];
  const emails = historyData?.emails || [];

  // Use company data if form data doesn't exist (for companies that went through onboarding)
  const displayData = formData || (companyData ? {
    legal_name: companyData.company_name,
    business_name: companyData.business_name,
    cnpj: companyData.cnpj,
    email: companyData.email,
    contact_person: companyData.contact_person,
    contact_phone: companyData.contact_phone || companyData.phone,
    mobile_phone: companyData.mobile_phone,
    landline_phone: companyData.landline_phone,
    website: companyData.website,
    social_media: companyData.social_media,
    employee_count: companyData.employee_count,
    cep: companyData.cep,
    address: companyData.address,
    complement: companyData.complement,
    neighborhood: companyData.neighborhood,
    city: companyData.city,
    state: companyData.state,
    created_at: companyData.created_at,
    // Job data from the first job if available
    job_title: historyData?.jobs?.[0]?.title,
    compensation: historyData?.jobs?.[0]?.salary,
    employment_type: historyData?.jobs?.[0]?.contract_type,
    work_schedule: historyData?.jobs?.[0]?.work_schedule,
    benefits: historyData?.jobs?.[0]?.benefits,
    main_activities: historyData?.jobs?.[0]?.description,
    required_skills: historyData?.jobs?.[0]?.requirements,
  } : null);

  // Use real data from historyData.meeting (from database), not the meeting prop (may have fake data)
  const realMeeting = historyData?.meeting;

  // Contract data can come from meeting (outreach flow) or company (onboarding flow)
  const contractData = {
    signed_at: companyData?.contract_signed_at || realMeeting?.contract_signed_at,
    signature: companyData?.contract_signature || realMeeting?.contract_signature,
    signer_name: companyData?.contract_signer_name || realMeeting?.contract_signer_name,
    signer_cpf: companyData?.contract_signer_cpf || realMeeting?.contract_signer_cpf,
    sent_at: realMeeting?.contract_sent_at,
    pdf_url: realMeeting?.contract_pdf_url,
  };

  const getContractStatus = () => {
    if (contractData.signed_at) {
      return { label: "Assinado", color: "bg-green-100 text-green-700", icon: CheckCircle2 };
    }
    if (contractData.sent_at) {
      return { label: "Aguardando Assinatura", color: "bg-amber-100 text-amber-700", icon: Clock };
    }
    return { label: "Não Enviado", color: "bg-gray-100 text-gray-700", icon: AlertCircle };
  };

  const contractStatus = getContractStatus();
  const ContractIcon = contractStatus.icon;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="!max-w-[900px] !w-[90vw] !max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Documentos - {meeting.company_name || "Empresa"}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="max-h-[80vh] pr-4">
            <div className="space-y-3">
              {/* Company Info Section - Always visible (FIRST) */}
              {displayData ? (
                <div className="p-4 rounded-lg border bg-white space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Building2 className="h-5 w-5 text-purple-600" />
                    <h3 className="font-semibold">Dados da Empresa</h3>
                  </div>

                  {/* Basic Info */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Razão Social</span>
                      <p className="font-medium">{displayData.legal_name || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Nome Fantasia</span>
                      <p className="font-medium">{displayData.business_name || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{displayData.cnpj ? getDocumentTypeLabel(displayData.cnpj) : 'CNPJ/CPF'}</span>
                      <p className="font-medium">{displayData.cnpj || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Responsável</span>
                      <p className="font-medium">{displayData.contact_person || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cadastrado em</span>
                      <p className="font-medium">
                        {displayData.created_at
                          ? format(new Date(displayData.created_at), "dd/MM/yyyy", { locale: ptBR })
                          : "-"}
                      </p>
                    </div>
                  </div>

                  {/* Phone Numbers */}
                  <div>
                    <span className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                      <Phone className="h-4 w-4" /> Telefones
                    </span>
                    {historyData?.phoneNumbers && historyData.phoneNumbers.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {historyData.phoneNumbers.map((phone: { label: string; phone_number: string }, idx: number) => (
                          <div key={idx} className="px-3 py-1.5 bg-gray-100 rounded-md text-sm">
                            <span className="text-muted-foreground">{phone.label || "Principal"}: </span>
                            <span className="font-medium">{phone.phone_number}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {displayData.contact_phone && (
                          <div className="px-3 py-1.5 bg-gray-100 rounded-md text-sm">
                            <span className="text-muted-foreground">Principal: </span>
                            <span className="font-medium">{displayData.contact_phone}</span>
                          </div>
                        )}
                        {displayData.mobile_phone && displayData.mobile_phone !== displayData.contact_phone && (
                          <div className="px-3 py-1.5 bg-gray-100 rounded-md text-sm">
                            <span className="text-muted-foreground">Celular: </span>
                            <span className="font-medium">{displayData.mobile_phone}</span>
                          </div>
                        )}
                        {displayData.landline_phone && (
                          <div className="px-3 py-1.5 bg-gray-100 rounded-md text-sm">
                            <span className="text-muted-foreground">Fixo: </span>
                            <span className="font-medium">{displayData.landline_phone}</span>
                          </div>
                        )}
                        {!displayData.contact_phone && !displayData.mobile_phone && !displayData.landline_phone && (
                          <p className="text-sm text-muted-foreground">Nenhum telefone cadastrado</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Emails */}
                  <div>
                    <span className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                      <Mail className="h-4 w-4" /> Emails
                    </span>
                    {historyData?.companyEmails && historyData.companyEmails.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {historyData.companyEmails.map((emailItem: { label: string; email: string; is_primary: boolean }, idx: number) => (
                          <div key={idx} className={`px-3 py-1.5 rounded-md text-sm ${emailItem.is_primary ? 'bg-blue-100 border border-blue-300' : 'bg-gray-100'}`}>
                            <span className="text-muted-foreground">{emailItem.label || "Principal"}: </span>
                            <span className="font-medium">{emailItem.email}</span>
                            {emailItem.is_primary && (
                              <Badge className="ml-2 bg-blue-600 text-white text-xs py-0 px-1.5">Principal</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : displayData.email ? (
                      <div className="flex flex-wrap gap-2">
                        <div className="px-3 py-1.5 bg-gray-100 rounded-md text-sm">
                          <span className="text-muted-foreground">Principal: </span>
                          <span className="font-medium">{displayData.email}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum email cadastrado</p>
                    )}
                  </div>

                  {/* Address */}
                  {(displayData.address || displayData.city) && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Endereço</span>
                      <p className="font-medium">
                        {[
                          displayData.address,
                          displayData.complement,
                          displayData.neighborhood,
                          displayData.city,
                          displayData.state,
                          displayData.cep
                        ].filter(Boolean).join(", ") || "-"}
                      </p>
                    </div>
                  )}

                  {/* Website */}
                  {displayData.website && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Website</span>
                      <p className="font-medium">{displayData.website}</p>
                    </div>
                  )}

                  {/* Job Info */}
                  {displayData.job_title && (
                    <div className="pt-2 border-t">
                      <span className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                        <Briefcase className="h-4 w-4" /> Vaga Solicitada
                      </span>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Cargo</span>
                          <p className="font-medium">{displayData.job_title}</p>
                        </div>
                        {displayData.compensation && (
                          <div>
                            <span className="text-muted-foreground">Remuneração</span>
                            <p className="font-medium">{displayData.compensation}</p>
                          </div>
                        )}
                        {displayData.employment_type && (
                          <div>
                            <span className="text-muted-foreground">Tipo</span>
                            <p className="font-medium">{displayData.employment_type}</p>
                          </div>
                        )}
                        {displayData.work_schedule && (
                          <div>
                            <span className="text-muted-foreground">Horário</span>
                            <p className="font-medium">{displayData.work_schedule}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-lg border bg-white">
                  <div className="flex items-center gap-2 pb-2 border-b mb-3">
                    <Building2 className="h-5 w-5 text-purple-600" />
                    <h3 className="font-semibold">Dados da Empresa</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Empresa ainda não completou o cadastro.
                  </p>
                  <div className="flex items-center gap-3">
                    <Label
                      htmlFor="form-upload"
                      className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
                    >
                      <Upload className="h-4 w-4" />
                      Upload Formulário
                    </Label>
                    <Input
                      id="form-upload"
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                      className="hidden"
                      onChange={(e) => {
                        toast.info("Funcionalidade em desenvolvimento");
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Service Contract Section */}
              <Collapsible open={openSections.contract} onOpenChange={() => toggleSection('contract')}>
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-white hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      {openSections.contract ? (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-500" />
                      )}
                      <FileSignature className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">Contrato de Serviço</span>
                    </div>
                    <Badge className={contractStatus.color}>
                      <ContractIcon className="h-3 w-3 mr-1" />
                      {contractStatus.label}
                    </Badge>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 py-3 ml-8 border-l-2 border-gray-200 space-y-4">
                    {/* Contract Status Info */}
                    {contractData.sent_at && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        Enviado em: {format(new Date(contractData.sent_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    )}
                    {contractData.signed_at && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        Assinado em: {format(new Date(contractData.signed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        {contractData.signer_name && ` por ${contractData.signer_name}`}
                      </div>
                    )}
                    {contractData.signer_cpf && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        CPF: {contractData.signer_cpf}
                      </div>
                    )}

                    {/* View signed contract button */}
                    {contractData.signed_at && (historyData?.schoolContract || contractData.signature) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowContractPreview(true)}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Ver Contrato e Assinatura
                      </Button>
                    )}

                    {/* View uploaded PDF if exists */}
                    {contractData.pdf_url && (
                      <div className="flex items-center gap-2">
                        <a
                          href={contractData.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                        >
                          <Download className="h-4 w-4" />
                          Visualizar PDF Enviado
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}

                    {/* Upload contract section - only show if not signed */}
                    {!contractData.signed_at && (
                      <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground mb-3">
                          {contractData.sent_at
                            ? "Se a empresa já assinou o contrato offline, faça o upload aqui:"
                            : "Faça upload do contrato assinado:"}
                        </p>
                        <div className="flex items-center gap-3">
                          <Label
                            htmlFor="contract-upload"
                            className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Enviando...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4" />
                                Upload PDF
                              </>
                            )}
                          </Label>
                          <Input
                            id="contract-upload"
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={isUploading}
                          />
                        </div>
                      </div>
                    )}

                    {!contractData.sent_at && !contractData.signed_at && (
                      <p className="text-sm text-muted-foreground">
                        Contrato ainda não foi enviado para esta empresa.
                      </p>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Employee Contracts Section */}
              <Collapsible open={openSections.employees} onOpenChange={() => toggleSection('employees')}>
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-white hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      {openSections.employees ? (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-500" />
                      )}
                      <Users className="h-5 w-5 text-orange-600" />
                      <span className="font-medium">Contratos de Funcionários</span>
                    </div>
                    <Badge variant="secondary">{contracts.length}</Badge>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 py-3 ml-8 border-l-2 border-gray-200">
                    {contracts.length > 0 ? (
                      <div className="space-y-2">
                        {contracts.map((contract: any) => (
                          <div
                            key={contract.id}
                            className="flex items-center justify-between p-3 rounded-lg border bg-gray-50"
                          >
                            <div>
                              <p className="font-medium">{contract.candidate?.full_name || "Candidato"}</p>
                              <p className="text-sm text-muted-foreground">{contract.job?.title || "Vaga"}</p>
                            </div>
                            <Badge
                              className={
                                contract.status === "active"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-700"
                              }
                            >
                              {contract.status === "active" ? "Ativo" : contract.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Nenhum contrato de funcionário registrado.
                      </p>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Email History Section */}
              <Collapsible open={openSections.emails} onOpenChange={() => toggleSection('emails')}>
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-white hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      {openSections.emails ? (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-500" />
                      )}
                      <Mail className="h-5 w-5 text-teal-600" />
                      <span className="font-medium">Histórico de Emails</span>
                    </div>
                    <Badge variant="secondary">{emails.length}</Badge>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 py-3 ml-8 border-l-2 border-gray-200">
                    {emails.length > 0 ? (
                      <div className="space-y-2">
                        {emails.slice(0, 5).map((email: any) => (
                          <div
                            key={email.id}
                            className="flex items-center justify-between p-3 rounded-lg border bg-gray-50"
                          >
                            <div>
                              <p className="font-medium text-sm">{email.subject || email.email_type}</p>
                              <p className="text-xs text-muted-foreground">
                                {email.sent_at
                                  ? format(new Date(email.sent_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                                  : "-"}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {email.status || "enviado"}
                            </Badge>
                          </div>
                        ))}
                        {emails.length > 5 && (
                          <p className="text-sm text-muted-foreground text-center pt-2">
                            + {emails.length - 5} emails anteriores
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Nenhum email enviado para esta empresa.
                      </p>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </ScrollArea>
        )}

        {/* Form Preview Dialog */}
        <Dialog open={showFormPreview} onOpenChange={setShowFormPreview}>
          <DialogContent className="!max-w-[900px] !w-[90vw] !max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Dados da Empresa</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[80vh]">
              {displayData && (
                <div className="space-y-6 p-4">
                  {/* Company Information */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3 text-blue-700">Dados da Empresa</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-muted-foreground">Razão Social</label>
                        <p className="font-medium">{displayData.legal_name || "-"}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Nome Fantasia</label>
                        <p className="font-medium">{displayData.business_name || "-"}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">{displayData.cnpj ? getDocumentTypeLabel(displayData.cnpj) : 'CNPJ/CPF'}</label>
                        <p className="font-medium">{displayData.cnpj || "-"}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Pessoa de Contato</label>
                        <p className="font-medium">{displayData.contact_person || "-"}</p>
                      </div>
                    </div>

                    {/* Phone Numbers Section */}
                    <div className="mt-4">
                      <label className="text-sm text-muted-foreground flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Telefones
                      </label>
                      {historyData?.phoneNumbers && historyData.phoneNumbers.length > 0 ? (
                        <div className="mt-2 space-y-2">
                          {historyData.phoneNumbers.map((phone: { label: string; phone_number: string }, idx: number) => (
                            <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-md">
                              <span className="text-sm text-muted-foreground min-w-[100px]">
                                {phone.label || "Principal"}:
                              </span>
                              <span className="font-medium">{phone.phone_number}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {displayData.mobile_phone && (
                            <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-md">
                              <span className="text-sm text-muted-foreground min-w-[100px]">Celular:</span>
                              <span className="font-medium">{displayData.mobile_phone}</span>
                            </div>
                          )}
                          {displayData.contact_phone && displayData.contact_phone !== displayData.mobile_phone && (
                            <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-md">
                              <span className="text-sm text-muted-foreground min-w-[100px]">Contato:</span>
                              <span className="font-medium">{displayData.contact_phone}</span>
                            </div>
                          )}
                          {displayData.landline_phone && (
                            <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-md">
                              <span className="text-sm text-muted-foreground min-w-[100px]">Fixo:</span>
                              <span className="font-medium">{displayData.landline_phone}</span>
                            </div>
                          )}
                          {!displayData.mobile_phone && !displayData.contact_phone && !displayData.landline_phone && (
                            <p className="text-muted-foreground text-sm">Nenhum telefone cadastrado</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Emails Section */}
                    <div className="mt-4">
                      <label className="text-sm text-muted-foreground flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Emails
                      </label>
                      {historyData?.companyEmails && historyData.companyEmails.length > 0 ? (
                        <div className="mt-2 space-y-2">
                          {historyData.companyEmails.map((emailItem: { label: string; email: string; is_primary: boolean }, idx: number) => (
                            <div key={idx} className={`flex items-center gap-3 p-2 rounded-md ${emailItem.is_primary ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                              <span className="text-sm text-muted-foreground min-w-[100px]">
                                {emailItem.label || "Principal"}:
                              </span>
                              <span className="font-medium">{emailItem.email}</span>
                              {emailItem.is_primary && (
                                <Badge className="bg-blue-600 text-white text-xs py-0 px-1.5">Principal</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : displayData.email ? (
                        <div className="mt-2">
                          <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-md">
                            <span className="text-sm text-muted-foreground min-w-[100px]">Principal:</span>
                            <span className="font-medium">{displayData.email}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm mt-2">Nenhum email cadastrado</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="text-sm text-muted-foreground">Website</label>
                        <p className="font-medium">{displayData.website || "-"}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Redes Sociais</label>
                        <p className="font-medium">{displayData.social_media || "-"}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Número de Funcionários</label>
                        <p className="font-medium">{displayData.employee_count || "-"}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Address */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3 text-blue-700">Endereço</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-muted-foreground">CEP</label>
                        <p className="font-medium">{displayData.cep || "-"}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Endereço</label>
                        <p className="font-medium">{displayData.address || "-"}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Complemento</label>
                        <p className="font-medium">{displayData.complement || "-"}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Bairro</label>
                        <p className="font-medium">{displayData.neighborhood || "-"}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Cidade</label>
                        <p className="font-medium">{displayData.city || "-"}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Estado</label>
                        <p className="font-medium">{displayData.state || "-"}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Job Information */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3 text-blue-700">Dados da Vaga</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-muted-foreground">Cargo Solicitado</label>
                        <p className="font-medium">{displayData.job_title || "-"}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Remuneração</label>
                        <p className="font-medium">{displayData.compensation || "-"}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Tipo de Contratação</label>
                        <p className="font-medium">{displayData.employment_type || "-"}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Urgência</label>
                        <p className="font-medium">{displayData.urgency || "-"}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Número de Vagas</label>
                        <p className="font-medium">{displayData.positions_count || "-"}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Horário de Trabalho</label>
                        <p className="font-medium">{displayData.work_schedule || "-"}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Escolaridade</label>
                        <p className="font-medium">{displayData.education_level || "-"}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Faixa Etária</label>
                        <p className="font-medium">{displayData.age_range || "-"}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Preferência de Gênero</label>
                        <p className="font-medium">{displayData.gender_preference || "-"}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Benefícios</label>
                        <p className="font-medium">
                          {displayData.benefits && displayData.benefits.length > 0
                            ? displayData.benefits.join(", ")
                            : "-"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="text-sm text-muted-foreground">Principais Atividades</label>
                        <p className="font-medium whitespace-pre-wrap">{displayData.main_activities || "-"}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Habilidades Necessárias</label>
                        <p className="font-medium whitespace-pre-wrap">{displayData.required_skills || "-"}</p>
                      </div>
                      {displayData.notes && (
                        <div>
                          <label className="text-sm text-muted-foreground">Observações</label>
                          <p className="font-medium whitespace-pre-wrap">{displayData.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Contract Preview Dialog */}
        <Dialog open={showContractPreview} onOpenChange={setShowContractPreview}>
          <DialogContent className="!max-w-[900px] !w-[90vw] !max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSignature className="h-5 w-5 text-green-600" />
                Contrato Assinado
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[80vh]">
              <div className="space-y-6 p-4">
                {/* Signer Information */}
                {contractData.signed_at && (
                  <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                    <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Informações da Assinatura
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-green-700">Assinado em:</span>
                        <p className="font-medium text-green-900">
                          {contractData.signed_at
                            ? format(new Date(contractData.signed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                            : "-"}
                        </p>
                      </div>
                      {contractData.signer_name && (
                        <div>
                          <span className="text-green-700">Assinado por:</span>
                          <p className="font-medium text-green-900">{contractData.signer_name}</p>
                        </div>
                      )}
                      {contractData.signer_cpf && (
                        <div>
                          <span className="text-green-700">CPF:</span>
                          <p className="font-medium text-green-900">{contractData.signer_cpf}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Signature Image */}
                {contractData.signature && (
                  <div className="p-4 rounded-lg border bg-white">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <PenLine className="h-4 w-4 text-blue-600" />
                      Assinatura Digital
                    </h3>
                    <div className="flex justify-center p-4 bg-gray-50 rounded-lg border">
                      <img
                        src={contractData.signature.startsWith('data:')
                          ? contractData.signature
                          : `data:image/png;base64,${contractData.signature}`}
                        alt="Assinatura"
                        className="max-w-full max-h-[200px] object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* Contract Content */}
                {historyData?.schoolContract && (
                  <div className="p-4 rounded-lg border bg-white">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      Contrato
                    </h3>
                    {historyData.schoolContract.type === 'pdf' && historyData.schoolContract.pdfUrl ? (
                      <div className="space-y-3">
                        <a
                          href={historyData.schoolContract.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          <Download className="h-4 w-4" />
                          Abrir Contrato PDF
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <iframe
                          src={historyData.schoolContract.pdfUrl}
                          className="w-full h-[500px] border rounded-lg"
                          title="Contrato PDF"
                        />
                      </div>
                    ) : historyData.schoolContract.type === 'html' && historyData.schoolContract.html ? (
                      <div
                        className="prose prose-sm max-w-none p-4 bg-gray-50 rounded-lg border overflow-auto max-h-[500px]"
                        dangerouslySetInnerHTML={{ __html: historyData.schoolContract.html }}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Contrato não disponível para visualização.
                      </p>
                    )}
                  </div>
                )}

                {/* If no school contract but there's a PDF URL */}
                {!historyData?.schoolContract && contractData.pdf_url && (
                  <div className="p-4 rounded-lg border bg-white">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      Contrato PDF Enviado
                    </h3>
                    <div className="space-y-3">
                      <a
                        href={contractData.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        Abrir Contrato PDF
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <iframe
                        src={contractData.pdf_url}
                        className="w-full h-[500px] border rounded-lg"
                        title="Contrato PDF"
                      />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
