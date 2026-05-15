import { useAgencyFunnel } from "@/contexts/AgencyFunnelContext";
import { useAgencyContext } from "@/contexts/AgencyContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Briefcase, MapPin, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import CompanyJobFlow from "./CompanyJobFlow";
import { useMemo } from "react";

// Show actual jobs (title + description) instead of grouping by company.
// Company names are intentionally NOT displayed in the cards.
export default function JobDescriptionTab() {
  const { companies, selectedCompanyId, setSelectedCompanyId, isCompaniesLoading } = useAgencyFunnel();
  const { isAllAgenciesMode, availableAgencies } = useAgencyContext();

  if (selectedCompanyId) {
    return <CompanyJobFlow />;
  }

  if (isCompaniesLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-4 rounded-lg border border-slate-200 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        ))}
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
          Selecione uma vaga para visualizar candidatos
        </p>
      </div>

      {isAllAgenciesMode ? (
        <div className="space-y-6">
          {availableAgencies.map((agency) => {
            const agencyCompanies = companies.filter((c: any) => c.agency_id === agency.id);
            return (
              <div key={agency.id}>
                <div className="flex items-center gap-2 py-3 px-3 border-b border-gray-200 bg-gray-50/80 rounded-t-lg">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  <span className="font-semibold text-gray-700">{agency.name}</span>
                  <span className="text-xs text-gray-400">({agencyCompanies.length})</span>
                </div>
                <AgencyJobList
                  companies={agencyCompanies}
                  onJobClick={(companyId) => setSelectedCompanyId(companyId)}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <AgencyJobList
          companies={companies}
          onJobClick={(companyId) => setSelectedCompanyId(companyId)}
        />
      )}
    </div>
  );
}

// Fetches jobs for every company in `companies` and renders one card per job.
// Internally uses one query per company (existing endpoint), then flattens.
function AgencyJobList({
  companies,
  onJobClick,
}: {
  companies: any[];
  onJobClick: (companyId: string) => void;
}) {
  if (companies.length === 0) {
    return <p className="text-sm text-gray-400 py-4 px-3">Nenhuma empresa nesta agência</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
      {companies.map((company: any) => (
        <CompanyJobsBlock key={company.id} company={company} onJobClick={onJobClick} />
      ))}
    </div>
  );
}

// Renders all of one company's jobs as standalone cards (no company name shown).
function CompanyJobsBlock({
  company,
  onJobClick,
}: {
  company: any;
  onJobClick: (companyId: string) => void;
}) {
  const { data: jobs, isLoading } = trpc.job.getByCompanyId.useQuery(
    { companyId: company.id },
    { enabled: !!company.id, staleTime: 30000 }
  );

  const visibleJobs = useMemo(
    () =>
      (jobs ?? []).filter((j: any) =>
        ["open", "searching", "candidates_found", "in_selection"].includes(j.status)
      ),
    [jobs]
  );

  if (isLoading) {
    return (
      <div className="p-4 rounded-lg border border-slate-200 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-full" />
      </div>
    );
  }

  if (visibleJobs.length === 0) return null;

  return (
    <>
      {visibleJobs.map((job: any) => (
        <JobCard key={job.id} job={job} onClick={() => onJobClick(company.id)} />
      ))}
    </>
  );
}

function JobCard({ job, onClick }: { job: any; onClick: () => void }) {
  const contractLabelMap: Record<string, string> = {
    estagio: "Estágio",
    clt: "CLT",
    "menor-aprendiz": "Jovem Aprendiz",
    pj: "PJ",
  };
  const workTypeMap: Record<string, string> = {
    presencial: "Presencial",
    remoto: "Remoto",
    hibrido: "Híbrido",
  };
  const contractLabel = contractLabelMap[job.contract_type] || job.contract_type;
  const isActive = ["open", "searching", "candidates_found", "in_selection"].includes(job.status);

  return (
    <button
      onClick={onClick}
      className="group relative p-4 bg-white rounded-lg border-2 border-slate-200 hover:border-orange-300 hover:shadow-lg transition-all duration-200 text-left h-full flex flex-col"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-base font-semibold text-[#0A2342] group-hover:text-orange-600 transition-colors line-clamp-2">
          {job.title || "Vaga sem título"}
        </h3>
        <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          {contractLabel}
        </span>
      </div>

      {job.description && (
        <p className="text-xs text-slate-600 line-clamp-3 mb-3">
          {job.description}
        </p>
      )}

      <div className="mt-auto space-y-1.5 text-xs">
        {(job.location || job.work_type) && (
          <div className="flex items-center gap-1.5 text-slate-600">
            <MapPin className="w-3 h-3" />
            <span>
              {[job.location, job.work_type ? workTypeMap[job.work_type] : null]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
        )}
        {job.openings ? (
          <div className="flex items-center gap-1.5 text-slate-600">
            <Briefcase className="w-3 h-3 text-orange-600" />
            <span>
              {job.openings} {job.openings === 1 ? "vaga" : "vagas"}
            </span>
          </div>
        ) : null}
        {isActive && (
          <div className="flex items-center gap-1.5 text-green-700">
            <TrendingUp className="w-3 h-3" />
            <span>Ativa</span>
          </div>
        )}
      </div>

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
