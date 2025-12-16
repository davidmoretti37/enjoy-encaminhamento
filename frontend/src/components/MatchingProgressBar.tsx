/**
 * Matching Progress Bar Component
 *
 * Shows real-time progress of candidate matching
 * Features:
 * - Animated progress bar
 * - Live statistics (processed/total, matches found)
 * - ETA estimation
 * - Status indicators
 */

import React from 'react';

interface MatchingProgress {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'not_started';
  totalCandidates: number;
  processedCandidates: number;
  matchesFound: number;
  percentComplete: number;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  processingTimeMs?: number;
}

interface Props {
  progress: MatchingProgress;
}

export default function MatchingProgressBar({ progress }: Props) {
  const { status, totalCandidates, processedCandidates, matchesFound, percentComplete } = progress;

  // Calculate ETA
  const getETA = () => {
    if (!progress.startedAt || percentComplete === 0) return null;

    const startTime = new Date(progress.startedAt).getTime();
    const now = Date.now();
    const elapsed = now - startTime;
    const rate = processedCandidates / (elapsed / 1000); // candidates per second
    const remaining = totalCandidates - processedCandidates;
    const etaSeconds = remaining / rate;

    if (etaSeconds < 60) {
      return `${Math.ceil(etaSeconds)}s`;
    }
    return `${Math.ceil(etaSeconds / 60)}min`;
  };

  const eta = getETA();

  // Status-based styling
  const getStatusConfig = () => {
    switch (status) {
      case 'running':
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          progressColor: 'bg-blue-600',
          icon: '🔍',
          message: 'Procurando candidatos...',
        };
      case 'completed':
        return {
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
          progressColor: 'bg-green-600',
          icon: '✅',
          message: 'Busca concluída!',
        };
      case 'failed':
        return {
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          progressColor: 'bg-red-600',
          icon: '❌',
          message: 'Erro na busca',
        };
      case 'pending':
        return {
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          progressColor: 'bg-yellow-600',
          icon: '⏳',
          message: 'Aguardando início...',
        };
      default:
        return {
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-800',
          progressColor: 'bg-gray-600',
          icon: '📊',
          message: 'Carregando...',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`${config.bgColor} border-2 ${config.borderColor} rounded-lg p-6 mb-6 shadow-lg`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">{config.icon}</span>
        <div className="flex-1">
          <h3 className={`text-lg font-semibold ${config.textColor}`}>
            {config.message}
          </h3>
          {status === 'running' && (
            <p className="text-sm text-gray-600 mt-1">
              A busca está sendo realizada em segundo plano. Você pode sair desta página e voltar depois.
            </p>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm font-medium mb-2">
          <span className="text-gray-700">
            {processedCandidates} / {totalCandidates} candidatos analisados
          </span>
          <span className={config.textColor}>{percentComplete}%</span>
        </div>

        {/* Animated Progress Bar */}
        <div className="h-4 bg-white rounded-full overflow-hidden shadow-inner">
          <div
            className={`h-full ${config.progressColor} transition-all duration-500 ease-out relative overflow-hidden`}
            style={{ width: `${percentComplete}%` }}
          >
            {/* Animated shimmer effect */}
            {status === 'running' && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer" />
            )}
          </div>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Candidates */}
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">Total</div>
          <div className="text-2xl font-bold text-gray-900">{totalCandidates}</div>
          <div className="text-xs text-gray-500">candidatos</div>
        </div>

        {/* Processed */}
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">Analisados</div>
          <div className="text-2xl font-bold text-blue-600">{processedCandidates}</div>
          <div className="text-xs text-gray-500">processados</div>
        </div>

        {/* Matches Found */}
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">Matches</div>
          <div className="text-2xl font-bold text-green-600">{matchesFound}</div>
          <div className="text-xs text-gray-500">encontrados</div>
        </div>

        {/* ETA or Time */}
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">
            {status === 'running' ? 'ETA' : 'Tempo'}
          </div>
          <div className="text-2xl font-bold text-purple-600">
            {status === 'running' && eta ? eta : progress.processingTimeMs ? `${Math.round(progress.processingTimeMs / 1000)}s` : '-'}
          </div>
          <div className="text-xs text-gray-500">
            {status === 'running' ? 'estimado' : 'total'}
          </div>
        </div>
      </div>

      {/* Loading Animation (only when running) */}
      {status === 'running' && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      )}

      {/* Error Message */}
      {status === 'failed' && progress.errorMessage && (
        <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded text-sm text-red-800">
          <strong>Erro:</strong> {progress.errorMessage}
        </div>
      )}
    </div>
  );
}
