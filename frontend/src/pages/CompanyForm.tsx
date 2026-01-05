import { useState, useEffect } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { FeatureSteps } from "@/components/ui/feature-steps";
import { trpc } from "@/lib/trpc";
import { Building, CheckCircle, Loader2, Briefcase, FileText, CalendarDays, ArrowRight, Bot, Users, DollarSign } from "lucide-react";
import { toast } from "sonner";

const EMPLOYMENT_TYPES = [
  { value: "clt", label: "CLT" },
  { value: "estagio", label: "Estágio" },
  { value: "jovem_aprendiz", label: "Jovem Aprendiz" },
  { value: "pj", label: "PJ" },
  { value: "temporario", label: "Temporário" },
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
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80",
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

export default function CompanyForm() {
  const params = useParams<{ adminId: string }>();
  const [, setLocation] = useLocation();
  const adminId = params.adminId;

  // Get email and contract token from URL query params
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const emailFromUrl = urlParams.get('email') || "";
  const contractToken = urlParams.get('contract') || "";

  const [showIntro, setShowIntro] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    // Company Data
    contactPerson: "",
    contactPhone: "",
    cnpj: "",
    businessName: "",
    legalName: "",
    email: emailFromUrl,
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
    ageRange: "",
    educationLevel: "",
    benefits: [] as string[],
    workSchedule: "",
    positionsCount: "",
    genderPreference: "",
    notes: "",
  });

  // Update email if URL changes
  useEffect(() => {
    if (emailFromUrl) {
      setFormData(prev => ({ ...prev, email: emailFromUrl }));
    }
  }, [emailFromUrl]);

  const submitFormMutation = trpc.outreach.submitCompanyForm.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Formulário enviado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao enviar: ${error.message}`);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.cnpj || !formData.legalName || !formData.email) {
      toast.error("Por favor, preencha CNPJ, Razão Social e Email");
      return;
    }
    if (!formData.jobTitle || !formData.compensation || !formData.mainActivities ||
        !formData.requiredSkills || !formData.educationLevel || !formData.workSchedule) {
      toast.error("Por favor, preencha todos os campos obrigatórios da vaga");
      return;
    }

    submitFormMutation.mutate({
      adminId: adminId!,
      email: formData.email,
      contactPerson: formData.contactPerson || undefined,
      contactPhone: formData.contactPhone || undefined,
      cnpj: formData.cnpj.replace(/\D/g, ""),
      businessName: formData.businessName || undefined,
      legalName: formData.legalName,
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
      jobTitle: formData.jobTitle,
      compensation: formData.compensation,
      mainActivities: formData.mainActivities,
      requiredSkills: formData.requiredSkills,
      employmentType: formData.employmentType || undefined,
      urgency: formData.urgency || undefined,
      ageRange: formData.ageRange || undefined,
      educationLevel: formData.educationLevel,
      benefits: formData.benefits.length > 0 ? formData.benefits : undefined,
      workSchedule: formData.workSchedule,
      positionsCount: formData.positionsCount || undefined,
      genderPreference: formData.genderPreference || undefined,
      notes: formData.notes || undefined,
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-lg w-full shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Formulário Enviado!</CardTitle>
            <CardDescription>
              Obrigado por preencher o formulário. Seus dados foram salvos com sucesso.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {contractToken ? (
              <>
                <p className="text-center text-muted-foreground">
                  Agora você pode assinar o contrato de parceria.
                </p>
                <div className="flex justify-center gap-3">
                  <Button onClick={() => setLocation(`/contract/${contractToken}`)}>
                    <FileText className="h-4 w-4 mr-2" />
                    Assinar Contrato
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setLocation(`/book/${adminId}?email=${encodeURIComponent(formData.email)}`)}
                  >
                    <CalendarDays className="h-4 w-4 mr-2" />
                    Agendar Reunião
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-center text-muted-foreground">
                  Agende uma reunião para dar continuidade ao processo.
                </p>
                <div className="flex justify-center">
                  <Button onClick={() => setLocation(`/book/${adminId}?email=${encodeURIComponent(formData.email)}`)}>
                    <CalendarDays className="h-4 w-4 mr-2" />
                    Agendar Reunião
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Intro screen with feature steps
  if (showIntro) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        {/* Header */}
        <div className="bg-slate-900 text-white py-8 px-4">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold">
              Bem-vindo ao Nosso Sistema de Recrutamento
            </h1>
            <p className="text-slate-300 mt-2 text-lg">
              Encontre os melhores talentos para sua empresa
            </p>
          </div>
        </div>

        <FeatureSteps
          features={INTRO_FEATURES}
          title="Como Funciona"
          autoPlayInterval={4000}
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
                  Começar Cadastro
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="bg-slate-900 text-white py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Building className="h-8 w-8" />
            Cadastro de Empresa Parceira
          </h1>
          <p className="text-slate-300 mt-2">
            Preencha os dados da empresa e da vaga para iniciar nossa parceria
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Data */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Dados da Empresa
              </CardTitle>
              <CardDescription>
                Informações básicas sobre sua empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="contactPerson">Contato / Responsável</Label>
                  <Input
                    id="contactPerson"
                    placeholder="Nome do responsável"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contactPhone">Telefone do Contato</Label>
                  <Input
                    id="contactPhone"
                    placeholder="(11) 99999-9999"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: formatPhone(e.target.value) })}
                  />
                </div>
              </div>

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

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="contato@empresa.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="landlinePhone">Telefone Fixo</Label>
                  <Input
                    id="landlinePhone"
                    placeholder="(11) 3333-3333"
                    value={formData.landlinePhone}
                    onChange={(e) => setFormData({ ...formData, landlinePhone: formatPhone(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="mobilePhone">Celular</Label>
                  <Input
                    id="mobilePhone"
                    placeholder="(11) 99999-9999"
                    value={formData.mobilePhone}
                    onChange={(e) => setFormData({ ...formData, mobilePhone: formatPhone(e.target.value) })}
                  />
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="employeeCount">Quantidade de Funcionários</Label>
                  <Input
                    id="employeeCount"
                    placeholder="Ex: 50"
                    value={formData.employeeCount}
                    onChange={(e) => setFormData({ ...formData, employeeCount: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="socialMedia">Redes Sociais</Label>
                  <Input
                    id="socialMedia"
                    placeholder="@empresa"
                    value={formData.socialMedia}
                    onChange={(e) => setFormData({ ...formData, socialMedia: e.target.value })}
                  />
                </div>
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
            </CardContent>
          </Card>

          {/* Job Opening Data */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Dados da Vaga
              </CardTitle>
              <CardDescription>
                Informações sobre a vaga que deseja preencher
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  <Label htmlFor="compensation">Remuneração *</Label>
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

              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="ageRange">Faixa Etária</Label>
                  <Input
                    id="ageRange"
                    placeholder="Ex: 18-30 anos"
                    value={formData.ageRange}
                    onChange={(e) => setFormData({ ...formData, ageRange: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="educationLevel">Escolaridade *</Label>
                  <Input
                    id="educationLevel"
                    placeholder="Ex: Ensino Médio Completo"
                    value={formData.educationLevel}
                    onChange={(e) => setFormData({ ...formData, educationLevel: e.target.value })}
                    required
                  />
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

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="workSchedule">Horário de Trabalho *</Label>
                  <Input
                    id="workSchedule"
                    placeholder="Ex: 08:00 às 17:00"
                    value={formData.workSchedule}
                    onChange={(e) => setFormData({ ...formData, workSchedule: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="positionsCount">Quantidade de Vagas</Label>
                  <Input
                    id="positionsCount"
                    placeholder="Ex: 2"
                    value={formData.positionsCount}
                    onChange={(e) => setFormData({ ...formData, positionsCount: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-2 max-w-[200px]">
                <Label htmlFor="genderPreference">Gênero</Label>
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
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end">
            <Button type="submit" disabled={submitFormMutation.isPending} size="lg">
              {submitFormMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Enviar Formulário
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
