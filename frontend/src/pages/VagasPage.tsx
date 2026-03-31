/**
 * Vagas Page - Job Matches View
 *
 * Shows matched candidates for a specific job in real-time
 * Features:
 * - Real-time progress tracking as candidates are being matched
 * - Live updates every 2 seconds during matching
 * - Candidate cards with scores, factors, and AI reasoning
 * - Pagination for large result sets
 * - Filtering by minimum score
 */

import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { trpc } from '../lib/trpc';
import CandidateMatchCard from '../components/CandidateMatchCard';
import MatchingProgressBar from '../components/MatchingProgressBar';

export default function VagasPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = params.jobId;
  const [, setLocation] = useLocation();
  const [currentPage, setCurrentPage] = useState(1);
  const [minScore, setMinScore] = useState(50);
  const pageSize = 50;

  // Get matching progress (polls every 2 seconds)
  const { data: progressRaw, isLoading: progressLoading } = trpc.job.getMatchingProgress.useQuery(
    { jobId: jobId! },
    {
      enabled: !!jobId,
      refetchInterval: 2000, // Poll every 2 seconds for real-time updates
    }
  );
  const progress = progressRaw as any;

  // Get matched candidates
  const {
    data: matchDataRaw,
    isLoading: matchesLoading,
    refetch: refetchMatches,
  } = (trpc.job.getMatchesForJob as any).useQuery(
    {
      jobId: jobId!,
      page: currentPage,
      pageSize,
      minScore,
    },
    {
      enabled: !!jobId,
    }
  );
  const matchData = matchDataRaw as any;

  // Get job details
  const { data: job } = (trpc.job.getById as any).useQuery(
    { id: parseInt(jobId!) },
    { enabled: !!jobId }
  );

  const isMatching = progress?.status === 'running';
  const isCompleted = progress?.status === 'completed';
  const isFailed = progress?.status === 'failed';

  // Auto-refetch matches when matching completes
  useEffect(() => {
    if (isCompleted) {
      refetchMatches();
    }
  }, [isCompleted, refetchMatches]);

  if (!jobId) {
    return <div className="p-8">Invalid job ID</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => window.history.back()}
            className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            ← Voltar
          </button>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Candidatos para: {job?.title || 'Carregando...'}
          </h1>
          <p className="text-gray-600">
            Resultados da busca automática de candidatos
          </p>
        </div>

        {/* Progress Bar (shown during matching or when loading) */}
        {(isMatching || progressLoading) && progress && (
          <MatchingProgressBar progress={progress} />
        )}

        {/* Failed State */}
        {isFailed && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <h3 className="text-red-800 font-semibold mb-2">
              ❌ Erro na Busca de Candidatos
            </h3>
            <p className="text-red-600">
              {progress?.errorMessage || 'Ocorreu um erro ao buscar candidatos.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        {/* Filters */}
        {(isCompleted || matchData) && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Score Mínimo: {minScore}
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={minScore}
                  onChange={(e) => {
                    setMinScore(parseInt(e.target.value));
                    setCurrentPage(1); // Reset to first page
                  }}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0</span>
                  <span>50</span>
                  <span>100</span>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <div className="font-semibold">
                  {matchData?.pagination.totalMatches || 0} candidatos
                </div>
                <div className="text-xs">encontrados</div>
              </div>
            </div>
          </div>
        )}

        {/* Matches Grid */}
        {matchesLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : matchData && matchData.matches.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {matchData.matches.map((match: any) => (
                <CandidateMatchCard key={match.matchId} match={match} />
              ))}
            </div>

            {/* Pagination */}
            {matchData.pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Anterior
                </button>

                <div className="flex items-center gap-2">
                  {Array.from(
                    { length: Math.min(5, matchData.pagination.totalPages) },
                    (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 rounded ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                  )}
                  {matchData.pagination.totalPages > 5 && (
                    <>
                      <span className="text-gray-500">...</span>
                      <button
                        onClick={() => setCurrentPage(matchData.pagination.totalPages)}
                        className={`px-3 py-1 rounded ${
                          currentPage === matchData.pagination.totalPages
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {matchData.pagination.totalPages}
                      </button>
                    </>
                  )}
                </div>

                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(matchData.pagination.totalPages, p + 1))
                  }
                  disabled={currentPage === matchData.pagination.totalPages}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próximo →
                </button>
              </div>
            )}

            {/* Results Summary */}
            <div className="mt-6 text-center text-sm text-gray-600">
              Mostrando {matchData.matches.length} de {matchData.pagination.totalMatches}{' '}
              candidatos (Página {currentPage} de {matchData.pagination.totalPages})
            </div>
          </>
        ) : (
          // Empty State
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhum candidato encontrado
            </h3>
            <p className="text-gray-600 mb-4">
              Não há candidatos com score ≥ {minScore} para esta vaga.
            </p>
            {minScore > 50 && (
              <button
                onClick={() => setMinScore(50)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Reduzir Score Mínimo para 50
              </button>
            )}
          </div>
        )}

        {/* Processing Info */}
        {isCompleted && progress && (
          <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-800">
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-semibold">Busca concluída!</span>
            </div>
            <div className="mt-2 text-sm text-green-700">
              {progress.totalCandidates} candidatos analisados •{' '}
              {progress.matchesFound} matches encontrados •{' '}
              {progress.processingTimeMs
                ? `${Math.round(progress.processingTimeMs / 1000)}s`
                : 'Processado'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
