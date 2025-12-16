/**
 * Candidate Match Card Component
 *
 * Displays a candidate match with:
 * - Match score and recommendation badge
 * - Candidate profile info
 * - Match factors breakdown (skills, experience, etc.)
 * - AI reasoning (if available)
 * - Contact button
 */

import React from 'react';

interface CandidateMatch {
  matchId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail?: string;
  compositeScore: number;
  confidenceScore: number;
  recommendation: string;
  matchFactors: {
    skillsMatch: number;
    experienceMatch: number;
    locationMatch: number;
    educationMatch: number;
    reliabilityScore: number;
    performanceScore: number;
    stabilityScore: number;
    growthPotential: number;
  };
  semanticFactors?: {
    semanticScore: number;
    reasoning?: string;
    missingSkills?: string[];
    transferableSkills?: string[];
  };
  reasoning?: string;
  candidateProfile: {
    skills?: string[];
    yearsOfExperience?: number;
    educationLevel?: string;
    city?: string;
    state?: string;
  };
}

interface Props {
  match: CandidateMatch;
}

export default function CandidateMatchCard({ match }: Props) {
  // Color scheme based on score
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 70) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  // Recommendation badge
  const getRecommendationBadge = () => {
    const badges = {
      HIGHLY_RECOMMENDED: {
        label: 'Altamente Recomendado',
        className: 'bg-green-100 text-green-800 border-green-300',
        icon: '⭐',
      },
      RECOMMENDED: {
        label: 'Recomendado',
        className: 'bg-blue-100 text-blue-800 border-blue-300',
        icon: '👍',
      },
      CONSIDER: {
        label: 'Considerar',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        icon: '🤔',
      },
      NOT_RECOMMENDED: {
        label: 'Não Recomendado',
        className: 'bg-gray-100 text-gray-800 border-gray-300',
        icon: '❌',
      },
    };

    const badge = badges[match.recommendation as keyof typeof badges] || badges.CONSIDER;

    return (
      <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${badge.className}`}>
        <span>{badge.icon}</span>
        <span>{badge.label}</span>
      </div>
    );
  };

  // Progress bar for individual factors
  const FactorBar = ({ label, value }: { label: string; value: number }) => {
    const color =
      value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-blue-500' : value >= 40 ? 'bg-yellow-500' : 'bg-red-500';

    return (
      <div className="mb-2">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>{label}</span>
          <span className="font-medium">{value.toFixed(0)}</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-full ${color} transition-all duration-300`} style={{ width: `${value}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg border-2 overflow-hidden hover:shadow-xl transition-shadow ${getScoreColor(match.compositeScore)}`}>
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-blue-50 to-white">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-1">{match.candidateName}</h3>
            {match.candidateEmail && (
              <p className="text-sm text-gray-600">{match.candidateEmail}</p>
            )}
          </div>

          {/* Match Score Badge */}
          <div className="flex flex-col items-center">
            <div className={`text-3xl font-bold ${getScoreColor(match.compositeScore).split(' ')[0]}`}>
              {match.compositeScore.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">Match Score</div>
          </div>
        </div>

        {/* Recommendation Badge */}
        {getRecommendationBadge()}
      </div>

      {/* Profile Info */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          {match.candidateProfile.yearsOfExperience !== undefined && (
            <div>
              <span className="text-gray-600">Experiência:</span>
              <span className="ml-2 font-medium">{match.candidateProfile.yearsOfExperience} anos</span>
            </div>
          )}
          {match.candidateProfile.educationLevel && (
            <div>
              <span className="text-gray-600">Educação:</span>
              <span className="ml-2 font-medium capitalize">{match.candidateProfile.educationLevel.replace('_', ' ')}</span>
            </div>
          )}
          {match.candidateProfile.city && (
            <div className="col-span-2">
              <span className="text-gray-600">Localização:</span>
              <span className="ml-2 font-medium">
                {match.candidateProfile.city}, {match.candidateProfile.state}
              </span>
            </div>
          )}
        </div>

        {/* Skills */}
        {match.candidateProfile.skills && match.candidateProfile.skills.length > 0 && (
          <div className="mt-4">
            <div className="text-sm font-semibold text-gray-700 mb-2">Skills:</div>
            <div className="flex flex-wrap gap-2">
              {match.candidateProfile.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI Reasoning */}
      {(match.reasoning || match.semanticFactors?.reasoning) && (
        <div className="p-6 bg-blue-50 border-b border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <span>💡</span>
            <span>Análise IA:</span>
          </h4>
          <p className="text-sm text-gray-700 leading-relaxed">
            {match.reasoning || match.semanticFactors?.reasoning}
          </p>

          {/* Missing Skills */}
          {match.semanticFactors?.missingSkills && match.semanticFactors.missingSkills.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-medium text-red-700 mb-1">
                Skills Faltantes:
              </div>
              <div className="flex flex-wrap gap-1">
                {match.semanticFactors.missingSkills.map((skill) => (
                  <span key={skill} className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Transferable Skills */}
          {match.semanticFactors?.transferableSkills && match.semanticFactors.transferableSkills.length > 0 && (
            <div className="mt-2">
              <div className="text-xs font-medium text-green-700 mb-1">
                Skills Transferíveis:
              </div>
              <div className="flex flex-wrap gap-1">
                {match.semanticFactors.transferableSkills.map((skill) => (
                  <span key={skill} className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Match Factors Breakdown */}
      <div className="p-6 bg-gray-50">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">Fatores de Match:</h4>
        <FactorBar label="Skills" value={match.matchFactors.skillsMatch} />
        <FactorBar label="Experiência" value={match.matchFactors.experienceMatch} />
        <FactorBar label="Localização" value={match.matchFactors.locationMatch} />
        <FactorBar label="Educação" value={match.matchFactors.educationMatch} />
        <FactorBar label="Confiabilidade" value={match.matchFactors.reliabilityScore} />
        <FactorBar label="Performance" value={match.matchFactors.performanceScore} />

        {/* Confidence Score */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Confiança da Análise:</span>
            <span className="font-semibold text-gray-900">{match.confidenceScore.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Contact Button */}
      <div className="p-6">
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span>Entrar em Contato</span>
        </button>
      </div>
    </div>
  );
}
