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
    signedDocs: true,
    employees: false,
    emails: false,
  });
  const [isUploading, setIsUploading] = useState(false);
  const [viewingSignature, setViewingSignature] = useState<{
    name: string;
    role: string;
    date: string;
    signature: string | null;
  } | null>(null);
  const [editingCompany, setEditingCompany] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});

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

  const uploadEmployeeContractMutation = trpc.agency.uploadEmployeeContract.useMutation({
    onSuccess: () => {
      toast.success("Contrato do funcionário enviado!");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao enviar contrato");
    },
  });

  const updateCompanyMutation = trpc.agency.updateCompanyProfile.useMutation({
    onSuccess: () => {
      toast.success("Dados da empresa atualizados!");
      setEditingCompany(false);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao salvar");
    },
  });

  const handleStartEdit = () => {
    if (!displayData) return;
    setEditForm({
      companyName: displayData.legal_name || displayData.company_name || '',
      businessName: displayData.business_name || '',
      cnpj: displayData.cnpj || '',
      email: displayData.email || '',
      contactPerson: displayData.contact_person || '',
      phone: displayData.contact_phone || displayData.mobile_phone || '',
      mobilePhone: displayData.mobile_phone || '',
      landlinePhone: displayData.landline_phone || '',
      cep: displayData.cep || '',
      address: displayData.address || '',
      complement: displayData.complement || '',
      neighborhood: displayData.neighborhood || '',
      city: displayData.city || '',
      state: displayData.state || '',
      website: displayData.website || '',
      socialMedia: displayData.social_media || '',
      employeeCount: displayData.employee_count || '',
      description: displayData.description || '',
    });
    setEditingCompany(true);
  };

  const handleSaveCompany = () => {
    const companyId = displayData?.id || companyData?.id;
    if (!companyId) {
      toast.error("ID da empresa não encontrado");
      return;
    }
    updateCompanyMutation.mutate({
      companyId,
      ...editForm,
    });
  };

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
  const hiringProcesses = historyData?.hiringProcesses || [];
  const signingInvitations = historyData?.signingInvitations || [];
  const signedHiringDocs = (historyData as any)?.signedHiringDocs || [];

  // Use company data if form data doesn't exist (for companies that went through onboarding)
  const displayData = formData || (companyData ? {
    id: companyData.id,
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
    company_size: companyData.company_size,
    industry: companyData.industry,
    description: companyData.description,
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

  // Contract data can come from meeting (outreach flow), company (onboarding flow), or signed_documents
  const allSignedDocs = (historyData as any)?.signedContratoInicial || [];
  const latestSignedDoc = allSignedDocs[0];

  const contractData = {
    signed_at: companyData?.contract_signed_at || realMeeting?.contract_signed_at || latestSignedDoc?.signed_at,
    signature: companyData?.contract_signature || realMeeting?.contract_signature || latestSignedDoc?.signature,
    signer_name: companyData?.contract_signer_name || realMeeting?.contract_signer_name || latestSignedDoc?.signer_name,
    signer_cpf: companyData?.contract_signer_cpf || realMeeting?.contract_signer_cpf || latestSignedDoc?.signer_cpf,
    sent_at: realMeeting?.contract_sent_at,
    pdf_url: companyData?.contract_pdf_url || realMeeting?.contract_pdf_url || latestSignedDoc?.signed_pdf_url,
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
                  <div className="flex items-center justify-between pb-2 border-b">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-purple-600" />
                      <h3 className="font-semibold">Dados da Empresa</h3>
                    </div>
                    {!editingCompany ? (
                      <Button variant="outline" size="sm" onClick={handleStartEdit}>
                        <PenLine className="w-4 h-4 mr-1" /> Editar
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingCompany(false)}>Cancelar</Button>
                        <Button size="sm" onClick={handleSaveCompany} disabled={updateCompanyMutation.isPending}>
                          {updateCompanyMutation.isPending ? 'Salvando...' : 'Salvar'}
                        </Button>
                      </div>
                    )}
                  </div>

                  {editingCompany ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      <div><Label className="text-xs text-muted-foreground">Razão Social</Label><Input value={editForm.companyName} onChange={e => setEditForm({...editForm, companyName: e.target.value})} /></div>
                      <div><Label className="text-xs text-muted-foreground">Nome Fantasia</Label><Input value={editForm.businessName} onChange={e => setEditForm({...editForm, businessName: e.target.value})} /></div>
                      <div><Label className="text-xs text-muted-foreground">CNPJ/CPF</Label><Input value={editForm.cnpj} onChange={e => setEditForm({...editForm, cnpj: e.target.value})} /></div>
                      <div><Label className="text-xs text-muted-foreground">Responsável</Label><Input value={editForm.contactPerson} onChange={e => setEditForm({...editForm, contactPerson: e.target.value})} /></div>
                      <div><Label className="text-xs text-muted-foreground">Email</Label><Input value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} /></div>
                      <div><Label className="text-xs text-muted-foreground">Telefone</Label><Input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} /></div>
                      <div><Label className="text-xs text-muted-foreground">Celular</Label><Input value={editForm.mobilePhone} onChange={e => setEditForm({...editForm, mobilePhone: e.target.value})} /></div>
                      <div><Label className="text-xs text-muted-foreground">Fixo</Label><Input value={editForm.landlinePhone} onChange={e => setEditForm({...editForm, landlinePhone: e.target.value})} /></div>
                      <div><Label className="text-xs text-muted-foreground">CEP</Label><Input value={editForm.cep} onChange={e => setEditForm({...editForm, cep: e.target.value})} /></div>
                      <div><Label className="text-xs text-muted-foreground">Endereço</Label><Input value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} /></div>
                      <div><Label className="text-xs text-muted-foreground">Complemento</Label><Input value={editForm.complement} onChange={e => setEditForm({...editForm, complement: e.target.value})} /></div>
                      <div><Label className="text-xs text-muted-foreground">Bairro</Label><Input value={editForm.neighborhood} onChange={e => setEditForm({...editForm, neighborhood: e.target.value})} /></div>
                      <div><Label className="text-xs text-muted-foreground">Cidade</Label><Input value={editForm.city} onChange={e => setEditForm({...editForm, city: e.target.value})} /></div>
                      <div><Label className="text-xs text-muted-foreground">Estado</Label><Input value={editForm.state} onChange={e => setEditForm({...editForm, state: e.target.value})} /></div>
                      <div><Label className="text-xs text-muted-foreground">Website</Label><Input value={editForm.website} onChange={e => setEditForm({...editForm, website: e.target.value})} /></div>
                      <div><Label className="text-xs text-muted-foreground">Redes Sociais</Label><Input value={editForm.socialMedia} onChange={e => setEditForm({...editForm, socialMedia: e.target.value})} /></div>
                      <div><Label className="text-xs text-muted-foreground">Nº Funcionários</Label><Input value={editForm.employeeCount} onChange={e => setEditForm({...editForm, employeeCount: e.target.value})} /></div>
                      <div className="col-span-2 md:col-span-3"><Label className="text-xs text-muted-foreground">Descrição</Label><Input value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} /></div>
                    </div>
                  ) : (
                  <>
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
                  {/* Additional Info */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    {displayData.website && (
                      <div>
                        <span className="text-muted-foreground">Website</span>
                        <p className="font-medium">{displayData.website}</p>
                      </div>
                    )}
                    {displayData.social_media && (
                      <div>
                        <span className="text-muted-foreground">Redes Sociais</span>
                        <p className="font-medium">{displayData.social_media}</p>
                      </div>
                    )}
                    {displayData.employee_count && (
                      <div>
                        <span className="text-muted-foreground">Nº Funcionários</span>
                        <p className="font-medium">{displayData.employee_count}</p>
                      </div>
                    )}
                    {displayData.company_size && (
                      <div>
                        <span className="text-muted-foreground">Porte</span>
                        <p className="font-medium">{displayData.company_size}</p>
                      </div>
                    )}
                    {displayData.industry && (
                      <div>
                        <span className="text-muted-foreground">Setor</span>
                        <p className="font-medium">{displayData.industry}</p>
                      </div>
                    )}
                    {displayData.description && (
                      <div className="col-span-2 md:col-span-3">
                        <span className="text-muted-foreground">Descrição</span>
                        <p className="font-medium">{displayData.description}</p>
                      </div>
                    )}
                  </div>

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
                  </>
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
                    {contractData.signed_at && (historyData?.agencyContract || contractData.signature) && (
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

                    {/* View uploaded PDFs - show all from contract_files if available */}
                    {Array.isArray(companyData?.contract_files) && companyData.contract_files.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">
                          Documentos Enviados ({companyData.contract_files.length})
                        </p>
                        {companyData.contract_files.map((file: { url: string; key?: string; name?: string }, idx: number) => (
                          <div key={file.key || idx} className="flex items-center gap-2">
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                            >
                              <Download className="h-4 w-4" />
                              {file.name || `Documento ${idx + 1}`}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : contractData.pdf_url ? (
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
                    ) : null}

                    {/* Upload contract section - always visible */}
                    <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground mb-3">
                          {contractData.signed_at
                            ? "Adicionar mais documentos:"
                            : contractData.sent_at
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
                    {!contractData.sent_at && !contractData.signed_at && (
                      <p className="text-sm text-muted-foreground">
                        Contrato ainda não foi enviado para esta empresa.
                      </p>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Signed Documents Section - Show all signed documents */}
              {allSignedDocs.length > 0 && (
                <Collapsible open={openSections.signedDocs} onOpenChange={() => toggleSection('signedDocs')}>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-4 rounded-lg border bg-white hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        {openSections.signedDocs ? (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-500" />
                        )}
                        <FileCheck className="h-5 w-5 text-green-600" />
                        <span className="font-medium">Documentos Assinados</span>
                      </div>
                      <Badge variant="secondary">{allSignedDocs.length}</Badge>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 py-3 ml-8 border-l-2 border-gray-200 space-y-3">
                      {allSignedDocs.map((doc: any) => (
                        <div key={doc.id} className="rounded-lg border bg-gray-50 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-blue-600" />
                              <span className="font-medium text-sm">
                                {doc.template?.name || doc.category || 'Documento'}
                              </span>
                            </div>
                            <Badge className="bg-green-100 text-green-700">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Assinado
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            {doc.signer_name && (
                              <p>Assinado por: <span className="font-medium text-gray-700">{doc.signer_name}</span></p>
                            )}
                            {doc.signer_cpf && (
                              <p>CPF: <span className="font-medium text-gray-700">{doc.signer_cpf}</span></p>
                            )}
                            {doc.signed_at && (
                              <p>Data: <span className="font-medium text-gray-700">
                                {format(new Date(doc.signed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </span></p>
                            )}
                          </div>
                          <div className="flex gap-2 pt-1">
                            {doc.signed_pdf_url && (
                              <a
                                href={doc.signed_pdf_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                              >
                                <Download className="h-3 w-3" />
                                PDF Assinado
                              </a>
                            )}
                            {doc.template?.file_url && (
                              <a
                                href={doc.template.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Template Original
                              </a>
                            )}
                            {doc.signature && (
                              <button
                                onClick={() => setViewingSignature({
                                  name: doc.signer_name || 'Assinante',
                                  role: 'Empresa',
                                  date: doc.signed_at ? new Date(doc.signed_at).toLocaleDateString("pt-BR") : '',
                                  signature: doc.signature,
                                })}
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                              >
                                <PenLine className="h-3 w-3" />
                                Ver Assinatura
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

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
                    <Badge variant="secondary">{hiringProcesses.length}</Badge>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 py-3 ml-8 border-l-2 border-gray-200">
                    <p className="text-xs text-muted-foreground mb-3">
                      Contratos individuais de candidatos contratados por esta empresa (estágio, CLT, jovem aprendiz).
                    </p>
                    {hiringProcesses.length > 0 ? (
                      <div className="space-y-4">
                        {hiringProcesses.map((hp: any) => {
                          const hpInvitations = signingInvitations.filter(
                            (inv: any) => inv.hiring_process_id === hp.id
                          );
                          const typeLabels: Record<string, string> = {
                            estagio: "Estágio",
                            clt: "CLT",
                            menor_aprendiz: "Jovem Aprendiz",
                            "menor-aprendiz": "Jovem Aprendiz",
                          };
                          const statusLabels: Record<string, string> = {
                            active: "Ativo",
                            pending_signatures: "Aguardando Assinaturas",
                            pending_payment: "Aguardando Pagamento",
                            completed: "Concluído",
                          };
                          const roleLabels: Record<string, string> = {
                            candidate: "Candidato",
                            parent_guardian: "Responsável",
                            educational_institution: "Inst. de Ensino",
                          };
                          return (
                            <div key={hp.id} className="rounded-lg border bg-gray-50 p-3 space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{hp.candidate?.full_name || "Candidato"}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {hp.job?.title || "Vaga"} · {typeLabels[hp.hiring_type] || hp.hiring_type}
                                  </p>
                                </div>
                                <Badge
                                  className={
                                    hp.status === "active"
                                      ? "bg-green-100 text-green-700"
                                      : "bg-amber-100 text-amber-700"
                                  }
                                >
                                  {statusLabels[hp.status] || hp.status}
                                </Badge>
                              </div>

                              {/* Signing status for each party */}
                              <div className="space-y-1.5 pl-3 border-l-2 border-gray-300">
                                {/* Company signature (from hiring_processes fields) */}
                                <div
                                  className={`flex items-center justify-between text-sm ${hp.company_signed ? "cursor-pointer hover:bg-gray-100 -mx-1 px-1 rounded" : ""}`}
                                  onClick={() => hp.company_signed && setViewingSignature({
                                    name: hp.company_signer_name || "Empresa",
                                    role: "Empresa",
                                    date: hp.company_signed_at ? new Date(hp.company_signed_at).toLocaleDateString("pt-BR") : "",
                                    signature: hp.company_signature || null,
                                  })}
                                >
                                  <div className="flex items-center gap-2">
                                    {hp.company_signed ? (
                                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                                    ) : (
                                      <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                    )}
                                    <span className="text-gray-700">
                                      Empresa
                                      {hp.company_signer_name && (
                                        <span className="text-gray-500"> — {hp.company_signer_name}</span>
                                      )}
                                    </span>
                                  </div>
                                  {hp.company_signed_at && (
                                    <span className="text-xs text-gray-500">
                                      {new Date(hp.company_signed_at).toLocaleDateString("pt-BR")}
                                    </span>
                                  )}
                                  {!hp.company_signed && (
                                    <span className="text-xs text-amber-600">Pendente</span>
                                  )}
                                </div>

                                {/* Candidate, Parent, School signatures (from signing_invitations) */}
                                {hpInvitations.map((inv: any) => (
                                  <div
                                    key={inv.id}
                                    className={`flex items-center justify-between text-sm ${inv.signed_at ? "cursor-pointer hover:bg-gray-100 -mx-1 px-1 rounded" : ""}`}
                                    onClick={() => inv.signed_at && setViewingSignature({
                                      name: inv.signer_name,
                                      role: roleLabels[inv.signer_role] || inv.signer_role,
                                      date: new Date(inv.signed_at).toLocaleDateString("pt-BR"),
                                      signature: inv.signature || null,
                                    })}
                                  >
                                    <div className="flex items-center gap-2">
                                      {inv.signed_at ? (
                                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                                      ) : (
                                        <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                      )}
                                      <span className="text-gray-700">
                                        {roleLabels[inv.signer_role] || inv.signer_role}
                                        <span className="text-gray-500"> — {inv.signer_name}</span>
                                      </span>
                                    </div>
                                    {inv.signed_at ? (
                                      <span className="text-xs text-gray-500">
                                        {new Date(inv.signed_at).toLocaleDateString("pt-BR")}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-amber-600">Pendente</span>
                                    )}
                                  </div>
                                ))}
                              </div>

                              {/* Upload contract document for this employee */}
                              <div className="pt-2 border-t border-gray-200">
                                {hp.contract_document_url ? (
                                  <a href={hp.contract_document_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                                    <FileText className="h-3.5 w-3.5" />
                                    Ver contrato do funcionário
                                  </a>
                                ) : (
                                  <label className={`cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm ${uploadEmployeeContractMutation.isPending ? 'opacity-50' : ''}`}>
                                    <Upload className="h-3.5 w-3.5" />
                                    {uploadEmployeeContractMutation.isPending ? 'Enviando...' : 'Upload Contrato'}
                                    <input
                                      type="file"
                                      accept=".pdf"
                                      className="hidden"
                                      disabled={uploadEmployeeContractMutation.isPending}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = () => {
                                          const base64 = (reader.result as string).split(',')[1];
                                          uploadEmployeeContractMutation.mutate({
                                            hiringProcessId: hp.id,
                                            fileName: file.name,
                                            fileData: base64,
                                            contentType: file.type,
                                          });
                                        };
                                        reader.readAsDataURL(file);
                                        e.target.value = '';
                                      }}
                                    />
                                  </label>
                                )}
                              </div>

                              {/* Autentique documents for this hiring process */}
                              {(() => {
                                const hpDocs = signedHiringDocs.filter((d: any) => d.context_id === hp.id);
                                if (hpDocs.length === 0) return null;
                                return (
                                  <div className="mt-2 pt-2 border-t border-gray-200">
                                    <p className="text-xs font-medium text-gray-500 mb-1.5">Documentos Autentique</p>
                                    <div className="space-y-1.5">
                                      {hpDocs.map((doc: any) => {
                                        const signers = doc.signers || [];
                                        const allSigned = signers.every((s: any) => s.signed_at);
                                        return (
                                          <div key={doc.id} className="text-xs bg-white rounded border p-2">
                                            <div className="flex items-center justify-between mb-1">
                                              <span className="font-medium text-gray-700">{doc.document_name}</span>
                                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${allSigned ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {allSigned ? 'Completo' : 'Pendente'}
                                              </span>
                                            </div>
                                            <div className="flex gap-2">
                                              {signers.map((s: any, i: number) => (
                                                <span key={i} className={`flex items-center gap-0.5 ${s.signed_at ? 'text-green-600' : 'text-gray-400'}`}>
                                                  {s.signed_at ? <CheckCircle2 className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                                                  {s.name || s.role}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mb-3">
                        Nenhum contrato de funcionário registrado.
                      </p>
                    )}

                    {/* Always show upload button */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-muted-foreground mb-2">Adicionar documento de contrato:</p>
                      <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm">
                        <Upload className="h-3.5 w-3.5" />
                        Upload Contrato de Funcionário
                        <input
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              const base64 = (reader.result as string).split(',')[1];
                              const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                              uploadMutation.mutate({
                                companyEmail: meeting?.company_email || '',
                                fileBase64: base64,
                                fileName: `employee-contract-${sanitizedName}`,
                              });
                            };
                            reader.readAsDataURL(file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
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
                          {displayData.benefits
                            ? (Array.isArray(displayData.benefits)
                                ? displayData.benefits.join(", ")
                                : displayData.benefits)
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
                {historyData?.agencyContract && (
                  <div className="p-4 rounded-lg border bg-white">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      Contrato
                    </h3>
                    {historyData.agencyContract.type === 'pdf' && historyData.agencyContract.pdfUrl ? (
                      <div className="space-y-3">
                        <a
                          href={historyData.agencyContract.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          <Download className="h-4 w-4" />
                          Abrir Contrato PDF
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <iframe
                          src={historyData.agencyContract.pdfUrl}
                          className="w-full h-[500px] border rounded-lg"
                          title="Contrato PDF"
                        />
                      </div>
                    ) : historyData.agencyContract.type === 'html' && historyData.agencyContract.html ? (
                      <div
                        className="prose prose-sm max-w-none p-4 bg-gray-50 rounded-lg border overflow-auto max-h-[500px]"
                        dangerouslySetInnerHTML={{ __html: historyData.agencyContract.html }}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Contrato não disponível para visualização.
                      </p>
                    )}
                  </div>
                )}

                {/* If no agency contract but there's a PDF URL */}
                {!historyData?.agencyContract && contractData.pdf_url && (
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
        {/* Signature Viewing Dialog */}
        <Dialog open={!!viewingSignature} onOpenChange={() => setViewingSignature(null)}>
          <DialogContent className="!max-w-sm">
            <DialogHeader>
              <DialogTitle>Assinatura</DialogTitle>
            </DialogHeader>
            {viewingSignature && (
              <div className="space-y-4">
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Assinante:</span> {viewingSignature.name}</p>
                  <p><span className="text-muted-foreground">Papel:</span> {viewingSignature.role}</p>
                  <p><span className="text-muted-foreground">Data:</span> {viewingSignature.date}</p>
                </div>
                {viewingSignature.signature ? (
                  <div className="border rounded-lg p-4 bg-white">
                    <img
                      src={viewingSignature.signature.startsWith("data:") ? viewingSignature.signature : `data:image/png;base64,${viewingSignature.signature}`}
                      alt="Assinatura"
                      className="w-full h-auto max-h-48 object-contain"
                    />
                  </div>
                ) : (
                  <div className="border rounded-lg p-6 bg-gray-50 text-center">
                    <p className="text-sm text-muted-foreground">Imagem da assinatura não disponível</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
