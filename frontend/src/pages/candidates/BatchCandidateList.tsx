// @ts-nocheck
import { trpc } from "@/lib/trpc";
import { MapPin, GraduationCap } from "lucide-react";

interface BatchCandidateListProps {
  candidateIds: string[];
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

export default function BatchCandidateList({
  candidateIds,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
}: BatchCandidateListProps) {
  const allCandidatesQuery = trpc.candidate.getByIds.useQuery(
    { ids: candidateIds },
    { enabled: candidateIds.length > 0 }
  );

  const batchCandidates = allCandidatesQuery.data || [];

  const toggleCandidate = (candidateId: string) => {
    if (!onSelectionChange) return;
    if (selectedIds.includes(candidateId)) {
      onSelectionChange(selectedIds.filter(id => id !== candidateId));
    } else {
      onSelectionChange([...selectedIds, candidateId]);
    }
  };

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (selectedIds.length === batchCandidates.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(batchCandidates.map((c: any) => c.id));
    }
  };

  if (allCandidatesQuery.isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
            <div className="flex-1">
              <div className="h-3 w-32 bg-gray-200 rounded animate-pulse mb-1" />
              <div className="h-2.5 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (batchCandidates.length === 0) {
    return <p className="text-xs text-gray-400 py-2">Nenhum candidato encontrado</p>;
  }

  return (
    <div className="space-y-1">
      {selectable && batchCandidates.length > 1 && (
        <button
          onClick={toggleAll}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium mb-2"
        >
          {selectedIds.length === batchCandidates.length ? 'Desmarcar todos' : 'Selecionar todos'}
        </button>
      )}
      {batchCandidates.map((candidate: any) => (
        <div
          key={candidate.id}
          className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
            selectable ? 'cursor-pointer hover:bg-white' : 'hover:bg-white'
          } ${selectable && selectedIds.includes(candidate.id) ? 'bg-blue-50 ring-1 ring-blue-200' : ''}`}
          onClick={() => selectable && toggleCandidate(candidate.id)}
        >
          {selectable && (
            <input
              type="checkbox"
              checked={selectedIds.includes(candidate.id)}
              onChange={() => toggleCandidate(candidate.id)}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          )}
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium shrink-0">
            {candidate.full_name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{candidate.full_name}</p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {candidate.city && (
                <span className="flex items-center gap-0.5">
                  <MapPin className="h-3 w-3" />
                  {candidate.city}
                </span>
              )}
              {candidate.education_level && (
                <span className="flex items-center gap-0.5">
                  <GraduationCap className="h-3 w-3" />
                  {candidate.education_level}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
