import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import {
  User,
  GraduationCap,
  Briefcase,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Plus,
  X,
  Trash2,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import ClassicLoader from "@/components/ui/ClassicLoader";

const EDUCATION_LEVELS = [
  { value: 'fundamental_incompleto', label: 'Fundamental Incompleto' },
  { value: 'fundamental_completo', label: 'Fundamental Completo' },
  { value: 'medio_incompleto', label: 'Medio Incompleto' },
  { value: 'medio_completo', label: 'Medio Completo' },
  { value: 'tecnico', label: 'Tecnico' },
  { value: 'superior_incompleto', label: 'Superior Incompleto' },
  { value: 'superior_completo', label: 'Superior Completo' },
  { value: 'pos_graduacao', label: 'Pos-Graduacao' },
  { value: 'mestrado', label: 'Mestrado' },
  { value: 'doutorado', label: 'Doutorado' },
];

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

type Experience = {
  company: string;
  role: string;
  start_date?: string;
  end_date?: string;
  current?: boolean;
  description?: string;
};

export default function CandidateOnboarding() {
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    cpf: '',
    email: '',
    phone: '',
    date_of_birth: '',
    city: '',
    state: '',
    education_level: '',
    currently_studying: false,
    institution: '',
    course: '',
    skills: [] as string[],
    languages: [] as string[],
    profile_summary: '',
    available_for_clt: true,
    available_for_internship: true,
    available_for_apprentice: true,
    preferred_work_type: 'presencial',
  });

  // Pre-populate form with user data when available
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        full_name: prev.full_name || user.name || '',
        email: prev.email || user.email || '',
      }));
    }
  }, [user]);

  const [newSkill, setNewSkill] = useState('');
  const [newLanguage, setNewLanguage] = useState('');
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [showExperienceDialog, setShowExperienceDialog] = useState(false);
  const [editingExperience, setEditingExperience] = useState<number | null>(null);
  const [experienceForm, setExperienceForm] = useState<Experience>({
    company: '',
    role: '',
    start_date: '',
    end_date: '',
    current: false,
    description: '',
  });

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

  // Experience handlers
  const openAddExperience = () => {
    setEditingExperience(null);
    setExperienceForm({
      company: '',
      role: '',
      start_date: '',
      end_date: '',
      current: false,
      description: '',
    });
    setShowExperienceDialog(true);
  };

  const openEditExperience = (exp: Experience, index: number) => {
    setEditingExperience(index);
    setExperienceForm({
      company: exp.company || '',
      role: exp.role || '',
      start_date: exp.start_date || '',
      end_date: exp.end_date || '',
      current: exp.current || false,
      description: exp.description || '',
    });
    setShowExperienceDialog(true);
  };

  const saveExperience = () => {
    if (!experienceForm.company || !experienceForm.role) {
      toast.error("Preencha empresa e cargo");
      return;
    }

    if (editingExperience !== null) {
      const updated = [...experiences];
      updated[editingExperience] = experienceForm;
      setExperiences(updated);
    } else {
      setExperiences(prev => [...prev, experienceForm]);
    }
    setShowExperienceDialog(false);
  };

  const deleteExperience = (index: number) => {
    setExperiences(prev => prev.filter((_, i) => i !== index));
  };

  const validateStep1 = () => {
    if (!formData.full_name || !formData.cpf || !formData.email || !formData.phone || !formData.city || !formData.state) {
      toast.error("Preencha todos os campos obrigatorios");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.education_level) {
      toast.error("Selecione seu nivel de escolaridade");
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
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    submitOnboarding.mutate({
      ...formData,
      cpf: formData.cpf.replace(/\D/g, ""),
      experience: experiences,
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
    window.location.href = '/login?tab=signup&role=candidate';
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ClassicLoader />
      </div>
    );
  }

  // If user exists but role is different (and not undefined), show error
  if (user.role && user.role !== 'candidate') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Esta pagina e exclusiva para candidatos.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // If user exists (role is 'candidate' or still loading), show the form

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
            Preencha suas informacoes para que empresas possam te encontrar
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Etapa {step} de 3</span>
          <span className="text-sm text-muted-foreground">
            {step === 1 ? "Dados Pessoais" : step === 2 ? "Formacao e Habilidades" : "Preferencias"}
          </span>
        </div>
        <Progress value={(step / 3) * 100} className="h-2" />
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-8">
        <form onSubmit={handleSubmit}>
          {/* Step 1: Personal Data */}
          {step === 1 && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Dados Pessoais
                </CardTitle>
                <CardDescription>
                  Informacoes basicas sobre voce
                </CardDescription>
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
                    <Label htmlFor="date_of_birth">Data de Nascimento</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                    />
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

                <div className="flex justify-end pt-4">
                  <Button type="button" onClick={handleNext} size="lg">
                    Proximo
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Education and Skills */}
          {step === 2 && (
            <div className="space-y-6">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Formacao
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nivel de Escolaridade *</Label>
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
                      <Label htmlFor="institution">Instituicao</Label>
                      <Input
                        id="institution"
                        value={formData.institution}
                        onChange={(e) => handleInputChange('institution', e.target.value)}
                        placeholder="Nome da escola/universidade"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="course">Curso</Label>
                      <Input
                        id="course"
                        value={formData.course}
                        onChange={(e) => handleInputChange('course', e.target.value)}
                        placeholder="Nome do curso"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-6">
                      <input
                        type="checkbox"
                        id="currently_studying"
                        checked={formData.currently_studying}
                        onChange={(e) => handleInputChange('currently_studying', e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="currently_studying">Cursando atualmente</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Habilidades *</CardTitle>
                  <CardDescription>Adicione pelo menos uma habilidade</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
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
                    <div className="flex flex-wrap gap-2">
                      {formData.skills.map((skill, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          {skill}
                          <button type="button" onClick={() => removeSkill(skill)} className="ml-1 hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      {formData.skills.length === 0 && (
                        <p className="text-sm text-muted-foreground">Nenhuma habilidade adicionada</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Idiomas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={newLanguage}
                        onChange={(e) => setNewLanguage(e.target.value)}
                        placeholder="Ex: Ingles - Intermediario"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
                      />
                      <Button type="button" onClick={addLanguage} variant="outline">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.languages.map((lang, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          {lang}
                          <button type="button" onClick={() => removeLanguage(lang)} className="ml-1 hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      {formData.languages.length === 0 && (
                        <p className="text-sm text-muted-foreground">Nenhum idioma adicionado</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5" />
                      Experiencia Profissional
                    </CardTitle>
                    <CardDescription>Opcional - adicione suas experiencias anteriores</CardDescription>
                  </div>
                  <Button type="button" onClick={openAddExperience} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </CardHeader>
                <CardContent>
                  {experiences.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      Nenhuma experiencia cadastrada
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {experiences.map((exp, i) => (
                        <div key={i} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{exp.role}</h4>
                              <p className="text-sm text-muted-foreground">{exp.company}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {exp.start_date} - {exp.current ? 'Atual' : exp.end_date}
                              </p>
                              {exp.description && (
                                <p className="text-sm mt-2">{exp.description}</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button type="button" variant="ghost" size="sm" onClick={() => openEditExperience(exp, i)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button type="button" variant="ghost" size="sm" onClick={() => deleteExperience(i)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={handleBack} size="lg">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                <Button type="button" onClick={handleNext} size="lg">
                  Proximo
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Preferences and Summary */}
          {step === 3 && (
            <div className="space-y-6">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Preferencias de Trabalho</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="mb-2 block">Disponibilidade para:</Label>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.available_for_clt}
                          onChange={(e) => handleInputChange('available_for_clt', e.target.checked)}
                          className="rounded"
                        />
                        CLT
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.available_for_internship}
                          onChange={(e) => handleInputChange('available_for_internship', e.target.checked)}
                          className="rounded"
                        />
                        Estagio
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.available_for_apprentice}
                          onChange={(e) => handleInputChange('available_for_apprentice', e.target.checked)}
                          className="rounded"
                        />
                        Menor Aprendiz
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Modalidade preferida</Label>
                    <Select
                      value={formData.preferred_work_type}
                      onValueChange={(v) => handleInputChange('preferred_work_type', v)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="presencial">Presencial</SelectItem>
                        <SelectItem value="remoto">Remoto</SelectItem>
                        <SelectItem value="hibrido">Hibrido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Resumo Profissional</CardTitle>
                  <CardDescription>
                    Fale um pouco sobre voce e seus objetivos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={formData.profile_summary}
                    onChange={(e) => handleInputChange('profile_summary', e.target.value)}
                    placeholder="Escreva um breve resumo sobre voce, suas experiencias e objetivos..."
                    rows={5}
                  />
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={handleBack} size="lg">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                <Button type="submit" disabled={submitting} size="lg">
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
            </div>
          )}
        </form>

        {/* Experience Dialog */}
        <Dialog open={showExperienceDialog} onOpenChange={setShowExperienceDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingExperience !== null ? 'Editar Experiencia' : 'Adicionar Experiencia'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="exp_company">Empresa</Label>
                <Input
                  id="exp_company"
                  value={experienceForm.company}
                  onChange={(e) => setExperienceForm(prev => ({ ...prev, company: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exp_role">Cargo</Label>
                <Input
                  id="exp_role"
                  value={experienceForm.role}
                  onChange={(e) => setExperienceForm(prev => ({ ...prev, role: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="exp_start">Data Inicio</Label>
                  <Input
                    id="exp_start"
                    type="month"
                    value={experienceForm.start_date}
                    onChange={(e) => setExperienceForm(prev => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exp_end">Data Fim</Label>
                  <Input
                    id="exp_end"
                    type="month"
                    value={experienceForm.end_date}
                    onChange={(e) => setExperienceForm(prev => ({ ...prev, end_date: e.target.value }))}
                    disabled={experienceForm.current}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="exp_current"
                  checked={experienceForm.current}
                  onChange={(e) => setExperienceForm(prev => ({
                    ...prev,
                    current: e.target.checked,
                    end_date: e.target.checked ? '' : prev.end_date
                  }))}
                  className="rounded"
                />
                <Label htmlFor="exp_current">Trabalho atual</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="exp_desc">Descricao (opcional)</Label>
                <Textarea
                  id="exp_desc"
                  value={experienceForm.description}
                  onChange={(e) => setExperienceForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowExperienceDialog(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={saveExperience}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
