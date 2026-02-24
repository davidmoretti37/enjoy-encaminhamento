import { useAgencyFunnel } from "@/contexts/AgencyFunnelContext";
import { useAgencyContext } from "@/contexts/AgencyContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, FileText, DollarSign, FileCheck, User, Plus } from "lucide-react";
import { useState } from "react";
import CompanyDocumentsModal from "@/components/CompanyDocumentsModal";
import AddCompanyModal from "@/components/AddCompanyModal";
import { CandidateCardModal } from "@/components/candidate-card/CandidateCard";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

export default function ManagementTab() {
  const { managementFilter, setManagementFilter, companies, candidates, isLoading, refreshData } = useAgencyFunnel();
  const { isAllAgenciesMode, availableAgencies } = useAgencyContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [documentsModalOpen, setDocumentsModalOpen] = useState(false);
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);

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
      </div>

      {/* Content */}
      {managementFilter === 'companies' ? (
        <CompanyList
          companies={filteredCompanies}
          onDocumentsClick={handleDocumentsClick}
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

      {/* Candidate Profile Modal */}
      {selectedCandidate && (
        <CandidateCardModal
          open={!!selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          profile={selectedCandidate}
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
    </div>
  );
}

function CompanyRow({ company, onDocumentsClick }: { company: any; onDocumentsClick: (entity: any) => void }) {
  return (
    <div className="p-3 bg-white rounded-lg border-2 border-slate-200 hover:border-orange-300 hover:shadow-md transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-[#0A2342] flex items-center justify-center">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="text-sm font-medium text-gray-900">
              {company.company_name || "Empresa sem nome"}
            </span>
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
            disabled
            title="Em desenvolvimento"
          >
            <FileCheck className="h-4 w-4 mr-1.5" />
            Contratos
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-gray-600 border-gray-300 hover:bg-gray-50 hover:border-orange-300"
            disabled
            title="Em desenvolvimento"
          >
            <DollarSign className="h-4 w-4 mr-1.5" />
            Pagamentos
          </Button>
        </div>
      </div>
    </div>
  );
}

function CompanyList({ companies, onDocumentsClick, searchTerm, isAllAgenciesMode, availableAgencies }: { companies: any[]; onDocumentsClick: (entity: any) => void; searchTerm: string; isAllAgenciesMode: boolean; availableAgencies: { id: string; name: string; city: string | null }[] }) {
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
                    <CompanyRow key={company.id} company={company} onDocumentsClick={onDocumentsClick} />
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
        <CompanyRow key={company.id} company={company} onDocumentsClick={onDocumentsClick} />
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
