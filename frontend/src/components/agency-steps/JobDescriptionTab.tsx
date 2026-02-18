import { useAgencyFunnel } from "@/contexts/AgencyFunnelContext";
import { useAgencyContext } from "@/contexts/AgencyContext";
import ClassicLoader from "@/components/ui/ClassicLoader";
import { Building2, Briefcase, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import CompanyJobFlow from "./CompanyJobFlow";

export default function JobDescriptionTab() {
  const { companies, selectedCompanyId, setSelectedCompanyId, isCompaniesLoading } = useAgencyFunnel();
  const { isAllAgenciesMode, availableAgencies } = useAgencyContext();

  console.log('[JobDescriptionTab] selectedCompanyId:', selectedCompanyId);

  // If a company is selected, show the job flow
  if (selectedCompanyId) {
    return <CompanyJobFlow />;
  }

  // Otherwise, show the company cards grid
  if (isCompaniesLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <ClassicLoader />
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center mb-6 shadow-sm">
          <Building2 className="w-10 h-10 text-slate-400" />
        </div>
        <h3 className="text-xl font-semibold text-[#0A2342] mb-2">
          Nenhuma empresa cadastrada
        </h3>
        <p className="text-slate-600 max-w-sm mb-6">
          Empresas parceiras aparecerão aqui quando cadastradas
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-[#0A2342]">Descrição de Vagas</h2>
        <p className="text-slate-600 mt-1">
          Selecione uma empresa para visualizar suas vagas e candidatos
        </p>
      </div>

      {/* Company Cards Grid */}
      {isAllAgenciesMode ? (
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-3">
                    {agencyCompanies.map((company: any) => (
                      <CompanyCard
                        key={company.id}
                        company={company}
                        onClick={() => setSelectedCompanyId(company.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 py-4 px-3">Nenhuma empresa nesta agência</p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {companies.map((company: any) => (
            <CompanyCard
              key={company.id}
              company={company}
              onClick={() => setSelectedCompanyId(company.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Individual company card component
function CompanyCard({ company, onClick }: { company: any; onClick: () => void }) {
  // Query to get job count for this company
  const { data: jobs } = trpc.job.getByCompanyId.useQuery(
    { companyId: company.id },
    { enabled: !!company.id, staleTime: 30000 }
  );

  const jobCount = jobs?.length || 0;
  const activeJobs = jobs?.filter((j: any) => j.status === 'open' || j.status === 'searching' || j.status === 'candidates_found').length || 0;

  return (
    <button
      onClick={onClick}
      className="group relative p-4 bg-white rounded-lg border-2 border-slate-200 hover:border-orange-300 hover:shadow-lg transition-all duration-200 text-left h-full flex flex-col"
    >
      {/* Company Icon/Initial */}
      <div className="mb-3">
        <div className="w-10 h-10 rounded-lg bg-[#0A2342] flex items-center justify-center">
          <span className="text-white text-base font-bold">
            {company.company_name?.charAt(0)?.toUpperCase() || 'E'}
          </span>
        </div>
      </div>

      {/* Company Name */}
      <h3 className="text-base font-semibold text-[#0A2342] mb-1 group-hover:text-orange-600 transition-colors">
        {company.company_name || 'Empresa sem nome'}
      </h3>

      {/* Contact Name */}
      {company.contact_name && (
        <p className="text-xs text-slate-600 mb-3">
          {company.contact_name}
        </p>
      )}

      {/* Stats */}
      <div className="mt-auto space-y-1">
        <div className="flex items-center gap-1.5 text-xs">
          <Briefcase className="w-3 h-3 text-orange-600" />
          <span className="text-slate-700">
            {jobCount} {jobCount === 1 ? 'vaga' : 'vagas'}
          </span>
        </div>
        {activeJobs > 0 && (
          <div className="flex items-center gap-1.5 text-xs">
            <TrendingUp className="w-3 h-3 text-green-600" />
            <span className="text-green-700">
              {activeJobs} ativa{activeJobs !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Hover arrow indicator */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center">
          <svg className="w-3 h-3 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  );
}
