import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { Briefcase, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { MultiStepWizard } from '@/components/MultiStepWizard';

interface SchoolData {
  city: string;
  schoolName: string;
  tradeName: string;
  legalName: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  state: string;
  postalCode: string;
  website: string;
}

export default function CreateAffiliateInvitation() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Email and number of schools
  const [email, setEmail] = useState('');
  const [numberOfSchools, setNumberOfSchools] = useState(1);

  // Schools array - initialized based on numberOfSchools
  const [schools, setSchools] = useState<SchoolData[]>([{
    city: '',
    schoolName: '',
    tradeName: '',
    legalName: '',
    cnpj: '',
    email: '',
    phone: '',
    address: '',
    state: '',
    postalCode: '',
    website: ''
  }]);

  // Update schools array when numberOfSchools changes
  useEffect(() => {
    const currentLength = schools.length;
    if (numberOfSchools > currentLength) {
      // Add more schools
      const newSchools = Array.from({ length: numberOfSchools - currentLength }, () => ({
        city: '',
        schoolName: '',
        tradeName: '',
        legalName: '',
        cnpj: '',
        email: '',
        phone: '',
        address: '',
        state: '',
        postalCode: '',
        website: ''
      }));
      setSchools([...schools, ...newSchools]);
    } else if (numberOfSchools < currentLength) {
      // Remove excess schools
      setSchools(schools.slice(0, numberOfSchools));
    }
  }, [numberOfSchools]);

  const createInvitationMutation = trpc.affiliate.createInvitation.useMutation({
    onSuccess: (data) => {
      toast.success('Convite criado com sucesso!');

      // Open Gmail with pre-filled email
      const invitationLink = `${window.location.origin}/affiliate/accept/${data.token}`;
      const cities = schools.map(s => s.city).filter(c => c).join(', ');
      const subject = encodeURIComponent('Convite para ser Franqueado');
      const body = encodeURIComponent(`Olá,

Você foi convidado(a) para se juntar à nossa rede como franqueado!

Você gerenciará ${schools.length} escola(s) nas seguintes cidades: ${cities}

Para aceitar o convite e criar sua conta, acesse o link abaixo:

${invitationLink}

Este convite expira em 7 dias.

Atenciosamente,
Equipe Recrutamento`);

      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${subject}&body=${body}`;
      window.open(gmailUrl, '_blank');

      setLocation('/admin/regional');
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao criar convite');
      setIsSubmitting(false);
    }
  });

  const updateSchool = (index: number, field: keyof SchoolData, value: string) => {
    setSchools(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Validation functions
  const validateEmailAndNumber = (): boolean => {
    if (!email.trim() || !email.includes('@')) {
      toast.error('Por favor, forneça um email válido');
      return false;
    }
    if (numberOfSchools < 1 || numberOfSchools > 100) {
      toast.error('O número de escolas deve estar entre 1 e 100');
      return false;
    }
    return true;
  };

  const validateSchool = (schoolIndex: number): boolean => {
    const school = schools[schoolIndex];
    if (!school.city.trim()) {
      toast.error(`Escola ${schoolIndex + 1}: Por favor, preencha a cidade`);
      return false;
    }
    if (!school.schoolName.trim()) {
      toast.error(`Escola ${schoolIndex + 1}: Por favor, preencha o nome da escola`);
      return false;
    }
    if (!school.cnpj.trim()) {
      toast.error(`Escola ${schoolIndex + 1}: Por favor, preencha o CNPJ`);
      return false;
    }
    if (!school.email.trim()) {
      toast.error(`Escola ${schoolIndex + 1}: Por favor, preencha o email`);
      return false;
    }
    return true;
  };

  const handleNext = () => {
    // Validate current step
    if (currentStep === 0 && !validateEmailAndNumber()) {
      return;
    }
    // Validate school steps (steps 1 onwards)
    if (currentStep >= 1) {
      const schoolIndex = currentStep - 1;
      if (!validateSchool(schoolIndex)) {
        return;
      }
    }
    setCurrentStep(prev => prev + 1);
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = () => {
    // Final validation
    if (!validateEmailAndNumber()) {
      return;
    }

    // Validate all schools
    for (let i = 0; i < schools.length; i++) {
      if (!validateSchool(i)) {
        return;
      }
    }

    setIsSubmitting(true);

    const cities = schools.map(s => s.city);

    // For now, create dummy franchise data since affiliate doesn't fill it
    const dummyFranchise = {
      name: 'Franquia Temporária',
      legal_name: 'Franquia Temporária LTDA',
      cnpj: '00000000000000',
      contact_email: email,
      city: schools[0]?.city || 'Cidade'
    };

    createInvitationMutation.mutate({
      email,
      cities,
      franchise: dummyFranchise,
      schools: schools.map(school => ({
        city: school.city,
        school_name: school.schoolName,
        trade_name: school.tradeName || undefined,
        legal_name: school.legalName || undefined,
        cnpj: school.cnpj,
        email: school.email,
        phone: school.phone || undefined,
        address: school.address || undefined,
        state: school.state || undefined,
        postal_code: school.postalCode || undefined,
        website: school.website || undefined,
      })),
    });
  };

  // Build wizard steps - Step 1 + School steps
  const steps = [
    {
      id: 'email-and-number',
      title: 'Email e Escolas',
      description: 'Email do franqueado e quantas escolas serão registradas',
      content: (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email do Franqueado *</Label>
            <Input
              id="email"
              type="email"
              placeholder="franqueado@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Este será o email de login do franqueado. Ele precisará apenas fornecer nome, telefone e senha.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="numberOfSchools">Número de Escolas *</Label>
            <Input
              id="numberOfSchools"
              type="number"
              min="1"
              max="100"
              placeholder="1"
              value={numberOfSchools}
              onChange={(e) => setNumberOfSchools(parseInt(e.target.value) || 1)}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Quantas escolas você deseja registrar para este franqueado? (1-100)
            </p>
          </div>
        </div>
      ),
    },
    // Dynamically add school steps
    ...schools.map((school, index) => ({
      id: `school-${index}`,
      title: `Escola ${index + 1}`,
      description: `Preencha os dados da escola ${index + 1} de ${schools.length}`,
      content: (
        <div className="space-y-6">
          {/* School Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Informações da Escola</h3>

            <div className="space-y-2">
              <Label htmlFor={`school-city-${index}`}>Cidade *</Label>
              <Input
                id={`school-city-${index}`}
                type="text"
                placeholder="Cidade onde a escola está localizada"
                value={school.city}
                onChange={(e) => updateSchool(index, 'city', e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`school-name-${index}`}>Nome da Escola *</Label>
              <Input
                id={`school-name-${index}`}
                type="text"
                placeholder="Nome da escola"
                value={school.schoolName}
                onChange={(e) => updateSchool(index, 'schoolName', e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`school-legal-${index}`}>Razão Social</Label>
              <Input
                id={`school-legal-${index}`}
                type="text"
                placeholder="Razão social"
                value={school.legalName}
                onChange={(e) => updateSchool(index, 'legalName', e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`school-cnpj-${index}`}>CNPJ *</Label>
              <Input
                id={`school-cnpj-${index}`}
                type="text"
                placeholder="00.000.000/0000-00"
                value={school.cnpj}
                onChange={(e) => updateSchool(index, 'cnpj', e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* School Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Contato</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`school-email-${index}`}>Email *</Label>
                <Input
                  id={`school-email-${index}`}
                  type="email"
                  placeholder="escola@example.com"
                  value={school.email}
                  onChange={(e) => updateSchool(index, 'email', e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`school-phone-${index}`}>Telefone</Label>
                <Input
                  id={`school-phone-${index}`}
                  type="tel"
                  placeholder="(00) 0000-0000"
                  value={school.phone}
                  onChange={(e) => updateSchool(index, 'phone', e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`school-website-${index}`}>Website</Label>
              <Input
                id={`school-website-${index}`}
                type="url"
                placeholder="https://..."
                value={school.website}
                onChange={(e) => updateSchool(index, 'website', e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* School Address */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Endereço</h3>
            <div className="space-y-2">
              <Label htmlFor={`school-address-${index}`}>Endereço</Label>
              <Input
                id={`school-address-${index}`}
                type="text"
                placeholder="Rua, número"
                value={school.address}
                onChange={(e) => updateSchool(index, 'address', e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`school-state-${index}`}>Estado</Label>
                <Input
                  id={`school-state-${index}`}
                  type="text"
                  placeholder="UF"
                  value={school.state}
                  onChange={(e) => updateSchool(index, 'state', e.target.value)}
                  maxLength={2}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`school-postal-${index}`}>CEP</Label>
                <Input
                  id={`school-postal-${index}`}
                  type="text"
                  placeholder="00000-000"
                  value={school.postalCode}
                  onChange={(e) => updateSchool(index, 'postalCode', e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>
        </div>
      ),
    })),
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation('/admin/regional')}
            disabled={isSubmitting}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex items-center">
            <Briefcase className="h-12 w-12 text-slate-900 mr-3" />
            <h1 className="text-3xl font-bold text-slate-900">Criar Convite</h1>
          </div>
          <div className="w-24" /> {/* Spacer for centering */}
        </div>

        <MultiStepWizard
          steps={steps}
          currentStep={currentStep}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />

        <div className="mt-4 text-center text-sm text-muted-foreground">
          <p>
            O franqueado precisará apenas fornecer nome, telefone e senha ao aceitar o convite.
          </p>
        </div>
      </div>
    </div>
  );
}
