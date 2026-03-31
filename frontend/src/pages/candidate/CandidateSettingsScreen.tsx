import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { FunnelLayout, CardEntrance } from "@/components/funnel";
import ContentTransition from "@/components/ui/ContentTransition";
import { FormSkeleton } from "@/components/ui/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import {
  Camera,
  Upload,
  Plus,
  X,
  Edit2,
  Trash2,
  LogOut,
  Sparkles,
  RefreshCw,
  GraduationCap,
  Briefcase,
  FileText,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";

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

// Map DB enum values back to display values (onboarding maps medio_completo → medio, etc.)
function normalizeEducationLevel(dbValue: string | null | undefined): string {
  if (!dbValue) return '';
  const reverseMap: Record<string, string> = {
    'fundamental': 'fundamental_completo',
    'medio': 'medio_completo',
    'superior': 'superior_completo',
    'pos-graduacao': 'pos_graduacao',
  };
  return reverseMap[dbValue] || dbValue;
}

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export default function CandidateSettingsScreen() {
  const { user, loading: authLoading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const searchParams = useSearch();

  // Read initial tab from URL params
  const initialTab = useMemo(() => {
    const params = new URLSearchParams(searchParams);
    return params.get("tab") || "personal";
  }, []);

  const [activeTab, setActiveTabState] = useState(initialTab);

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    setLocation(`/candidate/settings?tab=${tab}`, { replace: true });
  };

  const sectionTitles: Record<string, string> = {
    personal: "Dados Pessoais",
    education: "Formação",
    experience: "Experiência",
    preferences: "Preferências",
    assessments: "Avaliações",
    documents: "Documentos",
  };

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
    summary: '',
    available_for_clt: true,
    available_for_internship: true,
    available_for_apprentice: true,
    preferred_work_type: 'presencial',
  });

  const [newSkill, setNewSkill] = useState('');
  const [newLanguage, setNewLanguage] = useState('');
  const [saving, setSaving] = useState(false);

  // Experience management
  const [experiences, setExperiences] = useState<any[]>([]);
  const [showExperienceDialog, setShowExperienceDialog] = useState(false);
  const [editingExperience, setEditingExperience] = useState<any>(null);
  const [experienceForm, setExperienceForm] = useState({
    company: '',
    role: '',
    start_date: '',
    end_date: '',
    current: false,
    description: '',
  });

  // Fetch candidate profile
  const profileQuery = trpc.candidate.getProfile.useQuery(undefined, {
    enabled: !!user,
  });

  // Update profile mutation
  const updateProfile = trpc.candidate.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Perfil atualizado com sucesso!");
      profileQuery.refetch();
      setSaving(false);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar perfil");
      setSaving(false);
    },
  });

  // Upload photo mutation
  const uploadPhoto = trpc.candidate.uploadPhoto.useMutation({
    onSuccess: () => {
      toast.success("Foto atualizada com sucesso!");
      profileQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao enviar foto");
    },
  });

  // Regenerate AI summary mutation
  const regenerateSummaryMutation = trpc.candidate.regenerateSummary.useMutation({
    onSuccess: (data) => {
      toast.success("Resumo gerado com sucesso!");
      if (data.summary) {
        setFormData(prev => ({ ...prev, summary: data.summary }));
      }
      profileQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao gerar resumo");
    },
  });

  const profile = profileQuery.data;

  // Load profile data into form
  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        cpf: profile.cpf || '',
        email: profile.email || '',
        phone: profile.phone || '',
        date_of_birth: profile.date_of_birth || '',
        city: profile.city || '',
        state: profile.state || '',
        education_level: normalizeEducationLevel(profile.education_level),
        currently_studying: profile.currently_studying || false,
        institution: profile.institution || '',
        course: profile.course || '',
        skills: (profile.skills as string[]) || [],
        languages: (profile.languages as string[]) || [],
        summary: profile.summary || '',
        available_for_clt: profile.available_for_clt ?? true,
        available_for_internship: profile.available_for_internship ?? true,
        available_for_apprentice: profile.available_for_apprentice ?? true,
        preferred_work_type: profile.preferred_work_type || 'presencial',
      });
      setExperiences((profile.experience as any[]) || []);
    }
  }, [profile]);

  if (authLoading || profileQuery.isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <FormSkeleton fields={5} />
      </div>
    );
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Tipo de arquivo não permitido. Use JPEG, PNG ou WebP.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      uploadPhoto.mutate({ base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
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

  const handleSaveProfile = async () => {
    setSaving(true);
    await updateProfile.mutateAsync({
      ...formData,
      experience: experiences,
    });
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

  const openEditExperience = (exp: any, index: number) => {
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

  return (
    <FunnelLayout
      onMenuClick={undefined}
      onBackClick={() => setLocation("/candidate")}
      tabs={[]}
      activeTab=""
      onTabChange={() => {}}
      steps={undefined}
      currentStep={0}
      selectorLabel={undefined}
      selectorValue={undefined}
      selectorOptions={undefined}
      onSelectorChange={undefined}
    >
      <div className="space-y-6">
        {/* Section title */}
        <h2 className="text-2xl font-bold text-[#0A2342]">{sectionTitles[activeTab] || "Configurações"}</h2>
        {/* Personal Data Tab */}
        {activeTab === "personal" && (
          <>
            {/* Photo Upload */}
            <CardEntrance>
              <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-[#0A2342] flex items-center justify-center overflow-hidden">
                      {uploadPhoto.isPending && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                          <div className="h-8 w-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                      {profile?.photo_url ? (
                        <img src={profile.photo_url} alt="Foto" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-10 h-10 text-white" />
                      )}
                    </div>
                    <input
                      type="file"
                      id="photo-upload"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                    <button
                      className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#FF6B35] text-white flex items-center justify-center hover:scale-110 transition-all shadow-lg disabled:opacity-50"
                      onClick={() => document.getElementById('photo-upload')?.click()}
                      disabled={uploadPhoto.isPending}
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <h3 className="text-[#0A2342] font-semibold mb-1">Foto de Perfil</h3>
                    <p className="text-slate-600 text-sm mb-3">JPG, PNG ou WebP (max 5MB)</p>
                    {uploadPhoto.isPending && (
                      <p className="text-xs text-blue-600">Enviando foto...</p>
                    )}
                  </div>
                </div>
              </div>
            </CardEntrance>

            {/* Personal Info */}
            <CardEntrance delay={0.1}>
              <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6">
                <h3 className="text-[#0A2342] font-semibold mb-4">Informações Pessoais</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nome Completo</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => handleInputChange('full_name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      value={formData.cpf}
                      onChange={(e) => handleInputChange('cpf', e.target.value)}
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Data de Nascimento</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">Estado</Label>
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
                </div>
              </div>
            </CardEntrance>

            {/* Education */}
            <CardEntrance delay={0.2}>
              <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#FF6B35]/20 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-[#FF6B35]" />
                  </div>
                  <h3 className="text-[#0A2342] font-semibold">Formação Acadêmica</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nível de Escolaridade</Label>
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
                    <Label htmlFor="institution_personal">Instituição</Label>
                    <Input
                      id="institution_personal"
                      value={formData.institution}
                      onChange={(e) => handleInputChange('institution', e.target.value)}
                      placeholder="Nome da escola/universidade"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="course_personal">Curso</Label>
                    <Input
                      id="course_personal"
                      value={formData.course}
                      onChange={(e) => handleInputChange('course', e.target.value)}
                      placeholder="Nome do curso"
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-6">
                    <input
                      type="checkbox"
                      id="currently_studying_personal"
                      checked={formData.currently_studying}
                      onChange={(e) => handleInputChange('currently_studying', e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="currently_studying_personal">Cursando atualmente</Label>
                  </div>
                </div>
              </div>
            </CardEntrance>

            {/* Skills */}
            <CardEntrance delay={0.3}>
              <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6">
                <h3 className="text-[#0A2342] font-semibold mb-4">Habilidades</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {formData.skills.map((skill, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-full bg-[#FF6B35]/10 text-[#FF6B35] text-sm font-medium flex items-center gap-2">
                      {skill}
                      <button onClick={() => removeSkill(skill)}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {formData.skills.length === 0 && (
                    <p className="text-slate-500 text-sm">Nenhuma habilidade adicionada</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="Adicionar habilidade"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  />
                  <button
                    onClick={addSkill}
                    className="px-4 py-2 rounded-lg bg-white border-2 border-slate-200 hover:border-[#FF6B35]/50 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardEntrance>

            {/* Languages */}
            <CardEntrance delay={0.4}>
              <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6">
                <h3 className="text-[#0A2342] font-semibold mb-4">Idiomas</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {formData.languages.map((lang, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 text-sm font-medium flex items-center gap-2">
                      {lang}
                      <button onClick={() => removeLanguage(lang)}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {formData.languages.length === 0 && (
                    <p className="text-slate-500 text-sm">Nenhum idioma adicionado</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newLanguage}
                    onChange={(e) => setNewLanguage(e.target.value)}
                    placeholder="Adicionar idioma (ex: Inglês - Intermediário)"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
                  />
                  <button
                    onClick={addLanguage}
                    className="px-4 py-2 rounded-lg bg-white border-2 border-slate-200 hover:border-[#FF6B35]/50 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardEntrance>

            {/* Experience */}
            <CardEntrance delay={0.5}>
              <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#1B4D7A]/20 flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-[#1B4D7A]" />
                    </div>
                    <h3 className="text-[#0A2342] font-semibold">Experiência Profissional</h3>
                  </div>
                  <button
                    onClick={openAddExperience}
                    className="px-4 py-2 rounded-lg bg-white border-2 border-slate-200 hover:border-[#FF6B35]/50 transition-all flex items-center gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4" /> Adicionar
                  </button>
                </div>
                {experiences.length === 0 ? (
                  <p className="text-slate-500 text-sm">Nenhuma experiência adicionada</p>
                ) : (
                  <div className="space-y-3">
                    {experiences.map((exp, i) => (
                      <div key={i} className="p-4 border border-slate-200 rounded-lg flex justify-between items-start">
                        <div>
                          <p className="font-medium text-[#0A2342]">{exp.role}</p>
                          <p className="text-sm text-slate-600">{exp.company}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {exp.start_date}{exp.current ? ' - Atual' : exp.end_date ? ` - ${exp.end_date}` : ''}
                          </p>
                          {exp.description && <p className="text-sm text-slate-500 mt-2">{exp.description}</p>}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => openEditExperience(exp, i)} className="text-slate-400 hover:text-[#FF6B35]">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteExperience(i)} className="text-slate-400 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardEntrance>

            {/* Preferences */}
            <CardEntrance delay={0.6}>
              <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6">
                <h3 className="text-[#0A2342] font-semibold mb-4">Preferências de Trabalho</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Trabalho Preferido</Label>
                    <Select
                      value={formData.preferred_work_type}
                      onValueChange={(v) => handleInputChange('preferred_work_type', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="presencial">Presencial</SelectItem>
                        <SelectItem value="remoto">Remoto</SelectItem>
                        <SelectItem value="hibrido">Híbrido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3 mt-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="avail_clt"
                        checked={formData.available_for_clt}
                        onChange={(e) => handleInputChange('available_for_clt', e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="avail_clt">Disponível para CLT</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="avail_internship"
                        checked={formData.available_for_internship}
                        onChange={(e) => handleInputChange('available_for_internship', e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="avail_internship">Disponível para Estágio</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="avail_apprentice"
                        checked={formData.available_for_apprentice}
                        onChange={(e) => handleInputChange('available_for_apprentice', e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="avail_apprentice">Disponível para Jovem Aprendiz</Label>
                    </div>
                  </div>
                </div>
              </div>
            </CardEntrance>

            {/* AI Summary */}
            {formData.summary && (
              <CardEntrance delay={0.7}>
                <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                      </div>
                      <h3 className="text-[#0A2342] font-semibold">Resumo do Perfil (IA)</h3>
                    </div>
                    <button
                      onClick={() => regenerateSummaryMutation.mutate()}
                      disabled={regenerateSummaryMutation.isPending}
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-purple-300 transition-all flex items-center gap-2 text-sm text-slate-600"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${regenerateSummaryMutation.isPending ? 'animate-spin' : ''}`} />
                      Regenerar
                    </button>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed">{formData.summary}</p>
                </div>
              </CardEntrance>
            )}

            {/* DISC & PDP Assessments */}
            {profile && <CandidateAssessmentsTab profile={profile} />}

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#1B4D7A] to-[#FF6B35] text-white font-medium shadow-lg shadow-[#FF6B35]/25 hover:shadow-[#FF6B35]/40 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </>
        )}

        {/* Education & Skills Tab */}
        {activeTab === "education" && (
          <>
            {/* Education */}
            <CardEntrance>
              <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#FF6B35]/20 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-[#FF6B35]" />
                  </div>
                  <h3 className="text-[#0A2342] font-semibold">Formação Acadêmica</h3>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nível de Escolaridade</Label>
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
              </div>
            </CardEntrance>

            {/* Skills */}
            <CardEntrance delay={0.1}>
              <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6">
                <h3 className="text-[#0A2342] font-semibold mb-4">Habilidades</h3>

                <div className="flex flex-wrap gap-2 mb-4">
                  {formData.skills.map((skill, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-full bg-[#FF6B35]/10 text-[#FF6B35] text-sm font-medium flex items-center gap-2">
                      {skill}
                      <button onClick={() => removeSkill(skill)}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {formData.skills.length === 0 && (
                    <p className="text-slate-500 text-sm">Nenhuma habilidade adicionada</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="Adicionar habilidade"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  />
                  <button
                    onClick={addSkill}
                    className="px-4 py-2 rounded-lg bg-white border-2 border-slate-200 hover:border-[#FF6B35]/50 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardEntrance>

            {/* Languages */}
            <CardEntrance delay={0.2}>
              <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6">
                <h3 className="text-[#0A2342] font-semibold mb-4">Idiomas</h3>

                <div className="flex flex-wrap gap-2 mb-4">
                  {formData.languages.map((lang, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 text-sm font-medium flex items-center gap-2">
                      {lang}
                      <button onClick={() => removeLanguage(lang)}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {formData.languages.length === 0 && (
                    <p className="text-slate-500 text-sm">Nenhum idioma adicionado</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Input
                    value={newLanguage}
                    onChange={(e) => setNewLanguage(e.target.value)}
                    placeholder="Adicionar idioma (ex: Inglês - Intermediário)"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
                  />
                  <button
                    onClick={addLanguage}
                    className="px-4 py-2 rounded-lg bg-white border-2 border-slate-200 hover:border-[#FF6B35]/50 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardEntrance>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#1B4D7A] to-[#FF6B35] text-white font-medium shadow-lg shadow-[#FF6B35]/25 hover:shadow-[#FF6B35]/40 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </>
        )}

        {/* Experience Tab */}
        {activeTab === "experience" && (
          <>
            {/* Experience List */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#0A2342]">Experiência Profissional</h2>
                <button
                  onClick={openAddExperience}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-[#1B4D7A] to-[#FF6B35] text-white font-medium shadow-lg shadow-[#FF6B35]/25 hover:shadow-[#FF6B35]/40 hover:scale-105 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Experiência
                </button>
              </div>

              {experiences.length === 0 ? (
                <CardEntrance>
                  <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-12 text-center">
                    <Briefcase className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-500">Nenhuma experiência cadastrada</p>
                  </div>
                </CardEntrance>
              ) : (
                experiences.map((exp, i) => (
                  <CardEntrance key={i} delay={i * 0.05}>
                    <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-[#0A2342] font-semibold">{exp.role}</h4>
                          <p className="text-slate-600 text-sm">{exp.company}</p>
                          <p className="text-slate-400 text-xs mt-1">
                            {exp.start_date} - {exp.current ? 'Atual' : exp.end_date}
                          </p>
                          {exp.description && (
                            <p className="text-slate-600 text-sm mt-2">{exp.description}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditExperience(exp, i)}
                            className="p-2 rounded-lg text-slate-600 hover:text-[#0A2342] hover:bg-slate-100 transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteExperience(i)}
                            className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardEntrance>
                ))
              )}
            </div>

            {/* AI Summary */}
            <CardEntrance delay={0.2}>
              <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-xl border-2 border-purple-500/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                    </div>
                    <h3 className="text-[#0A2342] font-semibold">Resumo Profissional</h3>
                  </div>
                  <button
                    onClick={() => regenerateSummaryMutation.mutate()}
                    disabled={regenerateSummaryMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border-2 border-purple-500/30 hover:border-purple-500/50 transition-all text-purple-600 font-medium disabled:opacity-50"
                  >
                    {regenerateSummaryMutation.isPending ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Regenerar
                      </>
                    )}
                  </button>
                </div>

                <Textarea
                  value={formData.summary}
                  onChange={(e) => handleInputChange('summary', e.target.value)}
                  placeholder="Clique em 'Regenerar' para gerar um resumo com IA, ou escreva seu próprio resumo profissional..."
                  rows={6}
                  className="resize-none"
                />

                {profile?.summary_generated_at && formData.summary && (
                  <p className="text-slate-400 text-xs mt-2">
                    Gerado em {new Date(profile.summary_generated_at).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            </CardEntrance>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#1B4D7A] to-[#FF6B35] text-white font-medium shadow-lg shadow-[#FF6B35]/25 hover:shadow-[#FF6B35]/40 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </>
        )}

        {/* Preferences Tab */}
        {activeTab === "preferences" && (
          <>
            <CardEntrance>
              <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6">
                <h3 className="text-[#0A2342] font-semibold mb-4">Preferências de Trabalho</h3>

                <div className="space-y-6">
                  <div>
                    <Label className="mb-3 block text-[#0A2342] font-medium">Disponibilidade para:</Label>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.available_for_clt}
                          onChange={(e) => handleInputChange('available_for_clt', e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-slate-700">CLT</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.available_for_internship}
                          onChange={(e) => handleInputChange('available_for_internship', e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-slate-700">Estágio</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.available_for_apprentice}
                          onChange={(e) => handleInputChange('available_for_apprentice', e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-slate-700">Menor Aprendiz</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[#0A2342] font-medium">Modalidade preferida</Label>
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
                        <SelectItem value="hibrido">Híbrido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardEntrance>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#1B4D7A] to-[#FF6B35] text-white font-medium shadow-lg shadow-[#FF6B35]/25 hover:shadow-[#FF6B35]/40 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </>
        )}

        {/* Assessments Tab */}
        {activeTab === "assessments" && (
          <CandidateAssessmentsTab profile={profile} />
        )}

        {/* Documents Tab */}
        {activeTab === "documents" && (
          <CandidateDocumentsTab />
        )}

      </div>

      {/* Experience Dialog */}
      <Dialog open={showExperienceDialog} onOpenChange={setShowExperienceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingExperience !== null ? 'Editar Experiência' : 'Adicionar Experiência'}
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
                <Label htmlFor="exp_start">Data Início</Label>
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
              <Label htmlFor="exp_desc">Descrição (opcional)</Label>
              <Textarea
                id="exp_desc"
                value={experienceForm.description}
                onChange={(e) => setExperienceForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setShowExperienceDialog(false)}
              className="px-4 py-2 rounded-lg bg-white border-2 border-slate-200 hover:border-[#FF6B35]/50 hover:bg-slate-50 transition-all text-[#0A2342] font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={saveExperience}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#1B4D7A] to-[#FF6B35] text-white font-medium shadow-lg shadow-[#FF6B35]/25 hover:shadow-[#FF6B35]/40 hover:scale-105 transition-all"
            >
              Salvar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FunnelLayout>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  contrato_inicial: "Contrato Inicial",
  clt: "CLT",
  estagio: "Estágio",
  menor_aprendiz: "Jovem Aprendiz",
};

const SIGNER_ROLE_LABELS: Record<string, string> = {
  candidate: "Candidato",
  parent_guardian: "Responsável",
  educational_institution: "Instituição de Ensino",
  company: "Empresa",
};

function DISCBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-sm font-medium text-slate-700">{label}</span>
      <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(value, 100)}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className="w-10 text-sm font-semibold text-slate-600 text-right">{value}%</span>
    </div>
  );
}

function CandidateAssessmentsTab({ profile }: { profile: any }) {
  const hasDisc = profile?.disc_completed_at || profile?.disc_dominante != null;
  const hasPdp = profile?.pdp_completed_at || profile?.pdp_competencies?.length > 0;

  if (!hasDisc && !hasPdp) {
    return (
      <CardEntrance>
        <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-12 text-center">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-500">Nenhuma avaliação concluída</p>
          <p className="text-slate-400 text-sm mt-1">Complete o DISC e PDP no processo de onboarding</p>
        </div>
      </CardEntrance>
    );
  }

  return (
    <div className="space-y-6">
      {/* DISC Results */}
      {hasDisc && (
        <CardEntrance>
          <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-[#0A2342] font-semibold">Perfil DISC</h3>
                {profile.disc_completed_at && (
                  <p className="text-slate-400 text-xs">
                    Concluído em {new Date(profile.disc_completed_at).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <DISCBar label="Dominante" value={profile.disc_dominante || 0} color="bg-red-500" />
              <DISCBar label="Influente" value={profile.disc_influente || 0} color="bg-yellow-500" />
              <DISCBar label="Estável" value={profile.disc_estavel || 0} color="bg-green-500" />
              <DISCBar label="Conforme" value={profile.disc_conforme || 0} color="bg-blue-500" />
            </div>
          </div>
        </CardEntrance>
      )}

      {/* PDP Results */}
      {hasPdp && (
        <CardEntrance delay={0.1}>
          <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-[#0A2342] font-semibold">Plano de Desenvolvimento Pessoal (PDP)</h3>
                {profile.pdp_completed_at && (
                  <p className="text-slate-400 text-xs">
                    Concluído em {new Date(profile.pdp_completed_at).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-5">
              {/* Competencies */}
              {profile.pdp_competencies?.length > 0 && (
                <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-100">
                  <h4 className="text-sm font-semibold text-[#0A2342] mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Competências Principais
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.pdp_competencies.map((comp: string, i: number) => (
                      <span key={i} className="px-3 py-1.5 rounded-lg bg-white text-blue-700 border border-blue-200 text-sm font-medium shadow-sm">
                        {comp}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Intrapersonal Skills */}
              {profile.pdp_intrapersonal && Object.keys(profile.pdp_intrapersonal).length > 0 && (
                <div className="bg-emerald-50/50 rounded-lg p-4 border border-emerald-100">
                  <h4 className="text-sm font-semibold text-[#0A2342] mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Habilidades Intrapessoais
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(profile.pdp_intrapersonal).map(([key, values]: [string, any]) => (
                      <div key={key} className="bg-white rounded-lg p-3 border border-emerald-100">
                        {Array.isArray(values) ? (
                          <ul className="space-y-1">
                            {values.map((v: string, i: number) => (
                              <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                <span className="text-emerald-500 mt-1 shrink-0">•</span>
                                {v}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-slate-700">{String(values)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interpersonal Skills */}
              {profile.pdp_interpersonal && Object.keys(profile.pdp_interpersonal).length > 0 && (
                <div className="bg-orange-50/50 rounded-lg p-4 border border-orange-100">
                  <h4 className="text-sm font-semibold text-[#0A2342] mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    Habilidades Interpessoais
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(profile.pdp_interpersonal).map(([key, values]: [string, any]) => (
                      <div key={key} className="bg-white rounded-lg p-3 border border-orange-100">
                        {Array.isArray(values) ? (
                          <ul className="space-y-1">
                            {values.map((v: string, i: number) => (
                              <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                <span className="text-orange-500 mt-1 shrink-0">•</span>
                                {v}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-slate-700">{String(values)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Technical Skills */}
              {profile.pdp_skills && Object.keys(profile.pdp_skills).length > 0 && (
                <div className="bg-violet-50/50 rounded-lg p-4 border border-violet-100">
                  <h4 className="text-sm font-semibold text-[#0A2342] mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-violet-500" />
                    Habilidades Técnicas
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(profile.pdp_skills).map(([key, values]: [string, any]) => (
                      Array.isArray(values) ? values.map((v: string, i: number) => (
                        <span key={`${key}-${i}`} className="px-3 py-1.5 rounded-lg bg-white text-violet-700 border border-violet-200 text-sm font-medium shadow-sm">
                          {v}
                        </span>
                      )) : (
                        <span key={key} className="px-3 py-1.5 rounded-lg bg-white text-violet-700 border border-violet-200 text-sm font-medium shadow-sm">
                          {String(values)}
                        </span>
                      )
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardEntrance>
      )}
    </div>
  );
}

function CandidateDocumentsTab() {
  const { data: docs, isLoading } = trpc.candidate.getMyDocuments.useQuery();

  if (isLoading) {
    return (
      <CardEntrance>
        <div className="py-4">
          <FormSkeleton fields={5} />
        </div>
      </CardEntrance>
    );
  }

  if (!docs || docs.length === 0) {
    return (
      <CardEntrance>
        <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-12 text-center">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-500">Nenhum documento assinado</p>
          <p className="text-slate-400 text-sm mt-1">Seus contratos assinados aparecerão aqui</p>
        </div>
      </CardEntrance>
    );
  }

  // Group by category
  const grouped: Record<string, any[]> = {};
  docs.forEach((doc: any) => {
    const cat = doc.category || "outro";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(doc);
  });

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([cat, catDocs]) => (
        <CardEntrance key={cat}>
          <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6">
            <h3 className="text-[#0A2342] font-semibold mb-4">
              {CATEGORY_LABELS[cat] || cat}
            </h3>
            <div className="space-y-3">
              {catDocs.map((doc: any) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#0A2342] truncate">
                        {doc.template?.name || "Documento"}
                      </p>
                      <p className="text-xs text-slate-500">
                        Assinado por {doc.signer_name}
                        {doc.signer_role && ` (${SIGNER_ROLE_LABELS[doc.signer_role] || doc.signer_role})`}
                        {" · "}
                        {new Date(doc.signed_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                      Assinado
                    </span>
                    {(doc.signed_pdf_url || doc.template?.file_url) && (
                      <button
                        onClick={() => window.open(doc.signed_pdf_url || doc.template.file_url, "_blank")}
                        className="p-2 rounded-lg text-slate-600 hover:text-[#0A2342] hover:bg-slate-100 transition-all"
                        title="Ver documento"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardEntrance>
      ))}
    </div>
  );
}
