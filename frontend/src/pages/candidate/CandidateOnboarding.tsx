// @ts-nocheck
import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  User,
  GraduationCap,
  ArrowRight,
  Plus,
  X,
  CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ContentTransition from "@/components/ui/ContentTransition";
import { FormSkeleton } from "@/components/ui/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import DISCAssessment from "@/components/disc/DISCAssessment";
import DISCResults from "@/components/disc/DISCResults";
import { DISCProfile, calculateDISCResults } from "@/data/discQuestions";
import PDPAssessment from "@/components/pdp/PDPAssessment";
import PDPResults from "@/components/pdp/PDPResults";
import { PDPResults as PDPResultsType, pdpCompetencies } from "@/data/pdpQuestions";

const EDUCATION_LEVELS = [
  { value: 'fundamental_incompleto', label: 'Fundamental Incompleto' },
  { value: 'fundamental_completo', label: 'Fundamental Completo' },
  { value: 'medio_incompleto', label: 'Médio Incompleto' },
  { value: 'medio_completo', label: 'Médio Completo' },
  { value: 'tecnico', label: 'Técnico' },
  { value: 'superior_incompleto', label: 'Superior Incompleto' },
  { value: 'superior_completo', label: 'Superior Completo' },
  { value: 'pos_graduacao', label: 'Pós-Graduação' },
  { value: 'mestrado', label: 'Mestrado' },
  { value: 'doutorado', label: 'Doutorado' },
];

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export default function CandidateOnboarding() {
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date(2000, 0));
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Form state - Step 1 (Personal + Education merged)
  const [formData, setFormData] = useState({
    full_name: '',
    cpf: '',
    email: '',
    phone: '',
    date_of_birth: '',
    city: '',
    state: '',
    social_media: '',
    education_level: '',
    institution: '',
    courses: [] as string[],
    skills: [] as string[],
    languages: [] as string[],
    experiences: [] as string[],
  });

  // Calculate age from date of birth
  const calculateAge = (birthDate: string): number | null => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate + 'T12:00:00');
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // DISC state
  const [discAnswers, setDiscAnswers] = useState<Record<number, DISCProfile>>({});
  const [discResults, setDiscResults] = useState<Record<DISCProfile, number> | null>(null);

  // PDP state
  const [pdpResults, setPdpResults] = useState<PDPResultsType | null>(null);

  // Fetch user's linked agency for pre-populating city/state
  const agencyQuery = trpc.candidate.getMyAgency.useQuery(undefined, {
    enabled: !!user,
  });

  // Pre-populate form with user data and agency data when available
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        full_name: prev.full_name || user.name || '',
        email: prev.email || user.email || '',
      }));
    }
  }, [user]);

  // Pre-populate city and state from agency when available
  useEffect(() => {
    const agency = agencyQuery.data;
    if (agency) {
      setFormData(prev => ({
        ...prev,
        city: prev.city || agency.city || '',
        state: prev.state || agency.state || '',
      }));
    }
  }, [agencyQuery.data]);

  const [newCourse, setNewCourse] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [newLanguage, setNewLanguage] = useState('');
  const [newExperience, setNewExperience] = useState('');

  const submitOnboarding = trpc.candidate.submitOnboarding.useMutation({
    onSuccess: () => {
      toast.success("Perfil criado com sucesso!");
      window.location.href = "/candidate";
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar perfil");
      setSubmitting(false);
    },
  });

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addCourse = () => {
    if (newCourse.trim() && !formData.courses.includes(newCourse.trim())) {
      setFormData(prev => ({
        ...prev,
        courses: [...prev.courses, newCourse.trim()]
      }));
      setNewCourse('');
    }
  };

  const removeCourse = (course: string) => {
    setFormData(prev => ({
      ...prev,
      courses: prev.courses.filter(c => c !== course)
    }));
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const addLanguage = () => {
    if (newLanguage.trim() && !formData.languages.includes(newLanguage.trim())) {
      setFormData(prev => ({
        ...prev,
        languages: [...prev.languages, newLanguage.trim()]
      }));
      setNewLanguage('');
    }
  };

  const removeLanguage = (lang: string) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.filter(l => l !== lang)
    }));
  };

  const addExperience = () => {
    if (newExperience.trim() && !formData.experiences.includes(newExperience.trim())) {
      setFormData(prev => ({
        ...prev,
        experiences: [...prev.experiences, newExperience.trim()]
      }));
      setNewExperience('');
    }
  };

  const removeExperience = (exp: string) => {
    setFormData(prev => ({
      ...prev,
      experiences: prev.experiences.filter(e => e !== exp)
    }));
  };

  const validateStep1 = () => {
    if (!formData.full_name || !formData.cpf || !formData.email || !formData.phone || !formData.city || !formData.state) {
      toast.error("Preencha todos os campos obrigatórios");
      return false;
    }
    if (!formData.education_level) {
      toast.error("Selecione seu nível de escolaridade");
      return false;
    }
    if (formData.skills.length === 0) {
      toast.error("Adicione pelo menos uma habilidade");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      // Close any open Radix portals (Select, Popover, Calendar) before unmounting step 1
      // This prevents removeChild DOM errors from portal cleanup race conditions
      setCalendarOpen(false);
      (document.activeElement as HTMLElement)?.blur?.();
      setTimeout(() => setStep(2), 0);
    }
  };

  const handleDISCComplete = (answers: Record<number, DISCProfile>) => {
    setDiscAnswers(answers);
    const results = calculateDISCResults(answers);
    setDiscResults(results);
    setStep(3);
  };

  const handleDISCContinue = () => {
    setStep(4); // Move to PDP Assessment
  };

  const handlePDPComplete = (results: PDPResultsType) => {
    setPdpResults(results);
    setStep(5); // Move to PDP Results
  };

  // Helper to convert competency IDs to names
  const getCompetencyNames = (ids: number[]): string[] => {
    return ids.map(id => pdpCompetencies.find(c => c.id === id)?.name || '').filter(Boolean);
  };

  // Helper to convert action plans (competency ID keys to names)
  const convertActionPlans = (plans: Record<number, string[]>): Record<string, string[]> => {
    const result: Record<string, string[]> = {};
    for (const [id, actions] of Object.entries(plans)) {
      const name = pdpCompetencies.find(c => c.id === Number(id))?.name;
      if (name) {
        result[name] = actions;
      }
    }
    return result;
  };

  const handleSubmit = async () => {
    if (!discResults || !pdpResults) return;
    setSubmitting(true);

    submitOnboarding.mutate({
      ...formData,
      cpf: formData.cpf.replace(/\D/g, ""),
      date_of_birth: formData.date_of_birth || undefined,
      experience: formData.experiences,
      // DISC results
      disc_influente: discResults.influente,
      disc_estavel: discResults.estavel,
      disc_dominante: discResults.dominante,
      disc_conforme: discResults.conforme,
      // PDP results
      pdp_intrapersonal: Object.fromEntries(
        Object.entries(pdpResults.intrapersonal).map(([k, v]) => [String(k), v])
      ),
      pdp_interpersonal: Object.fromEntries(
        Object.entries(pdpResults.interpersonal).map(([k, v]) => [String(k), v])
      ),
      pdp_skills: pdpResults.skills,
      pdp_competencies: getCompetencyNames(pdpResults.competencies),
      pdp_top_10_competencies: getCompetencyNames(pdpResults.topCompetencies),
      pdp_develop_competencies: getCompetencyNames(pdpResults.developCompetencies),
      pdp_action_plans: convertActionPlans(pdpResults.actionPlans),
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FormSkeleton fields={8} />
      </div>
    );
  }

  if (!user) {
    window.location.href = '/login?tab=signup&role=candidate';
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FormSkeleton fields={8} />
      </div>
    );
  }

  if (user.role && user.role !== 'candidate') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Esta página é exclusiva para candidatos.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const stepLabels = ["Dados Pessoais", "DISC", "Perfil DISC", "PDP", "Resultado"];
  const totalSteps = 5;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="bg-slate-900 text-white py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <User className="h-8 w-8" />
            Complete seu Perfil
          </h1>
          <p className="text-slate-300 mt-2">
            Preencha suas informações para que empresas possam te encontrar
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Etapa {step} de {totalSteps}</span>
          <span className="text-sm text-muted-foreground">{stepLabels[step - 1]}</span>
        </div>
        <Progress value={(step / totalSteps) * 100} className="h-2" />
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-8">
        {/* Step 1: Personal Data + Education (Merged) */}
        {step === 1 && (
          <div className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Dados Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nome Completo *</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => handleInputChange('full_name', e.target.value)}
                      placeholder="Seu nome completo"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF *</Label>
                    <Input
                      id="cpf"
                      value={formData.cpf}
                      onChange={(e) => handleInputChange('cpf', formatCpf(e.target.value))}
                      placeholder="000.000.000-00"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="seu@email.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', formatPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Data de Nascimento</Label>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.date_of_birth && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.date_of_birth ? (
                            format(new Date(formData.date_of_birth + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <div className="p-3 space-y-3">
                          {/* Month and Year selectors — native selects to avoid Radix portal-inside-portal crash */}
                          <div className="flex items-center justify-center gap-2">
                            <select
                              value={calendarMonth.getMonth()}
                              onChange={(e) => {
                                const newDate = new Date(calendarMonth);
                                newDate.setMonth(parseInt(e.target.value));
                                setCalendarMonth(newDate);
                              }}
                              className="h-8 px-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                              {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((month, index) => (
                                <option key={index} value={index}>{month}</option>
                              ))}
                            </select>
                            <select
                              value={calendarMonth.getFullYear()}
                              onChange={(e) => {
                                const newMonth = new Date(calendarMonth);
                                newMonth.setFullYear(parseInt(e.target.value));
                                setCalendarMonth(newMonth);
                              }}
                              className="h-8 px-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                              {Array.from({ length: new Date().getFullYear() - 1949 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                                <option key={year} value={year}>{year}</option>
                              ))}
                            </select>
                          </div>
                          <Calendar
                            mode="single"
                            selected={formData.date_of_birth ? new Date(formData.date_of_birth + 'T12:00:00') : undefined}
                            onSelect={(date) => {
                              if (date) {
                                // Format as YYYY-MM-DD using local timezone (not UTC)
                                const year = date.getFullYear();
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const day = String(date.getDate()).padStart(2, '0');
                                handleInputChange('date_of_birth', `${year}-${month}-${day}`);
                                setCalendarMonth(date);
                              } else {
                                handleInputChange('date_of_birth', '');
                              }
                              // Close popover after selection to prevent portal cleanup race condition
                              setCalendarOpen(false);
                            }}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1950-01-01")
                            }
                            month={calendarMonth}
                            onMonthChange={setCalendarMonth}
                            locale={ptBR}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="Sua cidade"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado *</Label>
                    <Select value={formData.state} onValueChange={(v) => handleInputChange('state', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="UF" />
                      </SelectTrigger>
                      <SelectContent>
                        {BRAZILIAN_STATES.map(state => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Age (calculated from date of birth) */}
                  <div className="space-y-2">
                    <Label>Idade</Label>
                    <div className="flex items-center h-10 px-3 rounded-md border bg-muted/50">
                      <span className="text-sm">
                        {calculateAge(formData.date_of_birth) !== null
                          ? `${calculateAge(formData.date_of_birth)} anos`
                          : 'Informe a data de nascimento'}
                      </span>
                    </div>
                  </div>
                  {/* Social Media */}
                  <div className="space-y-2">
                    <Label htmlFor="social_media">Rede Social (Instagram/LinkedIn)</Label>
                    <Input
                      id="social_media"
                      value={formData.social_media}
                      onChange={(e) => handleInputChange('social_media', e.target.value)}
                      placeholder="@seuusuario ou link do perfil"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Formação e Habilidades
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nível de Escolaridade *</Label>
                    <Select
                      value={formData.education_level}
                      onValueChange={(v) => handleInputChange('education_level', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {EDUCATION_LEVELS.map(level => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="institution">Instituição</Label>
                    <Input
                      id="institution"
                      value={formData.institution}
                      onChange={(e) => handleInputChange('institution', e.target.value)}
                      placeholder="Nome da escola/universidade"
                    />
                  </div>
                </div>

                {/* Courses/Formação */}
                <div className="space-y-2">
                  <Label>Formação</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newCourse}
                      onChange={(e) => setNewCourse(e.target.value)}
                      placeholder="Nome da formação"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCourse())}
                    />
                    <Button type="button" onClick={addCourse} variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.courses.map((course, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {course}
                        <button type="button" onClick={() => removeCourse(course)} className="ml-1 hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Skills */}
                <div className="space-y-2">
                  <Label>Habilidades *</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="Digite uma habilidade"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    />
                    <Button type="button" onClick={addSkill} variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.skills.map((skill, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {skill}
                        <button type="button" onClick={() => removeSkill(skill)} className="ml-1 hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Languages */}
                <div className="space-y-2">
                  <Label>Idiomas</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newLanguage}
                      onChange={(e) => setNewLanguage(e.target.value)}
                      placeholder="Ex: Inglês - Intermediário"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
                    />
                    <Button type="button" onClick={addLanguage} variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.languages.map((lang, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {lang}
                        <button type="button" onClick={() => removeLanguage(lang)} className="ml-1 hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Experience */}
                <div className="space-y-2">
                  <Label>Experiência Profissional</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newExperience}
                      onChange={(e) => setNewExperience(e.target.value)}
                      placeholder="Ex: Atendente - 1 ano, Estágio em TI..."
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addExperience())}
                    />
                    <Button type="button" onClick={addExperience} variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.experiences.map((exp, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {exp}
                        <button type="button" onClick={() => removeExperience(exp)} className="ml-1 hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="button" onClick={handleNext} size="lg">
                Próximo: Avaliação de Perfil
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: DISC Assessment */}
        {step === 2 && (
          <DISCAssessment
            onComplete={handleDISCComplete}
            onBack={() => setStep(1)}
          />
        )}

        {/* Step 3: DISC Results */}
        {step === 3 && discResults && (
          <DISCResults
            results={discResults}
            onContinue={handleDISCContinue}
            isSubmitting={false}
          />
        )}

        {/* Step 4: PDP Assessment */}
        {step === 4 && (
          <PDPAssessment
            onComplete={handlePDPComplete}
            onBack={() => setStep(3)}
          />
        )}

        {/* Step 5: PDP Results & Submit */}
        {step === 5 && pdpResults && (
          <PDPResults
            skills={pdpResults.skills}
            competencies={pdpResults.competencies}
            topCompetencies={pdpResults.topCompetencies}
            developCompetencies={pdpResults.developCompetencies}
            actionPlans={pdpResults.actionPlans}
            onContinue={handleSubmit}
            isSubmitting={submitting}
          />
        )}
      </div>
    </div>
  );
}
