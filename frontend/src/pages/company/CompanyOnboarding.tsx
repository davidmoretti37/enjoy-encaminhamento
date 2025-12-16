import { useState, useRef } from "react";
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
import { Building, CheckCircle, Briefcase, ArrowRight, ArrowLeft, FileText, Eraser, ExternalLink, Bot, Users, DollarSign, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ClassicLoader from "@/components/ui/ClassicLoader";
import SignatureCanvas from "react-signature-canvas";

const EMPLOYMENT_TYPES = [
  { value: "clt", label: "CLT" },
  { value: "estagio", label: "Estagio" },
  { value: "jovem_aprendiz", label: "Jovem Aprendiz" },
  { value: "pj", label: "PJ" },
  { value: "temporario", label: "Temporario" },
];

const URGENCY_OPTIONS = [
  { value: "imediata", label: "Imediata" },
  { value: "7_dias", label: "Em ate 7 dias" },
  { value: "15_dias", label: "Em ate 15 dias" },
  { value: "30_dias", label: "Em ate 30 dias" },
  { value: "sem_urgencia", label: "Sem urgencia" },
];

const GENDER_OPTIONS = [
  { value: "indiferente", label: "Indiferente" },
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
];

const EDUCATION_LEVELS = [
  { value: "sem_ensino", label: "Sem Escolaridade" },
  { value: "fundamental_incompleto", label: "Fundamental Incompleto" },
  { value: "fundamental_completo", label: "Fundamental Completo" },
  { value: "medio_incompleto", label: "Medio Incompleto" },
  { value: "medio_completo", label: "Medio Completo" },
  { value: "tecnico", label: "Tecnico" },
  { value: "superior_incompleto", label: "Superior Incompleto" },
  { value: "superior_completo", label: "Superior Completo" },
  { value: "pos_graduacao", label: "Pos-Graduacao" },
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
  "Vale Refeicao",
  "Vale Alimentacao",
  "Plano de Saude",
  "Plano Odontologico",
  "Seguro de Vida",
  "Gympass",
  "PLR",
  "Auxilio Creche",
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
    title: "Tecnologia de IA Avancada",
    content: "Utilizamos inteligencia artificial de ponta para encontrar os melhores candidatos para sua empresa, analisando milhares de perfis em segundos.",
    image: "https://images.unsplash.com/photo-1639322537228-f710d846310a?w=800&q=80",
  },
  {
    step: "Passo 2",
    title: "Equipe de Especialistas",
    content: "Nossa equipe de recrutadores experientes faz uma triagem pessoal de cada candidato, garantindo qualidade e adequacao ao seu perfil.",
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80",
  },
  {
    step: "Passo 3",
    title: "Preco Justo e Acessivel",
    content: "Oferecemos servicos de recrutamento de alta qualidade por um preco justo, sem taxas ocultas ou surpresas.",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80",
  },
];

