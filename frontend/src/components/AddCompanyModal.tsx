import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAgencyContext } from "@/contexts/AgencyContext";
import {
  Building,
  Briefcase,
  FileText,
  DollarSign,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  Check,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const EMPLOYMENT_TYPES = [
  { value: "clt", label: "CLT" },
  { value: "estagio", label: "Estágio" },
  { value: "jovem_aprendiz", label: "Jovem Aprendiz" },
];

const URGENCY_OPTIONS = [
  { value: "imediata", label: "Imediata" },
  { value: "7_dias", label: "Em até 7 dias" },
  { value: "15_dias", label: "Em até 15 dias" },
  { value: "30_dias", label: "Em até 30 dias" },
  { value: "sem_urgencia", label: "Sem urgência" },
];

const GENDER_OPTIONS = [
  { value: "indiferente", label: "Indiferente" },
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
];

const EDUCATION_LEVELS = [
  { value: "medio_incompleto", label: "Médio Incompleto" },
  { value: "medio_completo", label: "Médio Completo" },
  { value: "tecnico", label: "Técnico" },
  { value: "superior_incompleto", label: "Superior Incompleto" },
  { value: "superior_completo", label: "Superior Completo" },
  { value: "pos_graduacao", label: "Pós-Graduação" },
];

const TIME_OPTIONS = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00", "22:00",
];

const BENEFITS_OPTIONS = [
  "Vale Transporte",
  "Vale Refeição",
  "Vale Alimentação",
  "Plano de Saúde",
  "Plano Odontológico",
  "Seguro de Vida",
  "Gympass",
  "PLR",
  "Auxílio Creche",
  "Home Office",
];

const BRAZILIAN_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const STEPS = [
  { icon: Building, label: "Empresa" },
  { icon: Briefcase, label: "Vaga" },
  { icon: FileText, label: "Documentos" },
  { icon: DollarSign, label: "Pagamento" },
];

