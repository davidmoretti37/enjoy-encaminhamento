import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Target, Zap, Shield, AlertTriangle, MessageCircle, Quote, Users, Briefcase } from "lucide-react";
import {
  DISCProfile,
  profileDescriptions,
  combinedProfiles,
  getTopTwoProfiles,
  getCombinedProfileKey
} from "@/data/discQuestions";

interface DISCResultsProps {
  results: Record<DISCProfile, number>;
  onContinue: () => void;
  isSubmitting?: boolean;
  buttonText?: string;
}

export default function DISCResults({ results, onContinue, isSubmitting, buttonText = "Continuar para PDP" }: DISCResultsProps) {
  // Find dominant and secondary profiles
  const { primary: dominantProfile, secondary: secondaryProfile } = useMemo(() => {
    return getTopTwoProfiles(results);
  }, [results]);

  // Get combined profile if exists
  const combinedProfileKey = getCombinedProfileKey(dominantProfile, secondaryProfile);
  const combinedProfile = combinedProfileKey ? combinedProfiles[combinedProfileKey] : null;

  // Get profile info
  const primaryInfo = profileDescriptions[dominantProfile];
  const secondaryInfo = secondaryProfile ? profileDescriptions[secondaryProfile] : null;

  // Calculate SVG points for radar chart
  const radarPoints = useMemo(() => {
    const centerX = 150;
    const centerY = 150;
    const maxRadius = 120;

    // Order: Influente (top-right), Estavel (top-left), Dominante (bottom-left), Conforme (bottom-right)
    const angles = [315, 225, 135, 45]; // degrees, starting from top-right
    const profiles: DISCProfile[] = ["influente", "estavel", "dominante", "conforme"];

    return profiles.map((profile, i) => {
      const angle = (angles[i] * Math.PI) / 180;
      const radius = (results[profile] / 100) * maxRadius;
      return {
        x: centerX + radius * Math.cos(angle),
        y: centerY - radius * Math.sin(angle),
        profile,
        value: results[profile],
        labelX: centerX + (maxRadius + 30) * Math.cos(angle),
        labelY: centerY - (maxRadius + 30) * Math.sin(angle),
      };
    });
  }, [results]);

  // Generate polygon points string
  const polygonPoints = radarPoints.map(p => `${p.x},${p.y}`).join(" ");

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Seu Perfil Comportamental</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Radar Chart */}
          <div className="flex justify-center mb-8">
            <svg viewBox="0 0 300 300" className="w-full max-w-[400px]">
              {/* Background circles */}
              {[20, 40, 60, 80, 100].map((percent) => (
                <circle
                  key={percent}
                  cx="150"
                  cy="150"
                  r={(percent / 100) * 120}
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
              ))}

              {/* Axis lines */}
              {[315, 225, 135, 45].map((angle) => {
                const rad = (angle * Math.PI) / 180;
                return (
                  <line
                    key={angle}
                    x1="150"
                    y1="150"
                    x2={150 + 120 * Math.cos(rad)}
                    y2={150 - 120 * Math.sin(rad)}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Filled polygon - uses dominant profile color */}
              <polygon
                points={polygonPoints}
                fill={`${primaryInfo.color}20`}
                stroke={primaryInfo.color}
                strokeWidth="2"
              />

              {/* Data points */}
              {radarPoints.map((point) => (
                <circle
                  key={point.profile}
                  cx={point.x}
                  cy={point.y}
                  r="6"
                  fill={profileDescriptions[point.profile].color}
                  stroke="white"
                  strokeWidth="2"
                />
              ))}

              {/* Labels */}
              <text x="240" y="60" textAnchor="middle" className="text-sm font-medium fill-current">
                Influente
              </text>
              <text x="240" y="75" textAnchor="middle" className="text-xs" fill={profileDescriptions.influente.color}>
                {results.influente}%
              </text>

              <text x="60" y="60" textAnchor="middle" className="text-sm font-medium fill-current">
                Estável
              </text>
              <text x="60" y="75" textAnchor="middle" className="text-xs" fill={profileDescriptions.estavel.color}>
                {results.estavel}%
              </text>

              <text x="60" y="250" textAnchor="middle" className="text-sm font-medium fill-current">
                Dominante
              </text>
              <text x="60" y="265" textAnchor="middle" className="text-xs" fill={profileDescriptions.dominante.color}>
                {results.dominante}%
              </text>

              <text x="240" y="250" textAnchor="middle" className="text-sm font-medium fill-current">
                Conforme
              </text>
              <text x="240" y="265" textAnchor="middle" className="text-xs" fill={profileDescriptions.conforme.color}>
                {results.conforme}%
              </text>
            </svg>
          </div>

          {/* Profile bars */}
          <div className="space-y-4">
            {(["dominante", "influente", "estavel", "conforme"] as DISCProfile[]).map(
              (profile) => {
                const info = profileDescriptions[profile];
                return (
                  <div key={profile} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-medium flex items-center gap-2">
                        <span>{info.emoji}</span>
                        {info.title}
                      </span>
                      <span className="text-sm font-semibold" style={{ color: info.color }}>
                        {results[profile]}%
                      </span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${results[profile]}%`,
                          backgroundColor: info.color,
                        }}
                      />
                    </div>
                  </div>
                );
              }
            )}
          </div>

          {/* Primary Profile - Detailed */}
          <div className="mt-8 p-5 rounded-lg border-2" style={{ borderColor: primaryInfo.color, backgroundColor: `${primaryInfo.color}08` }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{primaryInfo.emoji}</span>
              <div>
                <h3 className="font-bold text-lg">
                  Seu perfil predominante: {primaryInfo.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {results[dominantProfile]}% das suas respostas
                </p>
              </div>
            </div>

            <div className="grid gap-3 text-sm">
              <div className="flex items-start gap-2">
                <Target className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <span className="font-medium">Foco:</span> {primaryInfo.focus}
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Zap className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <span className="font-medium">Motivação:</span> {primaryInfo.motivation}
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <span className="font-medium">Forças:</span>{" "}
                  <span className="inline-flex flex-wrap gap-1">
                    {primaryInfo.strengths.map((s, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <span className="font-medium">Pontos de atenção:</span>{" "}
                  <span className="inline-flex flex-wrap gap-1">
                    {primaryInfo.risks.map((r, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{r}</Badge>
                    ))}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MessageCircle className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <span className="font-medium">Comunicação:</span> {primaryInfo.communication}
                </div>
              </div>

              <div className="flex items-start gap-2 mt-2 p-3 bg-white/50 rounded-lg">
                <Quote className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <p className="italic text-muted-foreground">"{primaryInfo.typicalPhrase}"</p>
              </div>
            </div>
          </div>

          {/* Secondary Profile */}
          {secondaryInfo && (
            <div className="mt-4 p-4 rounded-lg bg-gray-50 border">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{secondaryInfo.emoji}</span>
                <h4 className="font-semibold">
                  Perfil secundário: {secondaryInfo.title}
                </h4>
                <span className="text-sm text-muted-foreground">
                  ({results[secondaryProfile!]}%)
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{secondaryInfo.summary}</p>
            </div>
          )}

          {/* Combined Profile Analysis */}
          {combinedProfile && (
            <div className="mt-4 p-4 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 border">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-5 w-5 text-slate-600" />
                <h4 className="font-semibold">Perfil Combinado: {combinedProfile.name}</h4>
              </div>

              <p className="text-sm font-medium mb-3" style={{ color: primaryInfo.color }}>
                "{combinedProfile.description}"
              </p>

              <ul className="space-y-1 mb-3">
                {combinedProfile.traits.map((trait, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-slate-400">•</span>
                    {trait}
                  </li>
                ))}
              </ul>

              <div className="flex items-start gap-2 text-sm mb-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
                <span><strong>Risco:</strong> {combinedProfile.risk}</span>
              </div>

              <div className="flex items-start gap-2 text-sm">
                <Briefcase className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                <span><strong>Comum em:</strong> {combinedProfile.commonIn}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button
          onClick={onContinue}
          disabled={isSubmitting}
          size="lg"
          className="w-full max-w-md"
        >
          {isSubmitting ? (
            "Finalizando..."
          ) : (
            <>
              {buttonText}
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