export default function CompanyOnboarding() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [showIntro, setShowIntro] = useState(true);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Contract signature state
  const [signerName, setSignerName] = useState("");
  const [signerCpf, setSignerCpf] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const sigRef = useRef<SignatureCanvas>(null);

  // Fetch school contract
  const { data: schoolContract, isLoading: contractLoading } = trpc.company.getSchoolContract.useQuery();

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

  // CPF formatting for contract signer
  const formatSignerCpf = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const handleSignerCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSignerCpf(formatSignerCpf(e.target.value));
  };

  const clearSignature = () => {
    sigRef.current?.clear();
  };

  const validateStep1 = () => {
    if (!formData.cnpj || !formData.legalName) {
      toast.error("CNPJ e Razao Social sao obrigatorios");
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
      toast.error("Selecione um email principal para comunicacoes");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.jobTitle || !formData.compensation || !formData.mainActivities ||
        !formData.requiredSkills || formData.educationLevels.length === 0 ||
        !formData.workScheduleStart || !formData.workScheduleEnd) {
      toast.error("Preencha todos os campos obrigatorios da vaga");
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    // If school has no contract, skip validation
    if (!schoolContract?.contract_type) {
      return true;
    }

    if (!sigRef.current || sigRef.current.isEmpty()) {
      toast.error("Por favor, faca sua assinatura");
      return false;
    }
    if (!signerName.trim()) {
      toast.error("Por favor, informe seu nome completo");
      return false;
    }
    if (signerCpf.replace(/\D/g, "").length !== 11) {
      toast.error("Por favor, informe um CPF valido");
      return false;
    }
    if (!acceptedTerms) {
      toast.error("Por favor, aceite os termos do contrato");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
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

    // Get signature if available
    const signature = sigRef.current && !sigRef.current.isEmpty()
      ? sigRef.current.toDataURL()
      : undefined;

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
      // Contract signature data
      contractSignature: signature,
      contractSignerName: signerName.trim() || undefined,
      contractSignerCpf: signerCpf.replace(/\D/g, "") || undefined,
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
            <CardDescription>Esta pagina e exclusiva para empresas.</CardDescription>
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
                <h3 className="text-2xl font-bold">Pronto para comecar?</h3>
                <p className="text-muted-foreground">
                  Preencha o formulario a seguir com os dados da sua empresa e da vaga que deseja preencher.
                  Em poucos minutos, nossa equipe comecara a trabalhar para encontrar o candidato ideal para voce.
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
        <form onSubmit={handleSubmit}>
          {/* Step 1: Company Data */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Section Header */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Dados da Empresa</h2>
                <p className="text-gray-500 mt-1">Informacoes basicas sobre sua empresa</p>
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
                  <Label htmlFor="legalName">Razao Social *</Label>
                  <Input
                    id="legalName"
                    placeholder="Razao social completa"
                    value={formData.legalName}
                    onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="contactPerson">Responsavel</Label>
                  <Input
                    id="contactPerson"
                    placeholder="Nome do responsavel"
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
                            placeholder="Titulo (ex: Diretor, Recepcao, Comercial)"
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
                    Adicione telefones com titulos para facilitar o contato (ex: "Diretor", "RH", "Comercial")
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
                    Marque "Principal" no email que deve receber as comunicacoes da plataforma
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
                  <Label htmlFor="employeeCount">Quantidade de Funcionarios</Label>
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
                    <Label htmlFor="address">Endereco e Numero</Label>
                    <Input
                      id="address"
                      placeholder="Rua, numero"
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
                <p className="text-gray-500 mt-1">Informacoes sobre a vaga que deseja preencher</p>
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
                  <Label htmlFor="requiredSkills">Competencias Requeridas *</Label>
                  <Textarea
                    id="requiredSkills"
                    placeholder="Liste as competencias e habilidades necessarias..."
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
                    <Label htmlFor="urgency">Urgencia</Label>
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
                    <Label>Faixa Etaria</Label>
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
                  <Label>Beneficios</Label>
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
                    <Label>Horario de Trabalho *</Label>
                    <div className="flex items-center gap-3">
                      <Select
                        value={formData.workScheduleStart}
                        onValueChange={(v) => setFormData({ ...formData, workScheduleStart: v })}
                      >
                        <SelectTrigger className="w-[100px]">
                          <SelectValue placeholder="Inicio" />
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
                  <Label htmlFor="notes">Observacoes Gerais</Label>
                  <Textarea
                    id="notes"
                    placeholder="Informacoes adicionais sobre a vaga..."
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

          {/* Step 3: Contract Sign */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Section Header */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Contrato de Parceria</h2>
                <p className="text-gray-500 mt-1">Leia e assine o contrato para finalizar seu cadastro</p>
              </div>

              <Card className="shadow-xl border-0 bg-white/80 backdrop-blur">
              <CardContent className="p-8 space-y-6">
                {contractLoading ? (
                  <div className="flex justify-center py-12">
                    <ClassicLoader />
                  </div>
                ) : !schoolContract?.contract_type ? (
                  <div className="text-center py-8 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p className="text-green-800 font-medium">Nenhum contrato necessario</p>
                    <p className="text-green-600 text-sm mt-1">
                      A escola nao configurou um contrato obrigatorio.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Contract Display */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-medium">
                          Contrato - {schoolContract.school_name}
                        </Label>
                        {schoolContract.contract_type === 'pdf' && schoolContract.contract_pdf_url && (
                          <a
                            href={schoolContract.contract_pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            Abrir em nova aba
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>

                      {schoolContract.contract_type === 'pdf' && schoolContract.contract_pdf_url ? (
                        <div className="border rounded-lg overflow-hidden bg-white">
                          <iframe
                            src={`${schoolContract.contract_pdf_url}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                            className="w-full h-[500px]"
                            title="Contrato"
                            style={{ border: 'none' }}
                          />
                        </div>
                      ) : schoolContract.contract_type === 'html' && schoolContract.contract_html ? (
                        <div
                          className="border rounded-lg p-4 bg-white max-h-[400px] overflow-y-auto prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: schoolContract.contract_html }}
                        />
                      ) : (
                        <div className="text-center py-8 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-yellow-800">Contrato nao disponivel</p>
                        </div>
                      )}
                    </div>

                    {/* Signature Section */}
                    <div className="space-y-4 pt-4 border-t">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="signerName">Nome Completo do Assinante *</Label>
                          <Input
                            id="signerName"
                            placeholder="Digite seu nome completo"
                            value={signerName}
                            onChange={(e) => setSignerName(e.target.value)}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="signerCpf">CPF do Assinante *</Label>
                          <Input
                            id="signerCpf"
                            placeholder="000.000.000-00"
                            value={signerCpf}
                            onChange={handleSignerCpfChange}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Assinatura *</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={clearSignature}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <Eraser className="h-4 w-4 mr-1" />
                            Limpar
                          </Button>
                        </div>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white">
                          <SignatureCanvas
                            ref={sigRef}
                            canvasProps={{
                              className: "w-full h-[150px]",
                            }}
                            backgroundColor="white"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Use o mouse ou o dedo para desenhar sua assinatura
                        </p>
                      </div>

                      <div className="flex items-start space-x-3 pt-2">
                        <Checkbox
                          id="acceptTerms"
                          checked={acceptedTerms}
                          onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                        />
                        <label htmlFor="acceptTerms" className="text-sm text-gray-600 leading-relaxed">
                          Li e concordo com os termos do contrato apresentado acima.
                          Declaro que as informacoes fornecidas sao verdadeiras.
                        </label>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex justify-between pt-6 border-t">
                  <Button type="button" variant="outline" onClick={handleBack} size="lg" className="px-8">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                  <Button type="submit" disabled={submitting} size="lg" className="px-8 bg-green-600 hover:bg-green-700">
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
