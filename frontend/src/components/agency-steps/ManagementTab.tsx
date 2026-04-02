import { useAgencyFunnel } from "@/contexts/AgencyFunnelContext";
import { useAgencyContext } from "@/contexts/AgencyContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, FileText, DollarSign, FileCheck, User, Plus, CheckCircle2, Clock, AlertCircle, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import CompanyDocumentsModal from "@/components/CompanyDocumentsModal";
import AddCompanyModal from "@/components/AddCompanyModal";
import { CandidateCardModal } from "@/components/candidate-card/CandidateCard";
import { Input } from "@/components/ui/input";
import { Search, X, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ManagementTab() {
  const { managementFilter, setManagementFilter, companies, candidates, isLoading, refreshData } = useAgencyFunnel();
  const { isAllAgenciesMode, availableAgencies } = useAgencyContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [documentsModalOpen, setDocumentsModalOpen] = useState(false);
  const [paymentsModalOpen, setPaymentsModalOpen] = useState(false);
  const [paymentsEntity, setPaymentsEntity] = useState<any>(null);
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [showRegisterEmployeeModal, setShowRegisterEmployeeModal] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    companyId: '', jobId: '', jobTitle: '', fullName: '', cpf: '', email: '',
    phone: '', dateOfBirth: '', contractType: 'estagio', monthlySalary: '',
    startDate: '', endDate: '',
  });

  const registerMutation = trpc.agency.registerExistingEmployee.useMutation({
    onSuccess: (data: any) => {
      toast.success('Funcionário registrado com sucesso!');
      setShowRegisterEmployeeModal(false);
      setRegisterForm({ companyId: '', jobId: '', jobTitle: '', fullName: '', cpf: '', email: '', phone: '', dateOfBirth: '', contractType: 'estagio', monthlySalary: '', startDate: '', endDate: '' });
      refreshData();
    },
    onError: (error: any) => toast.error(error.message || 'Erro ao registrar funcionário'),
  });

  // Fetch jobs for selected company in register modal
  const { data: companyJobs } = trpc.job.getByCompanyId.useQuery(
    { companyId: registerForm.companyId },
    { enabled: !!registerForm.companyId && showRegisterEmployeeModal }
  );

  const handleRegisterEmployee = () => {
    if (!registerForm.companyId || !registerForm.fullName || !registerForm.cpf || !registerForm.email || !registerForm.startDate) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    registerMutation.mutate({
      companyId: registerForm.companyId,
      jobId: registerForm.jobId || undefined,
      jobTitle: registerForm.jobTitle || undefined,
      candidate: {
        full_name: registerForm.fullName,
        cpf: registerForm.cpf,
        email: registerForm.email,
        phone: registerForm.phone || undefined,
        date_of_birth: registerForm.dateOfBirth || undefined,
      },
      contractType: registerForm.contractType as any,
      monthlySalary: Math.round(parseFloat(registerForm.monthlySalary || '0') * 100),
      startDate: registerForm.startDate,
      endDate: registerForm.endDate || undefined,
    });
  };

  // Filter entities based on search
  const filteredCompanies = companies.filter((company: any) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      company.company_name?.toLowerCase().includes(s) ||
      company.contact_name?.toLowerCase().includes(s) ||
      company.company_email?.toLowerCase().includes(s)
    );
  });

  const filteredCandidates = candidates.filter((candidate: any) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      candidate.full_name?.toLowerCase().includes(s) ||
      candidate.email?.toLowerCase().includes(s) ||
      candidate.phone?.toLowerCase().includes(s)
    );
  });

  const handleDocumentsClick = (entity: any) => {
    setSelectedEntity(entity);
    setDocumentsModalOpen(true);
  };

  const handlePaymentsClick = (entity: any) => {
    setPaymentsEntity(entity);
    setPaymentsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[#0A2342]">Gerenciamento</h2>
        <p className="text-slate-600 mt-1">
          Gerencie empresas, candidatos, documentos e pagamentos
        </p>
      </div>

      {/* Filter Toggle - centered */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => { setManagementFilter('companies'); setSearchTerm(''); }}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            managementFilter === 'companies'
              ? 'bg-[#0A2342] text-white shadow-md'
              : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            Empresas
            <Badge variant="secondary" className={`text-xs px-1.5 py-0 ${managementFilter === 'companies' ? 'bg-white/20 text-white' : 'bg-gray-100'}`}>
              {companies.length}
            </Badge>
          </span>
        </button>
        <button
          onClick={() => { setManagementFilter('candidates'); setSearchTerm(''); }}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            managementFilter === 'candidates'
              ? 'bg-[#0A2342] text-white shadow-md'
              : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Candidatos
            <Badge variant="secondary" className={`text-xs px-1.5 py-0 ${managementFilter === 'candidates' ? 'bg-white/20 text-white' : 'bg-gray-100'}`}>
              {candidates.length}
            </Badge>
          </span>
        </button>
      </div>

      {/* Search + Action - centered */}
      <div className="flex items-center justify-center gap-2 max-w-lg mx-auto">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={`Buscar ${managementFilter === 'companies' ? 'empresas' : 'candidatos'}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-9 h-9"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {managementFilter === 'companies' && (
          <Button
            onClick={() => setShowAddCompanyModal(true)}
            className="shrink-0 bg-[#0A2342] hover:bg-[#0A2342]/90"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Adicionar Empresa
          </Button>
        )}
        <Button
          onClick={() => setShowRegisterEmployeeModal(true)}
          variant="outline"
          className="shrink-0"
        >
          <UserPlus className="h-4 w-4 mr-1.5" />
          Registrar Funcionário
        </Button>
      </div>

      {/* Content */}
      {managementFilter === 'companies' ? (
        <CompanyList
          companies={filteredCompanies}
          onDocumentsClick={handleDocumentsClick}
          onPaymentsClick={handlePaymentsClick}
          searchTerm={searchTerm}
          isAllAgenciesMode={isAllAgenciesMode}
          availableAgencies={availableAgencies}
        />
      ) : (
        <CandidateList
          candidates={filteredCandidates}
          onDocumentsClick={handleDocumentsClick}
          onProfileClick={(candidate: any) => setSelectedCandidate(candidate)}
          searchTerm={searchTerm}
          isAllAgenciesMode={isAllAgenciesMode}
          availableAgencies={availableAgencies}
        />
      )}

      {/* Documents Modal */}
      <CompanyDocumentsModal
        meeting={selectedEntity}
        open={documentsModalOpen}
        onClose={() => {
          setDocumentsModalOpen(false);
          setSelectedEntity(null);
        }}
      />

      {/* Payments Modal */}
      <CompanyPaymentsModal
        company={paymentsEntity}
        open={paymentsModalOpen}
        onClose={() => {
          setPaymentsModalOpen(false);
          setPaymentsEntity(null);
        }}
      />

      {/* Candidate Profile Modal */}
      {selectedCandidate && (
        <CandidateCardModal
          open={!!selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          profile={{
            ...selectedCandidate,
            name: selectedCandidate.full_name || selectedCandidate.name || "Candidato",
            education: selectedCandidate.education_level || selectedCandidate.education,
            email: selectedCandidate.email || selectedCandidate.users?.email,
            phone: selectedCandidate.phone,
          }}
        />
      )}

      {/* Add Company Modal */}
      <AddCompanyModal
        open={showAddCompanyModal}
        onClose={() => setShowAddCompanyModal(false)}
        onSuccess={() => {
          setShowAddCompanyModal(false);
          refreshData();
        }}
      />

      {/* Register Existing Employee Modal */}
      <Dialog open={showRegisterEmployeeModal} onOpenChange={setShowRegisterEmployeeModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Funcionário Existente</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 -mt-2">
            Cadastre um funcionário que já foi contratado pela empresa fora da plataforma.
          </p>
          <div className="space-y-4 pt-2">
            {/* Company */}
            <div>
              <Label className="text-sm font-medium">Empresa *</Label>
              <Select value={registerForm.companyId} onValueChange={v => setRegisterForm({...registerForm, companyId: v, jobId: ''})}>
                <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                <SelectContent>
                  {companies.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Job */}
            {registerForm.companyId && (
              <div>
                <Label className="text-sm font-medium">Vaga</Label>
                <Select value={registerForm.jobId} onValueChange={v => setRegisterForm({...registerForm, jobId: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecione ou crie nova" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__new__">+ Criar nova vaga</SelectItem>
                    {(companyJobs || []).map((j: any) => (
                      <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {registerForm.jobId === '__new__' && (
                  <Input className="mt-2" placeholder="Título da vaga" value={registerForm.jobTitle} onChange={e => setRegisterForm({...registerForm, jobTitle: e.target.value})} />
                )}
              </div>
            )}

            <hr className="my-2" />
            <h4 className="font-semibold text-sm">Dados do Funcionário</h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nome Completo *</Label>
                <Input value={registerForm.fullName} onChange={e => setRegisterForm({...registerForm, fullName: e.target.value})} />
              </div>
              <div>
                <Label className="text-xs">CPF *</Label>
                <Input placeholder="000.000.000-00" value={registerForm.cpf} onChange={e => setRegisterForm({...registerForm, cpf: e.target.value})} />
              </div>
              <div>
                <Label className="text-xs">Email *</Label>
                <Input type="email" value={registerForm.email} onChange={e => setRegisterForm({...registerForm, email: e.target.value})} />
              </div>
              <div>
                <Label className="text-xs">Telefone</Label>
                <Input value={registerForm.phone} onChange={e => setRegisterForm({...registerForm, phone: e.target.value})} />
              </div>
              <div>
                <Label className="text-xs">Data de Nascimento</Label>
                <Input type="date" value={registerForm.dateOfBirth} onChange={e => setRegisterForm({...registerForm, dateOfBirth: e.target.value})} />
              </div>
            </div>

            <hr className="my-2" />
            <h4 className="font-semibold text-sm">Dados do Contrato</h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tipo de Contrato *</Label>
                <Select value={registerForm.contractType} onValueChange={v => setRegisterForm({...registerForm, contractType: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="estagio">Estágio</SelectItem>
                    <SelectItem value="clt">CLT</SelectItem>
                    <SelectItem value="pj">PJ</SelectItem>
                    <SelectItem value="menor-aprendiz">Menor Aprendiz</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Salário Mensal (R$)</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={registerForm.monthlySalary} onChange={e => setRegisterForm({...registerForm, monthlySalary: e.target.value})} />
              </div>
              <div>
                <Label className="text-xs">Data de Início *</Label>
                <Input type="date" value={registerForm.startDate} onChange={e => setRegisterForm({...registerForm, startDate: e.target.value})} />
              </div>
              {(registerForm.contractType === 'estagio' || registerForm.contractType === 'menor-aprendiz') && (
                <div>
                  <Label className="text-xs">Data de Término</Label>
                  <Input type="date" value={registerForm.endDate} onChange={e => setRegisterForm({...registerForm, endDate: e.target.value})} />
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowRegisterEmployeeModal(false)}>Cancelar</Button>
            <Button onClick={handleRegisterEmployee} disabled={registerMutation.isPending}>
              {registerMutation.isPending ? 'Registrando...' : 'Registrar Funcionário'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CompanyRow({ company, onDocumentsClick, onPaymentsClick }: { company: any; onDocumentsClick: (entity: any) => void; onPaymentsClick: (entity: any) => void }) {
  const [, setLocation] = useLocation();

  return (
    <div className="p-3 bg-white rounded-lg border-2 border-slate-200 hover:border-orange-300 hover:shadow-md transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-[#0A2342] flex items-center justify-center">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <div>
            <button
              className="text-sm font-medium text-gray-900 hover:text-blue-700 hover:underline text-left"
              onClick={() => setLocation(`/agency/companies/${company.id}/jobs`)}
            >
              {company.company_name || "Empresa sem nome"}
            </button>
            {company.contact_name && (
              <p className="text-xs text-gray-500">{company.contact_name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-gray-600 border-gray-300 hover:bg-gray-50 hover:border-orange-300"
            onClick={() => onDocumentsClick(company)}
          >
            <FileText className="h-4 w-4 mr-1.5" />
            Documentos
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-gray-600 border-gray-300 hover:bg-gray-50 hover:border-orange-300"
            onClick={() => onPaymentsClick(company)}
          >
            <DollarSign className="h-4 w-4 mr-1.5" />
            Pagamentos
          </Button>
        </div>
      </div>
    </div>
  );
}

function CompanyList({ companies, onDocumentsClick, onPaymentsClick, searchTerm, isAllAgenciesMode, availableAgencies }: { companies: any[]; onDocumentsClick: (entity: any) => void; onPaymentsClick: (entity: any) => void; searchTerm: string; isAllAgenciesMode: boolean; availableAgencies: { id: string; name: string; city: string | null }[] }) {
  if (!isAllAgenciesMode && companies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center mb-6 shadow-sm">
          <Building2 className="w-10 h-10 text-slate-400" />
        </div>
        <h3 className="text-xl font-semibold text-[#0A2342] mb-2">
          {searchTerm ? 'Nenhuma empresa encontrada' : 'Nenhuma empresa cadastrada'}
        </h3>
        <p className="text-slate-600 max-w-sm">
          {searchTerm ? 'Tente ajustar sua busca' : 'Empresas parceiras aparecerão aqui'}
        </p>
      </div>
    );
  }

  if (isAllAgenciesMode) {
    return (
      <div className="space-y-6">
        {availableAgencies.map(agency => {
          const agencyCompanies = companies.filter((c: any) => c.agency_id === agency.id);
          return (
            <div key={agency.id}>
              <div className="flex items-center gap-2 py-3 px-3 border-b border-gray-200 bg-gray-50/80 rounded-t-lg">
                <Building2 className="h-4 w-4 text-gray-500" />
                <span className="font-semibold text-gray-700">{agency.name}</span>
                <span className="text-xs text-gray-400">({agencyCompanies.length})</span>
              </div>
              {agencyCompanies.length > 0 ? (
                <div className="space-y-2 mt-2">
                  {agencyCompanies.map((company: any) => (
                    <CompanyRow key={company.id} company={company} onDocumentsClick={onDocumentsClick} onPaymentsClick={onPaymentsClick} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 py-4 px-3">Nenhuma empresa nesta agência</p>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {companies.map((company: any) => (
        <CompanyRow key={company.id} company={company} onDocumentsClick={onDocumentsClick} onPaymentsClick={onPaymentsClick} />
      ))}
    </div>
  );
}

function CandidateRow({ candidate, onProfileClick }: { candidate: any; onProfileClick: (candidate: any) => void }) {
  return (
    <div className="p-3 bg-white rounded-lg border-2 border-slate-200 hover:border-orange-300 hover:shadow-md transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-[#0A2342] flex items-center justify-center">
            <span className="text-white font-medium text-xs">
              {candidate.full_name?.charAt(0)?.toUpperCase() || 'C'}
            </span>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-900">
              {candidate.full_name || "Candidato sem nome"}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              {candidate.education_level && (
                <p className="text-xs text-gray-500">{candidate.education_level}</p>
              )}
              {candidate.status && (
                <Badge
                  variant={
                    candidate.status === 'active' ? 'default' :
                    candidate.status === 'employed' ? 'secondary' :
                    'outline'
                  }
                  className="text-xs"
                >
                  {candidate.status === 'active' ? 'Ativo' : candidate.status === 'employed' ? 'Empregado' : 'Inativo'}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-gray-600 border-gray-300 hover:bg-gray-50 hover:border-orange-300"
            disabled
            title="Em desenvolvimento"
          >
            <FileText className="h-4 w-4 mr-1.5" />
            Documentos
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-gray-600 border-gray-300 hover:bg-gray-50 hover:border-orange-300"
            onClick={() => onProfileClick(candidate)}
          >
            <User className="h-4 w-4 mr-1.5" />
            Perfil
          </Button>
        </div>
      </div>
    </div>
  );
}

function CandidateList({ candidates, onDocumentsClick, onProfileClick, searchTerm, isAllAgenciesMode, availableAgencies }: { candidates: any[]; onDocumentsClick: (entity: any) => void; onProfileClick: (candidate: any) => void; searchTerm: string; isAllAgenciesMode: boolean; availableAgencies: { id: string; name: string; city: string | null }[] }) {
  if (!isAllAgenciesMode && candidates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center mb-6 shadow-sm">
          <Users className="w-10 h-10 text-slate-400" />
        </div>
        <h3 className="text-xl font-semibold text-[#0A2342] mb-2">
          {searchTerm ? 'Nenhum candidato encontrado' : 'Nenhum candidato cadastrado'}
        </h3>
        <p className="text-slate-600 max-w-sm">
          {searchTerm ? 'Tente ajustar sua busca' : 'Candidatos aparecerão aqui quando cadastrados'}
        </p>
      </div>
    );
  }

  if (isAllAgenciesMode) {
    return (
      <div className="space-y-6">
        {availableAgencies.map(agency => {
          const agencyCandidates = candidates.filter((c: any) => c.agency_id === agency.id);
          return (
            <div key={agency.id}>
              <div className="flex items-center gap-2 py-3 px-3 border-b border-gray-200 bg-gray-50/80 rounded-t-lg">
                <Building2 className="h-4 w-4 text-gray-500" />
                <span className="font-semibold text-gray-700">{agency.name}</span>
                <span className="text-xs text-gray-400">({agencyCandidates.length})</span>
              </div>
              {agencyCandidates.length > 0 ? (
                <div className="space-y-2 mt-2">
                  {agencyCandidates.map((candidate: any) => (
                    <CandidateRow key={candidate.id} candidate={candidate} onProfileClick={onProfileClick} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 py-4 px-3">Nenhum candidato nesta agência</p>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {candidates.map((candidate: any) => (
        <CandidateRow key={candidate.id} candidate={candidate} onProfileClick={onProfileClick} />
      ))}
    </div>
  );
}

function CompanyPaymentsModal({ company, open, onClose }: { company: any; open: boolean; onClose: () => void }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    due_date: '',
    start_date: '',
    end_date: '',
    payment_day: '5',
    payment_type: 'monthly-fee' as string,
    notes: '',
  });

  const utils = trpc.useUtils();

  const { data: paymentsData, isLoading } = trpc.agency.getPaymentsGroupedByCompany.useQuery(
    undefined,
    { enabled: open }
  );

  const createPaymentMutation = trpc.admin.createManualPayment.useMutation({
    onSuccess: () => {
      // For one-time payments, show toast here. Monthly payments handle their own toast.
      if (paymentForm.payment_type === 'setup-fee' || paymentForm.payment_type === 'penalty') {
        toast.success('Pagamento adicionado!');
        setShowAddForm(false);
        setPaymentForm({ amount: '', due_date: '', start_date: '', end_date: '', payment_day: '5', payment_type: 'monthly-fee', notes: '' });
      }
      utils.agency.getPaymentsGroupedByCompany.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar pagamento');
    },
  });

  const isRecurring = paymentForm.payment_type === 'monthly-fee' || paymentForm.payment_type === 'insurance-fee';

  const handleCreatePayment = async () => {
    if (!paymentForm.amount) {
      toast.error('Preencha o valor');
      return;
    }

    const amountCents = Math.round(parseFloat(paymentForm.amount) * 100);

    if (isRecurring) {
      // Monthly: generate one payment per month between start and end
      if (!paymentForm.start_date || !paymentForm.end_date) {
        toast.error('Preencha data de início e fim');
        return;
      }
      const start = new Date(paymentForm.start_date);
      const end = new Date(paymentForm.end_date);
      const day = parseInt(paymentForm.payment_day) || 5;

      let current = new Date(start.getFullYear(), start.getMonth(), day);
      if (current < start) current.setMonth(current.getMonth() + 1);

      let count = 0;
      while (current <= end) {
        const dueDate = current.toISOString().split('T')[0];
        const period = `${String(current.getMonth() + 1).padStart(2, '0')}/${current.getFullYear()}`;
        try {
          await createPaymentMutation.mutateAsync({
            company_id: company.id,
            amount: amountCents,
            due_date: dueDate,
            billing_period: period,
            payment_type: paymentForm.payment_type as any,
            notes: paymentForm.notes || undefined,
          });
          count++;
        } catch (e) {
          // stop on error, already toasted by onError
          break;
        }
        current.setMonth(current.getMonth() + 1);
      }
      if (count > 0) {
        toast.success(`${count} pagamento(s) criado(s)!`);
        setShowAddForm(false);
        setPaymentForm({ amount: '', due_date: '', start_date: '', end_date: '', payment_day: '5', payment_type: 'monthly-fee', notes: '' });
        utils.agency.getPaymentsGroupedByCompany.invalidate();
      }
    } else {
      // One-time payment
      if (!paymentForm.due_date) {
        toast.error('Preencha a data de vencimento');
        return;
      }
      createPaymentMutation.mutate({
        company_id: company.id,
        amount: amountCents,
        due_date: paymentForm.due_date,
        payment_type: paymentForm.payment_type as any,
        notes: paymentForm.notes || undefined,
      });
    }
  };

  if (!company) return null;

  const companyPayments = paymentsData?.find(
    (g: any) => g.companyId === company.id || g.companyName === company.company_name
  );

  const payments = companyPayments?.payments || [];
  const hasPayments = payments.length > 0;

  const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
    paid: { label: "Pago", icon: CheckCircle2, color: "text-green-600 bg-green-50" },
    pending: { label: "Pendente", icon: Clock, color: "text-amber-600 bg-amber-50" },
    overdue: { label: "Atrasado", icon: AlertCircle, color: "text-red-600 bg-red-50" },
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Pagamentos - {company.company_name || "Empresa"}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : !hasPayments && !showAddForm ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <DollarSign className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Nenhum pagamento ainda</h3>
            <p className="text-sm text-gray-500 max-w-xs">
              Os pagamentos aparecem automaticamente quando um candidato é contratado por esta empresa e o contrato é finalizado.
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs text-gray-400">
              <span className="px-2 py-1 bg-gray-100 rounded">Contratar candidato</span>
              <ArrowRight className="h-3 w-3" />
              <span className="px-2 py-1 bg-gray-100 rounded">Assinar contrato</span>
              <ArrowRight className="h-3 w-3" />
              <span className="px-2 py-1 bg-gray-100 rounded">Pagamentos gerados</span>
            </div>
            <Button className="mt-4" variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-1" /> Adicionar Pagamento Manual
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-green-50 text-center">
                <p className="text-xs text-green-600 font-medium">Pago</p>
                <p className="text-lg font-bold text-green-700">
                  R$ {((companyPayments?.totalPaid || 0) / 100).toFixed(2)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 text-center">
                <p className="text-xs text-amber-600 font-medium">Pendente</p>
                <p className="text-lg font-bold text-amber-700">
                  R$ {((companyPayments?.pendingAmount || 0) / 100).toFixed(2)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-red-50 text-center">
                <p className="text-xs text-red-600 font-medium">Atrasado</p>
                <p className="text-lg font-bold text-red-700">
                  R$ {((companyPayments?.overdueAmount || 0) / 100).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Payment list */}
            <div className="space-y-2">
              {payments.map((payment: any) => {
                const config = statusConfig[payment.status] || statusConfig.pending;
                const StatusIcon = config.icon;
                return (
                  <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg border bg-white">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-md ${config.color}`}>
                        <StatusIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          R$ {((payment.amount || 0) / 100).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {payment.payment_type === 'monthly-fee' ? 'Taxa mensal' : payment.payment_type === 'insurance-fee' ? 'Seguro Mensal' : payment.payment_type === 'annual-insurance' ? 'Seguro Anual' : payment.payment_type}
                          {payment.billing_period && ` · ${payment.billing_period}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={config.color + " border-0 text-xs"}>
                        {config.label}
                      </Badge>
                      {payment.due_date && (
                        <p className="text-xs text-gray-400 mt-1">
                          Venc: {format(new Date(payment.due_date), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <Button className="mt-3 w-full" variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-1" /> Adicionar Pagamento
            </Button>
          </div>
        )}

        {/* Add Payment Form */}
        {showAddForm && (
          <div className="border-t pt-4 mt-4 space-y-3">
            <h4 className="font-semibold text-sm">Novo Pagamento</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tipo *</Label>
                <Select value={paymentForm.payment_type} onValueChange={v => setPaymentForm({...paymentForm, payment_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly-fee">Mensalidade</SelectItem>
                    <SelectItem value="insurance-fee">Seguro Mensal</SelectItem>
                    <SelectItem value="annual-insurance">Seguro Anual</SelectItem>
                    <SelectItem value="setup-fee">Taxa Única</SelectItem>
                    <SelectItem value="penalty">Multa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Valor (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="150.00"
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})}
                />
              </div>

              {isRecurring ? (
                <>
                  <div>
                    <Label className="text-xs">Início *</Label>
                    <Input type="date" value={paymentForm.start_date} onChange={e => setPaymentForm({...paymentForm, start_date: e.target.value})} />
                  </div>
                  <div>
                    <Label className="text-xs">Fim *</Label>
                    <Input type="date" value={paymentForm.end_date} onChange={e => setPaymentForm({...paymentForm, end_date: e.target.value})} />
                  </div>
                  <div>
                    <Label className="text-xs">Dia do Vencimento</Label>
                    <Input type="number" min="1" max="28" value={paymentForm.payment_day} onChange={e => setPaymentForm({...paymentForm, payment_day: e.target.value})} />
                  </div>
                </>
              ) : (
                <div>
                  <Label className="text-xs">Vencimento *</Label>
                  <Input type="date" value={paymentForm.due_date} onChange={e => setPaymentForm({...paymentForm, due_date: e.target.value})} />
                </div>
              )}

              <div className={isRecurring ? "" : "col-span-2"}>
                <Label className="text-xs">Observação</Label>
                <Input
                  placeholder="Ex: Seguro de vida - João Otávio"
                  value={paymentForm.notes}
                  onChange={e => setPaymentForm({...paymentForm, notes: e.target.value})}
                />
              </div>
            </div>

            {isRecurring && paymentForm.start_date && paymentForm.end_date && (
              <p className="text-xs text-gray-500">
                Serão criados pagamentos mensais de R$ {paymentForm.amount || '0'} no dia {paymentForm.payment_day} de cada mês
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleCreatePayment} disabled={createPaymentMutation.isPending}>
                {createPaymentMutation.isPending ? 'Salvando...' : isRecurring ? 'Gerar Pagamentos' : 'Criar Pagamento'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
