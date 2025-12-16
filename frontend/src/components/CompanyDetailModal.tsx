import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  Mail,
  Phone,
  User,
  Calendar,
  FileSignature,
  Clock,
  CheckCircle2,
  Loader2,
  Briefcase,
  AlertCircle,
  FileText,
  MapPin,
  Send,
  History,
  FileCheck,
  Users,
  Eye,
  X,
  Globe,
  Hash,
  DollarSign,
  GraduationCap,
  Clock3,
  UserCheck,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface Meeting {
  id: string;
  company_name: string | null;
  company_email: string;
  contact_name: string | null;
  contact_phone: string | null;
  scheduled_at: string;
  status: string;
  contract_sent_at: string | null;
  contract_signed_at: string | null;
  contract_signer_name: string | null;
  contract_signer_cpf?: string | null;
}

interface CompanyDetailModalProps {
  meeting: Meeting | null;
  open: boolean;
  onClose: () => void;
  onSend: (meetingId: string) => void;
  isSending: boolean;
}

export default function CompanyDetailModal({
  meeting,
  open,
  onClose,
  onSend,
  isSending,
}: CompanyDetailModalProps) {
  const [activeTab, setActiveTab] = useState("documentos");
  const [previewDialog, setPreviewDialog] = useState<'contract' | 'form' | null>(null);

  // Fetch full company history
  const { data: historyData, isLoading: isLoadingHistory } = trpc.outreach.getCompanyFullHistory.useQuery(
    { companyEmail: meeting?.company_email || "" },
    { enabled: !!meeting?.company_email && open }
  );

  if (!meeting) return null;

  const formData = historyData?.form;
  const hasForm = !!formData;
  const canTakeAction = !meeting.contract_sent_at && meeting.status === "completed";

  const formatCnpj = (cnpj: string) => {
    const digits = cnpj.replace(/\D/g, "");
    if (digits.length !== 14) return cnpj;
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  };

  const formatCpf = (cpf: string) => {
    const digits = cpf.replace(/\D/g, "");
    if (digits.length !== 11) return cpf;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return phone;
  };

  const getStatusConfig = () => {
    if (meeting.contract_signed_at) {
      return {
        label: "Contrato Assinado",
        icon: CheckCircle2,
        bgColor: "bg-emerald-500",
        textColor: "text-white",
      };
    }
    if (meeting.contract_sent_at) {
      return {
        label: "Aguardando Assinatura",
        icon: Clock,
        bgColor: "bg-amber-500",
        textColor: "text-white",
      };
    }
    if (hasForm) {
      return {
        label: "Formulário Preenchido",
        icon: FileCheck,
        bgColor: "bg-blue-500",
        textColor: "text-white",
      };
    }
    return {
      label: "Pendente",
      icon: AlertCircle,
      bgColor: "bg-gray-400",
      textColor: "text-white",
    };
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  const getTimelineIcon = (type: string) => {
    const iconConfig: Record<string, { icon: typeof Calendar; color: string; bg: string }> = {
      meeting: { icon: Calendar, color: "text-blue-600", bg: "bg-blue-100" },
      form: { icon: FileText, color: "text-emerald-600", bg: "bg-emerald-100" },
      contract: { icon: FileSignature, color: "text-purple-600", bg: "bg-purple-100" },
      email: { icon: Mail, color: "text-orange-600", bg: "bg-orange-100" },
      employee_contract: { icon: Users, color: "text-teal-600", bg: "bg-teal-100" },
    };
    return iconConfig[type] || { icon: Clock, color: "text-gray-600", bg: "bg-gray-100" };
  };

  // Form Preview Content - Styled like CompanyForm.tsx
  const FormPreviewContent = () => {
    if (!formData) return null;

    return (
      <div className="space-y-6">
        {/* Company Data Section */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" />
              Dados da Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-600">Pessoa de Contato</Label>
                <Input value={formData.contact_person || '-'} readOnly className="bg-slate-50" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600">Telefone do Contato</Label>
                <Input value={formData.contact_phone ? formatPhone(formData.contact_phone) : '-'} readOnly className="bg-slate-50" />
              </div>
            </div>

            {/* Company Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-600">CNPJ</Label>
                <Input value={formatCnpj(formData.cnpj)} readOnly className="bg-slate-50 font-mono" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600">Nome Fantasia</Label>
                <Input value={formData.business_name || '-'} readOnly className="bg-slate-50" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-600">Razão Social</Label>
              <Input value={formData.legal_name || '-'} readOnly className="bg-slate-50" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-600">Email</Label>
                <Input value={formData.email || '-'} readOnly className="bg-slate-50" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600">Telefone Celular</Label>
                <Input value={formData.mobile_phone ? formatPhone(formData.mobile_phone) : '-'} readOnly className="bg-slate-50" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-600">Telefone Fixo</Label>
                <Input value={formData.landline_phone ? formatPhone(formData.landline_phone) : '-'} readOnly className="bg-slate-50" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600">Website</Label>
                <Input value={formData.website || '-'} readOnly className="bg-slate-50" />
              </div>
            </div>

            {/* Address */}
            <Separator />
            <h4 className="font-semibold text-slate-700 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Endereço
            </h4>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-600">CEP</Label>
                <Input value={formData.cep || '-'} readOnly className="bg-slate-50" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-slate-600">Endereço</Label>
                <Input value={formData.address || '-'} readOnly className="bg-slate-50" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-600">Bairro</Label>
                <Input value={formData.neighborhood || '-'} readOnly className="bg-slate-50" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600">Complemento</Label>
                <Input value={formData.complement || '-'} readOnly className="bg-slate-50" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-600">Cidade</Label>
                <Input value={formData.city || '-'} readOnly className="bg-slate-50" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600">Estado</Label>
                <Input value={formData.state || '-'} readOnly className="bg-slate-50" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Job Opening Section */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Briefcase className="h-5 w-5" />
              Dados da Vaga
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-600">Cargo / Função</Label>
                <Input value={formData.job_title || '-'} readOnly className="bg-slate-50 font-semibold" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600">Remuneração</Label>
                <Input value={formData.compensation || '-'} readOnly className="bg-slate-50 text-emerald-700 font-semibold" />
              </div>
            </div>

            {formData.main_activities && (
              <div className="space-y-2">
                <Label className="text-slate-600">Principais Atividades</Label>
                <div className="p-3 bg-slate-50 rounded-md border text-sm whitespace-pre-wrap">
                  {formData.main_activities}
                </div>
              </div>
            )}

            {formData.required_skills && (
              <div className="space-y-2">
                <Label className="text-slate-600">Competências Necessárias</Label>
                <div className="p-3 bg-slate-50 rounded-md border text-sm whitespace-pre-wrap">
                  {formData.required_skills}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-600">Tipo de Contrato</Label>
                <Input value={formData.employment_type?.toUpperCase() || '-'} readOnly className="bg-slate-50" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600">Urgência</Label>
                <Input value={formData.urgency || '-'} readOnly className="bg-slate-50" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-600">Escolaridade</Label>
                <Input value={formData.education_level || '-'} readOnly className="bg-slate-50" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600">Horário de Trabalho</Label>
                <Input value={formData.work_schedule || '-'} readOnly className="bg-slate-50" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-600">Faixa Etária</Label>
                <Input value={formData.age_range || '-'} readOnly className="bg-slate-50" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600">Quantidade de Vagas</Label>
                <Input value={formData.positions_count || '-'} readOnly className="bg-slate-50" />
              </div>
            </div>

            {formData.benefits && formData.benefits.length > 0 && (
              <div className="space-y-2">
                <Label className="text-slate-600">Benefícios</Label>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-md border">
                  {formData.benefits.map((benefit: string, i: number) => (
                    <Badge key={i} variant="secondary" className="bg-blue-100 text-blue-700">
                      {benefit}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {formData.notes && (
              <div className="space-y-2">
                <Label className="text-slate-600">Observações Gerais</Label>
                <div className="p-3 bg-slate-50 rounded-md border text-sm whitespace-pre-wrap">
                  {formData.notes}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // Contract Preview Content
  const ContractPreviewContent = () => {
    const schoolContract = historyData?.schoolContract;
    const contractSignature = historyData?.meeting?.contract_signature;

    return (
      <div className="space-y-6">
        {/* Contract Document */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileSignature className="h-5 w-5" />
              Documento do Contrato
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {schoolContract?.type === "pdf" && schoolContract.pdfUrl ? (
              <div>
                <div className="bg-gray-100 p-3 flex items-center justify-between border-b">
                  <span className="text-sm font-medium text-gray-700">Contrato PDF</span>
                  <a
                    href={schoolContract.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                  >
                    <Eye className="h-4 w-4" />
                    Abrir em nova aba
                  </a>
                </div>
                <iframe
                  src={`${schoolContract.pdfUrl}#toolbar=1&navpanes=0&view=FitH`}
                  className="w-full border-0"
                  style={{ height: "50vh", minHeight: "400px" }}
                  title="Contrato PDF"
                />
              </div>
            ) : schoolContract?.type === "html" && schoolContract.html ? (
              <div className="p-6 max-h-[50vh] overflow-y-auto">
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: schoolContract.html }}
                />
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <FileText className="h-16 w-16 mx-auto mb-3 text-gray-300" />
                <p className="font-medium text-gray-600">Documento não configurado</p>
                <p className="text-sm mt-1">Configure um contrato nas configurações da escola</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contract Status & Signer Info */}
        <Card className={`shadow-lg ${meeting.contract_signed_at ? 'border-emerald-200' : meeting.contract_sent_at ? 'border-amber-200' : 'border-gray-200'}`}>
          <CardHeader className={`rounded-t-lg ${meeting.contract_signed_at ? 'bg-gradient-to-r from-emerald-600 to-teal-600' : meeting.contract_sent_at ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-gray-500 to-gray-600'} text-white`}>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserCheck className="h-5 w-5" />
              Status e Assinatura
              {meeting.contract_signed_at && (
                <Badge className="ml-auto bg-white/20 text-white">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Assinado
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Contract Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-600">Status</Label>
                <Input
                  value={meeting.contract_signed_at ? 'Assinado' : meeting.contract_sent_at ? 'Aguardando Assinatura' : 'Não Enviado'}
                  readOnly
                  className={`bg-slate-50 font-semibold ${meeting.contract_signed_at ? 'text-emerald-700' : meeting.contract_sent_at ? 'text-amber-700' : 'text-gray-500'}`}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600">Empresa</Label>
                <Input value={formData?.legal_name || formData?.business_name || meeting.company_name || '-'} readOnly className="bg-slate-50" />
              </div>
            </div>

            {meeting.contract_sent_at && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-600">Data de Envio</Label>
                  <Input
                    value={format(new Date(meeting.contract_sent_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                    readOnly
                    className="bg-slate-50"
                  />
                </div>
                {meeting.contract_signed_at && (
                  <div className="space-y-2">
                    <Label className="text-slate-600">Data de Assinatura</Label>
                    <Input
                      value={format(new Date(meeting.contract_signed_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                      readOnly
                      className="bg-slate-50"
                    />
                  </div>
                )}
              </div>
            )}

            {meeting.contract_signed_at && (
              <>
                <Separator />
                <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Dados do Assinante
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-600">Nome do Assinante</Label>
                    <Input value={meeting.contract_signer_name || '-'} readOnly className="bg-slate-50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-600">CPF do Assinante</Label>
                    <Input value={meeting.contract_signer_cpf ? formatCpf(meeting.contract_signer_cpf) : '-'} readOnly className="bg-slate-50 font-mono" />
                  </div>
                </div>

                {/* Signature Image */}
                <div className="space-y-2">
                  <Label className="text-slate-600">Assinatura Digital</Label>
                  {contractSignature ? (
                    <div className="border rounded-lg p-4 bg-white">
                      <img
                        src={contractSignature}
                        alt="Assinatura digital"
                        className="max-h-32 mx-auto"
                      />
                    </div>
                  ) : (
                    <div className="border rounded-lg p-4 bg-slate-50 text-center text-slate-500">
                      <FileSignature className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm">Assinatura não disponível</p>
                    </div>
                  )}
                </div>

                {/* Signed Status Banner */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-emerald-800">Contrato Válido</p>
                      <p className="text-sm text-emerald-600">Este contrato foi assinado digitalmente e está em vigor.</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {meeting.contract_sent_at && !meeting.contract_signed_at && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-amber-500 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-800">Aguardando Assinatura</p>
                    <p className="text-sm text-amber-600">O contrato foi enviado e está aguardando a assinatura da empresa.</p>
                  </div>
                </div>
              </div>
            )}

            {!meeting.contract_sent_at && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-400 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Contrato Não Enviado</p>
                    <p className="text-sm text-gray-500">O contrato ainda não foi enviado para esta empresa.</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5">
            <DialogHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                    <Building2 className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold text-white">
                      {formData?.legal_name || formData?.business_name || meeting.company_name || "Empresa"}
                    </DialogTitle>
                    {formData?.business_name && formData.business_name !== formData.legal_name && (
                      <p className="text-slate-300 text-sm mt-0.5">{formData.business_name}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={`${statusConfig.bgColor} ${statusConfig.textColor} border-0`}>
                        <StatusIcon className="h-3.5 w-3.5 mr-1.5" />
                        {statusConfig.label}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </DialogHeader>
          </div>

          {/* Tabs - Only Documentos and Histórico */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <div className="border-b bg-slate-50 px-6">
              <TabsList className="h-12 w-full justify-start gap-1 bg-transparent p-0">
                <TabsTrigger
                  value="documentos"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-b-none border-b-2 border-transparent data-[state=active]:border-blue-600 px-4"
                >
                  <FileCheck className="h-4 w-4 mr-2" />
                  Documentos
                </TabsTrigger>
                <TabsTrigger
                  value="historico"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-b-none border-b-2 border-transparent data-[state=active]:border-blue-600 px-4"
                >
                  <History className="h-4 w-4 mr-2" />
                  Histórico
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="h-[50vh]">
              <div className="p-6">
                {/* DOCUMENTOS TAB */}
                <TabsContent value="documentos" className="mt-0 space-y-4">
                  {isLoadingHistory ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Service Contract Card */}
                      <Card className="border-0 shadow-sm overflow-hidden">
                        <div className="flex items-stretch">
                          <div className={`w-1.5 ${meeting.contract_signed_at ? 'bg-emerald-500' : meeting.contract_sent_at ? 'bg-amber-500' : 'bg-gray-300'}`} />
                          <CardContent className="p-5 flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                                  meeting.contract_signed_at ? 'bg-emerald-100' : meeting.contract_sent_at ? 'bg-amber-100' : 'bg-gray-100'
                                }`}>
                                  <FileSignature className={`h-6 w-6 ${
                                    meeting.contract_signed_at ? 'text-emerald-600' : meeting.contract_sent_at ? 'text-amber-600' : 'text-gray-400'
                                  }`} />
                                </div>
                                <div className="text-left">
                                  <h4 className="font-semibold text-slate-800">Contrato de Serviço</h4>
                                  <p className="text-sm text-slate-500">
                                    {meeting.contract_signed_at
                                      ? `Assinado em ${format(new Date(meeting.contract_signed_at), "dd/MM/yyyy", { locale: ptBR })}`
                                      : meeting.contract_sent_at
                                      ? `Enviado em ${format(new Date(meeting.contract_sent_at), "dd/MM/yyyy", { locale: ptBR })}`
                                      : "Não enviado"}
                                  </p>
                                  {meeting.contract_signer_name && (
                                    <p className="text-xs text-slate-400 mt-0.5">Por: {meeting.contract_signer_name}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={
                                  meeting.contract_signed_at
                                    ? 'bg-emerald-100 text-emerald-700 border-0'
                                    : meeting.contract_sent_at
                                    ? 'bg-amber-100 text-amber-700 border-0'
                                    : 'bg-gray-100 text-gray-600 border-0'
                                }>
                                  {meeting.contract_signed_at ? 'Assinado' : meeting.contract_sent_at ? 'Pendente' : 'Não enviado'}
                                </Badge>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setPreviewDialog('contract')}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Visualizar
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </div>
                      </Card>

                      {/* Company Form Card */}
                      <Card className="border-0 shadow-sm overflow-hidden">
                        <div className="flex items-stretch">
                          <div className={`w-1.5 ${formData ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          <CardContent className="p-5 flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${formData ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                                  <FileText className={`h-6 w-6 ${formData ? 'text-emerald-600' : 'text-amber-600'}`} />
                                </div>
                                <div className="text-left">
                                  <h4 className="font-semibold text-slate-800">Formulário de Cadastro</h4>
                                  {formData ? (
                                    <>
                                      <p className="text-sm text-slate-500">CNPJ: {formatCnpj(formData.cnpj)}</p>
                                      {formData.job_title && (
                                        <p className="text-xs text-slate-400 mt-0.5">Vaga: {formData.job_title}</p>
                                      )}
                                    </>
                                  ) : (
                                    <p className="text-sm text-slate-500">Aguardando preenchimento</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={formData ? 'bg-emerald-100 text-emerald-700 border-0' : 'bg-amber-100 text-amber-700 border-0'}>
                                  {formData ? 'Preenchido' : 'Pendente'}
                                </Badge>
                                {formData && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPreviewDialog('form')}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Visualizar
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </div>
                      </Card>

                      {/* Employee Contracts */}
                      <Card className="border-0 shadow-sm">
                        <CardContent className="p-5">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="h-10 w-10 rounded-lg bg-teal-100 flex items-center justify-center">
                              <Users className="h-5 w-5 text-teal-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-slate-800">Contratos de Funcionários</h4>
                              <p className="text-sm text-slate-500">
                                {historyData?.contracts?.length || 0} contrato(s) registrado(s)
                              </p>
                            </div>
                          </div>

                          {historyData?.contracts && historyData.contracts.length > 0 ? (
                            <div className="space-y-2">
                              {historyData.contracts.map((contract: any) => (
                                <div key={contract.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                  <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center">
                                      <User className="h-4 w-4 text-slate-600" />
                                    </div>
                                    <div>
                                      <p className="font-medium text-slate-800 text-sm">{contract.candidate?.full_name}</p>
                                      <p className="text-xs text-slate-500">{contract.job?.title}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <Badge className={contract.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-0' : 'bg-gray-100 text-gray-700 border-0'}>
                                      {contract.status === 'active' ? 'Ativo' : contract.status}
                                    </Badge>
                                    {contract.start_date && (
                                      <p className="text-xs text-slate-400 mt-1">
                                        Início: {format(new Date(contract.start_date), "dd/MM/yy", { locale: ptBR })}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-6 bg-slate-50 rounded-lg">
                              <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                              <p className="text-slate-500 text-sm">Nenhum contrato de funcionário</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Emails */}
                      <Card className="border-0 shadow-sm">
                        <CardContent className="p-5">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                              <Mail className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-slate-800">Emails Enviados</h4>
                              <p className="text-sm text-slate-500">
                                {historyData?.emails?.length || 0} email(s) enviado(s)
                              </p>
                            </div>
                          </div>

                          {historyData?.emails && historyData.emails.length > 0 ? (
                            <div className="space-y-2">
                              {historyData.emails.map((email: any) => (
                                <div key={email.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <Mail className="h-4 w-4 text-slate-400" />
                                    <div>
                                      <p className="font-medium text-slate-800 text-sm">{email.subject || email.email_type}</p>
                                      <p className="text-xs text-slate-500">
                                        {email.sent_at && format(new Date(email.sent_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-6 bg-slate-50 rounded-lg">
                              <Mail className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                              <p className="text-slate-500 text-sm">Nenhum email registrado</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </TabsContent>

                {/* HISTÓRICO TAB */}
                <TabsContent value="historico" className="mt-0">
                  {isLoadingHistory ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                  ) : historyData?.timeline && historyData.timeline.length > 0 ? (
                    <div className="relative pl-8">
                      {/* Timeline line */}
                      <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 to-slate-200" />

                      <div className="space-y-4">
                        {historyData.timeline.map((event: any, index: number) => {
                          const iconConfig = getTimelineIcon(event.type);
                          const IconComponent = iconConfig.icon;
                          return (
                            <div key={index} className="relative">
                              {/* Timeline dot */}
                              <div className={`absolute -left-5 w-6 h-6 rounded-full ${iconConfig.bg} flex items-center justify-center border-2 border-white shadow-sm`}>
                                <IconComponent className={`h-3 w-3 ${iconConfig.color}`} />
                              </div>

                              <Card className="border-0 shadow-sm ml-4">
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between gap-4">
                                    <div>
                                      <p className="font-medium text-slate-800">{event.event}</p>
                                      {event.details && (
                                        <p className="text-sm text-slate-500 mt-0.5">{event.details}</p>
                                      )}
                                    </div>
                                    <p className="text-xs text-slate-400 whitespace-nowrap">
                                      {format(new Date(event.date), "dd/MM/yy HH:mm", { locale: ptBR })}
                                    </p>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                        <History className="h-8 w-8 text-slate-400" />
                      </div>
                      <h3 className="font-medium text-slate-800">Nenhum histórico</h3>
                      <p className="text-slate-500 text-sm mt-1">As interações aparecerão aqui</p>
                    </div>
                  )}
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>

          {/* Footer */}
          <DialogFooter className="border-t bg-slate-50 px-6 py-4 gap-2">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
            {canTakeAction && (
              <Button
                onClick={() => onSend(meeting.id)}
                disabled={isSending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {hasForm ? "Enviar Contrato" : "Enviar Formulário + Contrato"}
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialog !== null} onOpenChange={() => setPreviewDialog(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b bg-slate-50">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                {previewDialog === 'contract' ? (
                  <>
                    <FileSignature className="h-5 w-5 text-purple-600" />
                    Contrato de Serviço
                  </>
                ) : (
                  <>
                    <FileText className="h-5 w-5 text-blue-600" />
                    Formulário de Cadastro
                  </>
                )}
              </DialogTitle>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="p-6">
              {previewDialog === 'contract' && <ContractPreviewContent />}
              {previewDialog === 'form' && <FormPreviewContent />}
            </div>
          </ScrollArea>
          <DialogFooter className="border-t bg-slate-50 px-6 py-4">
            <Button variant="outline" onClick={() => setPreviewDialog(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
