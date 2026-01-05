// @ts-nocheck
import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import ClassicLoader from "@/components/ui/ClassicLoader";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  GraduationCap,
  Briefcase,
  FileText,
  Plus,
  Pencil,
  Trash2,
  X,
  Upload,
  Camera,
  LogOut
} from "lucide-react";
import { toast } from "sonner";

// Education levels matching database enum values
const EDUCATION_LEVELS = [
  { value: 'fundamental', label: 'Fundamental' },
  { value: 'medio', label: 'Médio' },
  { value: 'superior', label: 'Superior' },
  { value: 'pos-graduacao', label: 'Pós-Graduação' },
  { value: 'mestrado', label: 'Mestrado' },
  { value: 'doutorado', label: 'Doutorado' },
];

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export default function CandidateProfile() {
  const { user, loading: authLoading, logout } = useAuth();

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
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar perfil");
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

  // Handle photo upload
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Tipo de arquivo não permitido. Use JPEG, PNG ou WebP.");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 5MB.");
      return;
    }

    // Convert to base64 and upload
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      uploadPhoto.mutate({
        base64,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const isLoading = authLoading || profileQuery.isLoading;
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
        education_level: profile.education_level || '',
        currently_studying: profile.currently_studying || false,
        institution: profile.institution || '',
        course: profile.course || '',
        skills: (profile.skills as string[]) || [],
        languages: (profile.languages as string[]) || [],
        profile_summary: profile.profile_summary || '',
        available_for_clt: profile.available_for_clt ?? true,
        available_for_internship: profile.available_for_internship ?? true,
        available_for_apprentice: profile.available_for_apprentice ?? true,
        preferred_work_type: profile.preferred_work_type || 'presencial',
      });
      setExperiences((profile.experience as any[]) || []);
    }
  }, [profile]);

  // Calculate profile completion
  const calculateProfileCompletion = () => {
    let completed = 0;
    const total = 10;

    if (formData.full_name) completed++;
    if (formData.cpf) completed++;
    if (formData.email) completed++;
    if (formData.phone) completed++;
    if (formData.city) completed++;
    if (formData.state) completed++;
    if (formData.education_level) completed++;
    if (formData.skills.length > 0) completed++;
    if (experiences.length > 0) completed++;
    if (profile?.photo_url) completed++;

    return Math.round((completed / total) * 100);
  };

  const profileCompletion = calculateProfileCompletion();

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

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile.mutateAsync({
        ...formData,
        experience: experiences,
      });
    } finally {
      setSaving(false);
    }
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ClassicLoader />
      </div>
    );
  }

  if (!user || user.role !== 'candidate') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Esta página é exclusiva para candidatos.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header - Centered with completion progress */}
        <div className="text-center py-4">
          <h1 className="text-3xl font-bold text-gray-900">Meu Perfil</h1>
          <p className="text-gray-500 mt-1">Mantenha suas informações atualizadas</p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="text-right">
              <p className="text-sm text-gray-500">Perfil completo</p>
              <p className="font-semibold">{profileCompletion}%</p>
            </div>
            <Progress value={profileCompletion} className="w-24 h-2" />
          </div>
        </div>

        {/* Photo and Basic Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Dados Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              {/* Photo */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                    {uploadPhoto.isPending ? (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                        <div className="h-8 w-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : null}
                    {profile?.photo_url ? (
                      <img src={profile.photo_url} alt="Foto" className="h-full w-full object-cover" />
                    ) : (
                      <Camera className="h-8 w-8 text-slate-400" />
                    )}
                  </div>
                  <input
                    type="file"
                    id="photo-upload"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute -bottom-2 -right-2 rounded-full h-8 w-8 p-0"
                    onClick={() => document.getElementById('photo-upload')?.click()}
                    disabled={uploadPhoto.isPending}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
                <div>
                  <p className="font-medium">{formData.full_name || 'Seu nome'}</p>
                  <p className="text-sm text-muted-foreground">{formData.email}</p>
                  {uploadPhoto.isPending && (
                    <p className="text-xs text-blue-600 mt-1">Enviando foto...</p>
                  )}
                </div>
              </div>

              {/* Personal info grid */}
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
          </CardContent>
        </Card>

        {/* Education Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Formação
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Skills Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Habilidades</CardTitle>
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
                <Button onClick={addSkill} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.skills.map((skill, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {skill}
                    <button onClick={() => removeSkill(skill)} className="ml-1 hover:text-destructive">
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

        {/* Languages Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Idiomas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newLanguage}
                  onChange={(e) => setNewLanguage(e.target.value)}
                  placeholder="Digite um idioma (ex: Inglês - Intermediário)"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
                />
                <Button onClick={addLanguage} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.languages.map((lang, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {lang}
                    <button onClick={() => removeLanguage(lang)} className="ml-1 hover:text-destructive">
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

        {/* Experience Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Experiência Profissional
            </CardTitle>
            <Button onClick={openAddExperience} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </CardHeader>
          <CardContent>
            {experiences.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhuma experiência cadastrada
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
                        <Button variant="ghost" size="sm" onClick={() => openEditExperience(exp, i)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteExperience(i)}>
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

        {/* Work Preferences Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preferências de Trabalho</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
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
                    Estágio
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
                    <SelectItem value="hibrido">Híbrido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Generated Summary Card */}
        {profile?.summary && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Resumo Profissional
              </CardTitle>
              <CardDescription>
                Gerado automaticamente com base nas suas avaliações DISC e PDP
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap">
                {profile.summary}
              </div>
              {profile.summary_generated_at && (
                <p className="text-xs text-muted-foreground mt-2">
                  Gerado em: {new Date(profile.summary_generated_at).toLocaleDateString('pt-BR')}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* User Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {profile?.summary ? 'Observações Adicionais' : 'Resumo Profissional'}
            </CardTitle>
            {profile?.summary && (
              <CardDescription>
                Adicione informações extras que não foram capturadas nas avaliações
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.profile_summary}
              onChange={(e) => handleInputChange('profile_summary', e.target.value)}
              placeholder="Escreva um breve resumo sobre você, suas experiências e objetivos..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSaveProfile} disabled={saving} size="lg">
            {saving ? (
              <>
                <ClassicLoader />
                Salvando...
              </>
            ) : (
              'Salvar Alterações'
            )}
          </Button>
        </div>

        {/* Logout Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sair da Conta</CardTitle>
            <CardDescription>
              Encerrar sua sessão neste dispositivo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={logout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sair da conta
            </Button>
          </CardContent>
        </Card>

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
              <Button variant="outline" onClick={() => setShowExperienceDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={saveExperience}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
