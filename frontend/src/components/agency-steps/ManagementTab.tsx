import { useAgencyFunnel } from "@/contexts/AgencyFunnelContext";
import ClassicLoader from "@/components/ui/ClassicLoader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, FileText, DollarSign, FileCheck, User } from "lucide-react";
import { useState } from "react";
import CompanyDocumentsModal from "@/components/CompanyDocumentsModal";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

export default function ManagementTab() {
  const { managementFilter, setManagementFilter, companies, candidates, isLoading } = useAgencyFunnel();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [documentsModalOpen, setDocumentsModalOpen] = useState(false);

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
      <div className="flex items-center justify-center py-16">
        <ClassicLoader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-[#0A2342]">Gerenciamento</h2>
        <p className="text-slate-600 mt-1">
          Gerencie documentos, contratos e pagamentos
        </p>
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <button
          onClick={() => setManagementFilter('companies')}
          className={`px-6 py-3 rounded-full font-medium transition-all ${
            managementFilter === 'companies'
              ? 'bg-[#0A2342] text-white shadow-lg'
              : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-orange-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Empresas
            <Badge variant="secondary" className={managementFilter === 'companies' ? 'bg-white/20 text-white' : 'bg-gray-100'}>
              {companies.length}
            </Badge>
          </div>
        </button>
        <button
          onClick={() => setManagementFilter('candidates')}
          className={`px-6 py-3 rounded-full font-medium transition-all ${
            managementFilter === 'candidates'
              ? 'bg-[#0A2342] text-white shadow-lg'
              : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-orange-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Candidatos
            <Badge variant="secondary" className={managementFilter === 'candidates' ? 'bg-white/20 text-white' : 'bg-gray-100'}>
              {candidates.length}
            </Badge>
          </div>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder={`Buscar ${managementFilter === 'companies' ? 'empresas' : 'candidatos'}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 pr-10"
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

      {/* Content based on filter */}
      {managementFilter === 'companies' ? (
        <CompanyList companies={filteredCompanies} onDocumentsClick={handleDocumentsClick} searchTerm={searchTerm} />
      ) : (
        <CandidateList candidates={filteredCandidates} onDocumentsClick={handleDocumentsClick} searchTerm={searchTerm} />
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
    </div>
  );
}

function CompanyList({ companies, onDocumentsClick, searchTerm }: { companies: any[]; onDocumentsClick: (entity: any) => void; searchTerm: string }) {
  if (companies.length === 0) {
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

  return (
    <div className="space-y-2">
      {companies.map((company: any) => (
        <div
          key={company.id}
          className="p-3 bg-white rounded-lg border-2 border-slate-200 hover:border-orange-300 hover:shadow-md transition-all"
        >
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
      ))}
    </div>
  );
}

function CandidateList({ candidates, onDocumentsClick, searchTerm }: { candidates: any[]; onDocumentsClick: (entity: any) => void; searchTerm: string }) {
  if (candidates.length === 0) {
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

  return (
    <div className="space-y-2">
      {candidates.map((candidate: any) => (
        <div
          key={candidate.id}
          className="p-3 bg-white rounded-lg border-2 border-slate-200 hover:border-orange-300 hover:shadow-md transition-all"
        >
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
                disabled
                title="Em desenvolvimento"
              >
                <User className="h-4 w-4 mr-1.5" />
                Perfil
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
