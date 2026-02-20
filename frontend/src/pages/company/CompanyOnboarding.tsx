import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FeatureSteps } from "@/components/ui/feature-steps";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Building, CheckCircle, Briefcase, ArrowRight, ArrowLeft, FileText, Bot, Users, DollarSign, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ClassicLoader from "@/components/ui/ClassicLoader";
import DocumentSigningFlow from "@/components/DocumentSigningFlow";

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
  { value: "mestrado", label: "Mestrado" },
  { value: "doutorado", label: "Doutorado" },
];

const TIME_OPTIONS = [
  "00:00", "01:00", "02:00", "03:00", "04:00", "05:00",
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00", "22:00", "23:00",
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
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const INTRO_FEATURES = [
  {
    step: "Passo 1",
    title: "Tecnologia de IA Avançada",
    content: "Utilizamos inteligência artificial de ponta para encontrar os melhores candidatos para sua empresa, analisando milhares de perfis em segundos.",
    image: "https://images.unsplash.com/photo-1639322537228-f710d846310a?w=800&q=80",
  },
  {
    step: "Passo 2",
    title: "Equipe de Especialistas",
    content: "Nossa equipe de recrutadores experientes faz uma triagem pessoal de cada candidato, garantindo qualidade e adequação ao seu perfil.",
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80",
  },
  {
    step: "Passo 3",
    title: "Preço Justo e Acessível",
    content: "Oferecemos serviços de recrutamento de alta qualidade por um preço justo, sem taxas ocultas ou surpresas.",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80",
  },
];

export default function CompanyOnboarding() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [showIntro, setShowIntro] = useState(true);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Document signing state
  const [allDocsSigned, setAllDocsSigned] = useState(false);
  const utils = trpc.useUtils();

  const prepareAutentiqueDocs = trpc.contract.prepareAutentiqueDocuments.useMutation({
    onSuccess: () => {
      utils.contract.getDocumentsToSign.invalidate({ category: "contrato_inicial" });
    },
  });

  const [formData, setFormData] = useState({
    // Company Data
    contactPerson: "",
    phoneNumbers: [{ label: "", number: "" }] as { label: string; number: string }[],
    emails: [{ label: "", email: user?.email || "", isPrimary: true }] as { label: string; email: string; isPrimary: boolean }[],
    cnpj: "",
    businessName: "",
    legalName: "",
    landlinePhone: "",
    mobilePhone: "",
    website: "",
    employeeCount: "",
    socialMedia: "",
    cep: "",
    address: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    // Job Opening Data
    jobTitle: "",
    compensation: "",
    mainActivities: "",
    requiredSkills: "",
    employmentType: "",
    urgency: "",
    minAge: 14,
    maxAge: 99,
    educationLevels: [] as string[],
    benefits: [] as string[],
    workScheduleStart: "",
    workScheduleEnd: "",
    positionsCount: "",
    genderPreference: "",
    notes: "",
  });

  const submitOnboarding = trpc.company.submitOnboarding.useMutation({
    onSuccess: () => {
      toast.success("Cadastro concluido com sucesso!");
      window.location.href = "/company/dashboard";
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao concluir cadastro");
      setSubmitting(false);
    },
  });

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

  const handleBenefitChange = (benefit: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({ ...prev, benefits: [...prev.benefits, benefit] }));
    } else {
      setFormData(prev => ({ ...prev, benefits: prev.benefits.filter(b => b !== benefit) }));
    }
  };

  const handleEducationChange = (level: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({ ...prev, educationLevels: [...prev.educationLevels, level] }));
    } else {
      setFormData(prev => ({ ...prev, educationLevels: prev.educationLevels.filter(l => l !== level) }));
    }
  };

  // Phone numbers management
  const addPhoneNumber = () => {
    setFormData(prev => ({
      ...prev,
      phoneNumbers: [...prev.phoneNumbers, { label: "", number: "" }]
    }));
  };

  const removePhoneNumber = (index: number) => {
    setFormData(prev => ({
      ...prev,
      phoneNumbers: prev.phoneNumbers.filter((_, i) => i !== index)
    }));
  };

  const updatePhoneNumber = (index: number, field: "label" | "number", value: string) => {
    setFormData(prev => ({
      ...prev,
      phoneNumbers: prev.phoneNumbers.map((phone, i) =>
        i === index ? { ...phone, [field]: field === "number" ? formatPhone(value) : value } : phone
      )
    }));
  };

  // Email management
  const addEmail = () => {
    setFormData(prev => ({
      ...prev,
      emails: [...prev.emails, { label: "", email: "", isPrimary: false }]
    }));
  };

  const removeEmail = (index: number) => {
    setFormData(prev => {
      const newEmails = prev.emails.filter((_, i) => i !== index);
      // If we removed the primary, make first one primary
      if (prev.emails[index].isPrimary && newEmails.length > 0) {
        newEmails[0].isPrimary = true;
      }
      return { ...prev, emails: newEmails };
    });
  };

  const updateEmail = (index: number, field: "label" | "email", value: string) => {
    setFormData(prev => ({
      ...prev,
      emails: prev.emails.map((e, i) =>
        i === index ? { ...e, [field]: value } : e
      )
    }));
  };

  const setEmailPrimary = (index: number) => {
    setFormData(prev => ({
      ...prev,
      emails: prev.emails.map((e, i) => ({
        ...e,
        isPrimary: i === index
      }))
    }));
  };

  const validateStep1 = () => {
    if (!formData.cnpj || !formData.legalName) {
      toast.error("CNPJ e Razão Social são obrigatórios");
      return false;
    }
    // Check if at least one phone number is filled
    const hasValidPhone = formData.phoneNumbers.some(p => p.number.trim() !== "");
    if (!hasValidPhone) {
      toast.error("Informe pelo menos um telefone");
      return false;
    }
    // Check if at least one email is filled
    const hasValidEmail = formData.emails.some(e => e.email.trim() !== "");
    if (!hasValidEmail) {
      toast.error("Informe pelo menos um email");
      return false;
    }
    // Check if a primary email is selected
    const hasPrimary = formData.emails.some(e => e.isPrimary && e.email.trim() !== "");
    if (!hasPrimary) {
      toast.error("Selecione um email principal para comunicações");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.jobTitle || !formData.compensation || !formData.mainActivities ||
        !formData.requiredSkills || formData.educationLevels.length === 0 ||
        !formData.workScheduleStart || !formData.workScheduleEnd) {
      toast.error("Preencha todos os campos obrigatórios da vaga");
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!allDocsSigned) {
      toast.error("Por favor, assine todos os documentos antes de continuar");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
      // Prepare Autentique documents for signing (if configured)
      prepareAutentiqueDocs.mutate({ category: "contrato_inicial" });
    }
  };

  const handleBack = () => {
    if (step === 3) {
      setStep(2);
    } else if (step === 2) {
      setStep(1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep3()) return;

    setSubmitting(true);

    submitOnboarding.mutate({
      // Company data
      cnpj: formData.cnpj.replace(/\D/g, ""),
      legalName: formData.legalName,
      businessName: formData.businessName || undefined,
      contactPerson: formData.contactPerson || undefined,
      phoneNumbers: formData.phoneNumbers.filter(p => p.number.trim() !== ""),
      emails: formData.emails.filter(e => e.email.trim() !== ""),
      landlinePhone: formData.landlinePhone || undefined,
      mobilePhone: formData.mobilePhone || undefined,
      website: formData.website || undefined,
      employeeCount: formData.employeeCount || undefined,
      socialMedia: formData.socialMedia || undefined,
      cep: formData.cep?.replace(/\D/g, "") || undefined,
      address: formData.address || undefined,
      complement: formData.complement || undefined,
      neighborhood: formData.neighborhood || undefined,
      city: formData.city || undefined,
      state: formData.state || undefined,
      // Job data
      jobTitle: formData.jobTitle,
      compensation: formData.compensation,
      mainActivities: formData.mainActivities,
      requiredSkills: formData.requiredSkills,
      employmentType: formData.employmentType || undefined,
      urgency: formData.urgency || undefined,
      ageRange: `${formData.minAge}-${formData.maxAge}`,
      educationLevel: formData.educationLevels.join(','),
      benefits: formData.benefits.length > 0 ? formData.benefits : undefined,
      workSchedule: `${formData.workScheduleStart}-${formData.workScheduleEnd}`,
      positionsCount: formData.positionsCount || undefined,
      genderPreference: formData.genderPreference || undefined,
      notes: formData.notes || undefined,
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ClassicLoader />
      </div>
    );
  }

  // If no user at all, redirect to login
  if (!user) {
    window.location.href = '/login?tab=signup&role=company';
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ClassicLoader />
      </div>
    );
  }

  // If user exists but role is different (and not undefined), show error
  if (user.role && user.role !== 'company') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Esta página é exclusiva para empresas.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // If user exists (role is 'company' or still loading), show the form

  // Intro screen with feature steps
  if (showIntro) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <FeatureSteps
          features={INTRO_FEATURES}
          title="Como Funciona"
          autoPlayInterval={8000}
          className="bg-white"
        />

        <div className="max-w-3xl mx-auto px-4 pb-12">
          <Card className="shadow-xl border-2 border-primary/20">
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <h3 className="text-2xl font-bold">Pronto para começar?</h3>
                <p className="text-muted-foreground">
                  Preencha o formulário a seguir com os dados da sua empresa e da vaga que deseja preencher.
                  Em poucos minutos, nossa equipe começará a trabalhar para encontrar o candidato ideal para você.
                </p>
                <Button
                  size="lg"
                  className="mt-4 gap-2"
                  onClick={() => setShowIntro(false)}
                >
                  Comecar Cadastro
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const steps = [
    { number: 1, title: "Empresa", icon: Building },
    { number: 2, title: "Vaga", icon: Briefcase },
    { number: 3, title: "Contrato", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Modern Stepper Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Step Indicators */}
          <div className="flex items-center justify-center">
            {steps.map((s, index) => {
              const StepIcon = s.icon;
              const isActive = step === s.number;
              const isCompleted = step > s.number;

              return (
                <div key={s.number} className="flex items-center">
                  {/* Step Circle */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`
                        w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
                        ${isActive
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110"
                          : isCompleted
                            ? "bg-green-500 text-white"
                            : "bg-gray-100 text-gray-400"
                        }
                      `}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-6 w-6" />
                      ) : (
                        <StepIcon className="h-5 w-5" />
                      )}
                    </div>
                    <span className={`
                      mt-2 text-sm font-medium transition-colors
                      ${isActive ? "text-blue-600" : isCompleted ? "text-green-600" : "text-gray-400"}
                    `}>
                      {s.title}
                    </span>
                  </div>

                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className={`
                      w-24 h-1 mx-4 rounded-full transition-colors duration-300
                      ${step > s.number ? "bg-green-500" : "bg-gray-200"}
                    `} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} noValidate>
          {/* Step 1: Company Data */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Section Header */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Dados da Empresa</h2>
                <p className="text-gray-500 mt-1">Informações básicas sobre sua empresa</p>
              </div>

              <Card className="shadow-xl border-0 bg-white/80 backdrop-blur">
              <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="cnpj">CNPJ *</Label>
                    <Input
                      id="cnpj"
                      placeholder="00.000.000/0000-00"
                      value={formData.cnpj}
                      onChange={(e) => setFormData({ ...formData, cnpj: formatCnpj(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="businessName">Nome Fantasia</Label>
                    <Input
                      id="businessName"
                      placeholder="Nome fantasia da empresa"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="legalName">Razão Social *</Label>
                  <Input
                    id="legalName"
                    placeholder="Razão social completa"
                    value={formData.legalName}
                    onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="contactPerson">Responsável</Label>
                  <Input
                    id="contactPerson"
                    placeholder="Nome do responsável"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  />
                </div>

                {/* Multiple Phone Numbers */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Telefones *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addPhoneNumber}
                      className="gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar Telefone
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {formData.phoneNumbers.map((phone, index) => (
                      <div key={index} className="flex gap-3 items-start">
                        <div className="flex-1">
                          <Input
                            placeholder="Título (ex: Diretor, Recepção, Comercial)"
                            value={phone.label}
                            onChange={(e) => updatePhoneNumber(index, "label", e.target.value)}
                          />
                        </div>
                        <div className="flex-1">
                          <Input
                            placeholder="(11) 99999-9999"
                            value={phone.number}
                            onChange={(e) => updatePhoneNumber(index, "number", e.target.value)}
                          />
                        </div>
                        {formData.phoneNumbers.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removePhoneNumber(index)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Adicione telefones com títulos para facilitar o contato (ex: "Diretor", "RH", "Comercial")
                  </p>
                </div>

                {/* Multiple Emails */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Emails *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addEmail}
                      className="gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar Email
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {formData.emails.map((emailItem, index) => (
                      <div key={index} className="flex gap-3 items-start">
                        <div className="w-32">
                          <Input
                            placeholder="Setor (ex: RH)"
                            value={emailItem.label}
                            onChange={(e) => updateEmail(index, "label", e.target.value)}
                          />
                        </div>
                        <div className="flex-1">
                          <Input
                            type="email"
                            placeholder="email@empresa.com"
                            value={emailItem.email}
                            onChange={(e) => updateEmail(index, "email", e.target.value)}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`email-primary-${index}`}
                            checked={emailItem.isPrimary}
                            onCheckedChange={() => setEmailPrimary(index)}
                          />
                          <Label htmlFor={`email-primary-${index}`} className="text-xs text-muted-foreground cursor-pointer">
                            Principal
                          </Label>
                        </div>
                        {formData.emails.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeEmail(index)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Marque "Principal" no email que deve receber as comunicações da plataforma
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="website">Site ou Rede Social</Label>
                  <Input
                    id="website"
                    placeholder="https://www.empresa.com"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="employeeCount">Quantidade de Funcionários</Label>
                  <Input
                    id="employeeCount"
                    placeholder="Ex: 50"
                    value={formData.employeeCount}
                    onChange={(e) => setFormData({ ...formData, employeeCount: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="cep">CEP</Label>
                    <Input
                      id="cep"
                      placeholder="00000-000"
                      value={formData.cep}
                      onChange={(e) => setFormData({ ...formData, cep: formatCep(e.target.value) })}
                    />
                  </div>
                  <div className="col-span-2 grid gap-2">
                    <Label htmlFor="address">Endereço e Número</Label>
                    <Input
                      id="address"
                      placeholder="Rua, número"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="complement">Complemento</Label>
                    <Input
                      id="complement"
                      placeholder="Sala, andar"
                      value={formData.complement}
                      onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="neighborhood">Bairro</Label>
                    <Input
                      id="neighborhood"
                      placeholder="Bairro"
                      value={formData.neighborhood}
                      onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      placeholder="Cidade"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-2 max-w-[200px]">
                  <Label htmlFor="state">Estado</Label>
                  <Select
                    value={formData.state}
                    onValueChange={(v) => setFormData({ ...formData, state: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRAZILIAN_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end pt-6 border-t">
                  <Button type="button" onClick={handleNext} size="lg" className="px-8">
                    Continuar
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
            </div>
          )}

          {/* Step 2: Job Opening Data */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Section Header */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Dados da Vaga</h2>
                <p className="text-gray-500 mt-1">Informações sobre a vaga que deseja preencher</p>
              </div>

              <Card className="shadow-xl border-0 bg-white/80 backdrop-blur">
              <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="jobTitle">Cargo *</Label>
                    <Input
                      id="jobTitle"
                      placeholder="Ex: Assistente Administrativo"
                      value={formData.jobTitle}
                      onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="compensation">Remuneracao *</Label>
                    <Input
                      id="compensation"
                      placeholder="Ex: R$ 2.000,00"
                      value={formData.compensation}
                      onChange={(e) => setFormData({ ...formData, compensation: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="mainActivities">Principais Atividades *</Label>
                  <Textarea
                    id="mainActivities"
                    placeholder="Descreva as principais atividades do cargo..."
                    value={formData.mainActivities}
                    onChange={(e) => setFormData({ ...formData, mainActivities: e.target.value })}
                    rows={3}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="requiredSkills">Competências Requeridas *</Label>
                  <Textarea
                    id="requiredSkills"
                    placeholder="Liste as competências e habilidades necessárias..."
                    value={formData.requiredSkills}
                    onChange={(e) => setFormData({ ...formData, requiredSkills: e.target.value })}
                    rows={3}
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="employmentType">Tipo de Contrato</Label>
                    <Select
                      value={formData.employmentType}
                      onValueChange={(v) => setFormData({ ...formData, employmentType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {EMPLOYMENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="urgency">Urgência</Label>
                    <Select
                      value={formData.urgency}
                      onValueChange={(v) => setFormData({ ...formData, urgency: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {URGENCY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Faixa Etária</Label>
                    <div className="flex items-center gap-2">
                      <Select
                        value={String(formData.minAge)}
                        onValueChange={(v) => setFormData({ ...formData, minAge: parseInt(v) })}
                      >
                        <SelectTrigger className="w-[70px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-48">
                          {Array.from({ length: 86 }, (_, i) => 14 + i).map((age) => (
                            <SelectItem key={age} value={String(age)}>
                              {age}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground text-sm">a</span>
                      <Select
                        value={String(formData.maxAge)}
                        onValueChange={(v) => setFormData({ ...formData, maxAge: parseInt(v) })}
                      >
                        <SelectTrigger className="w-[70px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-48">
                          {Array.from({ length: 86 }, (_, i) => 14 + i).map((age) => (
                            <SelectItem key={age} value={String(age)}>
                              {age}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Escolaridade Aceita *</Label>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 p-3 border rounded-md">
                    {EDUCATION_LEVELS.map((level) => (
                      <div key={level.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edu-${level.value}`}
                          checked={formData.educationLevels.includes(level.value)}
                          onCheckedChange={(checked) => handleEducationChange(level.value, checked as boolean)}
                        />
                        <label htmlFor={`edu-${level.value}`} className="text-sm whitespace-nowrap">
                          {level.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Benefícios</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {BENEFITS_OPTIONS.map((benefit) => (
                      <div key={benefit} className="flex items-center space-x-2">
                        <Checkbox
                          id={benefit}
                          checked={formData.benefits.includes(benefit)}
                          onCheckedChange={(checked) => handleBenefitChange(benefit, checked as boolean)}
                        />
                        <label htmlFor={benefit} className="text-sm">
                          {benefit}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div className="grid gap-2">
                    <Label>Horário de Trabalho *</Label>
                    <div className="flex items-center gap-3">
                      <Select
                        value={formData.workScheduleStart}
                        onValueChange={(v) => setFormData({ ...formData, workScheduleStart: v })}
                      >
                        <SelectTrigger className="w-[100px]">
                          <SelectValue placeholder="Início" />
                        </SelectTrigger>
                        <SelectContent className="max-h-48">
                          {TIME_OPTIONS.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground text-sm">as</span>
                      <Select
                        value={formData.workScheduleEnd}
                        onValueChange={(v) => setFormData({ ...formData, workScheduleEnd: v })}
                      >
                        <SelectTrigger className="w-[100px]">
                          <SelectValue placeholder="Fim" />
                        </SelectTrigger>
                        <SelectContent className="max-h-48">
                          {TIME_OPTIONS.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="positionsCount">Quantidade de Vagas</Label>
                    <Input
                      id="positionsCount"
                      type="number"
                      min="1"
                      placeholder="Ex: 2"
                      value={formData.positionsCount}
                      onChange={(e) => setFormData({ ...formData, positionsCount: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="genderPreference">Genero</Label>
                    <Select
                      value={formData.genderPreference}
                      onValueChange={(v) => setFormData({ ...formData, genderPreference: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {GENDER_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="notes">Observações Gerais</Label>
                  <Textarea
                    id="notes"
                    placeholder="Informações adicionais sobre a vaga..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                  />
                </div>

                <div className="flex justify-between pt-6 border-t">
                  <Button type="button" variant="outline" onClick={handleBack} size="lg" className="px-8">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                  <Button type="button" onClick={handleNext} size="lg" className="px-8">
                    Continuar
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
            </div>
          )}

          {/* Step 3: Document Signing */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Section Header */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Documentos de Parceria</h2>
                <p className="text-gray-500 mt-1">Leia e assine os documentos para finalizar seu cadastro</p>
              </div>

              <Card className="shadow-xl border-0 bg-white/80 backdrop-blur">
              <CardContent className="p-8 space-y-6">
                <DocumentSigningFlow
                  category="contrato_inicial"
                  onAllSigned={() => setAllDocsSigned(true)}
                />

                <div className="flex justify-between pt-6 border-t">
                  <Button type="button" variant="outline" onClick={handleBack} size="lg" className="px-8">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                  <Button type="submit" disabled={submitting || !allDocsSigned} size="lg" className="px-8 bg-green-600 hover:bg-green-700">
                    {submitting ? (
                      <>
                        <ClassicLoader />
                        Finalizando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Concluir Cadastro
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