interface AddCompanyModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddCompanyModal({ open, onClose, onSuccess }: AddCompanyModalProps) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const { currentAgency, isAllAgenciesMode, availableAgencies } = useAgencyContext();

  // Admin agency selection (for all-agencies mode)
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>("");

  const [formData, setFormData] = useState({
    // Company Data
    legalName: "",
    businessName: "",
    cnpj: "",
    contactPerson: "",
    email: "",
    password: "",
    phoneNumbers: [{ label: "Principal", number: "" }] as { label: string; number: string }[],
    website: "",
    employeeCount: "",
    cep: "",
    address: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    // Job Data
    jobTitle: "",
    compensation: "",
    mainActivities: "",
    requiredSkills: "",
    employmentType: "",
    urgency: "",
    educationLevel: "",
    benefits: [] as string[],
    workScheduleStart: "",
    workScheduleEnd: "",
    positionsCount: "",
    genderPreference: "",
    notes: "",
    // Documents
    hasDocuments: false,
    contractFileBase64: "" as string,
    contractFileName: "" as string,
    // Payment
    hasPayment: false,
    monthlyAmount: "",
    paymentStartDate: "",
    paymentEndDate: "",
    paymentDay: "",
    paidMonths: "",
    paymentNotes: "",
  });

  const registerCompany = trpc.agency.registerCompany.useMutation();
  const createPaymentSchedule = trpc.agency.createCompanyPaymentSchedule.useMutation();

  // Formatters
  const formatCnpj = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 14);
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  };

  const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  // Phone management
  const addPhoneNumber = () => {
    setFormData(prev => ({
      ...prev,
      phoneNumbers: [...prev.phoneNumbers, { label: "", number: "" }],
    }));
  };

  const removePhoneNumber = (index: number) => {
    if (formData.phoneNumbers.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      phoneNumbers: prev.phoneNumbers.filter((_, i) => i !== index),
    }));
  };

  const updatePhoneNumber = (index: number, field: "label" | "number", value: string) => {
    setFormData(prev => ({
      ...prev,
      phoneNumbers: prev.phoneNumbers.map((phone, i) =>
        i === index ? { ...phone, [field]: field === "number" ? formatPhone(value) : value } : phone
      ),
    }));
  };

  // Benefits
  const handleBenefitChange = (benefit: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({ ...prev, benefits: [...prev.benefits, benefit] }));
    } else {
      setFormData(prev => ({ ...prev, benefits: prev.benefits.filter(b => b !== benefit) }));
    }
  };

  // File upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Por favor, selecione um arquivo PDF");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      setFormData(prev => ({
        ...prev,
        contractFileBase64: base64,
        contractFileName: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

  // Validation
  const validateStep1 = () => {
    if (isAllAgenciesMode && !selectedAgencyId) {
      toast.error("Selecione uma agência");
      return false;
    }
    if (!formData.legalName) {
      toast.error("Razão Social é obrigatória");
      return false;
    }
    if (!formData.email) {
      toast.error("Email é obrigatório");
      return false;
    }
    if (!formData.password || formData.password.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres");
      return false;
    }
    const hasValidPhone = formData.phoneNumbers.some(p => p.number.trim() !== "");
    if (!hasValidPhone) {
      toast.error("Informe pelo menos um telefone");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.jobTitle || !formData.compensation || !formData.mainActivities ||
        !formData.requiredSkills || !formData.educationLevel ||
        !formData.workScheduleStart || !formData.workScheduleEnd) {
      toast.error("Preencha todos os campos obrigatórios da vaga");
      return false;
    }
    return true;
  };

  const validateStep4 = () => {
    if (formData.hasPayment) {
      if (!formData.monthlyAmount || parseFloat(formData.monthlyAmount) <= 0) {
        toast.error("Informe o valor mensal");
        return false;
      }
      if (!formData.paymentStartDate) {
        toast.error("Informe a data de início dos pagamentos");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 4 && !validateStep4()) return;
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep4()) return;
    setSubmitting(true);

    try {
      // Step 1: Register the company
      const workSchedule = `${formData.workScheduleStart} - ${formData.workScheduleEnd}`;

      const result = await registerCompany.mutateAsync({
        agencyId: isAllAgenciesMode ? selectedAgencyId : undefined,
        email: formData.email,
        password: formData.password,
        legalName: formData.legalName,
        businessName: formData.businessName || undefined,
        cnpj: formData.cnpj || undefined,
        contactPerson: formData.contactPerson || undefined,
        phoneNumbers: formData.phoneNumbers.filter(p => p.number.trim()),
        emails: [{ label: "Principal", email: formData.email, isPrimary: true }],
        website: formData.website || undefined,
        employeeCount: formData.employeeCount || undefined,
        cep: formData.cep || undefined,
        address: formData.address || undefined,
        complement: formData.complement || undefined,
        neighborhood: formData.neighborhood || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        jobTitle: formData.jobTitle,
        compensation: formData.compensation,
        mainActivities: formData.mainActivities,
        requiredSkills: formData.requiredSkills,
        employmentType: formData.employmentType || undefined,
        urgency: formData.urgency || undefined,
        educationLevel: formData.educationLevel,
        benefits: formData.benefits.length > 0 ? formData.benefits : undefined,
        workSchedule,
        positionsCount: formData.positionsCount || undefined,
        genderPreference: formData.genderPreference || undefined,
        notes: formData.notes || undefined,
        contractSigned: formData.hasDocuments,
        contractFileBase64: formData.contractFileBase64 || undefined,
        contractFileName: formData.contractFileName || undefined,
      });

      // Step 2: Create payment schedule if configured
      if (formData.hasPayment && result.companyId) {
        const monthlyAmount = parseFloat(formData.monthlyAmount);
        await createPaymentSchedule.mutateAsync({
          companyId: result.companyId,
          monthlyAmount,
          startDate: new Date(formData.paymentStartDate).toISOString(),
          endDate: formData.paymentEndDate ? new Date(formData.paymentEndDate).toISOString() : undefined,
          paymentDay: formData.paymentDay ? parseInt(formData.paymentDay) : undefined,
          paidMonths: formData.paidMonths ? parseInt(formData.paidMonths) : undefined,
          notes: formData.paymentNotes || undefined,
        });
      }

      toast.success("Empresa cadastrada com sucesso!");
      handleClose();
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Erro ao cadastrar empresa");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedAgencyId("");
    setFormData({
      legalName: "",
      businessName: "",
      cnpj: "",
      contactPerson: "",
      email: "",
      password: "",
      phoneNumbers: [{ label: "Principal", number: "" }],
      website: "",
      employeeCount: "",
      cep: "",
      address: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      jobTitle: "",
      compensation: "",
      mainActivities: "",
      requiredSkills: "",
      employmentType: "",
      urgency: "",
      educationLevel: "",
      benefits: [],
      workScheduleStart: "",
      workScheduleEnd: "",
      positionsCount: "",
      genderPreference: "",
      notes: "",
      hasDocuments: false,
      contractFileBase64: "",
      contractFileName: "",
      hasPayment: false,
      monthlyAmount: "",
      paymentStartDate: "",
      paymentEndDate: "",
      paymentDay: "",
      paidMonths: "",
      paymentNotes: "",
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Empresa</DialogTitle>
          <DialogDescription>
            Cadastre uma nova empresa parceira
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-1 py-2">
          {STEPS.map((s, idx) => {
            const StepIcon = s.icon;
            const stepNum = idx + 1;
            const isActive = step === stepNum;
            const isCompleted = step > stepNum;
            return (
              <div key={idx} className="flex items-center">
                {idx > 0 && (
                  <div className={`w-8 h-0.5 mx-1 ${isCompleted ? 'bg-orange-500' : 'bg-gray-200'}`} />
                )}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors ${
                      isActive
                        ? "bg-[#0A2342] text-white"
                        : isCompleted
                        ? "bg-orange-500 text-white"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                  </div>
                  <span className={`text-xs ${isActive ? 'text-[#0A2342] font-medium' : 'text-gray-400'}`}>
                    {s.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="space-y-4 py-2">
          {step === 1 && (
            <Step1CompanyInfo
              formData={formData}
              setFormData={setFormData}
              formatCnpj={formatCnpj}
              formatCep={formatCep}
              formatPhone={formatPhone}
              addPhoneNumber={addPhoneNumber}
              removePhoneNumber={removePhoneNumber}
              updatePhoneNumber={updatePhoneNumber}
              isAllAgenciesMode={isAllAgenciesMode}
              availableAgencies={availableAgencies}
              selectedAgencyId={selectedAgencyId}
              setSelectedAgencyId={setSelectedAgencyId}
            />
          )}
          {step === 2 && (
            <Step2JobDescription
              formData={formData}
              setFormData={setFormData}
              handleBenefitChange={handleBenefitChange}
            />
          )}
          {step === 3 && (
            <Step3Documents
              formData={formData}
              setFormData={setFormData}
              handleFileUpload={handleFileUpload}
            />
          )}
          {step === 4 && (
            <Step4Payment
              formData={formData}
              setFormData={setFormData}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1 || submitting}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          {step < 4 ? (
            <Button onClick={handleNext}>
              Próximo
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Cadastrar Empresa
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Step 1: Company Information
// ============================================
function Step1CompanyInfo({
  formData, setFormData, formatCnpj, formatCep, formatPhone,
  addPhoneNumber, removePhoneNumber, updatePhoneNumber,
  isAllAgenciesMode, availableAgencies, selectedAgencyId, setSelectedAgencyId,
}: any) {
  return (
    <div className="space-y-4">
      {/* Agency selector for admins */}
      {isAllAgenciesMode && (
        <div>
          <Label>Agência *</Label>
          <Select value={selectedAgencyId} onValueChange={setSelectedAgencyId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a agência" />
            </SelectTrigger>
            <SelectContent>
              {availableAgencies.map((a: any) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name} {a.city ? `(${a.city})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Razão Social *</Label>
          <Input
            value={formData.legalName}
            onChange={(e) => setFormData((p: any) => ({ ...p, legalName: e.target.value }))}
            placeholder="Razão Social da empresa"
          />
        </div>
        <div>
          <Label>Nome Fantasia</Label>
          <Input
            value={formData.businessName}
            onChange={(e) => setFormData((p: any) => ({ ...p, businessName: e.target.value }))}
            placeholder="Nome fantasia"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>CNPJ</Label>
          <Input
            value={formData.cnpj}
            onChange={(e) => setFormData((p: any) => ({ ...p, cnpj: formatCnpj(e.target.value) }))}
            placeholder="00.000.000/0000-00"
          />
        </div>
        <div>
          <Label>Pessoa de Contato</Label>
          <Input
            value={formData.contactPerson}
            onChange={(e) => setFormData((p: any) => ({ ...p, contactPerson: e.target.value }))}
            placeholder="Nome do contato"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Email de Acesso *</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData((p: any) => ({ ...p, email: e.target.value }))}
            placeholder="email@empresa.com"
          />
        </div>
        <div>
          <Label>Senha de Acesso *</Label>
          <Input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData((p: any) => ({ ...p, password: e.target.value }))}
            placeholder="Mínimo 6 caracteres"
          />
        </div>
      </div>

      {/* Phone Numbers */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Telefones *</Label>
          <Button type="button" variant="ghost" size="sm" onClick={addPhoneNumber}>
            <Plus className="h-3 w-3 mr-1" /> Adicionar
          </Button>
        </div>
        {formData.phoneNumbers.map((phone: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-2">
            <Input
              value={phone.label}
              onChange={(e) => updatePhoneNumber(index, "label", e.target.value)}
              placeholder="Rótulo"
              className="w-32"
            />
            <Input
              value={phone.number}
              onChange={(e) => updatePhoneNumber(index, "number", e.target.value)}
              placeholder="(00) 00000-0000"
              className="flex-1"
            />
            {formData.phoneNumbers.length > 1 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => removePhoneNumber(index)}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Address */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>CEP</Label>
          <Input
            value={formData.cep}
            onChange={(e) => setFormData((p: any) => ({ ...p, cep: formatCep(e.target.value) }))}
            placeholder="00000-000"
          />
        </div>
        <div className="col-span-2">
          <Label>Endereço</Label>
          <Input
            value={formData.address}
            onChange={(e) => setFormData((p: any) => ({ ...p, address: e.target.value }))}
            placeholder="Rua, número"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Bairro</Label>
          <Input
            value={formData.neighborhood}
            onChange={(e) => setFormData((p: any) => ({ ...p, neighborhood: e.target.value }))}
          />
        </div>
        <div>
          <Label>Cidade</Label>
          <Input
            value={formData.city}
            onChange={(e) => setFormData((p: any) => ({ ...p, city: e.target.value }))}
          />
        </div>
        <div>
          <Label>Estado</Label>
          <Select value={formData.state} onValueChange={(v) => setFormData((p: any) => ({ ...p, state: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="UF" />
            </SelectTrigger>
            <SelectContent>
              {BRAZILIAN_STATES.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Website</Label>
          <Input
            value={formData.website}
            onChange={(e) => setFormData((p: any) => ({ ...p, website: e.target.value }))}
            placeholder="www.empresa.com"
          />
        </div>
        <div>
          <Label>N° de Funcionários</Label>
          <Input
            value={formData.employeeCount}
            onChange={(e) => setFormData((p: any) => ({ ...p, employeeCount: e.target.value }))}
            placeholder="Ex: 50"
          />
        </div>
      </div>
    </div>
  );
}

// ============================================
// Step 2: Job Description
// ============================================
function Step2JobDescription({ formData, setFormData, handleBenefitChange }: any) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Título da Vaga *</Label>
          <Input
            value={formData.jobTitle}
            onChange={(e) => setFormData((p: any) => ({ ...p, jobTitle: e.target.value }))}
            placeholder="Ex: Assistente Administrativo"
          />
        </div>
        <div>
          <Label>Remuneração *</Label>
          <Input
            value={formData.compensation}
            onChange={(e) => setFormData((p: any) => ({ ...p, compensation: e.target.value }))}
            placeholder="Ex: R$ 1.500,00"
          />
        </div>
      </div>

      <div>
        <Label>Principais Atividades *</Label>
        <Textarea
          value={formData.mainActivities}
          onChange={(e) => setFormData((p: any) => ({ ...p, mainActivities: e.target.value }))}
          placeholder="Descreva as atividades principais da vaga..."
          rows={3}
        />
      </div>

      <div>
        <Label>Requisitos / Habilidades *</Label>
        <Textarea
          value={formData.requiredSkills}
          onChange={(e) => setFormData((p: any) => ({ ...p, requiredSkills: e.target.value }))}
          placeholder="Habilidades e requisitos necessários..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Tipo de Contrato</Label>
          <Select
            value={formData.employmentType}
            onValueChange={(v) => setFormData((p: any) => ({ ...p, employmentType: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {EMPLOYMENT_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Urgência</Label>
          <Select
            value={formData.urgency}
            onValueChange={(v) => setFormData((p: any) => ({ ...p, urgency: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {URGENCY_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>N° de Vagas</Label>
          <Input
            value={formData.positionsCount}
            onChange={(e) => setFormData((p: any) => ({ ...p, positionsCount: e.target.value }))}
            placeholder="1"
            type="number"
          />
        </div>
      </div>

      <div>
        <Label>Escolaridade Mínima *</Label>
        <Select
          value={formData.educationLevel}
          onValueChange={(v) => setFormData((p: any) => ({ ...p, educationLevel: v }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {EDUCATION_LEVELS.map(l => (
              <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Horário Início *</Label>
          <Select
            value={formData.workScheduleStart}
            onValueChange={(v) => setFormData((p: any) => ({ ...p, workScheduleStart: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Início" />
            </SelectTrigger>
            <SelectContent>
              {TIME_OPTIONS.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Horário Fim *</Label>
          <Select
            value={formData.workScheduleEnd}
            onValueChange={(v) => setFormData((p: any) => ({ ...p, workScheduleEnd: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Fim" />
            </SelectTrigger>
            <SelectContent>
              {TIME_OPTIONS.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Gênero</Label>
        <Select
          value={formData.genderPreference}
          onValueChange={(v) => setFormData((p: any) => ({ ...p, genderPreference: v }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Indiferente" />
          </SelectTrigger>
          <SelectContent>
            {GENDER_OPTIONS.map(g => (
              <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Benefits */}
      <div>
        <Label className="mb-2 block">Benefícios</Label>
        <div className="grid grid-cols-2 gap-2">
          {BENEFITS_OPTIONS.map(b => (
            <label key={b} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={formData.benefits.includes(b)}
                onCheckedChange={(checked) => handleBenefitChange(b, !!checked)}
              />
              {b}
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label>Observações</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData((p: any) => ({ ...p, notes: e.target.value }))}
          placeholder="Informações adicionais..."
          rows={2}
        />
      </div>
    </div>
  );
}

// ============================================
// Step 3: Documents
// ============================================
function Step3Documents({ formData, setFormData, handleFileUpload }: any) {
  return (
    <div className="space-y-6">
      <div className="text-center py-4">
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">Documentos da Empresa</h3>
        <p className="text-sm text-gray-500">
          A empresa já possui contrato assinado ou documentos para upload?
        </p>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setFormData((p: any) => ({ ...p, hasDocuments: true }))}
          className={`px-6 py-3 rounded-lg border-2 transition-all ${
            formData.hasDocuments
              ? "border-orange-500 bg-orange-50 text-orange-700"
              : "border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          Sim, já tem documentos
        </button>
        <button
          onClick={() => setFormData((p: any) => ({ ...p, hasDocuments: false, contractFileBase64: "", contractFileName: "" }))}
          className={`px-6 py-3 rounded-lg border-2 transition-all ${
            !formData.hasDocuments
              ? "border-orange-500 bg-orange-50 text-orange-700"
              : "border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          Não, sem documentos
        </button>
      </div>

      {formData.hasDocuments && (
        <div className="space-y-4 mt-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-300 transition-colors">
            {formData.contractFileName ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700">{formData.contractFileName}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFormData((p: any) => ({ ...p, contractFileBase64: "", contractFileName: "" }))}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-2">Arraste o contrato PDF ou clique para selecionar</p>
                <Label
                  htmlFor="contract-upload"
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-[#0A2342] text-white rounded-md hover:bg-[#0A2342]/90 text-sm"
                >
                  <Upload className="h-4 w-4" />
                  Selecionar PDF
                </Label>
                <Input
                  id="contract-upload"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </>
            )}
          </div>
          <p className="text-xs text-gray-400 text-center">Apenas PDF, máximo 10MB</p>
        </div>
      )}
    </div>
  );
}

// ============================================
// Step 4: Payment
// ============================================
function Step4Payment({ formData, setFormData }: any) {
  return (
    <div className="space-y-6">
      <div className="text-center py-4">
        <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">Pagamentos</h3>
        <p className="text-sm text-gray-500">
          Deseja configurar cobrança mensal para esta empresa?
        </p>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setFormData((p: any) => ({ ...p, hasPayment: true }))}
          className={`px-6 py-3 rounded-lg border-2 transition-all ${
            formData.hasPayment
              ? "border-orange-500 bg-orange-50 text-orange-700"
              : "border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          Sim, configurar pagamento
        </button>
        <button
          onClick={() => setFormData((p: any) => ({
            ...p,
            hasPayment: false,
            monthlyAmount: "",
            paymentStartDate: "",
            paymentEndDate: "",
            paymentDay: "",
            paidMonths: "",
            paymentNotes: "",
          }))}
          className={`px-6 py-3 rounded-lg border-2 transition-all ${
            !formData.hasPayment
              ? "border-orange-500 bg-orange-50 text-orange-700"
              : "border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          Não, sem pagamento
        </button>
      </div>

      {formData.hasPayment && (
        <div className="space-y-4 mt-4 bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Valor Mensal (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.monthlyAmount}
                onChange={(e) => setFormData((p: any) => ({ ...p, monthlyAmount: e.target.value }))}
                placeholder="Ex: 250.00"
              />
            </div>
            <div>
              <Label>Dia do Vencimento</Label>
              <Input
                type="number"
                min="1"
                max="31"
                value={formData.paymentDay}
                onChange={(e) => setFormData((p: any) => ({ ...p, paymentDay: e.target.value }))}
                placeholder="Ex: 10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data de Início *</Label>
              <Input
                type="date"
                value={formData.paymentStartDate}
                onChange={(e) => setFormData((p: any) => ({ ...p, paymentStartDate: e.target.value }))}
              />
            </div>
            <div>
              <Label>Data de Término</Label>
              <Input
                type="date"
                value={formData.paymentEndDate}
                onChange={(e) => setFormData((p: any) => ({ ...p, paymentEndDate: e.target.value }))}
              />
              <p className="text-xs text-gray-400 mt-1">Se vazio, gera 12 meses</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Meses já pagos</Label>
              <Input
                type="number"
                min="0"
                value={formData.paidMonths}
                onChange={(e) => setFormData((p: any) => ({ ...p, paidMonths: e.target.value }))}
                placeholder="Ex: 3"
              />
              <p className="text-xs text-gray-400 mt-1">Primeiros meses marcados como pagos</p>
            </div>
            <div>
              <Label>Observações</Label>
              <Input
                value={formData.paymentNotes}
                onChange={(e) => setFormData((p: any) => ({ ...p, paymentNotes: e.target.value }))}
                placeholder="Ex: Mensalidade estágio"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
